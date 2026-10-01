# Stille installasjon på Windows

NSIS-pakken installeres per bruker. Kjør installasjonen i brukerens sesjon; en opphøyet eller annen konto kan gi installasjon i feil profil.

Bygg med `bun run dist:nsis`. Filen ligger som `release/Pulse-X.Y.Z-setup.exe`.

## Installere

Fra repoets rot:

```powershell
.\resources\silent-install.ps1 -InstallerPath '.\release\Pulse-X.Y.Z-setup.exe'
```

Valgfri `-InstallDir` overstyrer standardmappen under `%LOCALAPPDATA%\Programs\Pulse`. Skriptet starter NSIS med `/S` og venter på exit-koden. `/D=` legges sist, slik NSIS forventer.

Batch-filen videresender de samme PowerShell-argumentene:

```bat
resources\silent-install.bat -InstallerPath ".\release\Pulse-X.Y.Z-setup.exe"
```

Skriptet ber ikke om administratorrettigheter og avinstallerer ikke en eksisterende utgave først. Installerens egen oppgraderingsflyt håndterer oppdatering.

## Kontroll og avinstallasjon

Kontroller versjonen i appen eller brukerens Windows-innstillinger for installerte programmer. Avinstaller derfra.

Brukerdata beholdes av NSIS-konfigurasjonen. Bevar både SQLite og appprofilen før eventuell manuell flytting; [sendingshistorikken ligger separat](../docs/features/database.md).

Se [distribusjonsguiden](../docs/distribution/DISTRIBUTION.md) for forskjellen mellom installer, portable og MSI.
