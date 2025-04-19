---
description: Cross-platform development rules for building a Windows-compatible Electron + React + SQLite app on macOS.
globs: **/*.*
---

- Always ensure generated file paths use `path.join` or `path.resolve`, not hardcoded slashes (`/` or `\\`)
- Avoid macOS-specific paths like `/Users/...` – use `app.getPath('userData')` or equivalent Electron APIs
- Generated code must be fully compatible with Electron for Windows — avoid APIs or modules unsupported on Windows
- All generated code must account for the use of `better-sqlite3` or `sqlite3` with native bindings – validate their usage in build steps
- IPC handlers must be defined in `main/` and used via `contextBridge` or preload-safe access only
- Do not use Node APIs directly in renderer — use exposed IPC functions
- When suggesting file creation or editing, prefer `.cjs` or `.mjs` extensions where needed to clarify ES module usage

- Windows-compatible builds must be created using `npm run dist:win` or `npm run portable` — ensure build instructions do not assume `electron-builder` will infer target correctly
- Avoid generating macOS-specific shell commands — always verify that `powershell` or `cmd` equivalents exist where relevant
- Logging and debugging must work on both macOS and Windows — use `electron-log`, never `console.log` in `main/`

- Assume no admin rights on the target machine — all paths and update mechanisms must respect per-user space and not require elevated privileges
- Application updates should work with NSIS, MSI, or Portable — generated release logic should clearly distinguish these cases
