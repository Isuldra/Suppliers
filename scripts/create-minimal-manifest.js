import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(
  path.join(dist, 'package.json'),
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      main: 'main/main.cjs',
      private: true,
      dependencies: pkg.dependencies,
    },
    null,
    2
  ) + '\n'
);
fs.writeFileSync(path.join(dist, '.npmrc'), 'fund=false\nlegacy-peer-deps=true\n');
console.log('Created distribution manifest.');
