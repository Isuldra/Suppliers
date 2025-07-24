# Brukerguide - OneMed SupplyChain

Denne brukerguiden beskriver hvordan du bruker OneMed SupplyChain for effektiv leverandørstyring og ordreoppfølging.

## 🚀 Kom i gang

### Første oppstart

1. **Start applikasjonen** - Du vil bli bedt om å velge en Excel-fil for første import
2. **Velg Excel-fil** - Velg filen med ordredata (se [Excel Import](features/excel-import.md) for detaljer)
3. **Vent på import** - Applikasjonen importerer og validerer dataene
4. **Du er klar!** - Applikasjonen er nå klar til bruk

### Hovedgrensesnitt

Applikasjonen har to hovedvisninger:

- **Hovedside**: For ordrebehandling og e-post sending
- **Dashboard**: For oversikt og statistikk

## 📊 Dashboard

Dashboard gir deg en komplett oversikt over leverandørstatus og ordre.

### Oversiktkort

Fire hovedkort viser viktig informasjon:

- **Totalt leverandører**: Antall leverandører i systemet
- **Leverandører med åpne ordre**: Antall leverandører som har utestående ordre
- **Totalt åpne ordre**: Antall ordre som venter på levering
- **Totalt restantall**: Sum av alle utestående enheter

### Grafer og Statistikk

- **Topp 5 leverandører**: Viser leverandører med høyest restantall
- **Ordrer per ukedag**: Fordeling av ordre på ukedager

### Navigasjon

- Klikk **"Tilbake til hovedside"** for å gå tilbake til ordrebehandling

## 📁 Excel Import og Ordrebehandling

### Steg 1: Last opp fil

1. **Dra og slipp** Excel-filen i det markerte området, eller klikk for å velge fil
2. **Validering** - Applikasjonen sjekker filformat og innhold
3. **Suksess** - Du ser bekreftelse på at filen er lastet opp

### Progress Indikator

Etter filopplasting vises en progress indikator som viser hvor du er i prosessen:

- ✅ **Last opp fil** - Fullført
- 🔄 **Velg ukedag** - Aktivt steg
- ⏳ **Velg leverandør** - Kommende
- ⏳ **Gjennomgå data** - Kommende
- ⏳ **Send e-post** - Kommende

### Steg 2: Velg ukedag

1. **Velg ukedag** fra listen (Mandag-Fredag)
2. **Automatisk oppdatering** - Leverandørlisten oppdateres umiddelbart
3. **Filtrering** - Kun leverandører med åpne ordre vises

### Steg 3: Velg leverandør

1. **Søk** etter leverandør i søkefeltet (valgfritt)
2. **Velg leverandør** fra listen
3. **Automatisk overgang** - Du går direkte til datagjennomgang

### Steg 4: Gjennomgå data

1. **Se ordre** for valgt leverandør
2. **Kontroller detaljer** som ordrenummer, antall, beskrivelse
3. **Klikk "Neste"** for å gå til e-post

### Steg 5: Send e-post

1. **Forhåndsvis** e-posten ved å klikke "Forbered e-post"
2. **Kontroller innhold** i preview-modalen
3. **Send** e-posten via din e-postklient

## ⌨️ Hurtigtaster

Bruk hurtigtaster for raskere navigasjon:

| Tast           | Funksjon                    |
| -------------- | --------------------------- |
| `Ctrl/Cmd + R` | Start applikasjonen på nytt |
| `Ctrl/Cmd + ?` | Vis hurtigtaster hjelp      |
| `Escape`       | Gå tilbake ett steg         |
| `Enter`        | Bekreft valg                |
| `Tab`          | Naviger mellom felter       |

### Hurtigtaster hjelp

Klikk på ⌨️-ikonet i header for å se alle tilgjengelige hurtigtaster.

## 📧 E-post System

### E-post Templates

Applikasjonen bruker forhåndsdefinerte maler:

- **Norsk mal**: Standard norsk e-post
- **Engelsk mal**: For internasjonale leverandører

### Sending av e-post

1. **Automatisk generering** - E-post innhold genereres basert på valgt leverandør og ordre
2. **Preview** - Se e-posten før sending
3. **E-postklient** - E-posten åpnes i din standard e-postklient
4. **Manuell sending** - Du sender e-posten fra din e-postklient

### E-post Tracking

- **Database oppdatering** - Når e-post sendes, oppdateres databasen
- **Historikk** - Se tidligere sendte e-poster i loggene

## 🔍 Søk og Filtrering

### Leverandør Søk

- **Realtid søk** - Skriv for å filtrere leverandører
- **Case-insensitive** - Søk fungerer uansett store/små bokstaver
- **Delvis matching** - Søk matcher deler av leverandørnavn

### Filtrering

- **Ukedag filtrering** - Kun leverandører for valgt ukedag vises
- **Åpne ordre** - Kun leverandører med utestående ordre vises
- **Automatisk oppdatering** - Lister oppdateres når du endrer valg

## 📊 Data og Statistikk

### Ordre Oversikt

- **Ordrenummer** - Unikt ID for hver ordre
- **Artikkelnummer** - Produkt ID
- **Beskrivelse** - Produktbeskrivelse
- **Bestilt antall** - Opprinnelig bestilt mengde
- **Levert antall** - Hvor mye som er levert
- **Restantall** - Utestående mengde

### Leverandør Informasjon

- **Navn** - Leverandørnavn
- **E-post** - Kontaktinformasjon
- **Ukedag** - Hvilken dag leverandøren skal purres
- **Status** - Gjeldende status

## 🔧 Innstillinger og Konfigurasjon

### Database

- **Automatisk backup** - Database sikkerhetskopieres automatisk
- **Lokal lagring** - Alle data lagres lokalt på din maskin
- **Import/Export** - Data kan importeres fra Excel

### E-post Innstillinger

- **Standard e-postklient** - Bruker din systemets standard e-postklient
- **Template språk** - Automatisk valg basert på leverandør
- **Manuell overskriving** - Du kan endre språk i preview

## 🆘 Feilsøking

### Vanlige problemer

**Excel-fil kan ikke lastes opp:**

- Sjekk at filen er i `.xlsx` format
- Kontroller at filen inneholder riktige ark (BP, Sjekkliste Leverandører)
- Prøv å lagre filen på nytt i Excel

**Ingen leverandører vises:**

- Sjekk at du har valgt riktig ukedag
- Kontroller at leverandørene har åpne ordre
- Prøv å laste opp Excel-filen på nytt

**E-post kan ikke sendes:**

- Sjekk at du har en standard e-postklient installert
- Kontroller at leverandøren har en gyldig e-postadresse
- Prøv å sende manuelt fra e-postklienten

### Logg og Debugging

- **Loggvisning** - Tilgjengelig via meny
- **Konsoll** - Teknisk informasjon i utviklermodus
- **Database** - Lokal SQLite-fil for avansert debugging

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
**Versjon**: 1.1.7
