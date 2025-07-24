#!/usr/bin/env node

// This script cleans the build environment by removing
// node_modules, dist, and release directories

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🧹 Cleaning build artifacts...");

// Remove build directories
const dirsToClean = ["dist", "release", "node_modules"];
dirsToClean.forEach((dir) => {
  if (fs.existsSync(dir)) {
    console.log(`Removing ${dir}...`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Clean npm cache
try {
  console.log("Cleaning npm cache...");
  execSync("npm cache clean --force", { stdio: "inherit" });
} catch (error) {
  console.log("npm cache clean failed, continuing...");
}

// Reinstall dependencies
console.log("📦 Reinstalling dependencies...");
try {
  execSync("npm ci", { stdio: "inherit" });
} catch (error) {
  console.log("npm ci failed, trying npm install...");
  execSync("npm install", { stdio: "inherit" });
}

// Rebuild sharp specifically for Electron
console.log("🔧 Rebuilding sharp for Electron...");
try {
  execSync(
    "npm rebuild sharp --runtime=electron --target=36.5.0 --dist-url=https://electronjs.org/headers",
    { stdio: "inherit" }
  );
} catch (error) {
  console.log("Sharp rebuild failed, trying alternative approach...");
  try {
    execSync("npm rebuild sharp --ignore-scripts", { stdio: "inherit" });
  } catch (sharpError) {
    console.log("Sharp rebuild with ignore-scripts also failed, continuing...");
  }
}

console.log("✅ Clean build completed!");
