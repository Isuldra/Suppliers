# Utviklingsmiljø - OneMed SupplyChain (Pulse)

Denne guiden beskriver hvordan du setter opp utviklingsmiljøet for Pulse.

## 🛠️ Forutsetninger

### Nødvendige Verktøy

- **Bun**: Prosjektets pakkebehandler. `bun.lock` er canonical, og CI kjører
  `bun install --frozen-lockfile`. Bruk `bun install`/`bun run <script>`, ikke `npm install`.
- **Node.js**: Versjon 22 (brukt av flere GitHub Actions workflows, f.eks.
  `.github/workflows/release.yml`, `manual-release.yml`, `security-audit.yml`,
  `version-management.yml`). `build.yml` selv bruker kun Bun og trenger ikke en separat
  Node-setup.
- **Git**: For versjonskontroll
- **Code Editor**: VS Code anbefales

### Systemkrav

- **OS for utvikling**: Windows, macOS eller Linux
- **OS for produksjonsbygg**: Windows (native moduler som `better-sqlite3` bygges kun pålitelig
  for Windows-target; Outlook-integrasjonen krever uansett Windows i produksjon)
- **RAM**: Minimum 4GB, anbefalt 8GB
- **Diskplass**: 2GB ledig plass
- **Nettverk**: Internett for nedlasting av dependencies

## 🚀 Installasjon

### 1. Klone Repository

```bash
git clone <repository-url>
cd Suppliers
```

### 2. Installer Dependencies

```bash
bun install
```

### 3. Sjekk Installasjon

```bash
# Sjekk Node.js versjon
node --version  # Skal være 22.x

# Sjekk Bun-versjon
bun --version

# Sjekk at alle dependencies er installert
bun pm ls
```

## 🔧 Konfigurasjon

### VS Code Anbefalinger

Installer følgende extensions:

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: CSS autocomplete

## 🏃‍♂️ Utvikling

### Start Development Server

```bash
bun run dev
```

Dette kjører `scripts/ensure-electron-modules.js` og starter deretter `electron-vite dev`:

- Vite dev server for renderer-prosessen
- Electron main-prosess
- Hot Module Replacement (HMR)

### Build

```bash
bun run build
```

## 🧪 Testing

Prosjektet bruker **Vitest** (ikke Jest, ikke Playwright).

```bash
# Kjør alle tester
bun run test

# Kjør tester i watch mode
bun run test:watch

# Kjør tester med coverage
bun run test:coverage
```

### Manuell testing

1. **Start applikasjonen**: `bun run dev`
2. **Test Excel-import**: Last opp en test Excel-fil
3. **Test e-post-sending**: Krever Windows + Outlook installert og innlogget (se
   [Email Setup](../features/email-setup.md))
4. **Test dashboard**: Naviger til dashboard

## 🔍 Kvalitetssjekk (Quality Gate)

Kanonisk kommando før commit/PR:

```bash
bun run quality
```

Dette kjører `format:check`, `lint`, `typecheck`, og `test` (med `--passWithNoTests`) i rekkefølge.
Andre nyttige varianter:

```bash
# Auto-fikser formattering og linting, kjører deretter typecheck
bun run quality:fix

# Rask sjekk uten tester
bun run quality:fast

# Kun formattering
bun run format
bun run format:check

# Kun linting
bun run lint
```

## 📁 Prosjektstruktur

```
src/
├── main/                       # Main-prosess (entry: index.ts → dist/main/main.cjs)
├── preload/                    # Preload-script (contextBridge + kanal-allowlist)
├── renderer/                   # React-frontend
│   ├── App.tsx
│   ├── components/
│   ├── services/
│   └── locales/                # no, en, se, da, fi
└── services/                    # Delt mellom main og renderer (databaseService)
docs/                            # Dokumentasjon
resources/                       # App-ressurser (ikoner, installer-config)
scripts/                         # Bygg- og release-scripts
tests/                           # Vitest-oppsett
dist/                            # Byggoutput (gitignored)
```

Se [Arkitektur](../architecture.md) for full detaljer.

## 📦 Produksjonsbygg (Windows)

```bash
bun run dist            # Full NSIS + portable + zip, med Cloudflare-forberedelse
bun run dist:portable   # Kun portable .exe
bun run dist:nsis       # Kun NSIS-installer
bun run dist:msi        # Kun MSI-pakke
```

Se [Distribusjon](../distribution/DISTRIBUTION.md) og
[Publishing Updates](publishing-updates.md) for release-prosessen.

## 🚨 Vanlige Problemer

### Node Modules Feil

```bash
rm -rf node_modules
bun install
```

### Database Feil

```bash
# Slett lokal database og start på nytt (data ligger i app-data-mappen, ikke i repoet)
bun run dev
```

### Build Feil

```bash
rm -rf dist/
bun run build
```

## 📚 Ressurser

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite](https://vitejs.dev/)
- [Electron Vite](https://electron-vite.org/)
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)
- [Bun](https://bun.sh/docs)

## 🤝 Bidrag

### Pull Request Prosess

1. Opprett feature branch fra `main`
2. Gjør endringer i små, fokuserte commits
3. Kjør `bun run quality`
4. Opprett pull request
5. Vent på CI (kjører samme kvalitetssjekk) og code review
6. Merge

### Commit Convention

```
type(scope): description

feat: ny feature
fix: bugfix
docs: dokumentasjonsoppdatering
refactor: refaktorering
test: tester
chore: vedlikehold
```

---

**Sist oppdatert**: juli 2026
**Versjon**: Se package.json for gjeldende versjon
