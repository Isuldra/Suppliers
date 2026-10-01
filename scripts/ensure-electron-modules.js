#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bunEnvironment } from './bun-environment.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulePath = path.join(root, 'node_modules', 'better-sqlite3');

try {
  if (!fs.existsSync(modulePath)) {
    throw new Error('better-sqlite3 is missing. Run bun install --frozen-lockfile first.');
  }
  execSync('bunx electron-rebuild -f -w better-sqlite3', {
    env: bunEnvironment(),
    stdio: 'inherit',
    cwd: root,
  });

  const source = path.join(modulePath, 'build', 'Release');
  if (!fs.existsSync(path.join(source, 'better_sqlite3.node'))) {
    throw new Error('Electron rebuild did not produce better_sqlite3.node.');
  }
  // A previous package build may leave a separate native module in dist.
  const distModule = path.join(root, 'dist', 'node_modules', 'better-sqlite3');
  if (fs.existsSync(distModule)) {
    const destination = path.resolve(distModule, 'build', 'Release');
    if (!destination.startsWith(root + path.sep)) {
      throw new Error('Native module destination is outside the repository.');
    }
    fs.rmSync(destination, { recursive: true, force: true });
    fs.cpSync(source, destination, { recursive: true });
  }
  console.log('SQLite native module rebuilt for Electron.');
} catch (error) {
  console.error('SQLite rebuild failed:', error.message);
  process.exitCode = 1;
}
