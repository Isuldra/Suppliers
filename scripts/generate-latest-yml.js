#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Generate latest.yml file for electron-updater
 * This is needed for portable versions since electron-builder only generates latest.yml for nsis targets
 */

function generateLatestYml() {
  try {
    // Read package.json to get version
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const version = packageJson.version;

    console.log(`Generating latest.yml for version ${version}...`);

    // Find portable .exe file
    const releaseDir = path.join(__dirname, "..", "release");
    const portableFiles = fs
      .readdirSync(releaseDir)
      .filter((file) => file.includes("Portable") && file.endsWith(".exe"));

    if (portableFiles.length === 0) {
      throw new Error("No portable .exe file found in release directory");
    }

    const portableFile = portableFiles[0]; // Take the first one found
    const portablePath = path.join(releaseDir, portableFile);

    console.log(`Found portable file: ${portableFile}`);

    // Calculate file size
    const stats = fs.statSync(portablePath);
    const fileSize = stats.size;

    // Calculate SHA512 hash
    const fileBuffer = fs.readFileSync(portablePath);
    const hash = crypto.createHash("sha512");
    hash.update(fileBuffer);
    const sha512 = hash.digest("base64");

    // Get GitHub publish configuration from package.json
    const publishConfig = packageJson.build.publish;
    const downloadUrl = `https://github.com/${publishConfig.owner}/${publishConfig.repo}/releases/download/v${version}/${portableFile}`;

    // Generate latest.yml content
    const latestYmlContent = `version: ${version}
files:
  - url: ${portableFile}
    sha512: ${sha512}
    size: ${fileSize}
path: ${portableFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

    // Write latest.yml to release directory
    const latestYmlPath = path.join(releaseDir, "latest.yml");
    fs.writeFileSync(latestYmlPath, latestYmlContent);

    console.log(`✅ Generated latest.yml successfully`);
    console.log(`   File: ${latestYmlPath}`);
    console.log(`   Version: ${version}`);
    console.log(`   Portable file: ${portableFile}`);
    console.log(`   Download URL: ${downloadUrl}`);

    return {
      success: true,
      version,
      portableFile,
      downloadUrl,
      latestYmlPath,
    };
  } catch (error) {
    console.error("❌ Error generating latest.yml:", error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  generateLatestYml();
}

module.exports = { generateLatestYml };
