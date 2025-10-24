# Native Module Troubleshooting Guide

## Problem: better-sqlite3 Node.js Version Mismatch

### Symptoms:

- Error: "The module was compiled against a different Node.js version using NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 135"
- App crashes on startup with database initialization errors

### Root Cause:

Native modules like `better-sqlite3` are compiled for specific Node.js versions. Electron uses its own Node.js version which may differ from the system Node.js version.

### Solutions:

#### 1. Automatic Fix (Recommended)

```bash
npm run dev  # This now includes automatic module verification
```

#### 2. Manual Fix

```bash
# Remove and reinstall the problematic module
rm -rf node_modules/better-sqlite3
npm install better-sqlite3

# Rebuild for Electron
npx electron-rebuild -f -w better-sqlite3
```

#### 3. Nuclear Option (If above fails)

```bash
# Complete clean reinstall
rm -rf node_modules package-lock.json
npm install
npx electron-rebuild
```

### Prevention:

- Always use `npm run dev` instead of direct electron-vite commands
- The `ensure-electron-modules.js` script now runs automatically before dev
- Never manually rebuild native modules without specifying Electron target

### Verification:

Check that the app starts without database errors and can load Excel files successfully.
