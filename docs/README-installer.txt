===================================
SUPPLYCHAIN ONEMED - INSTALLATION
===================================

This package contains the SupplyChain OneMed application installer for Windows.
The application can be installed WITHOUT administrator rights.

PACKAGE CONTENTS:
----------------
1. SupplyChain-OneMed-[version]-setup.exe - The application installer (replace [version] with actual version)
2. install-supplychain-onemed.ps1 - Optional PowerShell script for silent installation
3. README.txt - This file

INSTALLATION OPTIONS:
-------------------

OPTION 1: STANDARD INSTALLATION (Recommended for most users)
------------------------------------------------------------
1. Double-click the "SupplyChain-OneMed-[version]-setup.exe" file
2. When prompted, select "Install for current user only" (unless admin rights are available and desired)
3. Follow the installation wizard prompts
4. The application will be available in your Start Menu and potentially Desktop when installation completes

OPTION 2: SILENT INSTALLATION USING POWERSHELL (if script provided)
-----------------------------------------------------------------
1. Right-click the "install-supplychain-onemed.ps1" file
2. Select "Run with PowerShell"
3. The script will attempt to install the application silently without user input.
4. The application will typically be installed to: %LOCALAPPDATA%\Programs\SupplyChainOneMed
   (e.g., C:\Users\[YourUsername]\AppData\Local\Programs\SupplyChainOneMed)

TROUBLESHOOTING:
--------------
- If you receive an error about PowerShell execution policy preventing the script from running, open PowerShell as a regular user and run:
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass -Force
  (Use caution when bypassing execution policies.)

- If the installation fails, try the Standard Installation (Option 1) which provides more feedback.

- For further assistance, contact your IT department or the application support team.

===================================
      OneMed © 2024
=================================== 