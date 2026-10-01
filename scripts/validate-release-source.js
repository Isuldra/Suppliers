import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { projectRoot } from './release-artifacts.js';

export function validateReleaseSource({
  root = projectRoot,
  version,
  targetCommit = process.env.GITHUB_SHA || 'HEAD',
}) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Release version must be X.Y.Z');
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const commit = git(['rev-parse', targetCommit + '^{commit}']);
  const packageVersion = JSON.parse(git(['show', commit + ':package.json'])).version;
  if (packageVersion !== version)
    throw new Error(
      `Release version ${version} does not match committed package version ${packageVersion}. Commit the intended version before releasing.`
    );
  const tag = 'v' + version;
  const ref = 'refs/tags/' + tag;
  const existing = spawnSync('git', ['show-ref', '--verify', '--quiet', ref], { cwd: root });
  if (existing.error) throw existing.error;
  if (existing.status !== 0 && existing.status !== 1)
    throw new Error('Could not check release tag ' + tag);
  if (existing.status === 0 && git(['rev-parse', ref + '^{commit}']) !== commit)
    throw new Error(`Release tag ${tag} points to a different commit. Choose a new version.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    validateReleaseSource({ version: process.argv[2] });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
