# SupplyChain OneMed: Onboarding Guide

This document provides a starting point for developers and IT administrators joining the SupplyChain OneMed project.

## 1. Introduction

Welcome to the SupplyChain OneMed project! This application is designed to efficiently manage supplier data and interactions, including tracking outstanding orders, triggering email communications to suppliers via the default email client, importing and validating Excel files (`.xlsx`), and local data storage.

**Key Technologies:**

- **Framework:** Electron
- **UI:** React, TypeScript, Tailwind CSS
- **Database:** SQLite

For a general overview, project setup, and contribution guidelines, please refer to the main [Project README](./README.md).

## 2. For Developers

### Getting Started

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd supplier-reminder-pro # Or your project directory name
    ```
2.  **Install Dependencies:** (Assuming Node.js and npm/yarn are installed)
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Run Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
4.  **Build for Production:**
    ```bash
    npm run build
    # or
    yarn build
    ```
5.  **Testing & Linting:**
    - Note: Test and lint steps are currently missing in the CI pipeline but are planned additions. Run linters/formatters locally as needed (e.g., `eslint`, `prettier`).

### Project Structure Overview

- `src/main/`: Electron main process code (Node.js environment). Handles window creation, system events, background tasks.
- `src/renderer/`: React application code (Browser environment). Contains UI components, state management, etc.
- `src/preload/`: Scripts that run before web pages load in the renderer. Bridges main and renderer processes via contextBridge.
- `src/shared/`: Code shared between main, renderer, and preload processes (e.g., types, constants).
- `database/`: Database schema, migrations, and service logic.

### Core Concepts

- **Inter-Process Communication (IPC):** Electron's mechanism for communication between the main and renderer processes. See Electron documentation and `src/preload/` for examples.
- **Database Service:** Handles all interactions with the SQLite database (`database/databaseService.ts`).
- **Wizard Interface:** The primary user flow is managed by a wizard component (`src/renderer/App.tsx`). See [Wizard Interface](./features/wizard-interface.md) for details.
- **Building & CI/CD:** Builds are handled by `electron-builder`. The process is automated via GitHub Actions. See the [CI/CD Pipeline documentation](./development/ci-cd-pipeline.md) for workflow details.

## 3. For IT Admins / Deployment

### Application Overview

SupplyChain OneMed is a desktop application facilitating efficient management of supplier data and interactions (tracking orders, triggering emails, Excel import/validation). It stores data locally in a SQLite database.

### Distribution Formats

The application is distributed in two primary formats:

- **Installer (.exe):** Standard Windows installer. Installs to the user's `AppData\Local` directory by default.
- **Portable (.exe):** Standalone executable that does not require installation. It stores its data in the user's `AppData\Roaming` directory.

For more details on build outputs and configuration, see [Distribution Options](./distribution/DISTRIBUTION-OPTIONS.md).

### Installation

- **Permissions:** The standard installer does **not** require administrator privileges (when installing for the current user).
- **Data Storage:**
  - Installer: Typically `%LOCALAPPDATA%\Programs\SupplyChainOneMed`
  - Portable: Typically `%LOCALAPPDATA%\one-med-supplychain-app`
- **Silent Installation:** Refer to the NSIS documentation for potential silent install flags (e.g., `/S`).
- **Detailed Steps:** See the [End-User Installation Guide](./installation/end-user-installation.md).

### Updates

- **Process:** Updates are managed through `electron-updater`, which checks for new versions published as **manual GitHub Releases**.
- **Configuration:** Update server configuration is defined in `package.json`.
- **Further Details:** See the [Publishing Updates Guide](./development/publishing-updates.md).

### Troubleshooting

- **Log Files:** Application logs can typically be found at `%APPDATA%\one-med-supplychain-app\logs\`
- **Common Issues:** Refer to the installation guide for common installation problems: [End-User Installation Guide](./installation/end-user-installation.md).
  - _(Since `docs/troubleshooting` is empty, link directly to relevant sections in the installation guide or add common issues here as they become known)._

## 4. Key Resources

- **Main Documentation Hub:** [docs/README.md](./README.md)
- **Planned Features & Roadmap:** [docs/planning/planned-features.md](./planning/planned-features.md)

---

**\*Note:** This is a living document. Please update it as the project evolves.\*
