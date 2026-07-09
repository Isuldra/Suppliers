# Pulse (OneMed SupplyChain)

Electron + React + TypeScript desktop app that helps OneMed purchasers track outstanding
supplier orders (imported from Excel) and send reminder emails. Internal tool, Windows-only in
production. Package name `one-med-supplychain-app`, `productName` **Pulse**.

## Package manager: bun, not npm

`bun.lock` is canonical. Install with `bun install`; CI runs `bun install --frozen-lockfile`.
Run scripts with `bun run <script>` (package.json scripts are unchanged, just invoked via bun).

## Build entrypoint gotcha

The main-process entry point is **`src/main/index.ts`**, not `src/main/main.ts` (that file was
dead code and has been deleted — if you see it referenced anywhere, the reference is stale).
`electron.vite.config.ts` builds three separate bundles:

| Process  | Source                  | Output                    |
| -------- | ------------------------ | -------------------------- |
| main     | `src/main/index.ts`      | `dist/main/main.cjs`       |
| preload  | `src/preload/index.ts`   | `dist/preload/index.cjs`   |
| renderer | `src/renderer/`          | `dist/renderer/`           |

`package.json`'s `"main"` field points at `dist/main/main.cjs`. Before touching build config,
verify `electron.vite.config.ts` and `package.json` `main`/`build.files` agree — the entry point
path differs between `bun run dev` and a packaged `app.asar` build.

## Quality gate

Run `bun run quality` before considering a change done (format:check, lint, typecheck, then
`vitest run --passWithNoTests`). `bun run quality:fix` auto-fixes formatting/linting.
Testing is **Vitest only** — there is no Jest, no Playwright/E2E harness in this repo.

## Windows is the only real target

Production builds are Windows-only (NSIS installer, portable `.exe`, MSI). The email-sending
path uses **Outlook COM automation via a PowerShell child process** (`src/main/index.ts` spawns
`powershell`, piping a script over stdin) plus temporary `.eml` files — there is no SMTP client,
no stored password, no app-password flow anywhere in the live code. This only works on Windows
with Outlook installed and signed in. See `docs/features/email-setup.md`.

## IPC contract: preload allowlist

All renderer↔main communication goes through `src/preload/index.ts`, which exposes a narrow
`window.electron` API via `contextBridge.exposeInMainWorld`. Every channel must be listed in the
explicit `validSendChannels`/`validReceiveChannels` arrays before it works — renderer code has no
direct access to `ipcRenderer` or Node APIs. When adding a new IPC call, add the channel name to
both allowlists in `src/preload/index.ts` and register the matching handler in `src/main/index.ts`.

## Untrusted input: Excel data

Data imported from a user's Excel file (supplier names, item descriptions, comments, etc.) is
**untrusted input**. It must never be interpolated directly into:

- **PowerShell script strings** used for the Outlook email automation — pass data via
  parameters/temp files/stdin, not string concatenation into the script.
- **SQL strings** — always use `better-sqlite3` prepared statements with parameter binding
  (this is already the convention throughout `databaseService.ts`; keep it that way).

## Data & storage

- **SQLite** via `better-sqlite3` (`src/services/databaseService.ts`), six tables: `orders`,
  `audit_log`, `weekly_status`, `purchase_order`, `supplier_emails`, `supplier_planning`. See
  `docs/features/database.md`.
- **Supabase** (`src/services/supabaseClient.ts`) is used only to sync a read-only product
  catalog, with an anon key — not for order/supplier data.
- 5 locales: `src/renderer/locales/{no,en,se,da,fi}.json` (i18next). Any user-facing copy change
  should consider all five.

## Docs

`docs/architecture.md` and `docs/features/database.md` are kept verified against the current
code — prefer updating those over trusting older docs, and re-verify against source before
citing either in an unrelated task.
