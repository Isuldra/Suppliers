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

## Documentation Overview

| Area                                                            | Description                                               |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| [Distribution Guide](docs/distribution/DISTRIBUTION.md)         | How to build and distribute the app (NSIS, portable, DMG) |
| [CI/CD Pipeline](docs/development/ci-cd-pipeline.md)            | GitHub Actions build setup                                |
| [Manual Update Process](docs/development/publishing-updates.md) | How to publish app updates manually                       |
| [Security Policy](SECURITY.md)                                  | Security policy and vulnerability reporting               |

---

## Technologies

- Electron
- React + TypeScript
- Tailwind CSS
- SQLite (via `better-sqlite3`)
- electron-updater
- GitHub Actions CI/CD

---

## Dev Tools & Scripts

| Script                  | Description                   |
| ----------------------- | ----------------------------- |
| `npm run dev`           | Start development server      |
| `npm run build`         | Build renderer + Electron app |
| `npm run lint`          | Lint codebase                 |
| `npm run typecheck`     | Type check TypeScript files   |
| `npm run test`          | Run tests                     |
| `npm run test:coverage` | Run tests with coverage       |
| `npm run dist`          | Build production artifacts    |

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

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Maintainers & Contact

This project is maintained by the OneMed team. Please refer to internal documentation or reach out via standard channels.
