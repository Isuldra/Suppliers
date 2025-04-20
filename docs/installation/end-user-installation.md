# SupplyChain OneMed Installation Guide

This guide provides step-by-step instructions for installing the SupplyChain OneMed application, covering options for end-users and notes relevant for IT administrators.

## System Requirements

Before installing SupplyChain OneMed, ensure your system meets the following requirements:

- **Operating System**:

  - Windows 10/11 (64-bit recommended)
  - macOS 10.13 or later (Note: Installation steps below are Windows-focused)

- **Hardware**:

  - Processor: 1.6 GHz or faster
  - Memory: 4 GB RAM minimum, 8 GB recommended
  - Disk Space: 500 MB available
  - Display: 1280x720 resolution or higher

- **Software**:
  - Internet connection for automatic updates (optional but recommended)

## Installation Options

You may receive SupplyChain OneMed in one of the following formats:

1. **Standard Installation (NSIS `.exe`)** - Recommended for most users.
2. **MSI Installation (`.msi`)** - Alternative installation method (if provided).
3. **Portable Version (`.exe`)** - No installation required, run directly (if provided).

## Standard Installation (Recommended)

### Prerequisites

- Windows 10 or 11 (64-bit recommended)
- 500 MB available disk space
- Standard user account (administrator rights optional)

### Installation Steps

1. **Download the Installer**

   - Obtain the installer file, typically named **`OneMed SupplyChain-[version]-setup.exe`**.
   - If you downloaded the installer, Windows might block it. To unblock:
     - Right-click the downloaded `.exe` file -> Properties.
     - On the General tab, check the "Unblock" box (if present) and click OK.

2. **Run the Installer**

   - Double-click the `.exe` file.
   - Click "Yes" if prompted by User Account Control (UAC).

3. **Select Installation Type**

   - The installer will likely ask whether to install for:
     - "Install for all users" (Requires admin rights).
     - **"Install for current user only"** (Does **not** require admin rights).
   - Choose **"Install for current user only"** unless instructed otherwise by IT.

4. **Choose Installation Location**

   - You can usually accept the default location or click "Browse".
   - For a "current user only" installation, the default is typically within your user profile, e.g.:
     `%LOCALAPPDATA%\Programs\SupplyChainOneMed`
     _(The exact folder name might vary slightly. `%LOCALAPPDATA%` usually expands to `C:\Users\[YourUsername]\AppData\Local`)_.

5. **Select Additional Options (Optional)**

   - You might be asked to create Desktop or Start Menu shortcuts (Recommended).

6. **Complete Installation**

   - Click "Install", wait for completion, then click "Finish".

7. **Launch the Application**
   - Use the Desktop or Start Menu shortcuts, or run the `.exe` from the installation folder.

## MSI Installation

_(Note: MSI installers may not always be provided.)_

### Installation Steps

1. **Download the MSI Package**

   - Obtain the MSI file, typically named **`OneMed SupplyChain-[version]-Setup.msi`**.

2. **Run the Installer**

   - Double-click the MSI file.
   - Follow the wizard prompts (usually installs for the current user without admin rights by default).

3. **Complete Installation**
   - Click "Finish" when complete.

## Portable Version

_(Note: A portable version may not always be provided.)_

The portable version requires no installation.

### Using the Portable Version

1. **Obtain the Portable Executable**

   - Obtain the portable `.exe` file, typically named **`OneMed SupplyChain-Portable.exe`**.

2. **Place the Executable**

   - Place the `.exe` file in any location where you have permission to run programs (e.g., Desktop, Documents, USB drive).

3. **Run the Application**

   - Double-click the `OneMed SupplyChain-Portable.exe` file to start.
   - No installation or admin rights are needed.

4. **Data Storage Location**

   - The portable version does **NOT** store its data (database, logs) in the same folder as the `.exe`.
   - It uses the standard user application data folder, typically:
     `%LOCALAPPDATA%\one-med-supplychain-app` on Windows.
   - This means your data stays on the specific computer and user profile where you run the application.

## Post-Installation Steps

After installing or running for the first time:

1. **Initial Configuration**

   - The application might guide you through selecting the master Excel file.
   - Follow on-screen prompts.

2. **Check for Updates**

   - Recommended. Look for "Check for Updates" in the Help menu.

## Troubleshooting Installation Issues

- **Installer Won't Run / Blocked**: Ensure the downloaded `.exe` file is "unblocked" (see Standard Installation Step 1).
- **"Access Denied" Errors**: If installing, ensure you chose "Install for current user only" if you lack admin rights.
- **Application Fails to Start**: Check logs for errors. Logs are typically in:
  `%APPDATA%\one-med-supplychain-app\logs\`
  _(You can paste this path into the Windows Explorer address bar. `%APPDATA%` usually maps to `C:\Users\[YourUsername]\AppData\Roaming`)_.
- **MSI Issues**: Try the standard `.exe` installer if the MSI fails.

## Uninstallation

1. **Installed Versions (NSIS/MSI)**:

   - Use Windows Settings (Apps > Apps & features) or Control Panel (Programs and Features) to find and uninstall "OneMed SupplyChain".

2. **Portable Version**:
   - Simply delete the `OneMed SupplyChain-Portable.exe` file.
   - Note: Your application data remains in the AppData folder unless manually deleted.
