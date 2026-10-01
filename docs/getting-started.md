# Kom i gang

Pulse trenger Windows og en Excel-eksport av innkjøpslinjene. Sending krever Outlook med COM-støtte, en konfigurert e-postprofil og rettigheter til avsenderpostkassen.

## Installere

Last ned installasjonsprogrammet eller portable-utgaven fra [nedlastingssiden](https://suppliers-anx.pages.dev/). Installerutgaven legger inn snarveier og støtter automatisk oppdatering. Portable-utgaven startes direkte og erstattes manuelt ved oppdatering.

Begge utgavene lagrer arbeidsdata på PC-en. Dataene følger ikke automatisk med en portable-fil som flyttes til en annen maskin. Se [distribusjon](distribution/DISTRIBUTION.md).

## Første import

1. Åpne Pulse og velg import av innkjøpsliste.
2. Velg en `.xlsx`-fil med arket `BP`. Overskriftene skal ligge på rad 5 og dataene begynne på rad 6.
3. Kontroller eventuelle valideringsfeil før du fortsetter.
4. Åpne leverandørregisteret og kontroller e-postadresse, e-postspråk og purredager.

En ny import erstatter innkjøpslinjene i databasen. Lokale kontaktendringer i arbeidsflaten nullstilles ved vellykket import. Sendingshistorikk og valg om å utelate uendrede linjer beholdes. Se [Excel-formatet](features/excel-import.md).

## Første purring

1. Velg ukedag eller `Alle`, og åpne en leverandør.
2. Kontroller restlinjene. Fjern linjer som allerede er avklart.
3. Kryss av leverandørene som skal purres, og åpne gjennomgangen.
4. Kontroller mottakere, språk og forhåndsvisning for hver leverandør.
5. Send først når innholdet er kontrollert.

Pulse sender én e-post per leverandør. Ingen e-post sendes bare ved import eller ved å åpne forhåndsvisningen.

Hvis Outlook melder en feil, stopper køen. Kontroller Sendte elementer før du prøver igjen dersom det er uklart om meldingen ble sendt. Hvis Pulse melder at sendt historikk ikke kunne lagres, behold appen åpen og bruk knappen for å prøve lagringen igjen.

Se [brukerveiledningen](user-guide.md) for ukestatus, utelatte linjer og flere mottakere.
