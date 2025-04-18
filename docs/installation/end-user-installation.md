# End User Installation Guide

This guide provides step-by-step instructions for installing Supplier Reminder Pro for individual users.

## Installation Options

You have three options for installing Supplier Reminder Pro:

1. **Standard Installation (NSIS)** - Recommended for most users
2. **MSI Installation** - Alternative installation method
3. **Portable Version** - No installation required, run directly from any location

## Standard Installation (Recommended)

### Prerequisites

- Windows 10 or 11 (64-bit)
- 500 MB available disk space
- Standard user account (administrator rights optional)

### Installation Steps

1. **Download the Installer**

   - Locate the `Supplier-Reminder-Pro-[version]-setup.exe` file
   - If downloaded from the internet, you may need to unblock the file:
     - Right-click the file
     - Select "Properties"
     - Check "Unblock" and click "OK"

2. **Run the Installer**

   - Double-click the `Supplier-Reminder-Pro-[version]-setup.exe` file
   - If prompted by User Account Control, click "Yes" to allow the installer to run

3. **Select Installation Type**

   - You will be presented with two options:
     - **"Install for all users"** (requires administrator rights)
     - **"Install for current user only"** (no administrator rights required)
   - Select "Install for current user only" if you don't have administrator rights

4. **Choose Installation Location**

   - You can keep the default location or choose a custom location
   - For "current user only" installations, the default location is:
     `C:\Users\[YourUsername]\AppData\Local\Programs\SupplierReminderPro`

5. **Select Additional Options**

   - Choose whether to create a desktop shortcut
   - Choose whether to create a start menu shortcut
   - Both options are recommended and selected by default

6. **Complete Installation**

   - Click "Install" to begin the installation
   - Wait for the installation to complete
   - Click "Finish" when done

7. **Launch the Application**
   - The application can be launched from:
     - The desktop shortcut (if created)
     - The Start Menu (if a shortcut was created)
     - The installation directory

## MSI Installation

The MSI installation process is similar to the standard installation but uses the Windows Installer technology.

### Installation Steps

1. **Download the MSI Package**

   - Locate the `Supplier-Reminder-Pro-[version]-Setup.msi` file

2. **Run the Installer**

   - Double-click the MSI file
   - Follow the installation wizard prompts
   - The MSI installation is configured for current user and doesn't require administrator rights

3. **Complete Installation**
   - Click "Finish" when the installation is complete

## Portable Version

The portable version requires no installation and can be run from any location, including USB drives.

### Using the Portable Version

1. **Download the Portable Package**

   - Locate the `Supplier-Reminder-Pro-Portable.zip` file

2. **Extract the Package**

   - Right-click the ZIP file and select "Extract All..."
   - Choose a destination folder
   - Click "Extract"

3. **Run the Application**

   - Navigate to the extracted folder
   - Double-click `Supplier Reminder Pro.exe` to run the application
   - No installation or administrator rights are required

4. **Save Location Note**
   - The portable version stores all data in the `data` folder next to the executable
   - To keep your data, ensure you don't delete this folder
   - When moving the application, move the entire folder structure

## Post-Installation Steps

After installing Supplier Reminder Pro:

1. **Initial Configuration**

   - On first launch, you may be prompted to configure basic settings
   - Follow the on-screen instructions to complete the setup

2. **Check for Updates**

   - It's a good idea to check for updates after installation
   - Go to Help > Check for Updates
   - Updates will be installed automatically if available

3. **Explore the Application**
   - Familiarize yourself with the user interface
   - Review the [Getting Started Guide](../usage/getting-started.md) for basic usage instructions

## Troubleshooting Installation Issues

If you encounter issues during installation:

- **Installer Won't Run**: Ensure the file is unblocked (see Step 1)
- **Access Denied**: Try the "current user only" installation option
- **Application Won't Start**: Check the logs at `%USERPROFILE%\AppData\Roaming\Supplier Reminder Pro\logs\`
- **MSI Installation Fails**: Try the standard installer or portable version

For more troubleshooting information, see the [Installation Troubleshooting Guide](../troubleshooting/installation-issues.md).

## Uninstallation

To uninstall Supplier Reminder Pro:

1. **Using Windows Settings**

   - Open Windows Settings
   - Go to Apps > Apps & features
   - Find "Supplier Reminder Pro" in the list
   - Click on it and select "Uninstall"
   - Follow the uninstallation prompts

2. **Using Control Panel**
   - Open Control Panel
   - Go to Programs > Programs and Features
   - Find "Supplier Reminder Pro" in the list
   - Right-click and select "Uninstall"
   - Follow the uninstallation prompts

Note: The portable version can be "uninstalled" by simply deleting the folder containing the application.
