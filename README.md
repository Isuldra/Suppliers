# Pulse

Pulse is a desktop application for managing supplier workflows and data. It's built with Electron, React, and TypeScript, and follows OneMed's design system.

## End-User Documentation

**For users of the application:**

- **[Multi-language User Guide](docs/user-guide-multilang.md)** - Complete user manual in Norwegian, Swedish, Danish, Finnish, and English
- **[Getting Started Guide](docs/getting-started.md)** - Quick start guide for new users

---

## Getting Started (Developers)

1. Clone the repo
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Build: `npm run build`

> For complete setup instructions, see [Development Setup](docs/development/setup.md)

---

## How to Run

### Development Mode

```bash
npm run dev                # Start with hot reload
npm run dev:no-warnings    # Start without Node warnings
```

### Production Build

```bash
npm run build              # Build the app
npm run dist               # Create distributable packages (Windows)
npm run dist:portable      # Create portable executable
npm run dist:nsis          # Create NSIS installer
```

### Testing

```bash
npm run test               # Run tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run with coverage report
```

---

## Documentation Overview

| Area                                                            | Description                                               |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| [Distribution Guide](docs/distribution/DISTRIBUTION.md)         | How to build and distribute the app (NSIS, portable, DMG) |
| [CI/CD Pipeline](docs/development/ci-cd-pipeline.md)            | GitHub Actions build setup                                |
| [Manual Update Process](docs/development/publishing-updates.md) | How to publish app updates manually                       |
| [Security Policy](SECURITY.md)                                  | Security policy and vulnerability reporting               |

---

## Testing

The project uses Vitest for testing with comprehensive quality gates.

### Running Tests

- `npm run test` - Run all tests
- `npm run test:watch` - Watch mode for development
- `npm run test:coverage` - Generate coverage reports

### Quality Checks

Before committing, always run quality checks:

- `npm run quality` - Full quality gate (format, lint, typecheck, test)
- `npm run quality:fast` - Quick check without tests
- `npm run quality:fix` - Auto-fix formatting and linting issues

The quality gates enforce:

1. **Prettier formatting** - Code style consistency
2. **ESLint linting** - Code quality and best practices
3. **TypeScript type checking** - Type safety
4. **Vitest tests** - Functional correctness

---

## Technologies

- Electron
- React + TypeScript
- Tailwind CSS
- SQLite (via `better-sqlite3`)
- electron-updater
- GitHub Actions CI/CD

---

## Project Structure

```
supplier-reminder-pro/
├── .github/              # GitHub Actions workflows
│   └── workflows/        # CI/CD pipeline definitions
│       ├── quality.yml   # Quality checks (lint, format, typecheck, test)
│       ├── build.yml     # Build workflow
│       └── ...
├── docs/                 # All documentation
│   ├── development/      # Developer guides
│   ├── distribution/     # Distribution & deployment guides
│   ├── features/         # Feature documentation
│   └── planning/         # Future plans & roadmaps
├── resources/            # Static assets
│   ├── icon-*.png        # Application icons (various sizes)
│   ├── installer.nsh     # NSIS installer configuration
│   └── Produktkatalog.xlsx # Example Excel template
├── scripts/              # Build & deployment scripts
│   ├── build-*.js        # Build automation scripts
│   ├── generate-*.js     # Release metadata generators
│   └── README.md         # Scripts documentation
├── src/
│   ├── main/             # Electron main process
│   │   ├── index.ts      # Main entry point
│   │   ├── main.ts       # Application logic
│   │   ├── database.ts   # Database handlers
│   │   └── importer.ts   # Excel import logic
│   ├── preload/          # Preload scripts (context bridge)
│   │   └── index.ts      # IPC API exposure
│   ├── renderer/         # React frontend
│   │   ├── components/   # React components
│   │   │   └── dashboard/ # Dashboard-specific components
│   │   ├── locales/      # Translations (no, en, se, da, fi)
│   │   ├── services/     # Frontend services
│   │   └── App.tsx       # Main React app
│   ├── services/         # Shared services (main + renderer)
│   │   ├── emailService.ts
│   │   ├── databaseService.ts
│   │   └── emailTemplates/ # Handlebars templates
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
└── tests/                # Test files and setup
    └── setup.ts          # Vitest configuration
```

---

## Dev Tools & Scripts

| Script                  | Description                   |
| ----------------------- | ----------------------------- |
| `npm run dev`           | Start development server      |
| `npm run build`         | Build renderer + Electron app |
| `npm run lint`          | Lint codebase                 |
| `npm run format`        | Format code with Prettier     |
| `npm run format:check`  | Check code formatting         |
| `npm run typecheck`     | Type check TypeScript files   |
| `npm run test`          | Run tests                     |
| `npm run test:coverage` | Run tests with coverage       |
| `npm run dist`          | Build production artifacts    |

### Quality Gates

The project uses standardized quality gates for code validation:

| Command                | Description                                                                     |
| ---------------------- | ------------------------------------------------------------------------------- |
| `npm run quality`      | **Canonical command** - Runs all quality checks (format, lint, typecheck, test) |
| `npm run quality:fix`  | Auto-fix formatting and linting issues, then typecheck                          |
| `npm run quality:fast` | Quick validation without tests (format, lint, typecheck)                        |
| `npm run ci:check`     | Alias for `quality` - use in CI/CD pipelines                                    |

**Technology Stack:**

- **JS/TS**: Prettier + ESLint + TypeScript typecheck
- **Testing**: Vitest

**Usage:**

- Before committing: Run `npm run quality` to ensure all checks pass
- For quick feedback: Use `npm run quality:fast` (skips tests)
- To auto-fix issues: Use `npm run quality:fix` (fixes formatting and linting)

**CI/CD Integration:**

The quality checks run automatically on GitHub Actions:

- **Trigger:** Pull requests and pushes to `main`
- **Workflow:** `.github/workflows/quality.yml`
- **Steps:** Checkout → Cache → Install → Run `npm run quality`

---

## Security Practices

- Context Isolation & Node Integration disabled
- CSP enforced via headers
- Secure external link handling with `shell.openExternal()`
- Prepared SQL statements and audit logging

> For security policy and vulnerability reporting, see [SECURITY.md](SECURITY.md)

---

## Releases & Updates

Pulse uses `electron-updater` with **manual GitHub Releases**.

- CI builds artifacts (EXE, portable, latest.yml)
- Maintainers publish updates manually
- App checks for updates on startup

See: [Publishing Updates](docs/development/publishing-updates.md)

---

## Contributing

### Code Quality Standards

All code must pass quality gates before merging:

1. **Prettier formatting** - Consistent code style
2. **ESLint linting** - Code quality and best practices
3. **TypeScript type checking** - Type safety
4. **Test coverage** - Functional correctness

Run `npm run quality` before committing.

### Git Workflow

1. Create feature branch from `main`
2. Make changes in small, focused commits
3. Run quality checks: `npm run quality`
4. Push and create Pull Request
5. CI/CD will run quality checks automatically
6. Wait for approval and merge

### Commit Message Format

Follow conventional commits:

- `feat: Add new feature`
- `fix: Bug fix`
- `docs: Documentation update`
- `refactor: Code refactoring`
- `test: Add or update tests`
- `chore: Maintenance tasks`

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Keep components small and focused
- Prefer functional components with hooks

---

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Maintainers & Contact

This project is maintained by the OneMed team. Please refer to internal documentation or reach out via standard channels.
