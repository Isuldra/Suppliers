import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [version, title] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version || '') || !title?.trim() || /[\r\n]/.test(title)) {
  throw new Error(
    'Usage: node scripts/create-changelog-entry.js X.Y.Z "Concrete change description"'
  );
}
const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/CHANGELOG.md');
const text = fs.readFileSync(filename, 'utf8');
if (new RegExp('^## Version ' + version.replaceAll('.', '\\.') + ':', 'm').test(text)) {
  throw new Error('Changelog already contains version ' + version);
}
const nextVersion = text.search(/^## Version /m);
const insertion = nextVersion === -1 ? text.length : nextVersion;
fs.writeFileSync(
  filename,
  text.slice(0, insertion).trimEnd() +
    `\n\n## Version ${version}: ${title.trim()}\n\n` +
    text.slice(insertion)
);
console.log('Added changelog entry for ' + version);
