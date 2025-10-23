<!-- 7178e933-3ea7-4386-b9fe-b5052d72efc6 16c6a193-02ad-41ea-b0a3-af2d270ccbe5 -->
# Add NSIS Installer Build Support

## Overview

Enable building of NSIS installer alongside portable and zip versions to test if the installable version works on company PCs and provides better auto-update functionality.

## Changes Required

### 1. Update package.json build targets

**File**: `package.json` (lines 59-66)

Add `nsis` to the Windows targets array:

```json
"win": {
  "target": [
    "zip",
    "portable",
    "nsis"
  ],
  "icon": "supplychain.png",
  "artifactName": "${productName}-${version}-setup.${ext}"
}
```

NSIS configuration already exists (lines 80-94), so no additional setup needed.

### 2. Update GitHub Actions workflow

**File**: `.github/workflows/build.yml` (lines 81-92)

Update the release upload step to include NSIS installer files:

```yaml
- name: Upload to GitHub Release
  if: startsWith(github.ref, 'refs/tags/')
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  uses: softprops/action-gh-release@v1
  with:
    files: |
      release/*Portable.exe
      release/*.zip
      release/*.exe
      release/latest.yml
    draft: false
    prerelease: false
```

Add artifact upload for development builds (after line 123):

```yaml
- name: Upload NSIS Installer
  if: >
    !startsWith(github.ref, 'refs/tags/')
  uses: actions/upload-artifact@v4
  with:
    name: SupplyChain-NSIS-Windows
    path: release/*.exe
    retention-days: 3
```

## Benefits

- NSIS installer provides fully automatic updates (no manual file replacement)
- Installs to user directory (no admin rights needed with current config)
- Better for corporate environments
- Can test alongside portable version

## Testing

After implementation, the CI will build three versions:

1. Portable .exe (no installation)
2. ZIP archive
3. NSIS installer (full installation with auto-update)

Download the NSIS installer artifact from GitHub Actions to test on company PCs.

### To-dos

- [ ] Add 'nsis' to win.target array in package.json
- [ ] Update GitHub Release upload to include *.exe files (NSIS installer)
- [ ] Add NSIS installer artifact upload for development builds