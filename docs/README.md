# Pulse (OneMed SupplyChain) - Dokumentasjon

Velkommen til dokumentasjonen for Pulse, en moderne desktop-applikasjon for effektiv leverandørstyring og ordreoppfølging.

## 🚀 Oversikt

Pulse er en Electron-basert desktop-applikasjon bygget for OneMed for å effektivt administrere leverandørdata og interaksjoner. Applikasjonen tilbyr en strømlinjeformet brukeropplevelse med moderne UI/UX-prinsipper.

### Hovedfunksjoner

- 📊 **Dashboard**: Oversikt over leverandørstatistikk og ordreanalyse
- 📁 **Excel Import**: Enkel import av ordredata fra Excel-filer
- 📧 **E-post Reminders**: Automatisk generering av påminnelser til leverandører
- 🔍 **Progress Tracking**: Visuell progress indikator for workflow
- ⌨️ **Keyboard Shortcuts**: Hurtigtaster for effektiv navigasjon
- 💾 **Local Database**: SQLite-database for lokal datalagring
- 🎨 **Modern UI**: Responsivt design med Tailwind CSS

## 🛠️ Teknisk Stack

- **Electron**: Cross-platform desktop support
- **React**: Moderne brukergrensesnitt
- **TypeScript**: Type-safe utvikling
- **SQLite**: Lokal database
- **Tailwind CSS**: Utility-first styling
- **Vite**: Rask utvikling og bygging

## 📚 Dokumentasjon

### Brukerguider

- **[Kom i gang](getting-started.md)**: Installasjon og første bruk
- **[Brukerguide](user-guide.md)**: Detaljert brukerguide for alle funksjoner
- **[Multi-språk Brukerguide](user-guide-multilang.md)**: Brukerguide på no/en/se/da/fi

### Utviklerguider

- **[Utviklingsmiljø](development/setup.md)**: Sette opp utviklingsmiljø
- **[Arkitektur](architecture.md)**: Applikasjonsarkitektur og komponenter
- **[Bygging og Distribusjon](distribution/README.md)**: Pakking og distribusjon

### Funksjoner

- **[Excel Import](features/excel-import.md)**: Import av ordredata
- **[Database](features/database.md)**: Datastruktur og lagring
- **[E-post Setup](features/email-setup.md)**: Hvordan e-post faktisk sendes (Outlook COM)
- **[E-post Templates](features/email-templates.md)**: E-post maler og tilpasning

## 🎯 Hovedarbeidsflyt

1. **Last opp Excel-fil** med ordredata
2. **Velg ukedag** for leverandører
3. **Velg leverandør** fra listen
4. **Gjennomgå data** og ordre
5. **Send e-post** påminnelse

## ⌨️ Hurtigtaster

- **Ctrl/Cmd + R**: Start på nytt
- **Ctrl/Cmd + ?**: Vis hurtigtaster
- **Escape**: Gå tilbake ett steg
- **Enter**: Bekreft valg
- **Tab**: Naviger mellom felter

## 📊 Dashboard

Dashboard gir oversikt over:

- Totalt antall leverandører
- Leverandører med åpne ordre
- Totalt antall åpne ordre
- Restantall per leverandør
- Topp 5 leverandører etter restantall
- Ordrer per ukedag

## 🔧 Konfigurasjon

Applikasjonen bruker en lokal SQLite-database (`app.sqlite`) som opprettes automatisk ved første bruk. Alle innstillinger og data lagres lokalt på brukerens maskin.

## 📞 Support

For teknisk support eller spørsmål, kontakt utviklingsteamet eller administrator.

---

**Versjon**: Se package.json for gjeldende versjon  
**Sist oppdatert**: juli 2026
