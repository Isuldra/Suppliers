#!/usr/bin/env node

// This script builds a special version for restricted work PCs
// by ensuring native modules are included correctly and
// no admin rights are required to run the application

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
    console.log("Starting work PC build preparation...");

    // 1. Clean environment
    await runCommand("rm -rf node_modules dist release");

    // 2. Install dependencies
    await runCommand("npm install");

    // 3. Modify package.json to ensure correct build settings
    const packageJsonPath = path.join(rootDir, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    // Ensure we don't rebuild native modules
    if (packageJson.build) {
      packageJson.build.npmRebuild = false;

      // Set portable configuration for user-level access
      if (packageJson.build.portable) {
        packageJson.build.portable.requestExecutionLevel = "user";
      }

      // Set nsis configuration for non-admin installation
      if (packageJson.build.nsis) {
        packageJson.build.nsis.perMachine = false;
        packageJson.build.nsis.allowElevation = false;
        packageJson.build.nsis.oneClick = false;
      }
    }

    // Write the updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("Updated package.json with correct build settings");

    // 4. Build for Windows portable (no installer, just executable)
    await runCommand("npm run build");
    await runCommand("electron-builder --win portable");

    console.log("\n===============================");
    console.log("BUILD FOR WORK PC COMPLETED!");
    console.log("===============================");
    console.log("Your portable application is ready in the release/ folder.");
    console.log(
      "Copy the .exe file to your work PC and run it directly - no installation required."
    );
    console.log(
      "---------------------------------------------------------------"
    );
  } catch (error) {
    console.error("Failed to build for work PC:", error);
    process.exit(1);
  }
}

main();
