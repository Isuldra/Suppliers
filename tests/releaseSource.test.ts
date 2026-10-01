// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { validateReleaseSource } from '../scripts/validate-release-source.js';

let root: string;
const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
function commit(version: string) {
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version }));
  git('add', 'package.json');
  git('commit', '-m', 'Version ' + version);
  return git('rev-parse', 'HEAD');
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-release-source-'));
  git('init');
  git('config', 'user.name', 'Release test');
  git('config', 'user.email', 'release@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'tag.gpgsign', 'false');
  commit('2.0.0');
});
afterEach(() => {
  if (
    path.dirname(root) !== path.resolve(os.tmpdir()) ||
    !path.basename(root).startsWith('pulse-release-source-')
  )
    throw new Error('Unexpected test cleanup path');
  fs.rmSync(root, { recursive: true, force: true });
});

it('allows manual publication when the committed version matches and the tag is absent', () => {
  expect(() =>
    validateReleaseSource({ root, version: '2.0.0', targetCommit: 'HEAD' })
  ).not.toThrow();
});
it('rejects a requested version that exists only in the runner working tree', () => {
  fs.writeFileSync(path.join(root, 'package.json'), '{"version":"3.0.0"}');
  expect(() => validateReleaseSource({ root, version: '3.0.0', targetCommit: 'HEAD' })).toThrow(
    'committed package version 2.0.0'
  );
});
it.each([false, true])('accepts an existing matching tag (annotated: %s)', (annotated) => {
  if (annotated) git('tag', '-a', 'v2.0.0', '-m', 'Release');
  else git('tag', 'v2.0.0');
  expect(() =>
    validateReleaseSource({ root, version: '2.0.0', targetCommit: 'HEAD' })
  ).not.toThrow();
});
it('rejects an existing version tag that points to different source', () => {
  git('tag', 'v2.0.0');
  git('commit', '--allow-empty', '-m', 'Later source changes');
  expect(() => validateReleaseSource({ root, version: '2.0.0', targetCommit: 'HEAD' })).toThrow(
    'different commit'
  );
});
it('checks the actual target commit rather than the current checkout', () => {
  const targetCommit = git('rev-parse', 'HEAD');
  commit('3.0.0');
  expect(() => validateReleaseSource({ root, version: '3.0.0', targetCommit })).toThrow(
    'committed package version 2.0.0'
  );
});
it.each(['v2.0.0', '2.0.0-beta', 'invalid'])('rejects invalid version %s', (version) => {
  expect(() => validateReleaseSource({ root, version, targetCommit: 'HEAD' })).toThrow('X.Y.Z');
});
