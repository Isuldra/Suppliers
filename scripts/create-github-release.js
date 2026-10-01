import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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
  for (const asset of existing) {
    if (managedNames.has(asset.name))
      await client.rest.repos.deleteReleaseAsset({
        ...params,
        asset_id: asset.id,
      });
  }
  for (const asset of assets) {
    const data = fs.readFileSync(asset.path);
    await client.rest.repos.uploadReleaseAsset({
      ...params,
      release_id: release.id,
      name: asset.name,
      data,
      headers: {
        'content-type': asset.name.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream',
        'content-length': data.length,
      },
    });
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
