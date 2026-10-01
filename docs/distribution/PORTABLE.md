# Portable-utgaven

`Pulse-Portable.exe` kan startes uten installasjonsveiviser. Den trenger fortsatt Windows x64, Outlook for sending og tillatelse til å kjøre på maskinen.

## Bruke den

Last ned filen fra [nedlastingssiden](https://suppliers-anx.pages.dev/), legg den i en mappe du kan skrive til, og start den. Importer deretter innkjøpsfilen som beskrevet i [kom i gang](../getting-started.md).

Arbeidsdata lagres i appens brukerprofil på PC-en. De følger ikke med når EXE-filen kopieres til en USB-enhet eller annen maskin. Portable betyr her program uten installasjonsveiviser, ikke en flyttbar database.

## Oppdatere

Appen oppdager portable-kjøring gjennom electron-builder sine miljøvariabler. Den sjekker samme `latest.yml`-feed som installerutgaven, men automatisk nedlasting og installasjon er deaktivert.

Når ny versjon varsles:

1. Last ned den nye portable-filen fra releasen.
2. Lukk Pulse.
3. Erstatt den gamle programfilen.
4. Start appen og kontroller versjon og data.

Bevar appprofilen hvis du også flytter brukerdata. En SQLite-kopi alene inneholder ikke arbeidsflatens sendingshistorikk.

Se [Windows-feilsøking](WINDOWS-TROUBLESHOOTING.md) ved oppstarts- eller oppdateringsfeil.
