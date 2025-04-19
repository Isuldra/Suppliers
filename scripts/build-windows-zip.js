/**
 * Build script for creating a Windows portable application package that is zipped
 * for easy sharing via Google Drive or other platforms.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const releaseDir = path.join(rootDir, "release");
const portableExeName = "OneMed SupplyChain-Portable.exe";
const portableExePath = path.join(releaseDir, portableExeName);
const zipPath = path.join(releaseDir, "OneMed-SupplyChain-Portable.zip");

// Output directories for unpacked files - these are what we'll zip
const winUnpackedDir = path.join(releaseDir, "win-unpacked");
const win64UnpackedDir = path.join(releaseDir, "win-x64-unpacked");
const winArm64UnpackedDir = path.join(releaseDir, "win-arm64-unpacked");

console.log("Building Windows portable application package...");

try {
  // Clean release directory
  console.log("Cleaning previous builds...");
  if (fs.existsSync(releaseDir)) {
    // Don't delete the whole directory, just clean specific files
    if (fs.existsSync(portableExePath)) {
      fs.unlinkSync(portableExePath);
      console.log(`Deleted previous ${portableExeName}`);
    }
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      console.log(`Deleted previous ${path.basename(zipPath)}`);
    }
  } else {
    fs.mkdirSync(releaseDir, { recursive: true });
  }

  // Build the application
  console.log("Building application...");
  execSync("npm run build", {
    stdio: "inherit",
    cwd: rootDir,
  });

  // Execute build for Windows portable - explicitly specify x64 architecture
  console.log("Creating Windows portable package for x64 architecture...");
  execSync("electron-builder --win portable --x64", {
    stdio: "inherit",
    cwd: rootDir,
  });

  // Verify critical files are present in the unpacked directory
  console.log("Verifying critical files...");

  // Check what directories actually exist
  console.log("Available build directories:");
  if (fs.existsSync(releaseDir)) {
    fs.readdirSync(releaseDir).forEach((item) => {
      const itemPath = path.join(releaseDir, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        console.log(`- ${item}/`);
      }
    });
  }

  // First check if win-unpacked directory exists
  const unpackedDir = fs.existsSync(winUnpackedDir)
    ? winUnpackedDir
    : fs.existsSync(win64UnpackedDir)
    ? win64UnpackedDir
    : null;

  if (unpackedDir) {
    console.log(`Using unpacked directory: ${path.basename(unpackedDir)}`);

    // List of critical files that must be present
    const criticalFiles = [
      path.join(unpackedDir, "resources", "app", "dist", "main", "database.js"),
      path.join(
        unpackedDir,
        "resources",
        "app",
        "dist",
        "main",
        "databaseAdapter.js"
      ),
      path.join(
        unpackedDir,
        "resources",
        "app",
        "dist",
        "services",
        "databaseServiceAdapter.js"
      ),
      path.join(
        unpackedDir,
        "resources",
        "app",
        "dist",
        "main",
        "main-entry.js"
      ),
      path.join(unpackedDir, "resources", "app", "package.json"),
    ];

    // List of critical directories that must be present
    const criticalDirs = [
      path.join(unpackedDir, "resources", "app", "dist", "renderer"),
    ];

    // Check each critical file
    let allFilesPresent = true;
    criticalFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        console.log(`✓ Found ${path.relative(unpackedDir, file)}`);
      } else {
        console.error(`✗ MISSING ${path.relative(unpackedDir, file)}`);
        allFilesPresent = false;
      }
    });

    // Check each critical directory
    criticalDirs.forEach((dir) => {
      if (fs.existsSync(dir)) {
        console.log(`✓ Found ${path.relative(unpackedDir, dir)}`);
      } else {
        console.error(`✗ MISSING ${path.relative(unpackedDir, dir)}`);
        allFilesPresent = false;
      }
    });

    if (!allFilesPresent) {
      // If files are missing, manually copy them as a fallback solution
      console.log("Attempting to fix missing files...");

      // Ensure directories exist
      const resourcesAppDist = path.join(
        unpackedDir,
        "resources",
        "app",
        "dist"
      );
      const resourcesAppDistMain = path.join(resourcesAppDist, "main");
      const resourcesAppDistServices = path.join(resourcesAppDist, "services");
      const resourcesAppDistRenderer = path.join(resourcesAppDist, "renderer");

      if (!fs.existsSync(resourcesAppDistMain)) {
        fs.mkdirSync(resourcesAppDistMain, { recursive: true });
      }
      if (!fs.existsSync(resourcesAppDistServices)) {
        fs.mkdirSync(resourcesAppDistServices, { recursive: true });
      }
      if (!fs.existsSync(resourcesAppDistRenderer)) {
        fs.mkdirSync(resourcesAppDistRenderer, { recursive: true });
      }

      // Source files to copy - regular files
      const sourceFiles = [
        {
          src: path.join(rootDir, "dist", "main", "database.js"),
          dest: path.join(resourcesAppDistMain, "database.js"),
        },
        {
          src: path.join(rootDir, "dist", "main", "databaseAdapter.js"),
          dest: path.join(resourcesAppDistMain, "databaseAdapter.js"),
        },
        {
          src: path.join(
            rootDir,
            "dist",
            "services",
            "databaseServiceAdapter.js"
          ),
          dest: path.join(
            resourcesAppDistServices,
            "databaseServiceAdapter.js"
          ),
        },
        {
          src: path.join(rootDir, "dist", "main", "main-entry.js"),
          dest: path.join(resourcesAppDistMain, "main-entry.js"),
        },
        {
          src: path.join(rootDir, "package.json"),
          dest: path.join(unpackedDir, "resources", "app", "package.json"),
        },
      ];

      // Copy each file
      sourceFiles.forEach(({ src, dest }) => {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(
            `Manually copied ${path.basename(src)} to ${path.relative(
              unpackedDir,
              dest
            )}`
          );
        } else {
          console.error(`Cannot find source file to copy: ${src}`);
        }
      });

      // Copy the renderer directory
      if (
        !fs.existsSync(resourcesAppDistRenderer) ||
        fs.readdirSync(resourcesAppDistRenderer).length === 0
      ) {
        const sourceRendererDir = path.join(rootDir, "dist", "renderer");
        if (fs.existsSync(sourceRendererDir)) {
          // Copy the entire renderer directory recursively
          console.log(
            `Copying renderer directory to ${path.relative(
              unpackedDir,
              resourcesAppDistRenderer
            )}`
          );

          // Create the destination directory if it doesn't exist
          if (!fs.existsSync(resourcesAppDistRenderer)) {
            fs.mkdirSync(resourcesAppDistRenderer, { recursive: true });
          }

          // Copy the directory contents recursively
          const copyDirRecursive = (src, dest) => {
            const entries = fs.readdirSync(src, { withFileTypes: true });

            entries.forEach((entry) => {
              const srcPath = path.join(src, entry.name);
              const destPath = path.join(dest, entry.name);

              if (entry.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                  fs.mkdirSync(destPath, { recursive: true });
                }
                copyDirRecursive(srcPath, destPath);
              } else {
                fs.copyFileSync(srcPath, destPath);
              }
            });
          };

          copyDirRecursive(sourceRendererDir, resourcesAppDistRenderer);
          console.log(`Renderer directory copied successfully`);
        } else {
          console.error(
            `Cannot find source renderer directory: ${sourceRendererDir}`
          );
        }
      }
    }
  } else {
    console.warn(
      `Cannot verify critical files: unpacked directory not found at ${winUnpackedDir}`
    );
  }

  // Create ZIP archive
  console.log("Creating ZIP archive...");
  const zip = new AdmZip();

  // Include BOTH the portable EXE AND the unpacked directory
  // This ensures all dependencies are included

  // First add the portable EXE if it exists
  if (fs.existsSync(portableExePath)) {
    zip.addLocalFile(portableExePath, "");
    console.log(`Added ${portableExeName} to ZIP root`);
  } else {
    console.log(`Warning: ${portableExeName} not found`);
  }

  // Always include the unpacked directory for complete functionality
  let unpackedDirToUse = null;
  if (fs.existsSync(winUnpackedDir)) {
    unpackedDirToUse = winUnpackedDir;
  } else if (fs.existsSync(win64UnpackedDir)) {
    unpackedDirToUse = win64UnpackedDir;
  } else if (fs.existsSync(winArm64UnpackedDir)) {
    unpackedDirToUse = winArm64UnpackedDir;
  }

  if (unpackedDirToUse) {
    console.log(
      `Adding unpacked directory ${path.basename(unpackedDirToUse)} to ZIP...`
    );
    zip.addLocalFolder(unpackedDirToUse, "win-unpacked");
    console.log("All application files added to ZIP in win-unpacked/ folder");
  } else {
    throw new Error(
      "No unpacked directory found. Build process may have failed."
    );
  }

  // Save the ZIP file
  zip.writeZip(zipPath);
  console.log(`ZIP archive created at: ${zipPath}`);

  console.log("\n===============================");
  console.log("Build completed successfully!");
  console.log("===============================");
  console.log(`\nZIP file location: ${zipPath}`);
  console.log("\nIMPORTANT INSTRUCTIONS FOR WINDOWS USERS:");
  console.log(
    "1. Extract ALL files and folders from the ZIP, not just the EXE."
  );
  console.log("2. The portable EXE at the root can be used for quick launch.");
  console.log(
    "3. Keep the 'win-unpacked' folder in the same directory as the EXE file."
  );
  console.log("4. The application requires all files to function correctly.\n");
} catch (error) {
  console.error("Error building Windows package:", error);
  process.exit(1);
}
