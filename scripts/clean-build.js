#!/usr/bin/env node

// This script cleans the build environment by removing
// node_modules, dist, and release directories

import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

console.log("Cleaning build environment...");
exec(
  "rm -rf node_modules dist release",
  { cwd: rootDir },
  (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      console.error(stderr);
      process.exit(1);
    }
    console.log(stdout || "Cleaned build environment successfully");
    console.log("Now run: npm install");
  }
);
