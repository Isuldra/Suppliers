# Brukerveiledning

Arbeidsflaten viser leverandører med utestående innkjøpslinjer fra siste Excel-import. Leverandørregisteret inneholder også kontakter uten aktive linjer.

## Velge arbeid

Velg en ukedag for leverandører med den purredagen, `Ingen` for leverandører uten purredag eller `Alle` for hele listen. Søk snevrer inn den viste leverandørlisten.

For danske data kan du velge lager 80, 87 eller alle. `Ta med ICT-ordrer` styrer om ordretypen 70 inkluderes. Disse valgene påvirker hvilke linjer som er tilgjengelige for purring.

Klikk en leverandør for å se ordrene. Avkryssingen ved leverandørnavnet velger leverandøren til gjennomgang; å åpne detaljene alene velger den ikke.

## Kontrollere linjer

Ordrene grupperes etter innkjøpsordre. Kontroller artikkel, restmengde, leveringsdato, lagerbeholdning og kommentarer mot kildedataene.

Bruk linje- eller ordreavkryssing for å utelate avklarte linjer. Valget lagres med årsaken `Avklart skriftlig`. En ny import beholder valget bare når den samme linjens innhold er uendret.

Filteret for ventende linjer viser linjer med negativ tilgjengelig lagerbeholdning. Det er separat fra leverandørvalget `Avvent denne uken`.

## Ukestatus

- `Avvent denne uken` utsetter leverandøren til neste ISO-uke. `Ta med igjen` opphever utsettelsen.
- `Purret denne uken` betyr at Outlook bekreftet sending og historikken ble lagret. Leverandøren blir tilgjengelig igjen i neste ISO-uke.
- Historikkindikatoren viser de siste fem ukene med handlinger registrert på denne PC-en.

Historikken er lokal og deles ikke mellom PC-er. Sending fra en annen maskin eller direkte i Outlook blir ikke registrert her.

## Gjennomgang og sending

Kryss av aktuelle leverandører og åpne gjennomgangen. Hver leverandør har sin egen mottaker, sitt eget språk og sin egen e-post med de inkluderte linjene.

Mottakerfeltet støtter én eller flere rene e-postadresser, skilt med komma eller semikolon:

```text
innkjop@example.com; ordre@example.com
```

Navn foran adressen, som `Kontakt <ordre@example.com>`, støttes ikke. Et ugyldig mottakerfelt må rettes før sending.

Du kan endre mottaker og språk for den aktuelle gjennomgangen eller hoppe over en leverandør. Varige kontaktendringer gjøres i [leverandørregisteret](features/supplier-register.md).

Sendekøen går gjennom leverandørene én om gangen. En transportfeil stopper køen. Kontroller Outlooks Sendte elementer før ny sending ved uklare feil.

Hvis sendingen er bekreftet, men lagringen mislykkes, stopper køen med en egen melding. Behold Pulse åpen og prøv å lagre historikken igjen. Denne handlingen sender ikke e-posten på nytt. Å lukke appen før lagringen lykkes kan gjøre leverandøren tilgjengelig igjen etter omstart.

## Import og lokal lagring

En ny import erstatter ordresnapshotet og nullstiller lokale kontaktendringer. Den sletter ikke sendingshistorikken. Leverandørvalg i en pågående arbeidsøkt nullstilles når dataene lastes på nytt.

Databasen og arbeidsflatens lokale historikk lagres separat. En SQLite-sikkerhetskopi alene gjenoppretter ikke historikk eller lokale kontaktvalg. Se [lagring](features/database.md).

[Dashboardet](features/dashboard.md) viser statistikk over de importerte linjene. Tallene er ikke en direkte oppkobling mot ERP.
