import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
try {
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const tag = git(['describe', '--tags', '--abbrev=0']);
  const taggedVersion = tag.replace(/^v/, '');
  if (
    !semver.valid(version) ||
    !semver.valid(taggedVersion) ||
    !semver.eq(version, taggedVersion)
  ) {
    throw new Error(
      `Package version ${version} does not match nearest tag ${tag}. Choose the intended release version before publishing.`
    );
  }
  const head = git(['rev-parse', 'HEAD']);
  const taggedCommit = git(['rev-parse', tag + '^{commit}']);
  if (head !== taggedCommit) {
    throw new Error(
      'HEAD contains changes after the release tag. Create a new version for this build.'
    );
  }
  console.log(`Package and HEAD match ${tag}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
