/**
 * Script to verify the Windows build by analyzing unpacked contents
 * This helps catch module resolution issues before deployment
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const releaseDir = path.join(rootDir, "release");
const winUnpackedDir = path.join(releaseDir, "win-unpacked");

console.log("Verifying Windows build...");

// Check if the unpacked directory exists
if (!fs.existsSync(winUnpackedDir)) {
  console.error(`ERROR: Unpacked directory not found at ${winUnpackedDir}`);
  console.log("Run npm run build-windows-zip first to create the build.");
  process.exit(1);
}

// Critical paths that must exist for the app to work
const criticalPaths = [
  // Main executable and resources
  {
    path: path.join(winUnpackedDir, "OneMed SupplyChain.exe"),
    type: "file",
    label: "Main executable",
  },
  {
    path: path.join(winUnpackedDir, "resources", "app"),
    type: "dir",
    label: "App resources directory",
  },

  // Core app files
  {
    path: path.join(winUnpackedDir, "resources", "app", "package.json"),
    type: "file",
    label: "App package.json",
  },
  {
    path: path.join(winUnpackedDir, "resources", "app", "dist", "main"),
    type: "dir",
    label: "Main process directory",
  },
  {
    path: path.join(winUnpackedDir, "resources", "app", "dist", "services"),
    type: "dir",
    label: "Services directory",
  },
  {
    path: path.join(winUnpackedDir, "resources", "app", "dist", "renderer"),
    type: "dir",
    label: "Renderer directory",
  },

  // Critical database modules
  {
    path: path.join(
      winUnpackedDir,
      "resources",
      "app",
      "dist",
      "main",
      "main-entry.js"
    ),
    type: "file",
    label: "Main entry point",
  },
  {
    path: path.join(
      winUnpackedDir,
      "resources",
      "app",
      "dist",
      "main",
      "database.js"
    ),
    type: "file",
    label: "Database module",
  },
  {
    path: path.join(
      winUnpackedDir,
      "resources",
      "app",
      "dist",
      "main",
      "databaseAdapter.js"
    ),
    type: "file",
    label: "Database adapter",
  },
  {
    path: path.join(
      winUnpackedDir,
      "resources",
      "app",
      "dist",
      "services",
      "databaseServiceAdapter.js"
    ),
    type: "file",
    label: "Database service adapter",
  },
];

let hasErrors = false;

// Check each critical path
console.log("\nChecking critical files and directories:");
console.log("--------------------------------------");

criticalPaths.forEach((item) => {
  let status = "MISSING";
  let details = "";

  if (fs.existsSync(item.path)) {
    const stats = fs.statSync(item.path);

    if (
      (item.type === "file" && stats.isFile()) ||
      (item.type === "dir" && stats.isDirectory())
    ) {
      status = "OK";

      // For files, also check content
      if (item.type === "file") {
        try {
          const content = fs.readFileSync(item.path, "utf8");
          const sizeKb = (stats.size / 1024).toFixed(2);
          details = `(${sizeKb} KB)`;

          // Check for specific modules in JS files
          if (item.path.endsWith(".js")) {
            if (content.includes("import") || content.includes("require")) {
              const importMatches =
                content.match(
                  /(?:import|require)\s*\(?[\s\S]*?['"]([^'"]+)['"]/g
                ) || [];
              if (importMatches.length > 0) {
                details += ` Imports: ${importMatches.length}`;
              }
            }
          }
        } catch (err) {
          details = `(ERROR READING: ${err.message})`;
          status = "ERROR";
          hasErrors = true;
        }
      } else if (item.type === "dir") {
        try {
          const files = fs.readdirSync(item.path);
          details = `(${files.length} items)`;
        } catch (err) {
          details = `(ERROR READING: ${err.message})`;
          status = "ERROR";
          hasErrors = true;
        }
      }
    } else {
      status = "TYPE MISMATCH";
      details = `(Expected: ${item.type}, Found: ${
        stats.isFile() ? "file" : "directory"
      })`;
      hasErrors = true;
    }
  } else {
    hasErrors = true;
  }

  // Format for display
  const statusStyle = status === "OK" ? "\x1b[32m" : "\x1b[31m"; // Green for OK, Red for errors
  const resetStyle = "\x1b[0m";

  console.log(
    `${statusStyle}[${status}]${resetStyle} ${item.label}: ${path.relative(
      winUnpackedDir,
      item.path
    )} ${details}`
  );
});

// Check for JavaScript module import structure in database files
console.log("\nAnalyzing database module imports:");
console.log("--------------------------------");

const databaseFiles = [
  {
    path: path.join(
      winUnpackedDir,
      "resources",
      "app",
      "dist",
      "main",
      "database.js"
    ),
    name: "database.js",
  },
  {
    path: path.join(
      winUnpackedDir,
      "resources",
      "app",
      "dist",
      "main",
      "databaseAdapter.js"
    ),
    name: "databaseAdapter.js",
  },
  {
    path: path.join(
      winUnpackedDir,
      "resources",
      "app",
      "dist",
      "services",
      "databaseServiceAdapter.js"
    ),
    name: "databaseServiceAdapter.js",
  },
];

databaseFiles.forEach((file) => {
  if (fs.existsSync(file.path)) {
    try {
      const content = fs.readFileSync(file.path, "utf8");

      // Extract import statements
      const importMatches =
        content.match(/(?:import|require)\s*\(?[\s\S]*?['"]([^'"]+)['"]/g) ||
        [];

      if (importMatches.length > 0) {
        console.log(`\x1b[34m${file.name}:\x1b[0m`);
        importMatches.forEach((importStmt) => {
          // Extract the path from the import statement
          const pathMatch = importStmt.match(/['"]([^'"]+)['"]/);
          if (pathMatch && pathMatch[1]) {
            const importPath = pathMatch[1];
            let status = "";

            // Check if it's a relative path that might need verification
            if (importPath.startsWith("./") || importPath.startsWith("../")) {
              const isRequire = importStmt.includes("require");
              status = `\x1b[33m[${isRequire ? "REQUIRE" : "IMPORT"}]\x1b[0m`;
            } else {
              status = "\x1b[32m[EXTERNAL]\x1b[0m";
            }

            console.log(`  ${status} ${importPath}`);
          }
        });
      } else {
        console.log(`\x1b[34m${file.name}:\x1b[0m No imports found.`);
      }
    } catch (err) {
      console.error(
        `\x1b[31mError reading ${file.name}:\x1b[0m ${err.message}`
      );
      hasErrors = true;
    }
  } else {
    console.error(`\x1b[31m${file.name} not found\x1b[0m`);
    hasErrors = true;
  }
});

// Final report
console.log("\nVerification Summary:");
console.log("-------------------");
if (hasErrors) {
  console.error(
    "\x1b[31mVERIFICATION FAILED: Issues were found that might prevent the application from running correctly.\x1b[0m"
  );
  console.log("Please fix the issues or run npm run build-windows-zip again.");
} else {
  console.log(
    "\x1b[32mVERIFICATION PASSED: All critical files and directories are present.\x1b[0m"
  );
  console.log("The Windows build appears to be correctly structured.");
  console.log(
    `\nYou can upload the release/OneMed-SupplyChain-Portable.zip file to Google Drive.`
  );
}

// Exit with appropriate code
process.exit(hasErrors ? 1 : 0);
