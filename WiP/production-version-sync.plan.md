<!-- 283abba4-ae39-4fbb-9ae8-06b067d30889 e663753e-36a1-49db-9099-b987418103a8 -->
# Implement Production-Ready Version Sync Script

## 1. Install Dependencies

Add `execa` and `semver` as dev dependencies:

- `execa@^9.5.2` for async command execution
- `semver@^7.6.3` for robust version validation

## 2. Create Production Script

Create `scripts/sync-version.js` with the production-ready implementation including:

- Semver library validation (no regex)
- Annotated tags with `-a` flag
- Repo-root discovery via `git rev-parse --show-toplevel`
- Pre-flight checks (git identity, detached HEAD, working directory)
- Auto-push with `--push` flag
- Configurable tag prefix via `TAG_PREFIX` environment variable
- Robust dirty-check using `git status --porcelain=v1`
- CI-friendly logging (no emojis, stdout/stderr separation)
- Verbose mode with `--verbose` flag

## 3. Update Package.json

Update `package.json` with:

- Add `"type": "module"` if not present
- Add new npm scripts:
- `version:sync` - Sync with git tags
- `version:bump` - Bump patch version
- `version:bump:minor` - Bump minor version
- `version:bump:major` - Bump major version
- `version:bump:push` - Bump and auto-push
- `version:info` - Show version info
- `version:help` - Show help
- Add dev dependencies for `execa` and `semver`

## 4. Create Documentation

Create `docs/development/VERSIONING.md` with:

- Complete feature list and improvements
- Installation instructions
- Usage examples (basic and advanced)
- CI/CD integration examples (GitHub Actions, GitLab CI)
- Pre-flight checks documentation
- Troubleshooting guide
- Best practices

## 5. Sync Current Version

After implementation, run sync command to fix version mismatch:

- Current package.json: `1.1.8`
- Latest git tag: `v1.2.0`
- Run `npm run version:sync` to update package.json to `1.2.0`

## 6. Update Git Hook (Optional)

Update `.git/hooks/post-commit` to work with the new async script, or document that the new script is better run manually/in CI.

## Key Features

**Semver Validation**: Uses `semver` library instead of regex for reliable validation
**Annotated Tags**: Creates annotated tags (standard for CI/CD) with `-a` flag
**Repo Root**: Works from any subdirectory using `git rev-parse --show-toplevel`
**Pre-flight Checks**: Validates git identity, detached HEAD, and clean working directory
**Auto-push**: `--push` flag automatically pushes commits and tags with `--follow-tags`
**Tag Prefix**: Configurable via `TAG_PREFIX` environment variable
**CI-Friendly**: No emojis, structured logging with stdout/stderr separation
**Verbose Mode**: `--verbose` flag for detailed debugging output

### To-dos

- [ ] Install execa and semver as dev dependencies
- [ ] Create production-ready sync-version.js script
- [ ] Update package.json with new scripts and dependencies
- [ ] Create VERSIONING.md documentation
- [ ] Run version sync to fix current mismatch (1.1.8 → 1.2.0)
- [ ] Test all new commands (info, sync, bump --dry-run)
- [ ] Commit all changes and push to repository