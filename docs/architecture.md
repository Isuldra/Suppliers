# Arkitektur - Pulse (OneMed SupplyChain)

Denne dokumentasjonen beskriver arkitekturen til Pulse, en Electron-basert desktop-applikasjon for
leverandørstyring, bygget for Windows.

## Overordnet Arkitektur

Pulse følger Electrons standard tre-prosess-modell: main-prosess, preload-script og
renderer-prosess (React), koblet sammen via en typet IPC-bro.

```
┌──────────────────────────────────────────────────────────────────┐
│                              Pulse                                │
├──────────────────────────────────────────────────────────────────┤
│  Main Process (Node.js)        │  Preload          │  Renderer     │
│  src/main/index.ts             │  src/preload/     │  (React)      │
│  ┌───────────────────────────┐ │  index.ts         │ ┌───────────┐ │
│  │ • DatabaseService (SQLite)│ │  contextBridge +  │ │ Komponenter│ │
│  │ • Excel-import            │ │  channel-allowlist│ │ Services   │ │
│  │ • Outlook/PowerShell mail │ │                   │ │ i18n       │ │
│  │ • Auto-updater            │◄┼───IPC (invoke/send)┼►│           │ │
│  └───────────────────────────┘ │                   │ └───────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Byggeoppsett (viktig fallgruve)

`electron-vite` (konfigurert i `electron.vite.config.ts`) bygger tre separate bunter:

| Prosess  | Kildeinngang              | Byggoutput               |
| -------- | -------------------------- | ------------------------- |
| main     | `src/main/index.ts`        | `dist/main/main.cjs`      |
| preload  | `src/preload/index.ts`     | `dist/preload/index.cjs`  |
| renderer | `src/renderer/` (Vite root)| `dist/renderer/`          |

`package.json`'s `"main"` felt peker på `dist/main/main.cjs`, som igjen kommer fra
`src/main/index.ts` — **ikke** noen fil som heter `main.ts`. Det har tidligere eksistert en
`src/main/main.ts`, men den var død kode og er slettet.

## Prosjektstruktur (faktisk, verifisert mot `src/`)

```
src/
├── main/
│   ├── index.ts              # Main-prosessens entry point (bygges til dist/main/main.cjs)
│   ├── auto-updater.ts        # electron-updater-integrasjon
│   ├── database.ts            # Eldre database-hjelpere brukt av main
│   ├── databaseAdapter.js     # Adapter kopiert til dist/main ved bygg
│   ├── importer.ts            # Excel-import (BP/Sjekkliste/Leverandør-ark)
│   └── productCatalogImporter.ts
├── preload/
│   └── index.ts               # contextBridge + kanal-allowlist (validSendChannels/validReceiveChannels)
├── renderer/                   # React-frontend (Vite root)
│   ├── App.tsx
│   ├── components/             # UI-komponenter, inkl. components/dashboard/
│   ├── services/                # emailService.ts, languageDetectionService.ts
│   ├── locales/                  # no.json, en.json, se.json, da.json, fi.json (i18next)
│   ├── i18n/                    # i18next-oppsett
│   ├── context/, data/, styles/, types/, assets/
├── services/                    # Delt mellom main og renderer
│   ├── databaseService.ts        # Singleton SQLite-tjeneste (better-sqlite3)
│   └── emailTemplates/           # Handlebars-maler
├── config/
├── generated/                    # Genererte filer (f.eks. kompilert e-postmal)
├── types/
└── utils/
```

`docs/`, `resources/` og `scripts/` ligger på repo-roten, ikke under `src/`.

## Dataflyt

### 1. Excel Import

```
Bruker laster opp fil → FileUpload/BulkDataReview → IPC til main
   → importer.ts parser BP/Sjekkliste/Leverandør-ark → DatabaseService skriver til SQLite
   → UI oppdateres med leverandørliste/ordre
```

### 2. E-post-sending

Se [Email Setup](features/email-setup.md) for full beskrivelse. Kort oppsummert:

```
Bruker velger leverandør/ordre → EmailButton/BulkEmailPreview → emailService.sendReminder()
   → IPC (sendEmailViaEmlAndCOM → sendEmailAutomatically → sendEmail, med fallback i den rekkefølgen)
   → main-prosessen skriver en .eml-fil og styrer Outlook via en PowerShell-child-process (COM automation)
```

Det finnes **ingen SMTP-integrasjon** i produksjonskoden — sending skjer alltid via Outlook som
allerede kjører og er logget inn på brukerens Windows-maskin.

### 3. Dashboard

```
Dashboard.tsx → IPC (get-dashboard-stats / get-top-suppliers / get-orders-by-week)
   → DatabaseService (getDashboardStats/getTopSuppliersByOutstanding/getOrdersByWeek)
   → React state → recharts-komponenter i components/dashboard/
```

## IPC (Inter-Process Communication)

All IPC går gjennom `src/preload/index.ts`, som eksponerer et begrenset `window.electron`-API via
`contextBridge.exposeInMainWorld`. Kanaler må stå i en eksplisitt allowlist
(`validSendChannels`/`validReceiveChannels`) før de slipper gjennom — renderer-koden har ingen
direkte tilgang til `ipcRenderer` eller Node-APIer.

Eksempler på registrerte kanaler: `sendEmail`, `sendEmailAutomatically`, `sendEmailViaEmlAndCOM`,
`db:insertOrUpdateOrder`, `db:getAllOrders`, `get-dashboard-stats`, `get-top-suppliers`,
`get-orders-by-week`, `update:check`/`update:install` (auto-updater).

## Datalagring

- **SQLite** via `better-sqlite3`, singleton `DatabaseService` — se
  [Database](features/database.md) for fullt skjema (seks tabeller: `orders`, `audit_log`,
  `weekly_status`, `purchase_order`, `supplier_emails`, `supplier_planning`).

## Sikkerhet

- **Context Isolation**: aktivert; `nodeIntegration` er av i renderer.
- **Preload-allowlist**: all IPC valideres mot en eksplisitt kanal-liste (se over).
- **Prepared statements**: all SQL i `DatabaseService` bruker parameterbinding, ikke
  strengkonkatenering.
- **Untrusted input**: data fra brukerens Excel-fil regnes som utrusted og skal aldri
  interpoleres direkte inn i PowerShell-kommandoer eller SQL-strenger.

## Teknisk Stack

- **Electron 36** + **electron-vite** for bygg
- **React 19** + **TypeScript**
- **Tailwind CSS**
- **better-sqlite3** (SQLite)
- **i18next** / **react-i18next** (5 språk: no, en, se, da, fi)
- **electron-updater** (auto-oppdateringer via manuelt publiserte GitHub Releases)
- **Vitest** for testing — prosjektet bruker **ikke** Jest eller Playwright

## Testing

Testrammeverket er **Vitest**, konfigurert til å kjøre via `bun run test` /
`bun run quality`. Det finnes ikke noe E2E-testoppsett (Playwright/Spectron) i dette repoet i dag;
eventuelle tidligere referanser til Jest eller Playwright i denne dokumentasjonen var feil.

---

**Sist verifisert mot kode**: juli 2026
