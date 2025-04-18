# Supplier Reminder Pro - Silent Installation Script
# This script installs the application without requiring admin rights

# Configuration
$installerName = "Supplier-Reminder-Pro-1.0.0-setup.exe"
$installDir = "$env:LOCALAPPDATA\Programs\SupplierReminderPro"

# Check if installer exists in current directory
if (-not (Test-Path $installerName)) {
    Write-Host "Error: Installer not found in current directory!" -ForegroundColor Red
    Write-Host "Please make sure '$installerName' is in the same folder as this script." -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    [void][System.Console]::ReadKey($true)
    exit 1
}

# Inform user about installation
Write-Host "Installing Supplier Reminder Pro..." -ForegroundColor Cyan
Write-Host "Installation directory: $installDir" -ForegroundColor Cyan

# Create installation directory if it doesn't exist
if (-not (Test-Path $installDir)) {
    Write-Host "Creating installation directory..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

# Run installer silently for current user only (no admin required)
Write-Host "Running installer..." -ForegroundColor Gray
try {
    Start-Process -Wait -FilePath ".\$installerName" -ArgumentList "/CURRENTUSER /S /D=$installDir"
    
    # Check if installation was successful
    $appExe = "$installDir\Supplier Reminder Pro.exe"
    if (Test-Path $appExe) {
        Write-Host "Installation completed successfully!" -ForegroundColor Green
        Write-Host "You can now find the application in your Start Menu." -ForegroundColor Green
    } else {
        Write-Host "Warning: Installation may not have completed correctly." -ForegroundColor Yellow
        Write-Host "Please check if the application was installed properly." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error during installation: $_" -ForegroundColor Red
}

Write-Host "Press any key to exit..."
[void][System.Console]::ReadKey($true) 