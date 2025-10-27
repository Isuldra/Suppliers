# GitHub Releases System

## Overview

The OneMed SupplyChain application has a fully automated GitHub Release system that handles uploads of installers and update metadata.

## ⚡ Quick Start

**You don't need to do anything!** Just push a tag:

```bash
git tag v1.3.2
git push origin v1.3.2
```

GitHub Actions will **automatically**:

1. Build the application
2. Deploy to Cloudflare Pages
3. Create GitHub Release with all files
4. No manual setup needed!

## Components

### 1. GitHub Release Script (`scripts/create-github-release.js`)

**Purpose**: Manually creates GitHub releases with uploaded assets

**Usage**:

```bash
# Set GitHub token (required)
export GITHUB_TOKEN=your_github_token

# Create release
npm run release:github
```

**What it does**:

- Creates a GitHub Release for the current version (from `package.json`)
- Uploads NSIS installer (`OneMed SupplyChain-{version}-setup.exe`)
- Uploads blockmap file (`OneMed SupplyChain-{version}-setup.exe.blockmap`)
- Uploads portable executable (`OneMed SupplyChain-Portable.exe`)

### 2. GitHub Actions Workflow (`.github/workflows/build.yml`)

**Purpose**: Automatic release creation on tag push

**Trigger**: When you push a tag (e.g., `v1.3.2`)

**What it does**:

- Builds the application
- Generates `latest.yml` and `app-update.yml`
- Deploys update files to Cloudflare Pages
- **Automatically creates GitHub Release** with all artifacts using `softprops/action-gh-release@v1`

**Files uploaded**:

- `OneMed SupplyChain-Portable.exe`
- `OneMed SupplyChain-{version}-setup.zip`
- `OneMed SupplyChain-{version}-setup.exe`
- `latest.yml` (update metadata)
- `app-update.yml` (NSIS update metadata)

## Complete Release Workflow

### Manual Release

1. **Update version**:

   ```bash
   npm run version:bump patch  # or minor/major
   ```

2. **Create git tag**:

   ```bash
   git add package.json
   git commit -m "Release v1.3.2"
   git tag v1.3.2
   git push origin main
   git push origin v1.3.2
   ```

3. **Trigger CI/CD** (automatic):
   - GitHub Actions builds the app
   - Deploys to Cloudflare Pages
   - Creates GitHub Release with all files

### Full Automated Release

```bash
# One command to do everything:
npm run release:full

# This will:
# 1. Validate version
# 2. Clean build
# 3. Prepare Cloudflare files
# 4. Create GitHub Release (with token)
```

## GitHub Token Setup

### For GitHub Actions (Automatic - Already Configured! ✅)

GitHub Actions workflows **automatically** use `secrets.GITHUB_TOKEN` which is provided by GitHub. No setup needed!

This token is used in `.github/workflows/build.yml`:

```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**When you push a tag**, GitHub Actions:

1. Automatically builds the app
2. Creates GitHub Release
3. Uploads all files
4. **No manual token setup needed!**

### For Local Development (Manual - Only if needed)

If you want to test the release script locally (not required), you need a Personal Access Token:

#### Creating the Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `OneMed SupplyChain Auto-Release`
4. Select scope: **`repo`** (full control)
5. Generate and copy the token

#### Setting the Token Locally

**Linux/Mac**:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
echo 'export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' >> ~/.zshrc
source ~/.zshrc
```

**Windows (PowerShell)**:

```powershell
$env:GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

#### Verifying Local Setup

```bash
# Check if token is set
echo $GITHUB_TOKEN

# Test the token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Test the release script (optional - GitHub Actions does this automatically)
npm run release:github
```

## Release Files

All releases contain:

1. **NSIS Installer** (`OneMed SupplyChain-{version}-setup.exe`)

   - Full installer for Windows
   - Supports silent installation
   - Provides update capabilities

2. **Portable Executable** (`OneMed SupplyChain-Portable.exe`)

   - Single-file executable
   - No installation required
   - Simple distribution

3. **Update Metadata** (`latest.yml`, `app-update.yml`)

   - Used by `electron-updater`
   - Contains version, hash, size
   - Served from Cloudflare Pages

4. **Blockmap** (`*.exe.blockmap`)
   - Enables delta updates
   - Reduces download size
   - Better user experience

## GitHub Releases URL Structure

Releases are accessible at:

```
https://github.com/Isuldra/Suppliers/releases/download/v{version}/{filename}
```

Example:

```
https://github.com/Isuldra/Suppliers/releases/download/v1.3.2/OneMed SupplyChain-1.3.2-setup.exe
```

## Integration with Auto-Update

The GitHub Release system integrates with the auto-update mechanism:

1. **Cloudflare Pages** serves `latest.yml` pointing to GitHub Releases URLs
2. **electron-updater** downloads files from GitHub Releases
3. Users get fast downloads via Cloudflare CDN + GitHub's CDN
4. No manual download pages needed

## Troubleshooting

### "Authentication failed"

- Check that `GITHUB_TOKEN` is set: `echo $GITHUB_TOKEN`
- Verify token permissions include `repo` scope
- Regenerate token if expired

### "Release already exists"

- This is normal on re-runs
- Script skips creation if release exists
- You can manually delete release on GitHub if needed

### "File not found"

- Run `npm run dist` first to build the application
- Check that files exist in `release/` directory
- Verify version in `package.json` matches expected files

## API Reference

The script uses `@octokit/rest` for GitHub API access:

```javascript
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});
```

### Key API Calls

1. **Check existing release**: `octokit.rest.repos.getReleaseByTag()`
2. **Create release**: `octokit.rest.repos.createRelease()`
3. **Upload asset**: `octokit.rest.repos.uploadReleaseAsset()`

## Security Notes

- **Never commit** the `GITHUB_TOKEN` to Git
- Token is already in `.gitignore`
- If token leaks, revoke it on GitHub and create a new one
- Use environment variables, not hardcoded tokens

## Next Steps

After a release is created:

1. ✅ GitHub Release is live
2. ✅ Cloudflare Pages serves update files
3. ✅ Auto-updater system points to correct URLs
4. ✅ Users will receive update notifications
5. ✅ Users can download manually from GitHub Releases page
