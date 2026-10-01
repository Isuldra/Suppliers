import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectRoot, readReleaseFiles } from './release-artifacts.js';

export function prepareRelease(root = projectRoot, date = new Date()) {
  const { version, installer, portable } = readReleaseFiles(root);
  const updates = path.join(root, 'docs/updates');
  const indexPath = path.join(updates, 'index.html');
  let index = fs.readFileSync(indexPath, 'utf8');
  for (const id of ['download-installer', 'download-portable']) {
    if (!new RegExp('id="' + id + '"[^>]*href="').test(index)) {
      throw new Error('Download page is missing link: ' + id);
    }
  }
  const releaseDate = date.toISOString();
  const metadata = `version: ${version}
files:
  - url: ${installer.url}
    sha512: ${installer.sha512}
    size: ${installer.size}
path: ${installer.name}
sha512: ${installer.sha512}
releaseDate: '${releaseDate}'
`;
  const latestJson = {
    version,
    files: [{ url: portable.url, sha512: portable.sha512, size: portable.size }],
    releaseDate,
  };
  index = index
    .replace(/class="release-version">v[\d.]+</g, `class="release-version">v${version}<`)
    .replace(
      /class="release-date">[^<]+</g,
      `class="release-date">${date.toLocaleDateString('nb-NO')}<`
    )
    .replace(/Release v[\d.]+ er klar/g, `Release v${version} er klar`)
    .replace(/(id="download-installer"[^>]*href=")[^"]+(")/, `$1${installer.url}$2`)
    .replace(/(id="download-portable"[^>]*href=")[^"]+(")/, `$1${portable.url}$2`);

  fs.writeFileSync(path.join(updates, 'latest.yml'), metadata);
  fs.writeFileSync(path.join(updates, 'latest.json'), JSON.stringify(latestJson, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'release/latest.yml'), metadata);
  fs.writeFileSync(indexPath, index);
  console.log(
    `Prepared metadata for Pulse ${version}. Upload GitHub assets before publishing metadata on main.`
  );
  return { version, metadata, latestJson };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    prepareRelease();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
