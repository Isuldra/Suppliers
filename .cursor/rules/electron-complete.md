---
description: Full Electron cross-platform development rules for Supplier Reminder Pro.
globs: **/*.ts, **/*.tsx, main/**/*, renderer/**/*
---

# 1. Path & File Handling

- Always use `import path from 'path'` with `path.join` or `path.resolve`; never hardcode slashes (`/` or `\\`).
- Use `app.getPath('userData')` or `app.getPath('appData')` for user-specific directories.
- Avoid absolute file paths; rely on Electron APIs for cross-platform compatibility.

# 2. Native Modules & Bundling

- Externalize native modules (`better-sqlite3`, `sqlite3`) in `electron.vite.config.ts`.
- Ensure `asarUnpack` and CommonJS plugins are configured to include `.node` bindings.
- Test Windows builds via `npm run dist:win` and portable builds via `npm run portable` on macOS.

# 3. IPC & Preload

- Expose safe APIs via `contextBridge.exposeInMainWorld` in preload scripts.
- Renderer code must use `window.api.invoke()` or similar; never import `ipcRenderer` directly.
- Define clear channel names and validate all messages in both main and renderer.

# 4. Module Structure & ES Modules

- Use ES module syntax (`import`/`export`) consistently in both main and renderer.
- Use `.mjs` for ESM entry points in main if necessary; reserve `.cjs` for compatibility layers.

# 5. Logging & Error Handling

- Use `electron-log` for structured logging; avoid `console.log` in production code.
- Include timestamps and severity levels (`info`, `warn`, `error`) in all logs.

# 6. Security & Context Isolation

- Set `nodeIntegration: false` and `contextIsolation: true` in BrowserWindow.
- Implement a Content Security Policy (CSP) either via headers or meta tags.

# 7. Portable & Installer Configuration

- Build commands:
  - `npm run dist:win` for Windows installer (x64).
  - `npm run portable` for user-level portable ZIP without admin rights.
- Configure `requestExecutionLevel: 'user'` in portable build to avoid elevation.

# 8. Testing & Validation

- Write end-to-end tests for IPC channels using Playwright or Spectron.
- Unit-test core services (e.g., `DatabaseService`) with Vitest.
