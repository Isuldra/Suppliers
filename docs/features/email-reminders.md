# Sendeflyt for purringer

Dagens arbeidsflate lager én e-post per valgt leverandør. Den bruker bare leverandørens inkluderte restlinjer.

## Fra gjennomgang til Outlook

1. `Workspace.tsx` samler mottaker, språk og linjer.
2. `Review.tsx` viser innholdet og validerer mottakerfeltet.
3. `reminder.ts` lager emne og HTML på valgt språk.
4. Renderer kaller `sendEmailViaEmlAndCOM` gjennom preload.
5. Main-prosessen lager en EML-fil og bruker PowerShell til å sende via Outlook COM.
6. Etter bekreftet sending lagrer arbeidsflaten sendingshistorikken lokalt.

Renderer og main bruker samme parser for mottakere: `src/utils/emailRecipients.ts`. Komma- og semikolonseparerte adresser støttes. Tomme felt, linjeskift, ugyldige adresser og visningsnavn avvises.

## Kø og feil

Køen sender sekvensielt. En transportfeil stopper videre sending, og allerede sendte leverandører blir stående som sendt i gjennomgangen.

Hvis Outlook bekrefter sending, men historikken ikke kan lagres, får leverandøren status `sent-unsaved`. Køen og navigasjonen stoppes mens lagringen er uavklart. Lagreknappen forsøker bare å lagre historikken; den kaller ikke transporten igjen.

Historikken hindrer ny purring av samme leverandør i samme ISO-uke på denne PC-en. Den er ikke en serverbasert leveringskvittering og kan ikke avdekke sending fra andre maskiner.

Ved en uklar Outlook-feil må brukeren kontrollere Sendte elementer før ny sending. Transporten har ingen felles transaksjon med lokal lagring.

Se [malene](email-templates.md) før du endrer e-postinnhold, og [Outlook-oppsett](email-setup.md) for avsenderrettigheter.
