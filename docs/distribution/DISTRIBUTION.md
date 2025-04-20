# Distribution Guide for SupplyChain OneMed

This document provides instructions for building the application on Windows.

## Building the Application on Windows

Due to native dependencies (`better-sqlite3`), the application should ideally be built on Windows to create a valid Windows installer and portable executable.

### Prerequisites

1.  Install Node.js and npm on a Windows machine.
2.  Clone the repository or transfer the code to the Windows machine.
3.  Install build tools (if not already installed via other means, e.g., Visual Studio):
    ```bash
    # May require administrator privileges
    npm install --global --production windows-build-tools
    ```
    _Note: `windows-build-tools` installation can sometimes be problematic. Ensure Python and C++ build tools are available._

### Building Steps

1.  Open Command Prompt or PowerShell on the Windows machine.
2.  Navigate to the project directory.
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Build the application and create the installer/portable versions (check `package.json` scripts like `dist:win`, `dist:portable`):

    ```bash
    # Example: Build standard installer (NSIS assumed)
    npm run dist:win

    # Example: Build portable version
    npm run dist:portable
    ```

5.  The artifacts will typically be created in the `release` folder (defined in `package.json` > `build.directories.output`). Based on the current `package.json` configuration (`build.win.artifactName`, `build.portable.artifactName`), the filenames will be similar to:
    - Installer: **`OneMed SupplyChain-[version]-setup.exe`**
    - Portable: **`OneMed SupplyChain-Portable.exe`**

## Distribution

Once built (often via automated GitHub Actions), the desired artifact (installer or portable `.exe`) can be distributed to users via:

- File sharing services (OneDrive, Dropbox, Google Drive)
- Internal file server
- Email (if size permits)
- GitHub Releases page

## Notes for Users

- **Installer:** Users can run the `OneMed SupplyChain-[version]-setup.exe` installer directly. They should choose the option "Install for current user only" if prompted, which typically does not require administrator rights.
- **Portable:** The `OneMed SupplyChain-Portable.exe` can be run directly without installation. All application data will still be stored in the standard user data location (`%LOCALAPPDATA%\one-med-supplychain-app`).

## Troubleshooting

- If users report issues with the installer requiring admin rights, ensure the build configuration (e.g., `nsis.perMachine` in `package.json`) is set to `false`.
- If native dependencies cause issues on user machines, ensure the application was built on Windows with the same architecture (x64) as the target machines.
