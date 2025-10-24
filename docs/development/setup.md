# Utviklingsmiljø - OneMed SupplyChain

Denne guiden beskriver hvordan du setter opp utviklingsmiljøet for OneMed SupplyChain.

## 🛠️ Forutsetninger

### Nødvendige Verktøy

- **Node.js**: Versjon 18 eller nyere
- **npm**: Kommer med Node.js
- **Git**: For versjonskontroll
- **Code Editor**: VS Code anbefales

### Systemkrav

- **OS**: Windows 10+, macOS 10.15+, eller Linux
- **RAM**: Minimum 4GB, anbefalt 8GB
- **Diskplass**: 2GB ledig plass
- **Nettverk**: Internett for nedlasting av dependencies

## 🚀 Installasjon

### 1. Klone Repository

```bash
git clone <repository-url>
cd supplier-reminder-pro
```

### 2. Installer Dependencies

```bash
npm install
```

### 3. Sjekk Installasjon

```bash
# Sjekk Node.js versjon
node --version  # Skal være 18+

# Sjekk npm versjon
npm --version

# Sjekk at alle dependencies er installert
npm list --depth=0
```

## 🔧 Konfigurasjon

### Miljøvariabler

Opprett en `.env` fil i prosjektroten:

```env
# Development
NODE_ENV=development

# Database
DB_PATH=./data/app.sqlite

# Logging
LOG_LEVEL=debug

# Auto-updater (development)
AUTO_UPDATER_ENABLED=false
```

### VS Code Anbefalinger

Installer følgende extensions:

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **TypeScript Importer**: Auto-import
- **Tailwind CSS IntelliSense**: CSS autocomplete
- **Electron Debugger**: Debug Electron apps

### VS Code Settings

Legg til i `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## 🏃‍♂️ Utvikling

### Start Development Server

```bash
npm run dev
```

Dette starter:

- Vite dev server for renderer process
- Electron main process
- Hot Module Replacement (HMR)
- Auto-reload ved filendringer

### Build for Production

```bash
# Development build
npm run build

# Production build
npm run build:prod
```

### Package Application

```bash
# Package for current platform
npm run package

# Package for all platforms
npm run package:all
```

## 🧪 Testing

### Unit Tests

```bash
# Kjør alle tester
npm test

# Kjør tester i watch mode
npm run test:watch

# Kjør tester med coverage
npm run test:coverage
```

### E2E Tests

```bash
# Kjør E2E tester
npm run test:e2e

# Kjør E2E tester i headed mode
npm run test:e2e:headed
```

### Manual Testing

1. **Start applikasjonen**: `npm run dev`
2. **Test Excel import**: Last opp en test Excel-fil
3. **Test e-post sending**: Send test e-post
4. **Test dashboard**: Naviger til dashboard
5. **Test keyboard shortcuts**: Bruk Ctrl/Cmd + ?

## 🐛 Debugging

### Main Process Debugging

```bash
# Start med debugging
npm run dev:debug
```

Eller legg til i `package.json`:

```json
{
  "scripts": {
    "dev:debug": "cross-env NODE_ENV=development electron-vite dev --inspect=5858"
  }
}
```

### Renderer Process Debugging

1. Åpne DevTools: `Ctrl+Shift+I` (Windows/Linux) eller `Cmd+Option+I` (macOS)
2. Bruk Console for logging
3. Bruk Sources for breakpoints
4. Bruk Network for API-kall

### Database Debugging

```bash
# Åpne SQLite database
sqlite3 ./data/app.sqlite

# Kjør queries
SELECT * FROM purchase_order LIMIT 10;
SELECT * FROM supplier_emails LIMIT 10;
```

## 📁 Prosjektstruktur

```
supplier-reminder-pro/
├── src/
│   ├── main/                    # Main process
│   │   ├── index.ts            # Entry point
│   │   ├── database.ts         # Database service
│   │   ├── importer.ts         # Excel import
│   │   └── auto-updater.ts     # Auto-update
│   ├── renderer/               # Renderer process
│   │   ├── App.tsx            # Main component
│   │   ├── components/        # React components
│   │   ├── services/          # Business logic
│   │   └── types/             # TypeScript types
│   └── preload/               # Preload scripts
├── docs/                      # Documentation
├── resources/                 # App resources
├── scripts/                   # Build scripts
├── tests/                     # Test files
└── dist/                      # Build output
```

## 🔍 Linting og Formatting

### ESLint

```bash
# Kjør linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Prettier

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

## 📦 Build Scripts

### Development

```bash
# Start development
npm run dev

# Build development
npm run build:dev

# Package development
npm run package:dev
```

### Production

```bash
# Build production
npm run build:prod

# Package production
npm run package:prod

# Create installer
npm run make
```

## 🔄 Git Workflow

### Branch Strategy

- **main**: Production code
- **develop**: Development branch
- **feature/\***: New features
- **bugfix/\***: Bug fixes
- **hotfix/\***: Critical fixes

### Commit Convention

```
type(scope): description

feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

### Pre-commit Hooks

```bash
# Install husky
npm install husky --save-dev

# Setup pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

## 🚨 Vanlige Problemer

### Node Modules Feil

```bash
# Ryd node_modules og reinstall
rm -rf node_modules package-lock.json
npm install
```

### Electron Rebuild

```bash
# Rebuild native modules
npm run rebuild

# Eller manuelt
npx electron-rebuild
```

### Database Feil

```bash
# Slett database og start på nytt
rm -rf data/app.sqlite
npm run dev
```

### Build Feil

```bash
# Ryd build cache
rm -rf dist/
npm run build
```

## 📚 Ressurser

### Dokumentasjon

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Verktøy

- [Vite](https://vitejs.dev/)
- [Electron Vite](https://electron-vite.org/)
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)
- [ExcelJS](https://github.com/exceljs/exceljs)

## 🤝 Bidrag

### Pull Request Prosess

1. Fork repository
2. Opprett feature branch
3. Gjør endringer
4. Kjør tester
5. Opprett pull request
6. Code review
7. Merge

### Code Review Checklist

- [ ] Kode følger style guide
- [ ] Tester er inkludert
- [ ] Dokumentasjon er oppdatert
- [ ] Ingen breaking changes
- [ ] Performance er optimalisert

---

**Sist oppdatert**: Juli 2024  
**Versjon**: Se package.json for gjeldende versjon
