# Windows-signering

Repoets `package.json` og release-workflow angir ikke et signeringssertifikat. Byggeloggens omtale av signering er ikke bevis på at et bestemt release-artefakt har en gyldig utgiversignatur.

## Kontrollere en fil

På Windows:

```powershell
Get-AuthenticodeSignature -LiteralPath '.\release\Pulse-X.Y.Z-setup.exe' |
  Format-List Status, StatusMessage, SignerCertificate
```

Bytt ut versjonen med filen du kontrollerer. Kontroller også portable-filen hvis den skal distribueres. Kommandoen er beskrevet i [Microsofts dokumentasjon](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-authenticodesignature).

## Ta i bruk signering

Avklar sertifikat og tillatt signeringstjeneste med den som eier Windows-distribusjonen. Konfigurer electron-builder og CI ut fra den valgte løsningen, og hold nøkler og passord utenfor Git.

Etter konfigurering må den faktisk bygde filen kontrolleres for riktig utgiver og gyldig signatur før opplasting. Hash og størrelse til oppdateringsmetadata skal beregnes fra den endelige, signerte filen.

En gyldig signatur dokumenterer utgiver og filintegritet. Den er ingen garanti for at Windows SmartScreen eller virksomhetens programvarepolicy godtar appen. Ved blokkering brukes organisasjonens vanlige godkjenningsprosess.
