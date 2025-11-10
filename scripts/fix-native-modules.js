#!/usr/bin/env node

/**
 * Quick fix script to ensure dist/node_modules has the correct native module
 * This should be run after electron-vite builds to fix any platform mismatches
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const betterSqlite3Path = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');

const distBetterSqlite3Path = path.join(__dirname, '..', 'dist', 'node_modules', 'better-sqlite3');

const sourceReleasePath = path.join(betterSqlite3Path, 'build', 'Release');
const destReleasePath = path.join(distBetterSqlite3Path, 'build', 'Release');

if (fs.existsSync(distBetterSqlite3Path) && fs.existsSync(sourceReleasePath)) {
  if (fs.existsSync(destReleasePath)) {
    fs.rmSync(destReleasePath, { recursive: true, force: true });
  }
  fs.mkdirSync(destReleasePath, { recursive: true });
  fs.cpSync(sourceReleasePath, destReleasePath, { recursive: true });
  console.log('✅ Fixed native module in dist/node_modules');
}
