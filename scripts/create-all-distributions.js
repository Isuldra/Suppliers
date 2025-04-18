// Script to create all distribution formats of Supplier Reminder Pro
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Convert file URL to path (ES Module compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const releaseDir = path.join(rootDir, "release");
const distributionsDir = path.join(rootDir, "distributions");

// Ensure directories exist
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

if (!fs.existsSync(distributionsDir)) {
  fs.mkdirSync(distributionsDir, { recursive: true });
  console.log(`Created distributions directory: ${distributionsDir}`);
}

// Build all distribution formats
async function createAllDistributions() {
  try {
    console.log(
      "Creating all distribution formats for Supplier Reminder Pro..."
    );

    // Create a timestamped directory for this build
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const currentBuildDir = path.join(distributionsDir, `build-${timestamp}`);

    if (!fs.existsSync(currentBuildDir)) {
      fs.mkdirSync(currentBuildDir, { recursive: true });
    }

    // Step 1: Build the application
    console.log("\n🔨 Step 1/5: Building Electron application...");
    execSync("npm run build", { stdio: "inherit" });

    // Step 2: Create standard NSIS installer
    console.log("\n🔨 Step 2/5: Creating standard installer (NSIS)...");
    execSync("electron-builder --win nsis", { stdio: "inherit" });

    // Find the NSIS installer file
    const nsisFiles = fs
      .readdirSync(releaseDir)
      .filter(
        (file) =>
          file.endsWith("setup.exe") && file.includes("Supplier-Reminder-Pro")
      );

    if (nsisFiles.length > 0) {
      const nsisFile = nsisFiles[0];
      const targetFile = path.join(
        currentBuildDir,
        "Supplier-Reminder-Pro-Setup.exe"
      );
      fs.copyFileSync(path.join(releaseDir, nsisFile), targetFile);
      console.log(`✅ Standard installer saved to: ${targetFile}`);
    } else {
      console.log("⚠️ Standard installer not found in release directory");
    }

    // Step 3: Create MSI installer
    console.log("\n🔨 Step 3/5: Creating MSI installer...");
    execSync("electron-builder --win msi", { stdio: "inherit" });

    // Find the MSI installer file
    const msiFiles = fs
      .readdirSync(releaseDir)
      .filter(
        (file) =>
          file.endsWith(".msi") && file.includes("Supplier-Reminder-Pro")
      );

    if (msiFiles.length > 0) {
      const msiFile = msiFiles[0];
      const targetFile = path.join(
        currentBuildDir,
        "Supplier-Reminder-Pro-Setup.msi"
      );
      fs.copyFileSync(path.join(releaseDir, msiFile), targetFile);
      console.log(`✅ MSI installer saved to: ${targetFile}`);
    } else {
      console.log("⚠️ MSI installer not found in release directory");
    }

    // Step 4: Create portable version
    console.log("\n🔨 Step 4/5: Creating portable version...");
    execSync("npm run portable", { stdio: "inherit" });

    // Find the portable zip file
    const portableDir = path.join(rootDir, "portable");
    const portableFiles = fs
      .readdirSync(portableDir)
      .filter((file) => file.endsWith(".zip") && file.includes("Portable"));

    if (portableFiles.length > 0) {
      const portableFile = portableFiles[0];
      const targetFile = path.join(
        currentBuildDir,
        "Supplier-Reminder-Pro-Portable.zip"
      );
      fs.copyFileSync(path.join(portableDir, portableFile), targetFile);
      console.log(`✅ Portable version saved to: ${targetFile}`);
    } else {
      console.log("⚠️ Portable version not found in portable directory");
    }

    // Step 5: Create README file with installation instructions
    console.log("\n🔨 Step 5/5: Creating installation guide...");
    const readmeContent = `
=================================================
SUPPLIER REMINDER PRO - INSTALLATION OPTIONS
=================================================

This package contains multiple installation options for Supplier Reminder Pro.

PACKAGE CONTENTS:
----------------
1. Supplier-Reminder-Pro-Setup.exe - Standard Windows installer
2. Supplier-Reminder-Pro-Setup.msi - MSI package for enterprise deployment
3. Supplier-Reminder-Pro-Portable.zip - Portable version (no installation required)
4. INSTALLATION.md - Detailed installation instructions (this file)

INSTALLATION OPTIONS:
-------------------

OPTION 1: STANDARD INSTALLER (Recommended for most users)
--------------------------------------------------------
- Double-click the "Supplier-Reminder-Pro-Setup.exe" file
- When prompted, select "Install for all users" (requires admin rights) or "Install for current user only"
- Follow the installation wizard prompts
- The application will be available in your Start Menu when installation completes

SILENT INSTALLATION:
- Standard installer: Setup.exe /S /ALLUSERS      (For all users, requires admin)
- Standard installer: Setup.exe /S /CURRENTUSER   (For current user only)
- Custom directory: Setup.exe /S /D=C:\\CustomPath

OPTION 2: MSI PACKAGE (For enterprise deployment)
------------------------------------------------
- Double-click the "Supplier-Reminder-Pro-Setup.msi" file
- Follow the installation wizard prompts
- The application will be installed for all users

SILENT INSTALLATION:
- Basic silent install: msiexec /i Setup.msi /quiet
- Silent install for current user: msiexec /i Setup.msi ALLUSERS=2 /quiet
- Custom directory: msiexec /i Setup.msi INSTALLDIR="C:\\CustomPath" /quiet
- Silent uninstall: msiexec /x Setup.msi /quiet

OPTION 3: PORTABLE VERSION (No installation required)
---------------------------------------------------
1. Extract the "Supplier-Reminder-Pro-Portable.zip" file to any location
2. Open the extracted folder
3. Run "Supplier Reminder Pro.exe" or the included batch file
4. All data will be stored in the "data" folder next to the executable

NOTES:
- The portable version doesn't require admin rights
- Perfect for USB drives or restricted environments
- To move the application, move the entire folder including the "data" directory

SYSTEM REQUIREMENTS:
------------------
- Windows 10 or later
- 4GB RAM (minimum)
- 100MB disk space
- 1024x768 screen resolution (minimum)

TROUBLESHOOTING:
--------------
- Standard installer: If you encounter permission issues, try the "Install for current user only" option
- MSI package: For Group Policy deployment, use the ALLUSERS=1 property
- Portable version: Ensure you have write access to the folder where it's running

For additional support, contact your IT department or application administrator.

=================================================
            OneMed © 2024
=================================================
`;

    fs.writeFileSync(
      path.join(currentBuildDir, "INSTALLATION.md"),
      readmeContent
    );
    console.log(
      `✅ Installation guide created at: ${path.join(
        currentBuildDir,
        "INSTALLATION.md"
      )}`
    );

    // Create a ZIP file with all distributions
    console.log("\n📦 Creating complete package with all distributions...");
    const zipFileName = `Supplier-Reminder-Pro-All-Distributions-${timestamp}.zip`;
    const zipFilePath = path.join(distributionsDir, zipFileName);

    try {
      execSync(
        `cd "${distributionsDir}" && 7z a -tzip "${zipFilePath}" "${path.basename(
          currentBuildDir
        )}/*"`,
        {
          stdio: "inherit",
        }
      );
      console.log(
        `\n✅ All distributions packaged successfully in:\n   ${zipFilePath}`
      );
    } catch (e) {
      console.log(
        "\n⚠️ 7z not available, please manually zip the directory contents:\n   ",
        currentBuildDir
      );
    }

    console.log("\n✨ All distribution formats created successfully!");
    console.log(`📂 Individual files can be found in:\n   ${currentBuildDir}`);
    console.log(`📦 Complete package:\n   ${zipFilePath}`);
  } catch (error) {
    console.error("❌ Error creating distributions:", error.message);
    process.exit(1);
  }
}

// Run the script
createAllDistributions();
