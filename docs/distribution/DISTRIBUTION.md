# Distribution Guide for SupplyChain OneMed

This document provides instructions for building and deploying the application with automatic updates.

## Auto-Update System

The application uses Cloudflare Pages for automatic updates. Users receive update notifications automatically when new versions are available.

### How Auto-Updates Work

1. **User Experience**: Users see an update notification in the app when a new version is available
2. **Update Process**: Users click "Update" and the app downloads and installs the new version automatically
3. **No GitHub Interaction**: Users never need to visit GitHub or download files manually
4. **Fast Delivery**: Updates are served via Cloudflare's global CDN for fast downloads

## Release Workflow

### For New Releases

1. **Update Version**:

   ```bash
   # Bump version (patch, minor, or major)
   npm run version:bump patch
   # or
   npm run version:bump minor
   # or
   npm run version:bump major
   ```

2. **Build and Deploy**:

   ```bash
   # Clean build with proper version handling
   npm run dist:clean

   # Prepare for Cloudflare deployment
   npm run release:prepare
   ```

3. **Deploy to Cloudflare**:

   ```bash
   # Commit and push changes
   git add docs/updates/
   git commit -m "Release v1.2.2"
   git push origin main
   ```

4. **Automatic Deployment**: Cloudflare Pages automatically deploys within 1-2 minutes

### One-Command Release

For a complete release in one command:

```bash
npm run release:full
```

This will:

- Build the application with proper version handling
- Prepare files for Cloudflare deployment
- Show you the next steps for deployment

## Building the Application

### Prerequisites

1. Install Node.js and npm
2. Install dependencies:
   ```bash
   npm install
   ```

### Build Commands

- **Standard Build**: `npm run dist`
- **Clean Build** (recommended): `npm run dist:clean`
- **Portable Only**: `npm run dist:portable`
- **NSIS Installer Only**: `npm run dist:nsis`

### Build Output

Files are created in the `release/` directory:

- **NSIS Installer**: `OneMed SupplyChain-[version]-setup.exe`
- **Portable**: `OneMed SupplyChain-Portable.exe`
- **Blockmap**: `OneMed SupplyChain-[version]-setup.exe.blockmap`

## Deployment Architecture

```
GitHub Repository
       ↓ (git push)
Cloudflare Pages
       ↓ (serves files)
User Applications
       ↓ (check for updates)
https://suppliers-anx.pages.dev/latest.yml
```

### File Structure in Cloudflare

```
docs/updates/
├── latest.yml                              # Auto-update metadata
├── OneMed SupplyChain-1.2.2-setup.exe      # NSIS installer
├── OneMed SupplyChain-1.2.2-setup.exe.blockmap
├── OneMed SupplyChain-Portable.exe         # Portable version
├── index.html                               # Manual download page
└── _redirects                               # Cloudflare routing rules
```

## Version Management

### Version Sync

The project uses a sophisticated version management system:

```bash
# Sync package.json with latest git tag
npm run version:sync

# Show current version info
npm run version:info

# Get help with version commands
npm run version:help
```

### Version Bumping

```bash
# Patch version (1.2.2 → 1.2.3)
npm run version:bump

# Minor version (1.2.2 → 1.3.0)
npm run version:bump minor

# Major version (1.2.2 → 2.0.0)
npm run version:bump major

# With automatic push
npm run version:bump --push
```

## Troubleshooting

### Build Issues

- **Version not updating**: Use `npm run dist:clean` to clear cache and rebuild
- **Native dependencies**: Ensure you're building on the target platform
- **Cache issues**: Run `node scripts/clean-build-cache.js` to clear all caches

### Auto-Update Issues

- **Users not seeing updates**: Check that `latest.yml` is accessible at `https://suppliers-anx.pages.dev/latest.yml`
- **Update fails**: Verify file checksums in `latest.yml` match the actual files
- **Wrong version**: Ensure the version in `package.json` matches the git tag

### Deployment Issues

- **Files not deployed**: Check Cloudflare Pages build logs
- **Wrong files**: Verify `docs/updates/` directory contains the correct files
- **Version mismatch**: Ensure the version in `latest.yml` matches the installer filename

## Manual Distribution

For manual distribution (without auto-updates):

- **Installer**: Users run `OneMed SupplyChain-[version]-setup.exe` directly
- **Portable**: Users run `OneMed SupplyChain-Portable.exe` without installation
- **Data Location**: Application data stored in `%LOCALAPPDATA%\one-med-supplychain-app`

## Benefits of Auto-Update System

✅ **Zero GitHub interaction for end users** - They only see the update dialog in the app

✅ **Fast CDN delivery** - Cloudflare's global network serves updates quickly

✅ **Simple deployment** - Just git push to deploy

✅ **Version control** - All releases tracked in git history

✅ **Automated** - One command to build and prepare deployment
