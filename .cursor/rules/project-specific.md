# Cursor AI: Project-Specific Rules (SupplyChain OneMed - Electron/Vite)

**Purpose:** These rules supplement `core.md` with specifics for this project's Electron/Vite/Builder setup.

---

**I. Build & Development Process:**

1.  **CRITICAL: Entry Point Validation (`main` field & Build Output):**
    - The `main` entry point configuration is complex and differs between `dev` and `dist`.
    - **`npm run dist` / Production:** Relies on `package.json` `main` field pointing to the _path inside `app.asar`_. This path depends on the `build.files` config (e.g., `"main/main.cjs"` if `dist/main/main.cjs` is copied to `app.asar` root via `from: "dist", to: "."`).
    - **`npm run dev` / Development:** Seems to rely on `package.json` `main` pointing to the _actual file in the `dist` directory_ (e.g., `"dist/main/main.cjs"`), potentially ignoring the `electron.vite.config.ts` output filename settings during launch.
    - **Action:** Before running `dev` or `dist`, or modifying related configs:
      1.  Check `package.json` (`main`).
      2.  Check `electron.vite.config.ts` (`main.build.rollupOptions.input`, `main.build.output.entryFileNames`, `main.build.outDir`).
      3.  Check `package.json` (`build.files`, `build.directories.app` if present).
      4.  Verify the _actual filename_ created in `dist/main/` during the relevant build step (`dev` or `build`).
      5.  State the expected entry point path for the _specific context_ (`dev` or `dist`/`asar`) before proceeding. Adjust `package.json` `main` field _specifically_ for the task at hand if necessary, explaining the conflict if one exists.

2.  **`app.asar` Packaging & Paths:**
    - Understand that `build.files: [{ "from": "dist", "to": "." }]` copies the _contents_ of `dist` into the `app.asar` root.
    - Paths inside `app.asar` are relative to its root (e.g., `dist/main/file.js` becomes `main/file.js`).
    - The `package.json` `main` field for production builds must reflect this _internal archive path_.

3.  **Icon Configuration:**
    - **Production (`npm run dist`):** Icons are set via `package.json` (`build.win.icon`, `build.mac.icon`, etc.). These should point to platform-specific formats (`.ico`, `.icns`) ideally located in `resources/`.
    - **Development (`npm run dev`):** The window icon often defaults to Electron's. To show the custom icon during dev, it MUST be set explicitly in the `BrowserWindow` constructor options in `src/main/index.ts` (e.g., `icon: path.join(__dirname, '../../supplychain.png')`). Note `__dirname` refers to the _built file's location_ (`dist/main/`).

4.  **Path Resolution (`__dirname`)**:
    - When using `path.join(__dirname, ...)` in the main process (`src/main/index.ts`), remember `__dirname` refers to the location of the _built output file_ (e.g., `/path/to/project/dist/main`), not the source file (`src/main/`). Adjust relative paths accordingly (e.g., `../../supplychain.png` to get to the root).

5.  **Configuration Files Precedence:**
    - `electron.vite.config.ts` primarily controls the `electron-vite build` step (used by both `dev` and `dist`).
    - `package.json` (`build` section) primarily controls `electron-builder` (packaging/distribution).
    - `package.json` (`main` field) is used by Electron itself to find the entry point, but its required value differs between `dev` (seems to need path relative to project root pointing into `dist`) and `production` (needs path relative to `app.asar` root).

**II. Logging & Debugging:**

1.  **`electron-log` Deprecations:** Pay attention to warnings like `resolvePath is deprecated`. Use the suggested alternatives (`resolvePathFn`).
2.  **Error Correlation:** When build/dev fails, actively correlate error messages (e.g., "No electron app entry file found") with the configurations mentioned in section I to pinpoint the mismatch. Check the actual contents of the `dist` directory and, if possible, `app.asar`.
