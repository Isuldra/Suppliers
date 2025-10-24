#!/usr/bin/env node

/**
 * Safety script to ensure native modules are properly built for Electron
 * This prevents Node.js version mismatch issues with better-sqlite3
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
    execSync("npm install better-sqlite3", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
  }

  // Rebuild for Electron
  console.log("🔨 Rebuilding native modules for Electron...");
  execSync("npx electron-rebuild -f -w better-sqlite3", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });

  console.log("✅ Native modules are properly configured for Electron");
} catch (error) {
  console.error("❌ Error ensuring native modules:", error.message);
  process.exit(1);
}
