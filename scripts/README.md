# Scripts Directory

This directory contains utility scripts for building, testing, releasing, and maintaining the application.

## Table of Contents

- [Build & Development](#build--development)
- [Version Management](#version-management)
- [Release & Distribution](#release--distribution)
- [Testing & Validation](#testing--validation)
- [Deployment](#deployment)
- [Utilities](#utilities)
- [Deprecated/Unused Scripts](#deprecatedunused-scripts)

---

## Build & Development

### `buildEmailTemplate.ts`

**Status**: Active  
**Used by**: `npm run build:email-template` (prebuild hook)  
**Purpose**: Compiles Handlebars email template (`src/services/emailTemplates/reminder.hbs`) into TypeScript module (`src/generated/emailTemplateCompiled.ts`).  
**Usage**: Automatically runs before builds via `prebuild` hook.

### `build-with-version.js`

**Status**: Active  
**Used by**: `npm run dist:clean`  
**Purpose**: Builds the application with version synchronization. Cleans build cache, syncs version across files, and runs full build process.  
**Usage**: `npm run dist:clean`

### `clean-build.js`

**Status**: Active  
**Used by**: `npm run clean-dist`  
**Purpose**: Removes build artifacts (`dist/`, `release/`, `node_modules/`).  
**Usage**: `npm run clean-dist`

### `clean-build-cache.js`

**Status**: Active  
**Used by**: `build-with-version.js`  
**Purpose**: Cleans build cache directories.  
**Usage**: Called internally by build scripts.

### `create-minimal-manifest.js`

**Status**: Active  
**Used by**: `npm run create-minimal-manifest` (pre-dist hook)  
**Purpose**: Creates minimal `package.json` manifest in `dist/` directory with essential fields for electron-builder.  
**Usage**: Automatically runs before distribution builds.

### `ensure-electron-modules.js`

**Status**: Active  
**Used by**: `npm run dev`  
**Purpose**: Ensures native modules (like `better-sqlite3`) are properly rebuilt for Electron's Node.js version before starting dev server.  
**Usage**: Automatically runs when starting dev mode.

### `ensure-database-modules.js`

**Status**: Potentially Deprecated  
**Used by**: None (not in package.json)  
**Purpose**: Copies database module files to `dist/` directory. May be superseded by electron-vite build process.  
**Usage**: Manual execution if needed.

### `fix-native-modules.js`

**Status**: Potentially Deprecated  
**Used by**: None (not in package.json)  
**Purpose**: Quick fix script to ensure `dist/node_modules` has correct native modules. May be superseded by `ensure-electron-modules.js`.  
**Usage**: Manual execution if needed.

---

## Version Management

### `sync-version.js`

**Status**: Active  
**Used by**: `npm run version:sync`, `npm run version:bump`, `npm run version:bump:minor`, `npm run version:bump:major`, `npm run version:bump:push`, `npm run version:info`, `npm run version:help`  
**Purpose**: Synchronizes version numbers across `package.json`, `package-lock.json`, and other versioned files. Supports bumping patch/minor/major versions.  
**Usage**:

- `npm run version:sync` - Sync version from package.json
- `npm run version:bump` - Bump patch version
- `npm run version:bump:minor` - Bump minor version
- `npm run version:bump:major` - Bump major version
- `npm run version:info` - Show current version info

### `validate-version.js`

**Status**: Active  
**Used by**: `npm run validate:version`  
**Purpose**: Validates version consistency across all files (package.json, CHANGELOG.md, git tags, etc.).  
**Usage**: `npm run validate:version` (also runs before releases)

---

## Release & Distribution

### `build-x64-portable.js`

**Status**: Active  
**Used by**: `npm run build-x64-portable`  
**Purpose**: Builds portable Windows x64 distribution.  
**Usage**: `npm run build-x64-portable`

### `create-all-distributions.js`

**Status**: Manual Utility  
**Used by**: None (not in package.json)  
**Purpose**: Creates all distribution formats (NSIS, portable, MSI) in one run. May be superseded by individual dist commands.  
**Usage**: Manual execution: `node scripts/create-all-distributions.js`

### `create-changelog-entry.js`

**Status**: Manual Utility  
**Used by**: None (not in package.json)  
**Purpose**: Creates a new changelog entry for a version.  
**Usage**: `node scripts/create-changelog-entry.js <version> "<title>"`

### `create-github-release.js`

**Status**: Active  
**Used by**: `npm run release:github`  
**Purpose**: Creates GitHub release with release notes and uploads artifacts.  
**Usage**: `npm run release:github`

### `parse-changelog.js`

**Status**: Active (used by other scripts)  
**Used by**: `send-changelog-to-slack.js`  
**Purpose**: Parses CHANGELOG.md to extract release notes for a specific version.  
**Usage**: Called internally by Slack notification script.

### `prepare-cloudflare-release.js`

**Status**: Active  
**Used by**: `npm run release:prepare`  
**Purpose**: Prepares Cloudflare Pages release by generating `latest.yml`, `latest.json`, updating `index.html`, and copying metadata files to `docs/updates/`. Generates update manifests internally (no longer uses separate generate-\* scripts).  
**Usage**: `npm run release:prepare` (automatically runs after builds)

### `send-changelog-to-slack.js`

**Status**: Active  
**Used by**: `npm run slack:changelog`, `npm run slack:changelog:latest`  
**Purpose**: Sends changelog entries to Slack webhook.  
**Usage**:

- `npm run slack:changelog` - Send latest changelog
- `npm run slack:changelog:latest` - Same as above

---

## Testing & Validation

### `security-check.js`

**Status**: Active  
**Used by**: `npm run security-check`  
**Purpose**: Runs comprehensive security checks (OWASP best practices): dependency audit, lock file validation, outdated packages check.  
**Usage**: `npm run security-check`

### `sqlite-test.js`

**Status**: Active (utility)  
**Used by**: `test-sqlite-dependencies.js`  
**Purpose**: Tests SQLite3 and better-sqlite3 module functionality.  
**Usage**: Called internally by test script.

### `test-sqlite-dependencies.js`

**Status**: Active  
**Used by**: `npm run test-sqlite`  
**Purpose**: Tests SQLite dependencies and native module compatibility.  
**Usage**: `npm run test-sqlite`

---

## Deployment

### `simple-cloudflare-deploy.js`

**Status**: Active  
**Used by**: `npm run deploy:cloudflare`  
**Purpose**: Deploys metadata files to Cloudflare Pages for auto-update functionality.  
**Usage**: `npm run deploy:cloudflare`

### `deploy-to-cloudflare.js`

**Status**: Deprecated  
**Used by**: None  
**Purpose**: Older Cloudflare deployment script. Replaced by `simple-cloudflare-deploy.js`.  
**Usage**: Do not use - use `simple-cloudflare-deploy.js` instead.

### `deploy-to-github-pages.js`

**Status**: Deprecated/Unused  
**Used by**: None  
**Purpose**: Deploys to GitHub Pages. Not currently used (project uses Cloudflare Pages).  
**Usage**: Do not use.

---

## Utilities

### `generate-app-update-yml.js`

**Status**: Deprecated  
**Used by**: None  
**Purpose**: Generated `latest.yml` for auto-updates. Functionality integrated into `prepare-cloudflare-release.js`.  
**Usage**: Do not use - functionality is in `prepare-cloudflare-release.js`.

### `generate-latest-json.js`

**Status**: Deprecated  
**Used by**: None  
**Purpose**: Generated `latest.json` for portable version updates. Functionality integrated into `prepare-cloudflare-release.js`.  
**Usage**: Do not use - functionality is in `prepare-cloudflare-release.js`.

### `generate-latest-yml.js`

**Status**: Deprecated  
**Used by**: None  
**Purpose**: Generated `latest.yml` for NSIS installer updates. Functionality integrated into `prepare-cloudflare-release.js`.  
**Usage**: Do not use - functionality is in `prepare-cloudflare-release.js`.

---

## Scripts Pending Verification

The following scripts may be deprecated but require verification before removal:

- `ensure-database-modules.js` - May be superseded by electron-vite build process. **TODO:** Verify if electron-vite config handles database module copying, then consider removal.
- `fix-native-modules.js` - May be superseded by `ensure-electron-modules.js`. **TODO:** Verify if `ensure-electron-modules.js` provides all functionality, then consider removal.

---

## Related Documentation

- [Development Setup](../../docs/development/setup.md)
- [Release Workflow](../../docs/development/AUTOMATED-RELEASE-WORKFLOW.md)
- [Versioning](../../docs/development/VERSIONING.md)
- [Troubleshooting Native Modules](../../docs/development/troubleshoot-native-modules.md)

---

## Finding Scripts

To find which npm scripts use these files:

```bash
grep -r "scripts/" package.json
```

To find scripts referenced in code:

```bash
grep -r "scripts/" src/ scripts/
```
