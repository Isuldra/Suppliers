#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execa } from 'execa';
import semver from 'semver';

// CLI flags parsing
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const shouldPush = args.includes('--push');
const TAG_PREFIX = process.env.TAG_PREFIX ?? 'v';

// Filter out flags to get command and args
const commandArgs = args.filter((arg) => !arg.startsWith('--'));
const command = commandArgs[0];

/**
 * Logging utilities
 */
function log(message, level = 'info') {
  const prefix = {
    info: '[INFO]',
    success: '[OK]',
    error: '[ERROR]',
    warning: '[WARN]',
    process: '[RUNNING]',
  }[level];

  const output = level === 'error' ? console.error : console.log;
  output(`${prefix} ${message}`);
}

function verbose(message) {
  if (isVerbose) {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Find git repository root
 * Handles running from any subdirectory and git worktrees
 */
async function getRepoRoot() {
  try {
    const { stdout: root } = await execa('git', ['rev-parse', '--show-toplevel']);
    return root.trim();
  } catch (error) {
    throw new Error('Not in a git repository');
  }
}

/**
 * Check git identity configuration
 */
async function checkGitIdentity() {
  try {
    await execa('git', ['config', '--get', 'user.email']);
  } catch (error) {
    throw new Error(
      "git user.email is not configured. Set it with: git config user.email 'you@example.com'"
    );
  }

  try {
    await execa('git', ['config', '--get', 'user.name']);
  } catch (error) {
    throw new Error(
      "git user.name is not configured. Set it with: git config user.name 'Your Name'"
    );
  }
}

/**
 * Check if we're in detached HEAD state
 */
async function checkNotDetachedHead() {
  try {
    const { stdout: head } = await execa('git', ['symbolic-ref', '-q', '--short', 'HEAD']);
    return head.trim();
  } catch (error) {
    throw new Error('Detached HEAD state detected. Please checkout a branch before versioning.');
  }
}

/**
 * Check if working directory is clean
 */
async function checkWorkingDirectoryClean() {
  const { stdout: porcelain } = await execa('git', ['status', '--porcelain=v1']);
  if (porcelain.trim() !== '') {
    throw new Error('Working directory is not clean. Please commit or stash changes first.');
  }
}

/**
 * Execute git command with dry-run support and better error handling
 */
async function execGit(args, description) {
  verbose(`Executing: git ${args.join(' ')}`);

  const readOnlyCommands = ['describe', 'status', 'symbolic-ref', 'config', 'rev-parse'];
  const isReadOnly = readOnlyCommands.some((cmd) => args.includes(cmd));

  if (isDryRun && !isReadOnly) {
    log(`[DRY-RUN] Would execute: git ${args.join(' ')}`, 'warning');
    return { stdout: '', stderr: '' };
  }

  try {
    return await execa('git', args);
  } catch (error) {
    throw new Error(`Failed to ${description}: ${error.message}`);
  }
}

/**
 * Get current git branch
 */
async function getCurrentBranch() {
  try {
    const { stdout } = await execa('git', ['branch', '--show-current']);
    return stdout.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Sync package.json version with the latest git tag
 */
async function syncVersionWithGitTag() {
  try {
    log('Syncing package.json version with git tags...', 'process');

    // Get repo root
    const repoRoot = await getRepoRoot();
    const packageJsonPath = path.join(repoRoot, 'package.json');

    // Get the latest tag
    const { stdout: latestTag } = await execGit(
      ['describe', '--tags', '--abbrev=0'],
      'get latest tag'
    );

    if (!latestTag) {
      log('No git tags found', 'error');
      return false;
    }

    // Remove tag prefix if present
    const version = latestTag.startsWith(TAG_PREFIX)
      ? latestTag.slice(TAG_PREFIX.length)
      : latestTag;

    // Validate semver
    if (!semver.valid(version)) {
      log(`Invalid semver format: ${version}`, 'error');
      return false;
    }

    verbose(`Latest git tag: ${latestTag}`);
    verbose(`Extracted version: ${version}`);

    // Read current package.json
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    const currentVersion = packageJson.version;

    if (currentVersion === version) {
      log(
        `Package.json version (${currentVersion}) already matches git tag (${version})`,
        'success'
      );
      return true;
    }

    log(`Updating package.json version from ${currentVersion} to ${version}`, 'process');

    if (!isDryRun) {
      // Update package.json, preserving formatting
      packageJson.version = version;
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      log(`Updated package.json version to ${version}`, 'success');
    } else {
      log(`[DRY-RUN] Would update package.json version to ${version}`, 'warning');
    }

    // Commit the version change
    try {
      await execGit(['add', 'package.json'], 'stage package.json');
      await execGit(
        ['commit', '-m', `chore: sync package.json version to ${version}`],
        'commit version sync'
      );
      log('Committed version sync to git', 'success');
    } catch (error) {
      if (error.message.includes('nothing to commit')) {
        verbose('No changes to commit');
      } else {
        log('Could not commit version sync (this is normal if no changes were made)', 'warning');
      }
    }

    return true;
  } catch (error) {
    if (error.message.includes('No names found')) {
      log('No git tags found in repository', 'error');
    } else {
      log(`Error syncing version: ${error.message}`, 'error');
    }
    return false;
  }
}

/**
 * Create new version with better validation and checks
 */
async function createNewVersion(versionType = 'patch') {
  try {
    log(`Creating new ${versionType} version...`, 'process');

    // Validate version type
    const validTypes = [
      'patch',
      'minor',
      'major',
      'prepatch',
      'preminor',
      'premajor',
      'prerelease',
    ];
    if (!validTypes.includes(versionType)) {
      throw new Error(
        `Invalid version type: ${versionType}. Must be one of: ${validTypes.join(', ')}`
      );
    }

    // Get repo root
    const repoRoot = await getRepoRoot();
    const packageJsonPath = path.join(repoRoot, 'package.json');

    // Pre-flight checks
    await checkGitIdentity();
    const branch = await checkNotDetachedHead();
    await checkWorkingDirectoryClean();

    verbose(`Current branch: ${branch}`);

    // Read current package.json
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    const currentVersion = packageJson.version;

    verbose(`Current version: ${currentVersion}`);

    if (isDryRun) {
      log(`[DRY-RUN] Would bump version from ${currentVersion} (type: ${versionType})`, 'warning');
      return null;
    }

    // Update version using npm version
    const { stdout } = await execa('npm', ['version', versionType, '--no-git-tag-version']);

    // Parse npm output (handles "v1.2.3" or "1.2.3" with newlines)
    const cleanVersion = stdout.trim().replace(/^v/, '');

    // Validate the new version
    if (!semver.valid(cleanVersion)) {
      throw new Error(`npm version produced invalid semver: ${cleanVersion}`);
    }

    log(`New version: ${cleanVersion}`, 'success');

    // Create annotated git tag
    const tagName = `${TAG_PREFIX}${cleanVersion}`;
    await execGit(['add', 'package.json'], 'stage package.json');
    await execGit(
      ['commit', '-m', `chore: bump version to ${cleanVersion}`],
      'commit version bump'
    );
    await execGit(
      ['tag', '-a', tagName, '-m', `chore: release ${cleanVersion}`],
      'create annotated tag'
    );

    log(`Created annotated tag: ${tagName}`, 'success');

    // Push if requested
    if (shouldPush) {
      log('Pushing commits and tags...', 'process');
      await execGit(['push', '--follow-tags'], 'push commits and tags');
      log('Pushed to remote', 'success');
    } else {
      log(`To push: git push origin ${branch} --follow-tags`, 'info');
    }

    return cleanVersion;
  } catch (error) {
    log(`Error creating new version: ${error.message}`, 'error');
    if (error.stderr) {
      verbose(`Details: ${error.stderr}`);
    }
    return null;
  }
}

/**
 * Show current version info
 */
async function showVersionInfo() {
  try {
    const repoRoot = await getRepoRoot();
    const packageJsonPath = path.join(repoRoot, 'package.json');

    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);

    log(`Current version in package.json: ${packageJson.version}`, 'info');

    try {
      const { stdout: latestTag } = await execa('git', ['describe', '--tags', '--abbrev=0']);
      const version = latestTag.startsWith(TAG_PREFIX)
        ? latestTag.slice(TAG_PREFIX.length)
        : latestTag;
      log(`Latest git tag: ${latestTag} (${version})`, 'info');

      if (packageJson.version !== version) {
        log("Version mismatch detected. Run 'sync' to update package.json", 'warning');
      }
    } catch (error) {
      log('No git tags found', 'warning');
    }

    const branch = await getCurrentBranch();
    if (branch) {
      log(`Current branch: ${branch}`, 'info');
    }

    log(`Tag prefix: ${TAG_PREFIX}`, 'info');
  } catch (error) {
    log(`Error reading version info: ${error.message}`, 'error');
  }
}

/**
 * Main CLI handler
 */
async function main() {
  switch (command) {
    case 'sync':
      await syncVersionWithGitTag();
      break;

    case 'bump': {
      const versionType = commandArgs[1] || 'patch';
      await createNewVersion(versionType);
      break;
    }

    case 'info':
      await showVersionInfo();
      break;

    case 'help':
    default:
      console.log(`
Version Sync Script

Usage:
  node scripts/sync-version.js <command> [options]

Commands:
  sync          Sync package.json with latest git tag
  bump [type]   Create new version (patch|minor|major|prepatch|preminor|premajor|prerelease)
  info          Show current version information
  help          Show this help message

Options:
  --dry-run     Show what would be done without making changes
  --verbose     Show detailed output
  --push        Automatically push commits and tags after bump

Environment Variables:
  TAG_PREFIX    Git tag prefix (default: "v")

Examples:
  node scripts/sync-version.js sync
  node scripts/sync-version.js bump patch
  node scripts/sync-version.js bump minor --dry-run
  node scripts/sync-version.js bump major --push
  node scripts/sync-version.js info
  TAG_PREFIX="" node scripts/sync-version.js bump patch

Version Types:
  patch      - Bug fixes (1.0.0 -> 1.0.1)
  minor      - New features (1.0.0 -> 1.1.0)
  major      - Breaking changes (1.0.0 -> 2.0.0)
  prepatch   - Pre-release patch (1.0.0 -> 1.0.1-0)
  preminor   - Pre-release minor (1.0.0 -> 1.1.0-0)
  premajor   - Pre-release major (1.0.0 -> 2.0.0-0)
  prerelease - Increment pre-release (1.0.0-0 -> 1.0.0-1)
      `);
      break;
  }
}

// Run main and handle errors
main().catch((error) => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});
