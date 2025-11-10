#!/usr/bin/env node

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root directory
const projectRoot = path.resolve(__dirname, "..");
const releaseDir = path.join(projectRoot, "release");
const updatesDir = path.join(projectRoot, "docs", "updates");

// Read package.json to get current version
const packageJsonPath = path.join(projectRoot, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;

console.log(`🚀 Generating latest.json for portable version ${version}...`);

// Ensure updates directory exists
if (!fs.existsSync(updatesDir)) {
  fs.mkdirSync(updatesDir, { recursive: true });
}

// Function to calculate SHA512 hash
function calculateSHA512(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha512");
  hash.update(fileBuffer);
  return hash.digest("base64");
}

// Function to get file size
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

// Find portable executable
const portableExe = "Pulse-Portable.exe";
const portableExePath = path.join(releaseDir, portableExe);

if (fs.existsSync(portableExePath)) {
  console.log(`✅ Found portable executable: ${portableExe}`);

  // Calculate hash and size
  const fileHash = calculateSHA512(portableExePath);
  const fileSize = getFileSize(portableExePath);
  const releaseDate = new Date().toISOString();

  // Generate latest.json
  const latestJson = {
    version: version,
    files: [
      {
        url: portableExe,
        sha512: fileHash,
        size: fileSize,
      },
    ],
    releaseDate: releaseDate,
  };

  const latestJsonPath = path.join(updatesDir, "latest.json");
  fs.writeFileSync(latestJsonPath, JSON.stringify(latestJson, null, 2));
  console.log(`✅ Generated: latest.json`);

  console.log(`📋 Portable version info:`);
  console.log(`   - Version: ${version}`);
  console.log(`   - File: ${portableExe}`);
  console.log(`   - Size: ${Math.round(fileSize / 1024)} KB`);
  console.log(`   - SHA512: ${fileHash.substring(0, 16)}...`);
} else {
  console.log(`⚠️  Portable executable not found: ${portableExe}`);
  console.log(`   Make sure to run 'npm run dist:portable' first`);
}

console.log("\n🎉 latest.json generation complete!");
