# Oppdatering av E-post System med Språkstøtte

## Oversikt

Systemet har blitt oppdatert for å bruke en ny strukturert leverandørdatabase med e-postadresser og språkpreferanser.

## Nye Filer

### `src/renderer/data/supplierData.json`

- **Formål**: Komplett leverandørdatabase med e-postadresser og språkpreferanser
- **Struktur**:
  - 75 leverandører totalt
  - 62 norske e-postadresser (språkKode: "NO")
  - 13 engelske e-postadresser (språkKode: "ENG")
- **Felter per leverandør**:
  - `leverandør`: Leverandørnavn
  - `companyId`: Unikt firma-ID
  - `epost`: E-postadresse
  - `språk`: Språknavn (Norsk/Engelsk)
  - `språkKode`: Språkkode ("NO"/"ENG")
  - `purredag`: Hvilken ukedag leverandøren skal purres

## Oppdaterte Filer

### `src/renderer/services/emailService.ts`

**Endringer**:

- Importerer `supplierData.json` i stedet for `supplierEmails.json`
- Ny `SupplierInfo` interface for strukturert leverandørdata
- Ny metode `getSupplierInfo()` for å hente leverandørinfo fra JSON
- Ny metode `getSupplierLanguage()` for å hente språkpreferanse
- Oppdatert `sendReminder()` for automatisk språkvalg basert på leverandørens preferanse
- Fallback til database-oppslag hvis leverandør ikke finnes i JSON

### `src/renderer/components/EmailPreviewModal.tsx`

**Endringer**:

- Bruker først `getSupplierInfo()` for å hente e-postadresse
- Fallback til database-oppslag hvis ikke funnet i JSON

### `src/renderer/components/EmailButton.tsx`

**Endringer**:

- Automatisk språkvalg basert på leverandørens preferanse ved initialisering
- Bruker leverandørens foretrukne språk i `handlePreview()`

### `src/renderer/data/supplierEmails.json`

**Endringer**:

- Lagt til deprecation-merknad
- Beholdt for bakoverkompatibilitet

## Funksjonalitet

### Automatisk Språkvalg

- Systemet velger automatisk norsk eller engelsk basert på leverandørens `språkKode`
- Brukeren kan fortsatt manuelt overstyre språkvalget i preview-modalen

### E-post Oppslag

1. **Primær**: Søker i `supplierData.json` for e-postadresse og språkpreferanse
2. **Fallback**: Søker i database hvis leverandør ikke finnes i JSON
3. **Legacy**: Kan fortsatt bruke gamle `supplierEmails.json` via database

### Språkstøtte

- **Norsk (NO)**: Standard norsk e-post-mal
- **Engelsk (ENG)**: Engelsk e-post-mal
- Automatisk valg basert på leverandørens registrerte språkpreferanse

## Statistikk

### Leverandørfordeling per Ukedag

- **Mandag**: 15 leverandører
- **Tirsdag**: 12 leverandører
- **Onsdag**: 15 leverandører
- **Torsdag**: 18 leverandører
- **Fredag**: 15 leverandører

### Språkfordeling

- **Norsk**: 62 leverandører (82.7%)
- **Engelsk**: 13 leverandører (17.3%)

## Bakoverkompatibilitet

- Gamle `supplierEmails.json` beholdes for fallback
- Database-oppslag fungerer fortsatt som før
- Eksisterende e-post-funksjonalitet påvirkes ikke

## Testing

For å teste den nye funksjonaliteten:

1. Start applikasjonen med `npm run dev`
2. Last opp en Excel-fil med BP-data
3. Velg en leverandør som finnes i `supplierData.json`
4. Gå til e-post-steget og sjekk at:
   - Riktig e-postadresse vises
   - Riktig språk velges automatisk
   - E-post kan sendes som før

## Fremtidige Forbedringer

- Mulighet for å redigere leverandørdata direkte i applikasjonen
- Import av leverandørdata fra Excel "Leverandør"-ark
- Automatisk synkronisering mellom JSON og database
