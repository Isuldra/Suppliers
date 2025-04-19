import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Path to node_modules directory
const nodeModulesPath = path.join(process.cwd(), "node_modules");

console.log("Cleaning node_modules...");

// Remove node_modules
if (fs.existsSync(nodeModulesPath)) {
  try {
    // On Windows, sometimes removing large node_modules can be problematic
    // Use rimraf which handles this better than fs.rmSync
    execSync("npx rimraf node_modules", { stdio: "inherit" });
  } catch (error) {
    console.error("Error removing node_modules:", error);
    process.exit(1);
  }
}

console.log("Installing dependencies...");
try {
  execSync("npm install --no-fund --no-package-lock --legacy-peer-deps", {
    stdio: "inherit",
  });
} catch (error) {
  console.error("Error installing dependencies:", error);
  process.exit(1);
}

console.log("Building application...");
try {
  execSync("electron-vite build", { stdio: "inherit" });
} catch (error) {
  console.error("Error building application:", error);
  process.exit(1);
}

console.log("Running electron-builder...");
try {
  // For Windows builds, add the --win flag
  const isWindows = process.platform === "win32";
  const buildCommand = isWindows
    ? "electron-builder --win"
    : "electron-builder";
  execSync(buildCommand, { stdio: "inherit" });
} catch (error) {
  console.error("Error running electron-builder:", error);
  process.exit(1);
}

console.log("Build completed successfully!");
