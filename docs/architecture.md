# Arkitektur

Pulse er en Electron-app med React-renderer, TypeScript og SQLite. Bygget bruker electron-vite. Windows-pakken bruker electron-builder.

## Prosessene

| Del      | Inngang                           | Ansvar                                                         |
| -------- | --------------------------------- | -------------------------------------------------------------- |
| Main     | `src/main/index.ts`               | Vinduer, IPC, database, Excel-import, Outlook og oppdateringer |
| Preload  | `src/preload/index.ts`            | Eksponere navngitte metoder på `window.electron`               |
| Renderer | `src/renderer/App.tsx`            | Arbeidsflate og dashboard                                      |
| Database | `src/services/databaseService.ts` | Skjema og SQL-spørringer                                       |

`App.tsx` bruker HashRouter. `/dashboard` åpner dashboardet; øvrige ruter åpner arbeidsflaten.

Byggets innganger og utdata ligger i `electron.vite.config.ts`: main bygges til `dist/main/main.cjs`, preload til `dist/preload/index.cjs` og renderer til `dist/renderer`.

## Dataflyt

```text
Excel-fil
  -> renderer validerer filen
  -> preload / IPC
  -> main importerer til SQLite
  -> arbeidsflate og dashboard leser gjennom IPC

Valgte leverandører og linjer
  -> gjennomgang og HTML i renderer
  -> main lager EML og sender via Outlook COM
  -> renderer lagrer lokal sendingshistorikk
```

Importen erstatter ordresnapshotet. Kontaktark og planlegging behandles separat. Se [Excel-import](features/excel-import.md).

SQLite ligger i Electron sin `userData`-mappe. Arbeidsflatens kontaktendringer, utelatelser og historikk ligger i localStorage. Sending og historikklagring er separate operasjoner; køen stopper dersom lagringen etter bekreftet sending feiler. Se [lagring](features/database.md) og [sendeflyt](features/email-reminders.md).

## Arbeidsflaten

`src/renderer/workspace/` inneholder:

- `Workspace.tsx`: data, valg, import og navigasjon.
- `model.ts`: leverandørmodell, linjeidentitet, ukestatus og lokal lagring.
- `OrderTable.tsx` og `SupplierRegister.tsx`: ordre- og kontaktvisning.
- `Review.tsx`: gjennomgang, sekvensiell sending og lagringsretry.
- `reminder.ts`: språk, emne og HTML.

Renderer og main deler mottakervalidering i `src/utils/emailRecipients.ts`. Dataverdier escapes når purringens HTML bygges.

## Prosessgrense

BrowserWindow bruker `contextIsolation: true` og `nodeIntegration: false`. Renderer kommuniserer gjennom preload. Generiske `send`- og `on`-metoder har kanallister; navngitte API-metoder bruker sine egne IPC-kanaler.

Main bruker SQL-parametre og PowerShell-literalhjelpere. Validering varierer mellom IPC-metodene. CSP settes for utviklingsserveren og det pakkede rendererinnholdet.

## Oppdateringer

Installerutgaven bruker electron-updater med en generisk Cloudflare-feed. Feedens `latest.yml` peker til filer i GitHub Releases. Portable-utgaven sjekker samme versjonsfeed, men krever manuell utskifting av programfilen.

`docs/updates/` er publisert webinnhold. Se [publiseringsflyten](development/publishing-updates.md) før filene endres.
