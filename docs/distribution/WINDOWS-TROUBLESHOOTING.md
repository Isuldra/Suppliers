# Feilsøking på Windows

Start med feilmeldingen, appversjonen og tidspunktet feilen oppstod. Skill mellom oppstart, import, sending og oppdatering; de bruker forskjellige deler av appen.

## Finne loggen

Main-prosessen skriver `logs/supplier-reminder-app.log` under Electron sin `userData`-mappe. Standard Windows-plassering er under `%APPDATA%\one-med-supplychain-app`. Oppstartsloggen oppgir den faktiske databasebanen.

Ta med den relevante delen av loggen ved feilrapportering. Fjern e-postadresser, ordredata og andre forretningsopplysninger som ikke trengs for å forstå feilen.

## Appen starter ikke

- Kontroller at pakken er Windows x64.
- Ved feil om `better_sqlite3.node`, ABI eller `NODE_MODULE_VERSION`: bruk en ny, korrekt pakket utgave. Se [native moduler](../development/troubleshoot-native-modules.md) hvis du bygger selv.
- Ved sikkerhetsblokkering: kontroller filens opphav og ta saken gjennom virksomhetens godkjenningsprosess.

Ikke slett databasen for å reparere en feil i en native modul.

## Import feiler eller viser feil data

Kontroller at filen er `.xlsx`, at `BP` finnes, og at overskriftene ligger på rad 5. Sammenlign én feil linje med feltene beskrevet i [Excel-import](../features/excel-import.md).

Ved feil saldo eller produkttekst kontrolleres ITEM og ARS, særlig firma, lager og artikkelnummer. Behold originalfilen så feilen kan gjenskapes.

## E-postsending feiler

Åpne Outlook manuelt og kontroller profil og rettigheter til avsenderpostkassen. Se [Outlook-oppsett](../features/email-setup.md).

Ved usikkert senderesultat: kontroller Sendte elementer før du prøver igjen. Hvis Outlook bekreftet sending, men Pulse ikke fikk lagret historikken, behold appen åpen og prøv lagringen igjen. Det skal ikke sendes en ny e-post for å reparere historikken.

## Oppdatering feiler

Kontroller internettilgang til oppdateringsfeeden og GitHub-nedlastingen. Metadata på Cloudflare og programfilene på GitHub må være tilgjengelige samtidig.

Portable oppdateres manuelt. Lukk appen før EXE-filen erstattes. Installerutgaven bruker updateren; en feilmelding eller nedlastingsstans må undersøkes før installasjon forsøkes igjen.

Ved metadatafeil må vedlikeholderen følge [publiseringskontrollene](../development/publishing-updates.md).

## Data mangler etter omstart

Kontroller at appen kjøres med samme Windows-bruker og appprofil. Ordredata og arbeidsflatens historikk ligger i separate lagre. Ikke importer eller slett profilmapper før du har bevart data som kan gjenopprettes.

Se [lagring og sikkerhetskopier](../features/database.md) for forskjellen mellom SQLite-backup og full appprofil.
