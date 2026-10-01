#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const relative of ['dist', 'release', 'out', 'node_modules/.cache']) {
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) {
    throw new Error(`Build directory is outside the repository: ${target}`);
  }
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed ${relative}`);
}
