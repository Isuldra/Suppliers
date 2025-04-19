#!/usr/bin/env node

// This script prepares the project for cross-platform building
// specifically for Windows targets from macOS

import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// Helper to run commands
const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command}`);
    exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      console.log(stdout);
      resolve(stdout);
    });
  });
};

async function main() {
  try {
    console.log("Starting Windows build preparation...");

    // 1. Ensure we're using a clean environment
    await runCommand("rm -rf node_modules dist release");

    // 2. Install dependencies
    await runCommand("npm install");

    // 3. Create empty directories to store the prebuilt modules
    if (!fs.existsSync(path.join(rootDir, "prebuilds"))) {
      fs.mkdirSync(path.join(rootDir, "prebuilds"));
    }

    // 4. Modify package.json to ensure we don't rebuild
    const packageJsonPath = path.join(rootDir, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    // Ensure npmRebuild is set to false
    if (packageJson.build) {
      packageJson.build.npmRebuild = false;

      // Set nsis configuration for non-admin installation
      if (packageJson.build.nsis) {
        packageJson.build.nsis.perMachine = false;
        packageJson.build.nsis.allowElevation = false;
      }
    }

    // Write the updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("Updated package.json to disable native rebuilding");

    // 5. Create a postinstall script to avoid rebuilding native modules
    const postinstallPath = path.join(rootDir, "scripts", "postinstall.js");
    fs.writeFileSync(
      postinstallPath,
      `
#!/usr/bin/env node
// This script is designed to prevent rebuilding of native modules
// It's a workaround for cross-platform builds
console.log('Skipping native module rebuild - using prebuilt binaries');
process.exit(0);
    `
    );

    // Make it executable
    fs.chmodSync(postinstallPath, "755");
    console.log("Created postinstall script to prevent rebuilding");

    // 6. Add the postinstall script to package.json
    packageJson.scripts.postinstall = "node scripts/postinstall.js";
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    console.log("Windows build preparation complete!");
    console.log("Now run: npm run dist:portable");
  } catch (error) {
    console.error("Failed to prepare Windows build:", error);
    process.exit(1);
  }
}

main();
