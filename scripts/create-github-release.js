import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Octokit } from '@octokit/rest';
import { projectRoot, readReleaseArtifacts } from './release-artifacts.js';
import { parseChangelogVersion } from './parse-changelog.js';

export async function publishRelease({
  root = projectRoot,
  client = new Octokit({ auth: process.env.GITHUB_TOKEN }),
  targetCommit = process.env.RELEASE_COMMIT,
} = {}) {
  // Validate every required file and its metadata before changing GitHub.
  const { version, assets } = readReleaseArtifacts(root);
  const params = { owner: 'Isuldra', repo: 'Suppliers' };
  let release;
  try {
    release = (await client.rest.repos.getReleaseByTag({ ...params, tag: 'v' + version })).data;
  } catch (error) {
    if (error.status !== 404) throw error;
    const entry = await parseChangelogVersion(version, root);
    release = (
      await client.rest.repos.createRelease({
        ...params,
        tag_name: 'v' + version,
        target_commitish: targetCommit,
        name: 'Pulse v' + version,
        body: entry?.fullContent || `Pulse v${version}\n\nSee docs/CHANGELOG.md for changes.`,
        draft: false,
        prerelease: false,
      })
    ).data;
  }

  const existing = await client.paginate(client.rest.repos.listReleaseAssets, {
    ...params,
    release_id: release.id,
    per_page: 100,
  });
  const managedNames = new Set(assets.map((asset) => asset.name));
  managedNames.add(`Pulse-${version}-setup.exe.blockmap`);
  const transaction = randomUUID();
  const staged = [];
  const backups = [];
  const remove = (id) => client.rest.repos.deleteReleaseAsset({ ...params, asset_id: id });
  const rename = (id, name) =>
    client.rest.repos.updateReleaseAsset({ ...params, asset_id: id, name });
  try {
    // No live download is touched until every replacement has been uploaded.
    for (const asset of assets) {
      const data = fs.readFileSync(asset.path);
      const uploaded = await client.rest.repos.uploadReleaseAsset({
        ...params,
        release_id: release.id,
        name: `${asset.name}.upload-${transaction}`,
        data,
        headers: {
          'content-type': asset.name.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream',
          'content-length': data.length,
        },
      });
      staged.push({ id: uploaded.data.id, name: asset.name });
    }
    for (const asset of staged) {
      const original = existing.find((entry) => entry.name === asset.name);
      if (original) {
        // Retain the original bytes and ID until all canonical names are in place.
        backups.push(original);
        await rename(original.id, `${original.name}.backup-${transaction}`);
      }
      await rename(asset.id, asset.name);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const asset of staged) {
      try {
        await remove(asset.id);
      } catch (cleanupError) {
        rollbackErrors.push(cleanupError);
      }
    }
    for (const asset of backups) {
      try {
        await rename(asset.id, asset.name);
      } catch (restoreError) {
        rollbackErrors.push(restoreError);
      }
    }
    if (rollbackErrors.length)
      throw new AggregateError(
        [error, ...rollbackErrors],
        `${error.message}; release rollback was incomplete. Retained backup assets need manual recovery.`
      );
    throw error;
  }
  // Delete originals (including an obsolete blockmap) only after successful promotion.
  for (const asset of existing) {
    if (managedNames.has(asset.name)) await remove(asset.id);
  }
  console.log(`Uploaded ${assets.length} assets for Pulse ${version}: ${release.html_url}`);
  return release;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (!process.env.GITHUB_TOKEN)
      throw new Error('GITHUB_TOKEN is required for release publishing.');
    const targetCommit =
      process.env.RELEASE_COMMIT ||
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: projectRoot,
        encoding: 'utf8',
      }).trim();
    await publishRelease({ targetCommit });
  } catch (error) {
    console.error('Release publishing failed:', error.message);
    process.exitCode = 1;
  }
}
