# Excel Import - Pulse

Denne dokumentasjonen beskriver Excel import funksjonaliteten i Pulse.

## 📋 Oversikt

Excel import er en kjernefunksjon som lar brukere laste opp ordre- og leverandørstatusdata fra spesifikke Excel-regneark. Denne funksjonaliteten muliggjør hovedarbeidsflyten for å laste data inn i Pulse for gjennomgang og generering av e-post påminnelser.

## 📁 Støttede Filformater

Applikasjonen støtter for øyeblikket kun import av data fra:

- **.xlsx** (Excel 2007 og nyere) filer via drag-and-drop grensesnittet

_(Støtte for `.xls` eller `.csv` er ikke aktivert i grensesnittet.)_

## 📊 Påkrevde Ark og Felter

Excel import forventer spesifikke ark og felter å være tilstede i den opplastede `.xlsx` filen:

### Påkrevde Ark

Applikasjonen validerer tilstedeværelsen av følgende ark:

1. **BP**: Hovedarket som inneholder ordreinformasjonen som brukes i hele applikasjonen
2. **Sjekkliste Leverandører**: Inneholder leverandørinformasjon og e-postadresser

### Behandlede Ark og Data Bruk

- **BP**: Data fra dette arket parses og brukes i hovedarbeidsflyten (Data Review, E-post). Den lagres i `purchase_order` tabellen i databasen.
  - **Nøkkelfelter**: Parseren mapper kolonner til interne felter med fleksible headernavn:
    - `nøkkel` fra 'Nøkkel'/'Key'/'ID'/'A'
    - `ordreNr` fra 'PO'/'Purchase Order'/'C'
    - `itemNo` fra 'Item No.'/'Artikkelnummer'/'H'
    - `beskrivelse` fra 'Beskrivelse'/'Description'/'I'
    - `order_qty` fra 'OrdQtyPO'/'Bestilt antall'/'M'
    - `received_qty` fra 'Delivered'/'Levert'/'N'
    - `outstanding_qty` fra 'Outstanding'/'Restantall'/'O'
    - `supplier_name` fra 'Supplier'/'Leverandør'/'P'
    - `eta_supplier` fra 'ETA'/'Expected Date'/'J' eller 'K'

- **Sjekkliste Leverandører**: Behandles under initial database opprettelse. Data (leverandør, dag, uke, status, e-post) ekstraheres og lagres i `supplier_emails` tabellen.

## 🔄 Import Prosess

Import prosessen følger disse stegene i applikasjonen:

### Steg 1: Fil Opplasting

1. **Fil Valg** (`FileUpload.tsx`): Bruker drar eller velger en `.xlsx` fil
2. **Parsing & Validering** (`FileUpload.tsx`):
   - Applikasjonen parser `.xlsx` filen ved hjelp av `exceljs` biblioteket
   - Den validerer filformatet (`.xlsx` kun)
   - Den validerer tilstedeværelsen av `BP` og `Sjekkliste Leverandører` ark
   - Den validerer tilstedeværelsen av nøkkelkolonne-headere i `BP` ved hjelp av fleksibel matching
   - Hvis initial validering feiler, vises feil via toast-meldinger

### Steg 2: Progress Tracking

3. **Progress Indikator**: Hvis parsing og initial validering lykkes, vises en progress indikator som viser hvor brukeren er i prosessen
4. **Automatisk Overgang**: Parsed data (primært fra `BP`) sendes til neste steg (Ukedag Valg, Leverandør Valg)

### Steg 3: Data Behandling

5. **Data Review** (`DataReview.tsx`): Bruker gjennomgår den filtrerte ordredataen fra `BP` for den valgte leverandøren
6. **E-post Forberedelse** (`EmailButton.tsx`): Bruker fortsetter til å forberede en e-post påminnelse basert på gjennomgått data

### Steg 4: Database Lagring

- **Initial Import**: Hvis databasefilen (`app.sqlite`) ikke eksisterer når applikasjonen starter, kalles `importAlleArk` funksjonen, som parser den valgte Excel-filen og fyller `supplier_emails` og `purchase_order` tabellene
- **Etterfølgende Imports**: `FileUpload.tsx` komponenten kaller `window.electron.saveOrdersToDatabase` etter vellykket parsing for å oppdatere `purchase_order` tabellen

## ✅ Valideringsregler

Applikasjonen utfører følgende valideringer primært innenfor `FileUpload.tsx` komponenten under parsing:

1. **Fil Format**: Sjekker om den droppede filen er `.xlsx`
2. **Påkrevde Ark**: Sjekker for eksistensen av `BP` og `Sjekkliste Leverandører` ark
3. **Kolonne Headere**: Sjekker for tilstedeværelsen av essensielle kolonne-headere (`nøkkel`, `supplier_name`, `ordreNr`) i `BP` ved hjelp av alternative navn
4. **Data Kvalitet**: Validerer at kritiske felter ikke er tomme

## ❌ Feilhåndtering

Når parsing eller initial valideringsfeil oppstår:

1. Feilmeldinger vises ved hjelp av toast-meldinger
2. Detaljerte konsollogger kan gi mer informasjon for debugging
3. Fremheving av problematiske data innenfor filen eller tillatelse av delvise imports støttes **ikke** for øyeblikket

## 📝 Bruk Eksempel

```typescript
// Eksempel på fil opplasting i FileUpload komponenten
const onDrop = useCallback((acceptedFiles: File[]) => {
  const file = acceptedFiles[0];
  if (file && file.name.endsWith('.xlsx')) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      try {
        const success = await window.electron.saveOrdersToDatabase(buffer);
        if (success) {
          onDataParsed(parsedData);
        }
      } catch (error) {
        console.error('Import failed:', error);
      }
    };
    reader.readAsArrayBuffer(file);
  }
}, []);
```

## 💡 Beste Praksis

1. **Bruk `.xlsx` Format**: Sørg for at filen din er lagret i `.xlsx` formatet
2. **Korrekte Ark**: Verifiser at filen inneholder ark med nøyaktig navn `BP` og `Sjekkliste Leverandører`
3. **Konsistente Headere**: Bruk tydelige og konsistente headere i `BP` som matcher en av de forventede alternativene (f.eks. 'Leverandør' eller 'Supplier')
4. **Manuell Oppdatering**: **Kritisk, sørg for at dataene innenfor Excel-filen er oppdatert før opplasting.** Applikasjonen leser filen som den er og kobler ikke til eksterne kilder for å oppdatere den
5. **Backup**: Behold sikkerhetskopier av dine originale Excel-filer

## 🔧 Feilsøking

Vanlige problemer og deres løsninger:

### Fil Gjenkjennes Ikke

- **Løsning**: Sørg for at du laster opp en `.xlsx` fil
- **Sjekk**: Filnavn og filtype

### Manglende Ark Feil

- **Løsning**: Sjekk at ark med navn `BP` og `Sjekkliste Leverandører` eksisterer i arbeidsboken
- **Sjekk**: Arknavn må være nøyaktig som forventet

### Kolonne Ikke Funnet Feil

- **Løsning**: Verifiser at essensielle kolonne-headere (Leverandør, PO Number, Nøkkel/ID) er tilstede i `BP`
- **Sjekk**: Header-navn og kolonneplassering

### Parsing Feil

- **Løsning**: Filen kan være korrupt, passordbeskyttet, eller ha en uvanlig intern struktur
- **Sjekk**: Prøv å lagre filen på nytt i Excel

### Database Feil

- **Løsning**: Sjekk at applikasjonen har skrivetillatelse til databasemappen
- **Sjekk**: Diskplass og tillatelser

## 🔗 Relaterte Funksjoner

- [Brukerguide](../user-guide.md) - Detaljert brukerguide for alle funksjoner
- [Database](database.md) - Beskriver hvor importerte data lagres
- [Arkitektur](../architecture.md) - Teknisk arkitektur og dataflyt

## 📊 Data Struktur

### BP Ark Struktur

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

### Sjekkliste Leverandører Ark Struktur

| Kolonne | Beskrivelse    | Eksempel          |
| ------- | -------------- | ----------------- |
| A       | Leverandørnavn | "OneMed AS"       |
| J       | E-postadresse  | "ordre@onemed.no" |

---

**Sist oppdatert**: Juli 2024  
**Versjon**: Se package.json for gjeldende versjon
