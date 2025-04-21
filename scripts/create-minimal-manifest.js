/**
 * Creates a minimal package.json manifest in the dist directory with essential fields
 * including the main entry point path, which is critical for electron-builder.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Read the root package.json
const rootPackageJson = require("../package.json");

// Determine entry relative to dist
// If package.json.main is "dist/main/main.cjs", strip "dist/"
let main = rootPackageJson.main || "main/main.cjs";
if (main.startsWith("dist/")) {
  main = main.slice(5);
}

// Create minimal manifest
const minimalManifest = {
  name: rootPackageJson.name,
  version: rootPackageJson.version,
  description: rootPackageJson.description,
  author: rootPackageJson.author,
  main: main,
  dependencies: rootPackageJson.dependencies,
  devDependencies: rootPackageJson.devDependencies,
};

// Ensure dist directory exists
const distDir = path.join(__dirname, "../dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write the manifest to dist/package.json
fs.writeFileSync(
  path.join(distDir, "package.json"),
  JSON.stringify(minimalManifest, null, 2)
);

// Copy package-lock.json if it exists
const packageLockPath = path.join(__dirname, "../package-lock.json");
if (fs.existsSync(packageLockPath)) {
  fs.copyFileSync(packageLockPath, path.join(distDir, "package-lock.json"));
}

console.log("Created minimal manifest in dist/package.json with main:", main);
