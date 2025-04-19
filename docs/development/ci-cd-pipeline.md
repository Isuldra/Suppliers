# CI/CD Pipeline for Supplier Reminder Pro

This document describes the continuous integration and deployment (CI/CD) process for the Supplier Reminder Pro application, using GitHub Actions as the automation platform.

## Overview

The CI/CD pipeline ensures that every change to the codebase is automatically built, tested, and packaged for release. The pipeline is designed to:

- Run on every push and pull request to the `main` branch
- Lint and typecheck the code
- Run all unit and integration tests
- Build the Electron and React application for Windows (installer and portable)
- Upload build artifacts to GitHub Actions
- Optionally, publish releases to GitHub Releases using electron-builder

## Requirements

- **GitHub repository** with Actions enabled
- **Node.js 18** (configured in the workflow)
- **GH_TOKEN** secret set in repository settings (for publishing releases)
- All build and test scripts defined in `package.json`
- All dependencies installed via `npm ci`

## Pipeline Steps

1. **Checkout** the repository
2. **Set up Node.js** (version 18)
3. **Install dependencies** using `npm ci`
4. **Lint** the code with `npm run lint`
5. **Typecheck** with `npm run typecheck`
6. **Run tests** with `npm run test`
7. **Build the renderer** with `npm run build`
8. **Build Electron Windows installer and portable** with `npm run dist:win` and `npm run portable`
9. **Upload build artifacts** (installers, portable ZIPs) to GitHub Actions
10. **Publish release** (on tag push, optional) using `npm run release`

## Example GitHub Actions Workflow

Place this file at `.github/workflows/build.yml`:

```yaml
name: Build & Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Run tests
        run: npm run test

      - name: Build renderer
        run: npm run build

      - name: Build Windows installer
        run: npm run dist:win

      - name: Build Windows portable
        run: npm run portable

      - name: Upload Windows installer artifact
        uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: release/*.exe

      - name: Upload Windows portable artifact
        uses: actions/upload-artifact@v3
        with:
          name: windows-portable
          path: release/*Portable.exe

  release:
    if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/')
    needs: build
    runs-on: macos-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Build and publish release
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: npm run release
```

## Notes

- The pipeline runs on `macos-latest` to ensure compatibility with native modules and cross-platform builds.
- The `release` job only runs on tag pushes and requires the `GH_TOKEN` secret for publishing to GitHub Releases.
- Artifacts are uploaded for manual download and verification.
- For more advanced release management, see `docs/development/publishing-updates.md`.

## References

- [electron-builder documentation](https://www.electron.build/)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [Publishing Updates Guide](publishing-updates.md)
