# Utviklingsmiljø

Bruk Windows for å teste Outlook og bygge Windows-distribusjonen. Renderer og deler av testsuiten kan kjøres på andre plattformer, men det erstatter ikke kontroll av Windows-flyten.

## Verktøy

CI bruker Node.js 22 og Bun 1.3.14. Ha Node/npm, Bun og Git på PATH. Bun er pakkebehandleren; `bun.lock` er den delte låsefilen. Enkelte byggeskript bruker fortsatt npm og npx internt.

Fra repoets rot:

```powershell
bun install --frozen-lockfile
bun run dev
```

Utviklingskommandoen bygger `better-sqlite3` mot Electron før appen starter. Kontakter og planlegging kommer fra Excel-importen til SQLite.

Eldre lokale filer under `src/renderer/data/` og `resources/Produktkatalog.xlsx` er fortsatt utelatt fra Git. Dagens app importerer dem ikke.

## Kontroller

```powershell
bun run format:check
bun run lint
bun run typecheck
bun run test -- --run
```

`bun run test` uten `--run` starter Vitest i interaktiv modus. `bun run quality` samler formatkontroll, lint, typekontroll og tester.

Kjør kontroller som passer endringen. Ved endring av sendeflyt skal testene bruke mock av Outlook-transporten.

## Bygg

```powershell
bun run build
bun run dist:clean
```

`build` lager appens `dist/`-innhold. `dist:clean` bygger og pakker Windows-utgavene til `release/`, uten å publisere dem. For å pakke et allerede bygget `dist/`:

```powershell
bun run dist:clean -- --skip-vite-build
```

Separate mål finnes som `dist:nsis`, `dist:portable` og `dist:msi`. Se [publisering](publishing-updates.md) for metadata og eksterne sideeffekter.

## Feilsøking

Ved Node/Electron-modulfeil, se [native moduler](troubleshoot-native-modules.md). Apploggen og lagringsplasseringen er beskrevet i [Windows-feilsøking](../distribution/WINDOWS-TROUBLESHOOTING.md).

Appens innganger og dataflyt er beskrevet i [arkitektur](../architecture.md).
