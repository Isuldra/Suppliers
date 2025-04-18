# Supplier Reminder Pro - Deployment Guide

This document provides instructions for deploying Supplier Reminder Pro silently via PowerShell or batch scripts, which is especially useful for enterprise environments.

## Building the Windows Installer

To build the Windows installer package, run:

```bash
npm run dist:win
```

This will create an NSIS installer in the `release` directory, named something like `Supplier-Reminder-Pro-1.0.0-setup.exe`.

## Silent Installation Options

The installer supports the following silent installation options:

- `/S` - Silent installation (required for unattended install)
- `/D=<path>` - Installation directory (must be the last parameter)

## Deployment Methods

### Method 1: Direct Command Line

You can deploy silently directly from the command line:

```powershell
# PowerShell
Start-Process -Wait -FilePath "Supplier-Reminder-Pro-1.0.0-setup.exe" -ArgumentList "/S /D=C:\Program Files\Supplier Reminder Pro"
```

```batch
REM Command Prompt/Batch
"Supplier-Reminder-Pro-1.0.0-setup.exe" /S /D="C:\Program Files\Supplier Reminder Pro"
```

### Method 2: Using the Provided PowerShell Script

We provide a PowerShell script (`silent-install.ps1`) that handles common deployment scenarios:

```powershell
# Basic installation with defaults
.\silent-install.ps1

# Install to a custom directory
.\silent-install.ps1 -InstallerPath "C:\Path\To\Installer.exe" -InstallDir "D:\Custom\Path"

# Force reinstallation (uninstalls first if already installed)
.\silent-install.ps1 -Force

# Install without waiting for completion
.\silent-install.ps1 -NoWait

# Uninstall the application
.\silent-install.ps1 -Uninstall
```

### Method 3: Using the Batch Wrapper

For environments where PowerShell execution might be restricted, use the batch wrapper:

```batch
REM Basic installation
silent-install.bat

REM Custom installation
silent-install.bat -installer "C:\Path\To\Installer.exe" -dir "D:\Custom\Path" -force

REM Uninstall
silent-install.bat -uninstall
```

## Group Policy Deployment

For domain environments, you can deploy using Group Policy:

1. Place the installer on a network share accessible to target computers
2. Create a Group Policy Object (GPO)
3. Add a Startup/Logon script that runs the silent installation

Example GPO script:

```powershell
# Check if already installed
if (-not (Test-Path "C:\Program Files\Supplier Reminder Pro\Supplier Reminder Pro.exe")) {
    # Install silently
    Start-Process -Wait -FilePath "\\server\share\Supplier-Reminder-Pro-1.0.0-setup.exe" -ArgumentList "/S"
}
```

## Checking Installation Status

To verify installation status via PowerShell:

```powershell
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
    Where-Object { $_.DisplayName -eq "Supplier Reminder Pro" } |
    Select-Object DisplayName, DisplayVersion, InstallLocation
```

## Uninstallation

Silent uninstallation can be performed with:

```powershell
# Find uninstaller
$uninstaller = (Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
    Where-Object { $_.DisplayName -eq "Supplier Reminder Pro" }).UninstallString

# Run uninstaller silently
if ($uninstaller) {
    $uninstaller = $uninstaller + " /S"
    Start-Process -Wait -FilePath "cmd.exe" -ArgumentList "/c $uninstaller"
}
```

## Troubleshooting

If you encounter issues with silent installation:

1. Check installation logs in `%TEMP%\Supplier Reminder Pro-Install-Log.txt`
2. Verify the system meets the minimum requirements
3. Ensure the user has administrator privileges
4. Check if antivirus is blocking the installation
