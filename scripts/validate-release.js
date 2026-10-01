import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectRoot, readReleaseArtifacts } from './release-artifacts.js';

export async function validateRelease({
  root = projectRoot,
  fetchImpl = fetch,
  published = false,
} = {}) {
  const { version, assets, metadata, portableMetadata } = readReleaseArtifacts(root);
  const response = await fetchImpl(
    `https://api.github.com/repos/Isuldra/Suppliers/releases/tags/v${version}`,
    {
      headers: { 'User-Agent': 'Pulse-Release-Validator', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!response.ok) throw new Error('GitHub release check failed: HTTP ' + response.status);
  const release = await response.json();
  if (release.draft || release.prerelease)
    throw new Error('Release is not a stable published release.');
  for (const asset of assets) {
    const remote = release.assets?.find((item) => item.name === asset.name);
    if (!remote || remote.size !== asset.size || remote.browser_download_url !== asset.url) {
      throw new Error('Missing or mismatched GitHub asset: ' + asset.name);
    }
  }
  if (published) {
    const feed = await fetchImpl('https://suppliers-anx.pages.dev/latest.yml', {
      signal: AbortSignal.timeout(15000),
    });
    if (!feed.ok || (await feed.text()).trim() !== metadata.trim()) {
      throw new Error('Published latest.yml does not match the local release.');
    }
    const portable = await fetchImpl('https://suppliers-anx.pages.dev/latest.json', {
      signal: AbortSignal.timeout(15000),
    });
    if (
      !portable.ok ||
      JSON.stringify(await portable.json()) !== JSON.stringify(portableMetadata)
    ) {
      throw new Error('Published latest.json does not match the local release.');
    }
  }
  console.log(
    `Pulse ${version}: GitHub assets${published ? ' and published metadata' : ''} match the local build.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    await validateRelease({ published: process.argv.includes('--published') });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
