param (
    [Parameter(Mandatory = $true)]
    [string]$InstallerPath,
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'Programs\Pulse')
)

$ErrorActionPreference = 'Stop'
$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) {
    throw "Installer is not a file: $installer"
}
if (-not [IO.Path]::IsPathRooted($InstallDir) -or $InstallDir -match '[\r\n]') {
    throw 'InstallDir must be an absolute path without line breaks.'
}

# NSIS reads the unquoted /D argument through the end of the command line.
$process = Start-Process -FilePath $installer -ArgumentList "/S /D=$InstallDir" -WindowStyle Hidden -Wait -PassThru
exit $process.ExitCode
