# CI/CD Pipeline for Pulse

This document describes the GitHub Actions workflows in `.github/workflows/`. It replaces an
earlier version of this document that described a fictitious macOS+Windows matrix build with
`npm`/Node 20 — that never matched the actual workflow files.

## Workflows

### `quality.yml` — Code Quality Validation

- **Trigger**: `push`/`pull_request` to `main`
- **Runner**: `ubuntu-latest`
- **Steps**: checkout → setup Bun → `bun install --frozen-lockfile` → `bun run format:check` →
  `bun run lint` → `bun run typecheck` → `bun run test -- --run --passWithNoTests`
- This is the canonical quality gate (also runnable locally as `bun run quality`).

### `build.yml` — Build Electron App for Windows

- **Trigger**: `push`/`pull_request` to `main`, plus a `workflow_run` trigger after the Version
  Management workflow completes
- **Runner**: `windows-latest` only — there is no macOS or Linux build job
- **Steps**: checkout → setup Bun → cache Bun/electron-builder caches →
  `bun install --frozen-lockfile` → `bun run dist` (builds the app, then runs
  `electron-builder --win --publish never`) → best-effort Windows Defender exclusions
- **On a pushed tag** (`refs/tags/*`) it additionally: generates `latest.yml`/`app-update.yml`,
  runs `bun run release:prepare` (Cloudflare metadata), commits/pushes the updated
  `docs/updates/` files to `main`, and uploads the portable `.exe` to the GitHub Release via
  `softprops/action-gh-release@v1`.
- This workflow does **not** run linting, typechecking, or tests itself — that is `quality.yml`'s
  job, running in parallel on the same push/PR.

### `release.yml`, `manual-release.yml`, `version-management.yml`, `security-audit.yml`

These use `actions/setup-node@v4` with `node-version: "22"` in addition to (or instead of) Bun,
depending on what tooling each step needs (e.g. `@octokit/rest`-based release scripts). Consult
the workflow files directly for exact steps — they change more often than this document.

## Local Equivalent

```bash
bun install --frozen-lockfile
bun run quality      # matches quality.yml
bun run dist         # matches build.yml's Windows build step (Windows only)
```

## References

- [electron-builder documentation](https://www.electron.build/)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [Publishing Updates Guide](publishing-updates.md)
