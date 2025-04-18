// Script to create a portable version of the Supplier Reminder Pro application
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Convert file URL to path (ES Module compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, "..");
const portableDir = path.join(rootDir, "portable");
const releaseDir = path.join(rootDir, "release");
const resourcesDir = path.join(rootDir, "resources");

// Create portable directory if it doesn't exist
if (!fs.existsSync(portableDir)) {
  fs.mkdirSync(portableDir, { recursive: true });
  console.log(`Created portable directory: ${portableDir}`);
}

// Function to create a portable version
async function createPortableVersion() {
  try {
    console.log("Creating portable version of Supplier Reminder Pro...");

    // First, create a temporary copy of the src/services/databaseService.ts file
    const databaseServicePath = path.join(
      rootDir,
      "src",
      "services",
      "databaseService.ts"
    );
    const databaseServiceBackupPath = path.join(
      rootDir,
      "src",
      "services",
      "databaseService.ts.bak"
    );

    console.log("Creating backup of databaseService.ts...");
    fs.copyFileSync(databaseServicePath, databaseServiceBackupPath);

    // Modify the databaseService.ts file to use a local path for the database
    console.log("Modifying databaseService.ts for portable use...");
    let databaseServiceContent = fs.readFileSync(databaseServicePath, "utf8");

    // Replace the database path logic to use a local path instead of app.getPath('userData')
    databaseServiceContent = databaseServiceContent.replace(
      /const userDataPath = app\.getPath\("userData"\);/g,
      'const userDataPath = path.join(path.dirname(process.execPath), "data");'
    );

    // Also modify backup paths
    databaseServiceContent = databaseServiceContent.replace(
      /const userDataPath = app\.getPath\("userData"\);/g,
      'const userDataPath = path.join(path.dirname(process.execPath), "data");'
    );

    // Write the modified file
    fs.writeFileSync(databaseServicePath, databaseServiceContent);

    // Build the application
    console.log("Building Electron application...");
    execSync("npm run build", { stdio: "inherit" });

    // Package the application without an installer
    console.log("Packaging portable application...");
    execSync("electron-builder --dir --win portable", { stdio: "inherit" });

    // The output will be in release/win-unpacked
    const unpackedDir = path.join(releaseDir, "win-unpacked");

    if (!fs.existsSync(unpackedDir)) {
      throw new Error(`Unpacked directory not found: ${unpackedDir}`);
    }

    // Create data directory in the portable app
    const portableDataDir = path.join(unpackedDir, "data");
    fs.mkdirSync(portableDataDir, { recursive: true });

    // Create a README for the portable version
    console.log("Creating README file for portable version...");
    const readmeContent = `
=================================
SUPPLIER REMINDER PRO - PORTABLE
=================================

This is the portable version of Supplier Reminder Pro.
No installation is required - just extract and run.

INSTRUCTIONS:
------------
1. Extract this entire folder to any location on your computer
2. Run "Supplier Reminder Pro.exe" to start the application
3. All data will be stored in the "data" folder next to the executable

IMPORTANT NOTES:
--------------
- Do not move the executable out of this folder
- The "data" folder contains your database - don't delete it
- To move the application, move the entire folder

=================================
      OneMed © 2024
=================================
`;

    fs.writeFileSync(path.join(unpackedDir, "README.txt"), readmeContent);

    // Create a launch script for the portable version
    console.log("Creating launch script...");
    const launchScriptContent = `@echo off
echo Starting Supplier Reminder Pro (Portable)...
start "" "%~dp0Supplier Reminder Pro.exe"
`;

    fs.writeFileSync(
      path.join(unpackedDir, "Run-Supplier-Reminder-Pro.bat"),
      launchScriptContent
    );

    // Copy the portable version to the portable directory
    console.log("Copying portable version to output directory...");

    // Create a zip file of the portable version
    console.log("Creating ZIP archive...");
    const zipFilePath = path.join(
      portableDir,
      "Supplier-Reminder-Pro-Portable.zip"
    );

    // Use 7z if available (usually pre-installed on Windows)
    try {
      execSync(
        `cd "${releaseDir}" && 7z a -tzip "${zipFilePath}" "win-unpacked"/*`,
        { stdio: "inherit" }
      );
    } catch (e) {
      console.log(
        "7z not available, using native compression (may be slower)..."
      );
      // Copy files manually if 7z is not available
      fs.cpSync(unpackedDir, portableDir, { recursive: true });
      console.log(`Files copied to: ${portableDir}`);
      console.log(
        "Please manually zip the contents of the portable directory."
      );
    }

    // Restore the original databaseService.ts file
    console.log("Restoring original databaseService.ts...");
    fs.copyFileSync(databaseServiceBackupPath, databaseServicePath);
    fs.unlinkSync(databaseServiceBackupPath);

    console.log("Portable version created successfully!");
    console.log(`Output: ${zipFilePath}`);
    console.log("You can distribute this ZIP file to users for portable use.");
  } catch (error) {
    console.error("Error creating portable version:", error.message);

    // Restore the original databaseService.ts file if it exists
    const databaseServicePath = path.join(
      rootDir,
      "src",
      "services",
      "databaseService.ts"
    );
    const databaseServiceBackupPath = path.join(
      rootDir,
      "src",
      "services",
      "databaseService.ts.bak"
    );

    if (fs.existsSync(databaseServiceBackupPath)) {
      console.log("Restoring original databaseService.ts from backup...");
      fs.copyFileSync(databaseServiceBackupPath, databaseServicePath);
      fs.unlinkSync(databaseServiceBackupPath);
    }

    process.exit(1);
  }
}

// Run the script
createPortableVersion();
