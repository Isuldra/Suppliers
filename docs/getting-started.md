# Kom i gang - OneMed SupplyChain

Velkommen til OneMed SupplyChain! Denne guiden hjelper deg med å komme i gang med applikasjonen.

## 🚀 Første Oppstart

### 1. Start Applikasjonen

1. **Finn applikasjonen** på din datamaskin
2. **Dobbeltklikk** på OneMed SupplyChain ikonet
3. **Vent** mens applikasjonen starter opp

### 2. Første Import

Ved første oppstart vil applikasjonen be deg om å velge en Excel-fil:

1. **Klikk "Velg fil"** eller dra Excel-filen til applikasjonen
2. **Velg din Excel-fil** med ordredata
3. **Vent** mens applikasjonen importerer dataene
4. **Du er klar!** Applikasjonen er nå klar til bruk

> **Merk**: Se [Excel Import](features/excel-import.md) for detaljer om filformat og struktur.

## 🎯 Hovedarbeidsflyt

### Steg 1: Last opp Excel-fil

1. **Dra og slipp** Excel-filen i det markerte området
2. **Eller klikk** for å velge fil fra datamaskinen
3. **Vent** på validering og import

### Steg 2: Velg ukedag

1. **Velg ukedag** fra listen (Mandag-Fredag)
2. **Se leverandørlisten** oppdateres automatisk
3. **Kun leverandører med åpne ordre** vises

### Steg 3: Velg leverandør

1. **Søk** etter leverandør (valgfritt)
2. **Velg leverandør** fra listen
3. **Gå automatisk** til datagjennomgang

### Steg 4: Gjennomgå data

1. **Se ordre** for valgt leverandør
2. **Kontroller detaljer** som ordrenummer, antall, beskrivelse
3. **Klikk "Neste"** for å gå til e-post

### Steg 5: Send e-post

1. **Forhåndsvis** e-posten ved å klikke "Forbered e-post"
2. **Kontroller innhold** i preview-modalen
3. **Send** e-posten via din e-postklient

## 📊 Dashboard

### Tilgang til Dashboard

1. **Klikk "Dashboard"** i header
2. **Se oversikt** over alle leverandører og ordre
3. **Analyser data** med grafer og statistikk

### Dashboard Funksjoner

- **Oversiktkort**: Totalt antall leverandører, åpne ordre, restantall
- **Topp leverandører**: Leverandører med høyest restantall
- **Ordrer per ukedag**: Fordeling av ordre på ukedager
- **Navigasjon**: Enkel tilbake til hovedside

## ⌨️ Hurtigtaster

Bruk hurtigtaster for raskere arbeid:

| Tast           | Funksjon                    |
| -------------- | --------------------------- |
| `Ctrl/Cmd + R` | Start applikasjonen på nytt |
| `Ctrl/Cmd + ?` | Vis hurtigtaster hjelp      |
| `Escape`       | Gå tilbake ett steg         |
| `Enter`        | Bekreft valg                |
| `Tab`          | Naviger mellom felter       |

### Hurtigtaster Hjelp

1. **Klikk ⌨️-ikonet** i header
2. **Se alle tilgjengelige** hurtigtaster
3. **Lukk** med Escape eller klikk utenfor

## 📁 Excel-fil Krav

### Filformat

- **Format**: `.xlsx` (Excel 2007 og nyere)
- **Ikke støttet**: `.xls` eller `.csv`

### Påkrevde Ark

1. **BP**: Hovedarket med ordredata
2. **Sjekkliste Leverandører**: Leverandørinformasjon og e-post

### Kolonne Headere

BP-arket må inneholde:

| Kolonne | Beskrivelse    | Eksempel           |
| ------- | -------------- | ------------------ |
| A       | Nøkkel/ID      | "PO123-ITEM456"    |
| C       | Ordrenummer    | "PO123"            |
| H       | Artikkelnummer | "ITEM456"          |
| I       | Beskrivelse    | "Medisinsk utstyr" |
| J/K     | ETA Dato       | "2024-01-15"       |
| M       | Bestilt Antall | 100                |
| N       | Levert Antall  | 50                 |
| O       | Restantall     | 50                 |
| P       | Leverandør     | "OneMed AS"        |

## 📧 E-post System

### E-post Templates

Applikasjonen bruker forhåndsdefinerte maler:

- **Norsk mal**: Standard norsk e-post
- **Engelsk mal**: For internasjonale leverandører

### Sending av E-post

1. **Automatisk generering** basert på valgt leverandør og ordre
2. **Preview** før sending
3. **E-postklient** åpnes med forhåndsutfylt e-post
4. **Manuell sending** fra din e-postklient

### E-post Tracking

- **Database oppdatering** når e-post sendes
- **Historikk** i loggene

## 🔍 Søk og Filtrering

### Leverandør Søk

- **Realtid søk** - Skriv for å filtrere
- **Case-insensitive** - Uansett store/små bokstaver
- **Delvis matching** - Matcher deler av navn

### Filtrering

- **Ukedag filtrering** - Kun leverandører for valgt dag
- **Åpne ordre** - Kun leverandører med utestående ordre
- **Automatisk oppdatering** - Lister oppdateres når du endrer valg

## 🔧 Innstillinger

### Database

- **Automatisk backup** ved hver import
- **Lokal lagring** på din datamaskin
- **Ingen cloud sync** - Alle data er lokale

### E-post Innstillinger

- **Standard e-postklient** - Bruker din systemets klient
- **Template språk** - Automatisk valg
- **Manuell overskriving** - Endre språk i preview

## 🆘 Feilsøking

### Vanlige Problemer

**Excel-fil kan ikke lastes opp:**

- Sjekk at filen er i `.xlsx` format
- Kontroller at filen inneholder riktige ark
- Prøv å lagre filen på nytt i Excel

**Ingen leverandører vises:**

- Sjekk at du har valgt riktig ukedag
- Kontroller at leverandørene har åpne ordre
- Prøv å laste opp Excel-filen på nytt

**E-post kan ikke sendes:**

- Sjekk at du har en standard e-postklient
- Kontroller at leverandøren har gyldig e-post
- Prøv å sende manuelt fra e-postklienten

### Logg og Debugging

- **Loggvisning** - Tilgjengelig via meny
- **Konsoll** - Teknisk informasjon i utviklermodus
- **Database** - Lokal SQLite-fil for avansert debugging

## 📚 Neste Steg

### Lær Mer

- **[Brukerguide](user-guide.md)**: Detaljert brukerguide
- **[Dashboard](dashboard.md)**: Bruk av dashboard
- **[E-post System](email-system.md)**: E-post funksjoner
- **[Excel Import](features/excel-import.md)**: Import av data

### Tips og Triks

1. **Bruk hurtigtaster** for raskere arbeid
2. **Søk etter leverandører** for å finne dem raskt
3. **Sjekk dashboard** for oversikt
4. **Forhåndsvis e-post** før sending
5. **Hold Excel-filen oppdatert** for nøyaktige data

## 📞 Support

### Hjelp og Support

- **Innebygd hjelp** - Bruk hurtigtaster hjelp (⌨️)
- **Teknisk support** - Kontakt utviklingsteamet
- **Dokumentasjon** - Se andre dokumentasjonsfiler

### Kontakt

For teknisk support eller spørsmål:

- Kontakt utviklingsteamet
- Sjekk loggfilene for feilmeldinger
- Dokumenter problemet med skjermbilder

---

**Sist oppdatert**: Juli 2024  
**Versjon**: Se package.json for gjeldende versjon
