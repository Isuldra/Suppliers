# Auto-Update System Workflow

## Overview

The auto-update system uses Cloudflare Pages to serve update files for the OneMed SupplyChain application. The system supports both NSIS installer updates and portable version updates.

## Architecture

- **Update Server**: Cloudflare Pages (`https://suppliers-anx.pages.dev/`)
- **Update Files**: Served from `docs/updates/` directory
- **Auto-Deploy**: GitHub push triggers Cloudflare Pages deployment

## Files Generated

### For NSIS Installer Updates

- `latest.yml` - Contains metadata for electron-updater
- `OneMed SupplyChain-{version}-setup.exe` - NSIS installer
- `OneMed SupplyChain-{version}-setup.exe.blockmap` - Block map for delta updates

### For Portable Version Updates

- `latest.json` - Contains metadata for portable version updates
- `OneMed SupplyChain-Portable.exe` - Portable executable

## Build Process

### 1. Standard Build (with auto-update files)

```bash
npm run dist
```

This command:

1. Builds the application
2. Creates NSIS installer and portable executable
3. Automatically runs `prepare-cloudflare-release.js`
4. Generates `latest.yml` and `latest.json`
5. Copies files to `docs/updates/`

### 2. Release Build

```bash
npm run release
```

Same as `dist` but also publishes to the update server.

### 3. Manual Preparation

```bash
npm run release:prepare
```

Only runs the preparation script without building.

## Deployment Process

### Automatic (Recommended)

1. **Build**: `npm run dist`
2. **Commit**: `git add docs/updates/`
3. **Push**: `git push origin main`
4. **Auto-Deploy**: Cloudflare Pages deploys automatically (1-2 minutes)

### Manual Verification

After deployment, verify these URLs work:

- `https://suppliers-anx.pages.dev/latest.yml`
- `https://suppliers-anx.pages.dev/latest.json`
- `https://suppliers-anx.pages.dev/OneMed SupplyChain-Portable.exe`

## File Structure

```
docs/updates/
├── _redirects          # Cloudflare Pages routing rules
├── index.html          # Update page (shows current version)
├── latest.yml          # NSIS installer update metadata
├── latest.json         # Portable version update metadata
├── OneMed SupplyChain-{version}-setup.exe
├── OneMed SupplyChain-{version}-setup.exe.blockmap
└── OneMed SupplyChain-Portable.exe
```

## Update URLs

The app checks for updates at:

- **NSIS Updates**: `https://suppliers-anx.pages.dev/latest.yml`
- **Portable Updates**: `https://suppliers-anx.pages.dev/latest.json`

## Troubleshooting

### No Updates Found

1. Check if `latest.yml` exists at the update URL
2. Verify the version in `latest.yml` is newer than current app version
3. Check Cloudflare Pages deployment status

### Build Issues

1. Ensure all dependencies are installed: `npm install`
2. Check if release directory exists: `ls release/`
3. Verify package.json version matches expected version

### Deployment Issues

1. Check GitHub repository permissions
2. Verify Cloudflare Pages is connected to the repository
3. Check Cloudflare Pages build logs

## Scripts Reference

- `prepare-cloudflare-release.js` - Main preparation script
- `generate-latest-json.js` - Standalone portable version script
- `_redirects` - Cloudflare Pages routing configuration

## Security Notes

- All executable files are signed with code signing certificates
- SHA512 hashes are calculated for integrity verification
- Files are served over HTTPS via Cloudflare Pages
- No API tokens required for current deployment method
