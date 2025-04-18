# Distribution Guide for Supplier Reminder Pro

This document provides instructions for building the application on Windows and creating a distribution package for users.

## Building the Application on Windows

Due to native dependencies (better-sqlite3, sqlite3), the application must be built on Windows to create a valid Windows installer.

### Prerequisites

1. Install Node.js and npm on a Windows machine
2. Clone the repository or transfer the code to the Windows machine
3. Install build tools (if not already installed):
   ```
   npm install --global --production windows-build-tools
   ```

### Building Steps

1. Open Command Prompt or PowerShell on the Windows machine
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```
4. Build the application and create the installer:
   ```
   npm run dist:win
   ```
5. The installer will be created in the `release` folder as `Supplier-Reminder-Pro-1.0.0-setup.exe`

## Creating the Distribution Package

Once you have the Windows installer, create a distribution package that users can easily install without admin rights:

1. Copy the following files to a new folder:

   - `release/Supplier-Reminder-Pro-1.0.0-setup.exe` - The Windows installer
   - `install-reminder-pro.ps1` - The PowerShell installation script
   - `README.txt` - Installation instructions

2. Create a ZIP archive of this folder using any compression tool:

   - Windows Explorer: Right-click the folder > Send to > Compressed (zipped) folder
   - 7-Zip: Right-click the folder > 7-Zip > Add to archive...

3. Name the ZIP file something like `SupplierReminderPro-1.0.0-Install.zip`

4. Share this ZIP file with users via:
   - File sharing services (OneDrive, Dropbox, Google Drive)
   - Internal file server
   - Email (if size permits)

## Notes for Users

- The application can be installed without admin rights using the PowerShell script
- The default installation location is `%LOCALAPPDATA%\Programs\SupplierReminderPro`
- Users can also run the installer directly and choose "Install for current user only"

## Troubleshooting

- If users report issues with PowerShell execution policy, they may need to run:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass -Force
  ```
- If native dependencies cause issues, ensure the application was built on Windows with the same architecture (x64) as the target machines
