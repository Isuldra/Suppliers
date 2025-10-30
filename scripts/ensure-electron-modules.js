#!/usr/bin/env node

/**
 * Safety script to ensure native modules are properly built for Electron
 * This prevents Node.js version mismatch issues with better-sqlite3
 * Also ensures dist/node_modules has the correct platform-specific native module
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔧 Ensuring native modules are properly built for Electron...");

try {
  // Check if better-sqlite3 exists
  const betterSqlite3Path = path.join(
    __dirname,
    "..",
    "node_modules",
    "better-sqlite3"
  );
  if (!fs.existsSync(betterSqlite3Path)) {
    console.log("📦 Installing better-sqlite3...");
    execSync("bun install better-sqlite3", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
  }

  // Rebuild for Electron
  console.log("🔨 Rebuilding native modules for Electron...");
  execSync("bunx electron-rebuild -f -w better-sqlite3", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });

  // In dev mode, ensure dist/node_modules has the correct platform-specific native module
  // This fixes issues where Windows builds leave Windows DLLs in dist/node_modules
  const distBetterSqlite3Path = path.join(
    __dirname,
    "..",
    "dist",
    "node_modules",
    "better-sqlite3"
  );
  const distNativeModulePath = path.join(
    distBetterSqlite3Path,
    "build",
    "Release",
    "better_sqlite3.node"
  );

  if (fs.existsSync(distBetterSqlite3Path)) {
    console.log("🔧 Ensuring dist/node_modules has correct native module...");
    // Remove dist version and copy correct one from root node_modules
    if (fs.existsSync(distNativeModulePath)) {
      fs.rmSync(distNativeModulePath, { force: true });
    }
    // Copy entire better-sqlite3 module to dist (in dev mode only)
    if (fs.existsSync(path.join(distBetterSqlite3Path, "build", "Release"))) {
      fs.rmSync(path.join(distBetterSqlite3Path, "build", "Release"), {
        recursive: true,
        force: true,
      });
    }
    const sourceReleasePath = path.join(betterSqlite3Path, "build", "Release");
    const destReleasePath = path.join(
      distBetterSqlite3Path,
      "build",
      "Release"
    );
    if (fs.existsSync(sourceReleasePath)) {
      fs.mkdirSync(destReleasePath, { recursive: true });
      fs.cpSync(sourceReleasePath, destReleasePath, { recursive: true });
      console.log("✅ Copied correct native module to dist/node_modules");
    }
  }

  console.log("✅ Native modules are properly configured for Electron");
} catch (error) {
  console.error("❌ Error ensuring native modules:", error.message);
  process.exit(1);
}
