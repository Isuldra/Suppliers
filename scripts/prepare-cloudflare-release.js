#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root directory
const projectRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(projectRoot, 'release');
const updatesDir = path.join(projectRoot, 'docs', 'updates');

// Read package.json to get current version
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`Preparing Cloudflare release for version ${version}...`);

// VALIDATION: Check that version is valid semver
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(version)) {
  console.error(`[ERROR] ERROR: Invalid version format: ${version}`);
  console.error('   Version must be in format: X.Y.Z (e.g., 1.4.1)');
  process.exit(1);
}

// VALIDATION: Check that existing latest.yml (if it exists) will be updated
const existingLatestYml = path.join(updatesDir, 'latest.yml');
if (fs.existsSync(existingLatestYml)) {
  const existingContent = fs.readFileSync(existingLatestYml, 'utf8');
  const existingVersionMatch = existingContent.match(/^version:\s*(\S+)/m);
  if (existingVersionMatch) {
    const existingVersion = existingVersionMatch[1];
    if (existingVersion === version) {
      console.warn(`[WARNING]  WARNING: latest.yml already points to version ${version}`);
      console.warn('   Make sure this is a rebuild and not a version bump issue');
    }
    console.log(`   Updating from version ${existingVersion} → ${version}`);
  }
}

// Ensure updates directory exists
if (!fs.existsSync(updatesDir)) {
  fs.mkdirSync(updatesDir, { recursive: true });
}

// Function to calculate SHA512 hash
function calculateSHA512(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha512');
  hash.update(fileBuffer);
  return hash.digest('base64');
}

// Function to get file size
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

// Function to copy file
function copyFile(source, destination) {
  const destDir = path.dirname(destination);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(source, destination);
  console.log(`Success: Copied: ${path.basename(source)}`);
}

// Find the latest NSIS installer
const nsisInstaller = `Pulse-${version}-setup.exe`;
const nsisInstallerPath = path.join(releaseDir, nsisInstaller);
const nsisBlockmap = `Pulse-${version}-setup.exe.blockmap`;
const nsisBlockmapPath = path.join(releaseDir, nsisBlockmap);

// Find portable executable
const portableExe = 'Pulse-Portable.exe';
const portableExePath = path.join(releaseDir, portableExe);

// Check if files exist
const filesToCopy = [];
const filesToInclude = [];

if (fs.existsSync(nsisInstallerPath)) {
  filesToCopy.push({
    source: nsisInstallerPath,
    destination: path.join(updatesDir, nsisInstaller),
  });
  filesToInclude.push({
    name: nsisInstaller,
    path: nsisInstallerPath,
  });
  console.log(`Success: Found NSIS installer: ${nsisInstaller}`);
} else {
  console.log(`Warning: NSIS installer not found: ${nsisInstaller}`);
}

if (fs.existsSync(nsisBlockmapPath)) {
  filesToCopy.push({
    source: nsisBlockmapPath,
    destination: path.join(updatesDir, nsisBlockmap),
  });
  console.log(`Success: Found NSIS blockmap: ${nsisBlockmap}`);
} else {
  console.log(`Warning: NSIS blockmap not found: ${nsisBlockmap}`);
}

if (fs.existsSync(portableExePath)) {
  filesToCopy.push({
    source: portableExePath,
    destination: path.join(updatesDir, portableExe),
  });
  console.log(`Success: Found portable executable: ${portableExe}`);
} else {
  console.log(`Warning: Portable executable not found: ${portableExe}`);
}

// Note: Large files (exe, blockmap) are now hosted on GitHub Releases
// Only copy small files to docs/updates/ for Cloudflare Pages
console.log('\nPreparing Cloudflare Pages files...');
console.log('   Large files will be uploaded to GitHub Releases');
console.log('   Only metadata files will be copied to docs/updates/');

// Generate latest.yml for auto-updates
if (filesToInclude.length > 0) {
  console.log('\nGenerating latest.yml...');

  const mainFile = filesToInclude[0]; // Use the first file (NSIS installer) as main

  // VALIDATION: Verify file actually exists
  if (!fs.existsSync(mainFile.path)) {
    console.error(`[ERROR] ERROR: File not found: ${mainFile.path}`);
    console.error('   Cannot generate latest.yml without the installer file');
    process.exit(1);
  }

  const fileHash = calculateSHA512(mainFile.path);
  const fileSize = getFileSize(mainFile.path);
  const releaseDate = new Date().toISOString();

  // Use filename with dots instead of spaces for GitHub Releases URL
  const githubFilename = mainFile.name.replace(/ /g, '.');

  // Use full GitHub Releases URL since we're serving from Cloudflare Pages
  // but the files are hosted on GitHub Releases
  const githubReleaseUrl = `https://github.com/Isuldra/Suppliers/releases/download/v${version}/${githubFilename}`;

  const latestYml = `version: ${version}
files:
  - url: ${githubReleaseUrl}
    sha512: ${fileHash}
    size: ${fileSize}
path: ${githubFilename}
sha512: ${fileHash}
releaseDate: '${releaseDate}'`;

  const latestYmlPath = path.join(updatesDir, 'latest.yml');
  fs.writeFileSync(latestYmlPath, latestYml);
  console.log(`[OK] Success: Generated: latest.yml`);
  console.log(`   Version: ${version}`);
  console.log(`   Filename: ${mainFile.name}`);
  console.log(`   URL: ${githubReleaseUrl}`);
  console.log(`   SHA512: ${fileHash.substring(0, 20)}...`);
  console.log(`   Size: ${Math.round(fileSize / 1024 / 1024)} MB`);

  // VALIDATION: Verify the generated latest.yml is valid
  const generatedContent = fs.readFileSync(latestYmlPath, 'utf8');
  if (!generatedContent.includes(`version: ${version}`)) {
    console.error(`[ERROR] ERROR: Generated latest.yml does not contain correct version`);
    process.exit(1);
  }
  if (generatedContent.includes('PLACEHOLDER')) {
    console.error(`[ERROR] ERROR: Generated latest.yml contains PLACEHOLDER values`);
    process.exit(1);
  }

  // Also copy to release/ directory for GitHub Release upload
  const releaseLatestYmlPath = path.join(releaseDir, 'latest.yml');
  fs.writeFileSync(releaseLatestYmlPath, latestYml);
  console.log(`[OK] Success: Copied latest.yml to release/ directory for GitHub Release`);

  // IMPORTANT REMINDER
  console.log('\n[WARNING]  IMPORTANT: Make sure to:');
  console.log(`   1. Create GitHub Release v${version} FIRST`);
  console.log(`   2. Upload ${githubFilename} to the release`);
  console.log(`   3. Then deploy docs/updates/ to Cloudflare Pages`);
  console.log(`   4. Verify the URL is accessible: ${githubReleaseUrl}`);
} else {
  console.error('\n[ERROR] ERROR: No NSIS installer found for latest.yml generation');
  console.error("   Run 'npm run dist' to build the NSIS installer first");
  process.exit(1);
}

// Generate latest.json for portable version
if (fs.existsSync(portableExePath)) {
  console.log('\nGenerating latest.json...');

  const portableHash = calculateSHA512(portableExePath);
  const portableSize = getFileSize(portableExePath);
  const releaseDate = new Date().toISOString();

  // Use filename with dots instead of spaces for GitHub Releases URL
  const portableFilename = portableExe.replace(/ /g, '.');

  // Use full GitHub Releases URL since we're serving from Cloudflare Pages
  // but the files are hosted on GitHub Releases
  const portableReleaseUrl = `https://github.com/Isuldra/Suppliers/releases/download/v${version}/${portableFilename}`;

  const latestJson = {
    version: version,
    files: [
      {
        url: portableReleaseUrl,
        sha512: portableHash,
        size: portableSize,
      },
    ],
    releaseDate: releaseDate,
  };

  const latestJsonPath = path.join(updatesDir, 'latest.json');
  fs.writeFileSync(latestJsonPath, JSON.stringify(latestJson, null, 2));
  console.log(`Success: Generated: latest.json`);
  console.log(`   Filename: ${portableExe}`);
  console.log(`   URL: ${portableReleaseUrl}`);
}

// Update index.html with current version
console.log('\nUpdating index.html...');
const indexPath = path.join(updatesDir, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Update version in the HTML
indexContent = indexContent.replace(
  /<span class="version-badge">v[\d.]+<\/span>/,
  `<span class="version-badge">v${version}</span>`
);

// Update status message and replace all version entries
indexContent = indexContent.replace(
  /<h3>Cloudflare Pages er konfigurert!<\/h3>/,
  `<h3>Release v${version} er klar!</h3>`
);

// Replace the entire status section to avoid duplicates
const statusSectionRegex = /<div class="status">[\s\S]*?<\/div>/;
const newStatusSection = `<div class="status">
                <h3>Release v${version} er klar!</h3>
                <p>Automatiske oppdateringer er nå tilgjengelige via Cloudflare Pages.</p>
                <p><strong>Ny versjon:</strong> v${version} - ${new Date().toLocaleDateString(
                  'no-NO'
                )}</p>
            </div>`;

indexContent = indexContent.replace(statusSectionRegex, newStatusSection);

fs.writeFileSync(indexPath, indexContent);
console.log(`Success: Updated: index.html with version ${version}`);

// Ensure _redirects file exists
const redirectsPath = path.join(updatesDir, '_redirects');
if (!fs.existsSync(redirectsPath)) {
  const redirectsContent = `# Cloudflare Pages redirects
# Serve latest.yml for auto-updates
/latest.yml /latest.yml 200

# Serve all other files normally
/* /index.html 200`;

  fs.writeFileSync(redirectsPath, redirectsContent);
  console.log(`Success: Created: _redirects`);
}

console.log('\nHybrid release preparation complete!');
console.log('\nNext steps:');
console.log('1. Review the metadata files in docs/updates/');
console.log('2. Run: npm run release:github (creates GitHub Release)');
console.log('3. GitHub Actions will automatically commit and push metadata files');
console.log('4. Cloudflare Pages will serve latest.yml with GitHub URLs');
console.log('5. Users will download installers from GitHub Releases');

console.log('\nFiles ready for deployment:');
const deployedFiles = fs.readdirSync(updatesDir);
deployedFiles.forEach((file) => {
  const filePath = path.join(updatesDir, file);
  const stats = fs.statSync(filePath);
  const sizeKB = Math.round(stats.size / 1024);
  console.log(`   - ${file} (${sizeKB} KB)`);
});
