# Outlook-oppsett

Arbeidsflaten sender gjennom PowerShell og Outlooks COM-grensesnitt på Windows. Den trenger ikke SMTP-passord eller en GitHub-token for å sende e-post.

## Forutsetninger

- Outlook med COM-støtte er installert og kan startes av brukeren.
- Brukerens Outlook-profil er konfigurert.
- Brukeren har rettigheter til å sende på vegne av avsenderpostkassen.
- Maskinens policy tillater at appen bruker PowerShell og Outlook-automatisering.

Avsender velges fra landet som er oppdaget i innkjøpsdataene:

| Datagrunnlag                         | Avsender                        |
| ------------------------------------ | ------------------------------- |
| Danmark                              | `indkoeb.dk@onemed.com`         |
| Norge, Sverige, Finland eller ukjent | `supply.planning.no@onemed.com` |

Et valg av dansk e-postspråk endrer ikke avsenderen. Språk og leverandørland er separate valg.

## Ved feil

Start Outlook manuelt og kontroller at du kan sende på vegne av den aktuelle postkassen. Les deretter feilmeldingen i Pulse og [apploggen](../distribution/WINDOWS-TROUBLESHOOTING.md).

Hvis du er usikker på om Outlook sendte meldingen, kontroller Sendte elementer før du prøver igjen. Sending og lagring av lokal historikk er to separate steg.

Se [sendeflyten](email-reminders.md) for hvordan køen håndterer feil.
