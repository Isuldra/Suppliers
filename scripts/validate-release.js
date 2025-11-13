#!/usr/bin/env node

/**
 * Validate that a GitHub Release exists before deploying update metadata
 * This prevents 404 errors by ensuring the release and files are available
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// GitHub API configuration
const GITHUB_OWNER = 'Isuldra';
const GITHUB_REPO = 'Suppliers';
const GITHUB_API = 'https://api.github.com';

// Read version from package.json
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`\n[VALIDATING] Validating GitHub Release v${version}...\n`);

// Function to make HTTPS requests
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Pulse-Release-Validator',
          Accept: 'application/vnd.github.v3+json',
          ...options.headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
            } catch {
              resolve({ statusCode: res.statusCode, data });
            }
          } else {
            reject(
              new Error(`HTTP ${res.statusCode}: ${res.statusMessage}\n${data.substring(0, 200)}`)
            );
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

// Function to check if release exists
async function checkReleaseExists() {
  const releaseUrl = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/v${version}`;
  console.log(`[CHECKING] Checking: ${releaseUrl}`);

  try {
    const response = await httpsRequest(releaseUrl);
    console.log(`[OK] Release v${version} found on GitHub`);
    return response.data;
  } catch (error) {
    if (error.message.includes('404')) {
      console.error(`[ERROR] ERROR: Release v${version} NOT found on GitHub`);
      console.error(`   URL: ${releaseUrl}`);
      console.error('\n[TIP] You need to create the GitHub Release first:');
      console.error(`   1. Go to: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/new`);
      console.error(`   2. Tag version: v${version}`);
      console.error(`   3. Upload the installer files`);
      console.error(`   4. Publish the release`);
      console.error(`   5. Then run this script again\n`);
      process.exit(1);
    }
    throw error;
  }
}

// Function to check if specific asset exists in release
async function checkAssetExists(releaseData, expectedFilename) {
  console.log(`[VALIDATING] Checking for asset: ${expectedFilename}`);

  const assets = releaseData.assets || [];
  const asset = assets.find((a) => a.name === expectedFilename);

  if (asset) {
    console.log(`[OK] Asset found: ${expectedFilename}`);
    console.log(`   Size: ${Math.round(asset.size / 1024 / 1024)} MB`);
    console.log(`   Download URL: ${asset.browser_download_url}`);
    return true;
  } else {
    console.error(`[ERROR] ERROR: Asset NOT found: ${expectedFilename}`);
    console.error('\n   Available assets in this release:');
    if (assets.length === 0) {
      console.error('   (No assets uploaded yet)');
    } else {
      assets.forEach((a) =>
        console.error(`   - ${a.name} (${Math.round(a.size / 1024 / 1024)} MB)`)
      );
    }
    console.error(`\n[TIP] Upload ${expectedFilename} to the release and try again.\n`);
    return false;
  }
}

// Main validation function
async function validateRelease() {
  try {
    // Check if release exists
    const releaseData = await checkReleaseExists();

    // Check required assets
    const requiredAssets = [
      `Pulse-${version}-setup.exe`, // NSIS installer
      'Pulse-Portable.exe', // Portable version
    ];

    console.log('\n[PACKAGE] Checking required assets...\n');

    let allAssetsFound = true;
    for (const assetName of requiredAssets) {
      const found = await checkAssetExists(releaseData, assetName);
      if (!found) {
        allAssetsFound = false;
      }
      console.log(''); // Empty line for readability
    }

    if (!allAssetsFound) {
      console.error('[ERROR] VALIDATION FAILED: Some required assets are missing\n');
      process.exit(1);
    }

    // Check latest.yml in docs/updates
    const latestYmlPath = path.join(projectRoot, 'docs', 'updates', 'latest.yml');
    if (fs.existsSync(latestYmlPath)) {
      const latestYmlContent = fs.readFileSync(latestYmlPath, 'utf8');
      const versionMatch = latestYmlContent.match(/^version:\s*(\S+)/m);

      if (versionMatch && versionMatch[1] === version) {
        console.log(`[OK] latest.yml version matches: ${version}`);
      } else {
        console.error(`[WARNING]  WARNING: latest.yml version mismatch`);
        console.error(`   latest.yml: ${versionMatch ? versionMatch[1] : 'unknown'}`);
        console.error(`   package.json: ${version}`);
        console.error('\n   Run: npm run release:prepare  to update latest.yml\n');
      }

      // Check for PLACEHOLDER values
      if (latestYmlContent.includes('PLACEHOLDER')) {
        console.error('[ERROR] ERROR: latest.yml contains PLACEHOLDER values');
        console.error('   Run: npm run release:prepare  to generate proper hashes\n');
        process.exit(1);
      }
    } else {
      console.error('[WARNING]  WARNING: latest.yml not found in docs/updates/');
      console.error('   Run: npm run release:prepare  to generate it\n');
    }

    console.log('\n[OK] ALL VALIDATIONS PASSED!\n');
    console.log(' You can now safely deploy docs/updates/ to Cloudflare Pages\n');
    console.log('Next steps:');
    console.log('1. Commit and push docs/updates/ files to git');
    console.log('2. Cloudflare Pages will automatically deploy');
    console.log(`3. Users will be able to auto-update to v${version} via GitHub Releases\n`);
  } catch (error) {
    console.error('\n[ERROR] VALIDATION ERROR:', error.message);
    console.error('\nPlease fix the issues above and try again.\n');
    process.exit(1);
  }
}

// Run validation
validateRelease();
