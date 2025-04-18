# Supplier Reminder Pro - Portable Version

This document explains how to create and distribute a portable version of Supplier Reminder Pro that can run without installation on Windows computers.

## What is the Portable Version?

The portable version:

- Runs directly from a folder without installation
- Stores all data in its own directory structure
- Does not modify the Windows registry
- Can be run without administrator rights
- Can be moved between computers on a USB drive

## Creating the Portable Version

Due to native dependencies (better-sqlite3, sqlite3), the portable version must be built on a Windows machine:

1. Clone the repository to a Windows computer
2. Install Node.js and npm
3. Install dependencies:
   ```
   npm install
   ```
4. Run the portable build script:
   ```
   npm run portable
   ```
5. The portable version will be created in the `portable` directory

## How the Portable Version Works

The portable version differs from the installed version in these ways:

1. **Data Location**: Instead of storing data in the user's AppData folder, it stores all data in a `data` subfolder next to the executable
2. **No Installation Required**: Just extract the ZIP file and run the application
3. **Self-Contained**: All dependencies are included in the package

## Distributing the Portable Version

To distribute the portable version:

1. Share the `Supplier-Reminder-Pro-Portable.zip` file with users
2. Users can extract it to any location where they have write access:
   - Their Documents folder
   - A USB drive
   - Any folder on their computer

## Instructions for Users

Include these instructions for users:

1. Extract the ZIP file to a location of your choice
2. Run `Run-Supplier-Reminder-Pro.bat` or `Supplier Reminder Pro.exe` to start the application
3. The application will create and use a `data` folder next to the executable for storing all information
4. To move the application, move the entire folder including the `data` directory

## Limitations

The portable version has a few limitations:

1. It doesn't create Start Menu shortcuts
2. It doesn't appear in Programs and Features
3. It can't be updated automatically (users need to replace the entire folder with a new version)

## Troubleshooting

If users encounter issues:

1. Ensure they extracted the entire ZIP file, not just the executable
2. Verify they have write access to the folder where the application is running
3. If the application won't start, check that all required DLLs are present in the application folder
