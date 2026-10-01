# Windows-distribusjon

Pulse bygges for Windows x64. E-postsending krever Outlook med COM-støtte og riktige postkasserettigheter.

## Velge pakke

| Pakke                   | Bruk                                        | Oppdatering                           |
| ----------------------- | ------------------------------------------- | ------------------------------------- |
| `Pulse-X.Y.Z-setup.exe` | Vanlig brukerinstallasjon med snarveier     | Automatisk nedlasting gjennom updater |
| `Pulse-Portable.exe`    | Starte uten installasjonsveiviser           | Manuell utskifting av programfilen    |
| ZIP                     | Utpakket programmappe                       | Manuell distribusjon                  |
| `Pulse-X.Y.Z-Setup.msi` | Separat byggemål for administrert utrulling | Avhenger av utrullingsoppsettet       |

Standardbygget lager NSIS, portable og ZIP. MSI bygges separat med `bun run dist:msi`; det er ikke et standard-asset i release-skriptet.

Last ned fra [Pulse-siden](https://suppliers-anx.pages.dev/) eller [GitHub Releases](https://github.com/Isuldra/Suppliers/releases).

## Installere

NSIS-installasjonen er konfigurert per bruker, uten automatisk elevasjon, og lar brukeren velge mappe. Den oppretter snarveier på skrivebordet og i Start-menyen.

Dette beskriver installerinnstillingene. Maskinens policy kan fortsatt kreve godkjenning fra IT. Bruk godkjent distribusjonskanal dersom Windows eller organisasjonens sikkerhetsverktøy blokkerer appen.

## Brukerdata

Data ligger i Electron sin `userData`-mappe, separat fra programfilene. Standard Windows-plassering er under `%APPDATA%\one-med-supplychain-app`; faktisk bane logges ved oppstart.

SQLite inneholder innkjøpsdata og importerte kontakter. Rendererens lokale lagring inneholder arbeidsflatens sendingshistorikk og lokale valg. Se [lagring og sikkerhetskopier](../features/database.md).

NSIS er konfigurert til å beholde appdata ved avinstallering. Ikke fjern profilmappen uten å avklare konsekvensene for sendingshistorikken.

## Oppdatering

Installerutgaven sjekker Cloudflare-feeden og laster ned tilgjengelig oppdatering. Installering skjer gjennom updaterens flyt når appen avsluttes eller brukeren velger det.

Portable-utgaven varsler om ny versjon og åpner nedlasting. Lukk appen før programfilen erstattes. Data blir på samme PC; de ligger ikke automatisk ved siden av EXE-filen.

Se [publisering](../development/publishing-updates.md) for hvordan installasjonsfil, GitHub-release og metadata skal stemme.
