#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Octokit } from "@octokit/rest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root directory
const projectRoot = path.resolve(__dirname, "..");
const releaseDir = path.join(projectRoot, "release");

// Read package.json to get current version
const packageJsonPath = path.join(projectRoot, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;

console.log(`🚀 Creating GitHub Release v${version}...`);

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = "Isuldra";
const repo = "Suppliers";
const tagName = `v${version}`;

async function createRelease() {
  try {
    // Check if release already exists
    try {
      const existingRelease = await octokit.rest.repos.getReleaseByTag({
        owner,
        repo,
        tag: tagName,
      });

      console.log(`⚠️  Release ${tagName} already exists!`);
      console.log(`   URL: ${existingRelease.data.html_url}`);
      return;
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
      // Release doesn't exist, continue
    }

    // Create the release
    console.log(`📝 Creating release ${tagName}...`);
    const release = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tagName,
      name: `OneMed SupplyChain v${version}`,
      body: `## OneMed SupplyChain v${version}

### Changes
- Auto-update system improvements
- Bug fixes and performance enhancements

### Downloads
- **Windows Installer**: OneMed SupplyChain-${version}-setup.exe
- **Portable Version**: OneMed SupplyChain-Portable.exe

### Installation
1. Download the appropriate file for your system
2. Run the installer or portable executable
3. The app will automatically check for future updates

---
*This release was created automatically by the build system.*`,
      draft: false,
      prerelease: false,
    });

    console.log(`✅ Release created: ${release.data.html_url}`);

    // Upload assets
    const assetsToUpload = [
      {
        name: `OneMed SupplyChain-${version}-setup.exe`,
        path: path.join(releaseDir, `OneMed SupplyChain-${version}-setup.exe`),
        contentType: "application/octet-stream",
      },
      {
        name: `OneMed SupplyChain-${version}-setup.exe.blockmap`,
        path: path.join(
          releaseDir,
          `OneMed SupplyChain-${version}-setup.exe.blockmap`
        ),
        contentType: "application/octet-stream",
      },
      {
        name: "OneMed SupplyChain-Portable.exe",
        path: path.join(releaseDir, "OneMed SupplyChain-Portable.exe"),
        contentType: "application/octet-stream",
      },
    ];

    console.log("\n📦 Uploading assets...");

    for (const asset of assetsToUpload) {
      if (!fs.existsSync(asset.path)) {
        console.log(`⚠️  File not found: ${asset.name}`);
        continue;
      }

      const fileBuffer = fs.readFileSync(asset.path);
      const fileSize = fileBuffer.length;

      console.log(
        `   Uploading ${asset.name} (${Math.round(
          fileSize / 1024 / 1024
        )} MB)...`
      );

      try {
        await octokit.rest.repos.uploadReleaseAsset({
          owner,
          repo,
          release_id: release.data.id,
          name: asset.name,
          data: fileBuffer,
          headers: {
            "content-type": asset.contentType,
            "content-length": fileSize,
          },
        });
        console.log(`   ✅ ${asset.name} uploaded successfully`);
      } catch (error) {
        console.log(`   ❌ Failed to upload ${asset.name}:`, error.message);
      }
    }

    console.log(`\n🎉 GitHub Release v${version} is ready!`);
    console.log(`   URL: ${release.data.html_url}`);
    console.log(`\n📋 Next steps:`);
    console.log(`1. Auto-update will now work correctly`);
    console.log(`2. Users can download from: ${release.data.html_url}`);
    console.log(`3. Cloudflare Pages serves latest.yml with GitHub URLs`);
  } catch (error) {
    console.error("❌ Error creating GitHub release:", error.message);

    if (error.status === 401) {
      console.error(
        "\n💡 Authentication failed. Please set GITHUB_TOKEN environment variable:"
      );
      console.error("   export GITHUB_TOKEN=your_github_token");
      console.error(
        "   Or create a Personal Access Token at: https://github.com/settings/tokens"
      );
    } else if (error.status === 403) {
      console.error(
        "\n💡 Permission denied. Please check your token permissions:"
      );
      console.error("   - repo (full control)");
      console.error("   - write:packages");
    }

    process.exit(1);
  }
}

// Check for GitHub token
if (!process.env.GITHUB_TOKEN) {
  console.error("❌ GITHUB_TOKEN environment variable is required");
  console.error("\n💡 To create a GitHub token:");
  console.error("1. Go to: https://github.com/settings/tokens");
  console.error("2. Click 'Generate new token (classic)'");
  console.error("3. Select scopes: 'repo' (full control)");
  console.error("4. Copy the token and set it:");
  console.error("   export GITHUB_TOKEN=your_token_here");
  process.exit(1);
}

createRelease();
