# Windows Installasjonsproblemer - Feilsøkingsguide

Dette dokumentet hjelper deg med å løse vanlige problemer med installasjon av Pulse på Windows.

## Problem: Programmet finnes ikke etter installasjon

### Symptom

Pulse installerer vellykket, men du finner ikke programmet i Start-menyen eller på skrivebordet.

### Årsak

Dette problemet skyldtes en feil i tidligere versjoner av installasjonsprogrammet, hvor det prøvde å skrive til system-registeret (HKEY_LOCAL_MACHINE) uten administratortilgang. Dette førte til at:

- Registry-oppføringer ikke ble opprettet
- Start-meny-snarveier feilet
- Programmet ble installert, men Windows kunne ikke finne det

### Løsning (versjon 1.4.1 og nyere)

Fra versjon 1.4.1 er dette problemet løst. Last ned og installer den nyeste versjonen.

### Manuell feilsøking for eksisterende installasjoner

Hvis du allerede har installert Pulse og ikke kan finne det, kan du prøve følgende:

#### 1. Finn installasjonsmappen manuelt

Pulse installeres vanligvis til:

```
C:\Users\[DittBrukernavn]\AppData\Local\Programs\Pulse\
```

For å finne det:

1. Trykk `Windows + R`
2. Skriv: `%LOCALAPPDATA%\Programs\Pulse`
3. Trykk Enter

Hvis mappen eksisterer, kan du:

- Kjøre `Pulse.exe` direkte fra denne mappen
- Høyreklikk på `Pulse.exe` og velg "Fest til Start" eller "Opprett snarvei"

#### 2. Avinstaller og reinstaller

Den sikreste løsningen er å:

**Alternativ A: Via Windows Innstillinger**

1. Åpne Windows Innstillinger
2. Gå til "Apper" eller "Apps & features"
3. Søk etter "Pulse"
4. Velg "Avinstaller"
5. Last ned og installer den nyeste versjonen

**Alternativ B: Via Programs and Features**

1. Trykk `Windows + R`
2. Skriv: `appwiz.cpl`
3. Trykk Enter
4. Finn "Pulse" i listen
5. Velg "Avinstaller"
6. Last ned og installer den nyeste versjonen

**Alternativ C: Manuell avinstallering**
Hvis Pulse ikke vises i programlisten:

1. Gå til `%LOCALAPPDATA%\Programs\Pulse\`
2. Kjør `uninstall.exe`
3. Last ned og installer den nyeste versjonen

## Problem: Feilmelding under installasjon

### Symptom

Du får en feilmelding under installasjonen.

### Løsninger

#### "Installation failed" eller "Access denied"

1. Lukk alle åpne instanser av Pulse
2. Kjør installasjonsprogrammet på nytt
3. Velg en annen installasjonskatalog hvis problemet vedvarer

#### "Cannot overwrite existing files"

1. Avinstaller eksisterende versjon først (se over)
2. Slett mappen `%LOCALAPPDATA%\Programs\Pulse\` manuelt hvis den fortsatt eksisterer
3. Installer på nytt

## Problem: Start-meny-snarvei mangler

### Symptom

Pulse er installert og kjører, men det er ingen snarvei i Start-menyen.

### Løsning

**Manuell opprettelse av snarvei:**

1. Gå til `%LOCALAPPDATA%\Programs\Pulse\`
2. Høyreklikk på `Pulse.exe`
3. Velg "Fest til Start"

**Eller opprett en manuell snarvei:**

1. Gå til `%LOCALAPPDATA%\Programs\Pulse\`
2. Høyreklikk på `Pulse.exe`
3. Velg "Send til" > "Skrivebord (opprett snarvei)"
4. Flytt snarveien til ønsket sted

## Problem: Oppdateringer fungerer ikke

### Symptom

Du får ikke beskjed om nye versjoner, eller oppdateringer feiler.

### Løsning

1. Sjekk at du har internettforbindelse
2. Prøv å installere den nyeste versjonen manuelt
3. Sjekk at firewall/antivirus ikke blokkerer Pulse

## Problem: Programmet starter ikke

### Symptom

Når du prøver å starte Pulse, skjer det ingenting, eller det krasjer umiddelbart.

### Løsninger

#### 1. Sjekk Windows Event Viewer

1. Trykk `Windows + R`
2. Skriv: `eventvwr.msc`
3. Trykk Enter
4. Gå til "Windows Logs" > "Application"
5. Se etter feilmeldinger relatert til Pulse

#### 2. Sjekk om prosessen kjører

1. Åpne Task Manager (`Ctrl + Shift + Esc`)
2. Se etter "Pulse.exe" under "Processes"
3. Hvis den kjører, avslutt den og prøv å starte på nytt

#### 3. Kjør som administrator

1. Høyreklikk på Pulse-snarveien
2. Velg "Kjør som administrator"
3. Se om programmet starter

#### 4. Reinstaller

Hvis ingenting hjelper, avinstaller og reinstaller programmet.

## Teknisk informasjon

### Installasjonsstier

- **Programfiler**: `%LOCALAPPDATA%\Programs\Pulse\`
- **Brukerdata**: `%APPDATA%\one-med-supplychain-app\`
- **Start-meny**: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Pulse\`

### Registry-nøkler (versjon 1.4.1+)

- **Avinstallasjonsinformasjon**: `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Uninstall\Pulse`

### Hva ble endret i versjon 1.4.1?

1. **Registry-nøkler endret fra HKLM til HKCU**: Dette betyr at programmet nå skriver til brukerens registry i stedet for systemets registry, som ikke krever administratorrettigheter.
2. **Eksplisitt opprettelse av Start-meny-snarveier**: Installasjonsprogrammet oppretter nå Start-meny-snarveier eksplisitt for å sikre at de alltid blir laget.
3. **Forbedret feilhåndtering**: Bedre håndtering av installasjonsfeil.

## Kontakt

Hvis problemet fortsatt ikke er løst, ta kontakt med IT-support eller utviklerteamet med følgende informasjon:

- Windows-versjon (kjør `winver` i Run-dialog)
- Pulse-versjon du prøver å installere
- Feilmeldinger fra Event Viewer
- Skjermbilder av eventuelle feilmeldinger

## Loggfiler

For mer detaljert feilsøking, sjekk loggfilene:

- **Applikasjonslogger**: `%APPDATA%\one-med-supplychain-app\logs\`
- **Installasjonslogger**: Kan vanligvis finnes i `%TEMP%` (søk etter filer som starter med "Pulse")
