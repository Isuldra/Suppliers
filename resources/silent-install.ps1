# Silent Installation Script for Pulse
# This PowerShell script demonstrates how to silently install the application

param (
    [string]$InstallerPath = ".\Pulse-1.4.2-setup.exe",
    [string]$InstallDir = "C:\Program Files\Pulse",
    [switch]$Force = $false,
    [switch]$NoWait = $false,
    [switch]$Uninstall = $false
)

# Function to check if app is already installed
function Test-AppInstalled {
    $installed = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | 
        Where-Object { $_.DisplayName -eq "Pulse" }
    return $null -ne $installed
}

# Function to uninstall existing app
function Uninstall-App {
    Write-Host "Uninstalling existing Pulse..."
    $uninstallString = (Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | 
        Where-Object { $_.DisplayName -eq "Pulse" }).QuietUninstallString
    
    if ($null -ne $uninstallString) {
        Start-Process -Wait -FilePath "cmd.exe" -ArgumentList "/c $uninstallString"
        Write-Host "Uninstallation completed."
    } else {
        Write-Host "Uninstall string not found. The application may not be installed properly."
    }
}

# Main script
if ($Uninstall) {
    if (Test-AppInstalled) {
        Uninstall-App
    } else {
        Write-Host "Pulse is not installed. Nothing to uninstall."
    }
    exit 0
}

# Check if installer exists
if (-not (Test-Path $InstallerPath)) {
    Write-Error "Installer not found at path: $InstallerPath"
    exit 1
}

# Check if app is already installed
if (Test-AppInstalled) {
    if ($Force) {
        Write-Host "Application already installed. Force flag set, uninstalling first..."
        Uninstall-App
    } else {
        Write-Host "Application is already installed. Use -Force to reinstall."
        exit 0
    }
}

# Create install directory if it doesn't exist
$installDirParent = Split-Path -Parent $InstallDir
if (-not (Test-Path $installDirParent)) {
    New-Item -ItemType Directory -Path $installDirParent -Force | Out-Null
}

# Install silently
Write-Host "Installing Pulse silently to $InstallDir..."
$arguments = "/S /D=$InstallDir"

if ($NoWait) {
    # Start the installation without waiting
    Start-Process -FilePath $InstallerPath -ArgumentList $arguments -NoNewWindow
    Write-Host "Installation started. Not waiting for completion due to -NoWait flag."
} else {
    # Start the installation and wait for completion
    $process = Start-Process -FilePath $InstallerPath -ArgumentList $arguments -NoNewWindow -PassThru
    $process.WaitForExit()
    
    $exitCode = $process.ExitCode
    if ($exitCode -eq 0) {
        Write-Host "Installation completed successfully."
    } else {
        Write-Error "Installation failed with exit code: $exitCode"
        exit $exitCode
    }
}

# Example usage:
# .\silent-install.ps1 -InstallerPath "C:\Downloads\Pulse-1.4.2-setup.exe" -InstallDir "D:\Apps\Pulse" -Force
# .\silent-install.ps1 -Uninstall 