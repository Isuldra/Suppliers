# Version Management System

This document describes the production-ready version management system for the OneMed SupplyChain application.

## Features

### Core Capabilities

- **Semver Validation**: Uses the `semver` library for robust version validation instead of regex
- **Annotated Tags**: Creates annotated git tags (standard for CI/CD) with `-a` flag
- **Repository Root Discovery**: Works from any subdirectory using `git rev-parse --show-toplevel`
- **Pre-flight Checks**: Validates git identity, detached HEAD, and clean working directory
- **Auto-push Support**: `--push` flag automatically pushes commits and tags with `--follow-tags`
- **Configurable Tag Prefix**: Set via `TAG_PREFIX` environment variable (default: "v")
- **CI-Friendly Logging**: No emojis, structured logging with stdout/stderr separation
- **Verbose Mode**: `--verbose` flag for detailed debugging output
- **Dry-run Support**: `--dry-run` flag to preview changes without making them

### Version Management Commands

- **Sync**: Synchronize package.json with latest git tag
- **Bump**: Create new version with semantic versioning
- **Info**: Display current version information
- **Help**: Show usage information

## Installation

The version management system is already configured in this project. The required dependencies are:

```json
{
  "devDependencies": {
    "execa": "^9.5.2",
    "semver": "^7.6.3"
  }
}
```

Install dependencies:

```bash
npm install
```

## Usage

### Basic Commands

#### Show Version Information

```bash
npm run version:info
```

#### Sync Package.json with Git Tags

```bash
npm run version:sync
```

#### Create New Version

```bash
# Patch version (1.0.0 -> 1.0.1)
npm run version:bump

# Minor version (1.0.0 -> 1.1.0)
npm run version:bump:minor

# Major version (1.0.0 -> 2.0.0)
npm run version:bump:major

# Bump and auto-push
npm run version:bump:push
```

#### Show Help

```bash
npm run version:help
```

### Advanced Usage

#### Direct Script Usage

```bash
# Sync with latest git tag
node scripts/sync-version.js sync

# Create patch version with dry-run
node scripts/sync-version.js bump patch --dry-run

# Create minor version with verbose output
node scripts/sync-version.js bump minor --verbose

# Create major version and auto-push
node scripts/sync-version.js bump major --push

# Show version information
node scripts/sync-version.js info
```

#### Environment Variables

```bash
# Use custom tag prefix
TAG_PREFIX="" node scripts/sync-version.js bump patch

# Use custom tag prefix for sync
TAG_PREFIX="release-" node scripts/sync-version.js sync
```

## Version Types

| Type         | Description           | Example           |
| ------------ | --------------------- | ----------------- |
| `patch`      | Bug fixes             | 1.0.0 → 1.0.1     |
| `minor`      | New features          | 1.0.0 → 1.1.0     |
| `major`      | Breaking changes      | 1.0.0 → 2.0.0     |
| `prepatch`   | Pre-release patch     | 1.0.0 → 1.0.1-0   |
| `preminor`   | Pre-release minor     | 1.0.0 → 1.1.0-0   |
| `premajor`   | Pre-release major     | 1.0.0 → 2.0.0-0   |
| `prerelease` | Increment pre-release | 1.0.0-0 → 1.0.0-1 |

## CI/CD Integration

### GitHub Actions

```yaml
name: Version Management
on:
  workflow_dispatch:
    inputs:
      version_type:
        description: "Version type"
        required: true
        default: "patch"
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Configure Git
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"

      - name: Create new version
        run: npm run version:bump:${{ github.event.inputs.version_type }}
        env:
          TAG_PREFIX: v

      - name: Push changes
        run: git push origin main --follow-tags
```

### GitLab CI

```yaml
version_management:
  stage: version
  script:
    - git config user.name "GitLab CI"
    - git config user.email "ci@gitlab.com"
    - npm ci
    - npm run version:bump:minor
    - git push origin main --follow-tags
  only:
    - main
  when: manual
```

## Pre-flight Checks

The system performs several checks before creating new versions:

### Git Identity Check

Ensures git user.name and user.email are configured:

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

### Detached HEAD Check

Prevents versioning in detached HEAD state:

```bash
# Checkout a branch first
git checkout main
```

### Working Directory Check

Ensures working directory is clean:

```bash
# Commit or stash changes
git add .
git commit -m "Your changes"
# OR
git stash
```

## Troubleshooting

### Common Issues

#### "Not in a git repository"

- Ensure you're in a git repository
- Run `git init` if needed

#### "git user.email is not configured"

```bash
git config user.email "you@example.com"
```

#### "Detached HEAD state detected"

```bash
git checkout main
```

#### "Working directory is not clean"

```bash
git add .
git commit -m "Your changes"
```

#### "No git tags found"

- Create an initial tag: `git tag -a v1.0.0 -m "Initial release"`
- Or use `npm run version:bump` to create the first version

### Debug Mode

Use `--verbose` flag for detailed output:

```bash
node scripts/sync-version.js info --verbose
node scripts/sync-version.js sync --verbose
```

### Dry Run

Test commands without making changes:

```bash
node scripts/sync-version.js bump patch --dry-run
node scripts/sync-version.js sync --dry-run
```

## Best Practices

### Version Management

1. **Use semantic versioning**: Follow semver.org guidelines
2. **Create annotated tags**: Use `-a` flag for proper git tags
3. **Sync regularly**: Run `npm run version:sync` before major releases
4. **Test with dry-run**: Always test with `--dry-run` first
5. **Use CI/CD**: Automate version management in your pipeline

### Git Workflow

1. **Clean working directory**: Commit or stash changes before versioning
2. **Proper branch**: Don't version from detached HEAD
3. **Push tags**: Use `--follow-tags` when pushing
4. **Review changes**: Check what will be committed before pushing

### CI/CD Integration

1. **Configure git identity**: Set user.name and user.email in CI
2. **Use environment variables**: Configure TAG_PREFIX for your workflow
3. **Test thoroughly**: Use dry-run in CI before actual versioning
4. **Monitor logs**: Use verbose mode for debugging CI issues

## Examples

### Complete Release Workflow

```bash
# 1. Check current status
npm run version:info

# 2. Sync with latest tag (if needed)
npm run version:sync

# 3. Create new version
npm run version:bump:minor

# 4. Push changes
git push origin main --follow-tags
```

### Pre-release Workflow

```bash
# Create pre-release version
node scripts/sync-version.js bump prerelease

# Create specific pre-release
node scripts/sync-version.js bump prepatch
```

### Custom Tag Prefix

```bash
# Use custom prefix
TAG_PREFIX="release-" node scripts/sync-version.js bump patch
```

This will create tags like `release-1.0.1` instead of `v1.0.1`.
