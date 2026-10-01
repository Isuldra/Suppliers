@echo off
powershell.exe -NoProfile -File "%~dp0silent-install.ps1" %*
exit /b %ERRORLEVEL%
