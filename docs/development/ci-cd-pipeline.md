# Builds and GitHub Actions

## Build and quality: only after merge

`build.yml` and `quality.yml` listen only for `pull_request` events with
`types: [closed]` and `branches: [main]`. Their job-level condition additionally
requires `merged == true` and repository `Isuldra/Suppliers`.

Opening or updating a PR, pushing `developer` or another branch, pushing a tag,
a direct push to `main`, or completing Version Management does not start these
jobs. Closing an unmerged PR skips the jobs before runners are allocated.
Both check out the exact merge commit and have a 30-minute timeout.

- `quality.yml`: one Ubuntu runner installs the frozen lockfile, checks formatting,
  lint, TypeScript and Vitest.
- `build.yml`: one Windows runner installs the frozen lockfile, builds/packages
  once and uploads portable/NSIS installers and ZIP artifacts for three days.
- Newer runs cancel unfinished runs for the same workflow and ref.

This policy takes effect when these workflow changes are merged into `main`.
Check changes locally before merging; these jobs no longer provide pre-merge CI.

## Automation not yet consolidated

The existing `release.yml`, `manual-release.yml`, `version-management.yml` and
`security-audit.yml` are retained. Their existing tag, manual, scheduled and PR
triggers are exceptions to a repository-wide merge-only policy.

The proposed final simplification is one Windows merge-only workflow containing
lint, TypeScript, tests, a single build/package step, and artifact upload. Tag and
manual release/version workflows would be retired; security scanning would move
to the merge-only job instead of scheduled/PR runs. Production release publishing
would remain an explicit local task, separate from build artifacts.

## Local build

Use Node 22 and Bun 1.3.14 on Windows:

```powershell
bun install --frozen-lockfile
bun run quality
bun run build
bun run dist:clean -- --skip-vite-build
```

## Enforcement

Protect `main` with **Require a pull request before merging**. Do not require the
post-merge build/quality jobs as pre-merge status checks. Review modifications to
`.github/workflows/` through CODEOWNERS. Administrators can still change YAML or
repository settings, so this is not an account-wide spending policy.

GitHub documents the merge-only event and job condition in
[Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#running-your-pull_request-workflow-when-a-pull-request-merges).

Cloudflare should serve static metadata from `main` with previews disabled and
without installing dependencies. Apply the account settings in
[Cloudflare Pages setup](../setup/cloudflare-pages-setup.md) separately.
