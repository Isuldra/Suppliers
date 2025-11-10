#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root directory
const projectRoot = path.resolve(__dirname, '..');

console.log('🧹 Cleaning electron-builder cache and build artifacts...');

// Clean electron-builder cache
try {
  console.log('📦 Cleaning electron-builder cache...');
  execSync('npx electron-builder install-app-deps', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
} catch (error) {
  console.log('⚠️  Could not clean electron-builder cache:', error.message);
}

// Clean build directories
const dirsToClean = [
  path.join(projectRoot, 'dist'),
  path.join(projectRoot, 'release'),
  path.join(projectRoot, 'out'),
];

dirsToClean.forEach((dir) => {
  if (fs.existsSync(dir)) {
    console.log(`🗑️  Removing ${path.relative(projectRoot, dir)}/`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Clean node_modules/.cache if it exists
const cacheDir = path.join(projectRoot, 'node_modules', '.cache');
if (fs.existsSync(cacheDir)) {
  console.log('🗑️  Removing node_modules/.cache/');
  fs.rmSync(cacheDir, { recursive: true, force: true });
}

// Clean electron cache
const electronCacheDir = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.cache',
  'electron'
);
if (fs.existsSync(electronCacheDir)) {
  console.log('🗑️  Removing ~/.cache/electron/');
  fs.rmSync(electronCacheDir, { recursive: true, force: true });
}

// Clean electron-builder cache
const electronBuilderCacheDir = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.cache',
  'electron-builder'
);
if (fs.existsSync(electronBuilderCacheDir)) {
  console.log('🗑️  Removing ~/.cache/electron-builder/');
  fs.rmSync(electronBuilderCacheDir, { recursive: true, force: true });
}

console.log('✅ Build cache cleaned successfully!');
console.log('\n📋 Next steps:');
console.log("1. Run 'npm run dist' to build with clean cache");
console.log("2. Run 'npm run release:prepare' to prepare for deployment");
