# Publishing Updates

This guide explains how to publish updates for SupplyChain OneMed using the automated CI/CD pipeline.

## Overview

SupplyChain OneMed uses [electron-updater](https://www.electron.build/auto-update) to handle automatic updates. The CI pipeline automatically builds the application artifacts and publishes them to GitHub Releases when a version tag is pushed.

### Key Features

- **Automated Publishing**: No manual uploads needed - just push a version tag
- **Portable Auto-Updates**: Portable versions now receive automatic update notifications
- **Simplified Workflow**: Single `npm run dist` command handles all builds
- **Latest.yml Generation**: Automatically generates update metadata for portable versions

## Prerequisites

Before publishing an update, ensure you have:

1. **GitHub Access**: Write access to the GitHub repository where releases are hosted.
2. **Version Control**: All changes for the release are committed and pushed to the main branch.
3. **Clean Working Directory**: No uncommitted changes locally.
4. **Node.js 22**: The CI/CD pipeline uses Node.js 22 to avoid EBADENGINE warnings with modern dependencies.

## Automated Publishing Process

The publishing process is now fully automated through GitHub Actions. Follow these steps:

### 1. Update Version Number

Decide on the new version number following [semantic versioning](https://semver.org/) principles:

- **MAJOR** version for incompatible API changes (`1.0.0` → `2.0.0`)
- **MINOR** version for added functionality in a backwards compatible manner (`1.0.0` → `1.1.0`)
- **PATCH** version for backwards compatible bug fixes (`1.0.0` → `1.0.1`)

Update the `version` field in `package.json`:

```json
{
  "name": "one-med-supplychain-app",
  "version": "1.1.8",
  "description": "OneMed SupplyChain - Supplier Reminder Pro"
}
```

### 2. Commit and Create Release Tag

Commit the version change and create a Git tag:

```bash
git add package.json
git commit -m "Bump version to 1.1.8"
git push origin main

# Create and push the release tag
git tag v1.1.8
git push origin v1.1.8
```

### 3. Automated Build and Release

Once you push the tag, GitHub Actions will automatically:

1. **Build the application** using `npm run dist`
2. **Generate latest.yml** for portable auto-updates
3. **Upload to GitHub Release** with all artifacts:
   - Portable executable (`OneMed SupplyChain-Portable.exe`)
   - ZIP archive
   - `latest.yml` (update metadata)

The entire process is automated - no manual intervention required!

### 4. Verify the Release

After the automated release is complete:

1. **Check GitHub Releases**: Navigate to the GitHub Releases page and verify the new release appears
2. **Verify Assets**: Confirm all files are uploaded:
   - `OneMed SupplyChain-Portable.exe`
   - `OneMed SupplyChain-1.1.8-setup.zip`
   - `latest.yml`
3. **Test Auto-Update**: Install a previous version and test the auto-update functionality

## Testing Auto-Update Locally

To test the auto-update functionality:

1. **Install an older version** of the application
2. **Open the application** and go to the menu
3. **Click "Sjekk for oppdateringer"** (Check for Updates)
4. **Verify** that the new version is detected and can be downloaded

## Troubleshooting Auto-Updates

### Portable Version Issues

If portable users don't receive update notifications:

1. **Check latest.yml**: Verify the file exists in the GitHub release
2. **Verify file format**: The latest.yml should contain correct SHA512 hash and file size
3. **Check GitHub access**: Ensure users can access GitHub.com
4. **Review logs**: Check the application logs for update-related errors
5. **Verify Node.js version**: Ensure CI/CD uses Node.js 22 (check GitHub Actions logs for EBADENGINE warnings)

### Common Issues

#### Users Not Receiving Updates

- **Version Check**: Ensure the `version` in the released `package.json` is higher than the user's current version
- **GitHub Release**: Verify the release is published (not a draft) on GitHub
- **Assets**: Confirm the correct artifact files (installer, `latest.yml`) are present in the GitHub release
- **Firewall/Network**: Ensure users can reach GitHub.com to check for updates

## Advanced Configuration Notes

- **Release Channels:** The current setup supports stable releases. For beta/alpha channels, additional configuration would be needed.
- **Staged Rollouts:** The current setup publishes immediately to all users. For staged rollouts, consider using GitHub release drafts or separate repositories.

## Best Practices

1. **Maintain a Changelog**: Essential for release notes.
2. **Test Before Release**: Thoroughly test the application before creating a release tag.
3. **Communicate Updates**: Inform users about new releases.
4. **Versioning Strategy**: Stick to semantic versioning.
5. **Monitor CI/CD**: Watch the GitHub Actions workflow to ensure successful builds.
6. **Rollback Plan**: Know how to handle issues if a release has problems.

## Reference

- [Electron Builder Documentation](https://www.electron.build/)
- [Electron Updater Documentation](https://www.electron.build/auto-update)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Semantic Versioning](https://semver.org/)
