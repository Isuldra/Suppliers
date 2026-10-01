import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const releaseBase = 'https://github.com/Isuldra/Suppliers/releases/download';

export function readReleaseFiles(root = projectRoot) {
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Release version must be X.Y.Z');
  const names = [`Pulse-${version}-setup.exe`, 'Pulse-Portable.exe'];
  const files = names.map((name) => {
    const filename = path.join(root, 'release', name);
    const data = fs.readFileSync(filename);
    if (!data.length) throw new Error('Empty release file: ' + name);
    return {
      name,
      path: filename,
      size: data.length,
      sha512: createHash('sha512').update(data).digest('base64'),
      url: `${releaseBase}/v${version}/${encodeURIComponent(name)}`,
    };
  });
  return { version, installer: files[0], portable: files[1] };
}

export function readReleaseArtifacts(root = projectRoot) {
  const release = readReleaseFiles(root);
  const metadataPath = path.join(root, 'docs/updates/latest.yml');
  const metadata = fs.readFileSync(metadataPath, 'utf8');
  const field = (name) => metadata.match(new RegExp('^' + name + ':\\s*(\\S+)', 'm'))?.[1];
  const hashes = [...metadata.matchAll(/^\s*sha512:\s*(\S+)/gm)].map((match) => match[1]);
  const size = Number(metadata.match(/^\s+size:\s*(\d+)/m)?.[1]);
  if (
    field('version') !== release.version ||
    field('path') !== release.installer.name ||
    hashes.length !== 2 ||
    hashes.some((hash) => hash !== release.installer.sha512) ||
    size !== release.installer.size ||
    !metadata.includes('url: ' + release.installer.url)
  )
    throw new Error('latest.yml does not match the installer; run release:prepare');

  const portableMetadata = JSON.parse(
    fs.readFileSync(path.join(root, 'docs/updates/latest.json'), 'utf8')
  );
  const portableFile = portableMetadata.files?.[0];
  if (
    portableMetadata.version !== release.version ||
    portableMetadata.files?.length !== 1 ||
    portableFile.url !== release.portable.url ||
    portableFile.sha512 !== release.portable.sha512 ||
    portableFile.size !== release.portable.size
  )
    throw new Error('latest.json does not match the portable file; run release:prepare');

  const assets = [
    release.installer,
    release.portable,
    {
      name: 'latest.yml',
      path: metadataPath,
      size: Buffer.byteLength(metadata),
      url: `${releaseBase}/v${release.version}/latest.yml`,
    },
  ];
  const blockmapName = release.installer.name + '.blockmap';
  const blockmapPath = path.join(root, 'release', blockmapName);
  if (fs.existsSync(blockmapPath))
    assets.push({
      name: blockmapName,
      path: blockmapPath,
      size: fs.statSync(blockmapPath).size,
      url: `${releaseBase}/v${release.version}/${blockmapName}`,
    });
  return { ...release, metadata, portableMetadata, assets };
}
