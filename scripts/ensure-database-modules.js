/**
 * Ensures that database module files are properly copied to the dist directory
 * This script addresses the ERR_MODULE_NOT_FOUND issue on Windows
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Source and destination paths
const paths = [
  {
    src: path.join(rootDir, 'src', 'main', 'database.js'),
    dest: path.join(rootDir, 'dist', 'main', 'database.js'),
  },
  {
    src: path.join(rootDir, 'src', 'main', 'databaseAdapter.js'),
    dest: path.join(rootDir, 'dist', 'main', 'databaseAdapter.js'),
  },
  {
    src: path.join(rootDir, 'src', 'services', 'databaseServiceAdapter.js'),
    dest: path.join(rootDir, 'dist', 'services', 'databaseServiceAdapter.js'),
  },
];

console.log('Ensuring database modules are properly copied to dist directory...');

// Make sure all required directories exist
const directories = [path.join(rootDir, 'dist', 'main'), path.join(rootDir, 'dist', 'services')];

directories.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Copy each file
paths.forEach(({ src, dest }) => {
  try {
    if (fs.existsSync(src)) {
      console.log(`Copying ${src} to ${dest}`);
      fs.copyFileSync(src, dest);
    } else {
      console.error(`Source file not found: ${src}`);
    }
  } catch (error) {
    console.error(`Error copying ${src} to ${dest}:`, error);
  }
});

console.log('Database modules copy completed.');
