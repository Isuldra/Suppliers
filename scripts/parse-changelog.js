import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function parseChangelogVersion(version, root = projectRoot) {
  const text = await fs.readFile(path.join(root, 'docs/CHANGELOG.md'), 'utf8');
  const section = text
    .split(/^## Version /m)
    .slice(1)
    .find((value) => value.startsWith(version + ':'));
  if (!section) return null;
  const fullContent = section.slice(version.length + 1).trim();
  const [title, ...body] = fullContent.split('\n');
  return { version, title: title.trim(), description: body.join('\n').trim(), fullContent };
}

export async function getLatestChangelogEntry(root = projectRoot) {
  const text = await fs.readFile(path.join(root, 'docs/CHANGELOG.md'), 'utf8');
  const version = text.match(/^## Version ([^\s:]+):/m)?.[1];
  return version ? parseChangelogVersion(version, root) : null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const entry = process.argv[2]
      ? await parseChangelogVersion(process.argv[2])
      : await getLatestChangelogEntry();
    if (!entry) throw new Error('Changelog entry not found.');
    console.log(JSON.stringify(entry, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
