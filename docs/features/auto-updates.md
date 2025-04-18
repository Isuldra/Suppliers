# Automatic Updates

Supplier Reminder Pro includes a built-in automatic update system that ensures users always have access to the latest version of the application. This document provides detailed information about how the update system works.

## How Updates Work

The automatic update system is built using `electron-updater`, which provides a reliable, cross-platform way to deliver updates to Electron applications. The update process follows these steps:

1. **Update Check**:

   - The application checks for updates at startup (with a 10-second delay)
   - The application also checks for updates every hour
   - Users can trigger a manual update check from the application menu

2. **Update Detection**:

   - When an update is available, a notification is shown to the user
   - The notification includes the new version number

3. **Download Process**:

   - Updates are automatically downloaded in the background
   - Users see a progress indicator during the download
   - Download errors are reported to the user

4. **Installation**:
   - After the update is downloaded, users are prompted to install it
   - Users can choose to install immediately or defer the update
   - If installed immediately, the application will restart with the new version
   - If deferred, the update will be installed when the application exits

## Update Configuration

The update system is configured in the application's `package.json` file:

```json
"publish": [
  {
    "provider": "github",
    "owner": "Isuldra",
    "repo": "Suppliers"
  }
]
```

Updates are distributed through GitHub releases. Each release includes:

- Windows installers (NSIS, MSI)
- Portable application package
- Release notes
- Version information

## User Permission Requirements

The permission requirements for installing updates depend on how the application was originally installed:

| Installation Method         | Admin Rights for Updates | Notes                                            |
| --------------------------- | ------------------------ | ------------------------------------------------ |
| MSI (per-user installation) | Not required             | Updates work without administrator privileges    |
| NSIS (per-machine)          | Required                 | Updates need the same privileges as installation |
| NSIS (current user only)    | Not required             | Updates work without administrator privileges    |
| Portable                    | Not required             | Portable version can update without admin rights |

## Implementation Details

The auto-update functionality is implemented in the following files:

- `src/main/auto-updater.ts`: Main implementation of the update system
- `src/main/main.ts`: Initialization of the update system
- `src/preload/index.ts`: Preload script that exposes update functions to the renderer
- `src/types/electron-updater.d.ts`: TypeScript definitions for the electron-updater module

### Auto-updater Implementation

The `auto-updater.ts` file configures the update system and sets up event handlers for various update stages:

```typescript
// Configuration
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Event Handlers
autoUpdater.on("checking-for-update", () => { ... });
autoUpdater.on("update-not-available", (info: UpdateInfo) => { ... });
autoUpdater.on("update-available", (info: UpdateInfo) => { ... });
autoUpdater.on("download-progress", (progressObj: ProgressInfo) => { ... });
autoUpdater.on("update-downloaded", (info: UpdateInfo) => { ... });
autoUpdater.on("error", (error: Error) => { ... });
```

## Manual Update Check

Users can manually check for updates using the following methods:

1. **From the Help Menu**:

   - Open the application
   - Click on Help > Check for Updates

2. **From the Settings Panel**:
   - Open the application
   - Navigate to Settings
   - Click the "Check for Updates" button

The manual update check uses the `checkForUpdatesManually()` function, which returns a Promise with the update check result.

## Creating and Publishing Updates

To create and publish an update:

1. **Update the version number**:

   - Edit `package.json` and increment the `version` field
   - Follow semantic versioning (MAJOR.MINOR.PATCH)

2. **Build the application**:

   - Run `npm run build`
   - Test the build to ensure it works correctly

3. **Create installers**:

   - Run `npm run dist` to create all installers

4. **Publish the update**:
   - Run `npm run release` to build and publish the update
   - This command will:
     - Build the application
     - Create installers
     - Upload the release to GitHub
     - Create a new release tag

## Troubleshooting Updates

If users encounter issues with updates:

1. **Update Not Showing**:

   - Check internet connectivity
   - Verify GitHub repository accessibility
   - Ensure the version number was incremented
   - Check GitHub release configuration

2. **Update Download Fails**:

   - Check internet connectivity
   - Verify firewall settings
   - Check available disk space
   - Review application logs for specific errors

3. **Update Install Fails**:
   - Verify user permissions
   - Check for running processes locking files
   - Review application logs

Logs related to updates can be found in the application's log files:

- Windows: `%USERPROFILE%\AppData\Roaming\Supplier Reminder Pro\logs\main.log`
- macOS: `~/Library/Logs/Supplier Reminder Pro/main.log`

## Disabling Updates

In certain controlled environments, administrators may want to disable automatic updates:

1. **Development Environment**:

   - Updates are automatically disabled in development mode

2. **Managed Environment**:
   - Create a configuration file to disable updates
   - Use group policy to block update endpoints
   - Use network rules to block connections to update servers

## Additional Resources

- [Electron Updater Documentation](https://www.electron.build/auto-update)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
