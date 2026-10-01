# Native moduler

`better-sqlite3` inneholder en native modul som må passe både maskinens arkitektur og Electron-versjonen. Systemets Node.js og Electron kan ha forskjellige ABI-er.

Typiske symptomer er feil om `NODE_MODULE_VERSION`, `better_sqlite3.node` eller feil arkitektur ved oppstart.

## Utvikling

Fra repoets rot:

```powershell
bun install --frozen-lockfile
bun run dev
```

`dev` kjører `scripts/ensure-electron-modules.js`. Skriptet bruker `electron-rebuild` for å bygge SQLite-modulen mot prosjektets Electron.

For å kjøre dette steget alene:

```powershell
node scripts/ensure-electron-modules.js
```

Kontroller den første feilen i utskriften hvis rebuild feiler. En kompileringsfeil kan kreve Windows-byggverktøy; en feil om at Bun ikke finnes krever kontroll av PATH. Ikke endre Electron-versjonen bare for å matche en gammel modulfil.

## Pakket app

Windows-målene i `package.json` er x64. Bygg på Windows med avhengighetene fra `bun.lock` og pakk på nytt:

```powershell
bun run dist:clean
```

Test den nye pakken ved å starte appen og importere en fil. En vellykket renderer-build alene viser ikke at SQLite-modulen kan lastes.

Behold låsefilen og brukerdataene under feilsøking. Databasen trenger ikke slettes for å løse en ABI-feil.
