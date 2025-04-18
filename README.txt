===================================
SUPPLIER REMINDER PRO - INSTALLATION
===================================

This package contains the Supplier Reminder Pro application installer for Windows.
The application can be installed WITHOUT administrator rights.

PACKAGE CONTENTS:
----------------
1. Supplier-Reminder-Pro-1.0.0-setup.exe - The application installer
2. install-reminder-pro.ps1 - PowerShell script for silent installation
3. README.txt - This file

INSTALLATION OPTIONS:
-------------------

OPTION 1: STANDARD INSTALLATION (Recommended for most users)
------------------------------------------------------------
1. Double-click the "Supplier-Reminder-Pro-1.0.0-setup.exe" file
2. When prompted, select "Install for current user only"
3. Follow the installation wizard prompts
4. The application will be available in your Start Menu when installation completes

OPTION 2: SILENT INSTALLATION USING POWERSHELL
----------------------------------------------
1. Right-click the "install-reminder-pro.ps1" file
2. Select "Run with PowerShell"
3. The script will install the application silently without requiring user input
4. The application will be installed to: %LOCALAPPDATA%\Programs\SupplierReminderPro
   (Typically C:\Users\[YourUsername]\AppData\Local\Programs\SupplierReminderPro)

TROUBLESHOOTING:
--------------
- If you receive an error about PowerShell execution policy, open PowerShell as a regular user and run:
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass -Force

- If the installation fails, ensure you're using the script for current user installation without admin rights.

- For further assistance, contact your IT department or the application support team.

===================================
      OneMed © 2024
=================================== 