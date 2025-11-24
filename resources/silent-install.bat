@echo off
:: Silent Installation Batch Wrapper for Pulse
:: This batch file can be used to invoke the PowerShell script with elevated privileges

setlocal enabledelayedexpansion

:: Check for administrative privileges
NET SESSION >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Administrator privileges required. Attempting to elevate...
    goto :ELEVATE
) else (
    goto :ADMIN
)

:ELEVATE
echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\elevate.vbs"
echo UAC.ShellExecute "%~f0", "", "", "runas", 1 >> "%temp%\elevate.vbs"
"%temp%\elevate.vbs"
del "%temp%\elevate.vbs"
exit /b

:ADMIN
:: Parse command line arguments
set INSTALLER_PATH=.\Pulse-1.4.2-setup.exe
set INSTALL_DIR=C:\Program Files\Pulse
set FORCE=
set NOWAIT=
set UNINSTALL=

:PARSE_ARGS
if "%~1"=="" goto :END_PARSE
if /i "%~1"=="-installer" set "INSTALLER_PATH=%~2" & shift & shift & goto :PARSE_ARGS
if /i "%~1"=="-dir" set "INSTALL_DIR=%~2" & shift & shift & goto :PARSE_ARGS
if /i "%~1"=="-force" set "FORCE=-Force" & shift & goto :PARSE_ARGS
if /i "%~1"=="-nowait" set "NOWAIT=-NoWait" & shift & goto :PARSE_ARGS
if /i "%~1"=="-uninstall" set "UNINSTALL=-Uninstall" & shift & goto :PARSE_ARGS
shift
goto :PARSE_ARGS

:END_PARSE
:: Execute PowerShell script with arguments
powershell.exe -ExecutionPolicy Bypass -File "%~dp0silent-install.ps1" -InstallerPath "%INSTALLER_PATH%" -InstallDir "%INSTALL_DIR%" %FORCE% %NOWAIT% %UNINSTALL%

exit /b %ERRORLEVEL%

:: Example usage:
:: silent-install.bat -installer "C:\Downloads\Supplier-Reminder-Pro-1.0.0-setup.exe" -dir "D:\Apps\SupplierReminder" -force
:: silent-install.bat -uninstall 