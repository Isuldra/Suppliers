# Publishing Updates

This guide explains how to publish updates for Supplier Reminder Pro, allowing users to automatically receive and install new versions of the application.

## Overview

Supplier Reminder Pro uses [electron-updater](https://www.electron.build/auto-update) to handle automatic updates. The update system is configured to publish releases to GitHub, where the application will check for new versions.

## Prerequisites

Before publishing an update, ensure you have:

1. **GitHub Access**: Access to the GitHub repository configured in `package.json`
2. **GitHub Token**: A personal access token with `repo` permissions
3. **Version Control**: All changes are committed and pushed to the repository
4. **Clean Working Directory**: No uncommitted changes
5. **Package.json**: Version number updated
6. **Changelog**: Release notes prepared

## Update Process

### 1. Update Version Number

The first step is to update the version number in `package.json`:

```json
{
  "name": "supplier-reminder-pro",
  "version": "1.0.1", // Increment this version number
  "description": "Desktop application for managing supplier reminders"
  // ...
}
```

Follow [semantic versioning](https://semver.org/) principles:

- **MAJOR** version for incompatible API changes (`1.0.0` → `2.0.0`)
- **MINOR** version for added functionality in a backwards compatible manner (`1.0.0` → `1.1.0`)
- **PATCH** version for backwards compatible bug fixes (`1.0.0` → `1.0.1`)

### 2. Test the Update Locally

Before publishing, build and test the application locally:

```bash
# Build the application
npm run build

# Create distribution packages
npm run dist
```

Test the resulting installers and ensure everything works correctly.

### 3. Prepare GitHub

Ensure your GitHub repository is set up correctly:

1. Configure a GitHub token for the release process:

```bash
# On Windows
set GH_TOKEN=your_token_here

# On macOS/Linux
export GH_TOKEN=your_token_here
```

2. Verify that the repository settings in `package.json` are correct:

```json
"publish": [
  {
    "provider": "github",
    "owner": "Isuldra",
    "repo": "Suppliers"
  }
]
```

### 4. Publish the Release

When you're ready to publish, use the release command:

```bash
npm run release
```

This command will:

1. Build the application
2. Create distribution packages (NSIS, MSI, Portable)
3. Create a GitHub release with the version number as the tag
4. Upload the distribution packages to the GitHub release
5. Publish the release

### 5. Verify the Release

After publishing:

1. Check the GitHub repository to ensure the release was created
2. Verify that all assets were uploaded correctly
3. Add detailed release notes to the GitHub release
4. Test the update process by installing a previous version and checking for updates

## Advanced Configuration

### Custom Release Notes

To provide custom release notes:

1. Create a `notes.md` file in the project root
2. Add your release notes in Markdown format
3. Use the `--releaseNotes=notes.md` option when running the release command:

```bash
npm run release -- --releaseNotes=notes.md
```

### Release Channels

For more advanced release management, you can use channels:

```json
"publish": [
  {
    "provider": "github",
    "owner": "Isuldra",
    "repo": "Suppliers",
    "channel": "latest"
  }
]
```

Common channels include:

- `latest`: Standard release channel
- `beta`: Pre-release channel for testing
- `alpha`: Early access channel for internal testing

To publish to a specific channel:

```bash
npm run release -- --channel=beta
```

### Staged Rollout

For large user bases, consider a staged rollout approach:

1. Release to a small percentage of users first
2. Monitor for issues
3. Gradually increase the percentage
4. Release to all users when confident

## Troubleshooting

### Common Issues

#### Release Fails with Authentication Error

- Ensure your GitHub token is correctly set
- Check that the token has the correct permissions
- Verify the token hasn't expired

#### Assets Not Uploading

- Check for network issues
- Ensure file paths are correct
- Verify GitHub release asset size limits

#### Users Not Receiving Updates

- Check that the version number was incremented
- Verify that the release was published correctly
- Test the update process manually

## Best Practices

1. **Maintain a Changelog**: Document all changes for each release
2. **Test Before Publishing**: Always test updates locally before publishing
3. **Communicate Updates**: Inform users about new features and changes
4. **Versioning Strategy**: Use semantic versioning consistently
5. **Backup**: Always backup your code and environment before publishing
6. **Release Schedule**: Establish a regular release schedule
7. **Rollback Plan**: Have a plan for rolling back problematic updates

## Reference

- [Electron Builder Documentation](https://www.electron.build/)
- [Electron Updater Documentation](https://www.electron.build/auto-update)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Semantic Versioning](https://semver.org/)
