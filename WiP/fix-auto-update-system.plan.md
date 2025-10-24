<!-- f2cbe3f2-27ee-4503-9ef4-dbd02fea473c 852ee24e-2b91-4965-a382-079d22bf5cd1 -->
# Fix Auto-Update System

## Problem Analysis

The app uses `electron-updater` (NsisUpdater) which tries to fetch `latest.yml` from `https://suppliers-anx.pages.dev/latest.yml`. Currently:

1. **latest.yml does NOT exist** on Cloudflare Pages
2. Cloudflare returns the HTML fallback page instead
3. electron-updater fails to parse HTML as YAML
4. No script automatically generates/deploys update files after building

## Solution

### 1. Integrate Update File Generation into Build Process

Modify `package.json` scripts to automatically:

- Generate `latest.yml` after building the NSIS installer
- Copy update files to `docs/updates/` directory
- Ensure files are ready for GitHub push → Cloudflare auto-deploy

**Changes to `package.json`:**

- Update `dist` script to run `prepare-cloudflare-release.js` after build
- Update `release` script similarly
- Ensure `prepare-cloudflare-release.js` generates correct `latest.yml`

### 2. Fix `prepare-cloudflare-release.js` Script

The script exists but needs verification that it:

- Reads the correct version from `package.json`
- Finds the NSIS installer in `release/` directory
- Calculates SHA512 hash correctly
- Generates `latest.yml` in correct format for electron-updater
- Copies installer files to `docs/updates/`
- Updates `_redirects` to serve `latest.yml` correctly

### 3. Create `generate-latest-json.js` Script

For portable version support, create a script that generates `latest.json` with:

```json
{
  "version": "1.3.1",
  "files": [{
    "url": "OneMed SupplyChain-Portable.exe",
    "sha512": "...",
    "size": 123456
  }],
  "releaseDate": "2025-10-24T..."
}
```

### 4. Update Cloudflare Pages Configuration

Ensure `docs/updates/_redirects` file properly routes:

```
/latest.yml    /latest.yml     200
/latest.json   /latest.json    200
/*.exe         /*.exe          200
/*.blockmap    /*.blockmap     200
```

### 5. Test the Complete Flow

After changes:

1. Run `npm run dist` to build
2. Verify `docs/updates/` contains:

   - `latest.yml`
   - `latest.json`
   - NSIS installer exe
   - blockmap file

3. Push to GitHub
4. Wait for Cloudflare Pages to deploy
5. Test `https://suppliers-anx.pages.dev/latest.yml` manually
6. Run app and check for updates

## Files to Modify

1. `/package.json` - Update dist/release scripts
2. `/scripts/prepare-cloudflare-release.js` - Verify/fix generation logic
3. `/scripts/generate-latest-json.js` - Create new script for portable support
4. `/docs/updates/_redirects` - Ensure proper routing

## Deployment Method

**Option B: Generate files + manual GitHub push** (recommended, no API token needed)

- Build generates files in `docs/updates/`
- You commit and push to GitHub
- Cloudflare Pages auto-deploys from GitHub
- No Cloudflare API token required

### To-dos

- [ ] Update package.json dist/release scripts to automatically run prepare-cloudflare-release.js
- [ ] Verify and fix prepare-cloudflare-release.js to correctly generate latest.yml
- [ ] Create generate-latest-json.js script for portable version support
- [ ] Update docs/updates/_redirects to properly serve YAML and executable files
- [ ] Test complete build process and verify files are generated correctly
- [ ] Document the complete release workflow for future reference