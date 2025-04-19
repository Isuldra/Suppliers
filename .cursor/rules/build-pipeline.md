---
description: CI/PI pipeline rules for GitHub Actions and release management.
globs: .github/workflows/*.yml
---

# 1. Workflow Structure

- Trigger on `push` and `pull_request` to `main` branch.
- Use a build matrix on `macos-latest` (and optionally `windows-latest`).

# 2. Steps in `build.yml`

1. **Checkout**: `actions/checkout@v3`
2. **Setup Node**: `actions/setup-node@v3` with Node 18
3. **Install**: `npm ci`
4. **Lint & Typecheck**: `npm run lint` and `npm run typecheck`
5. **Build Renderer**: `npm run build`
6. **Build Electron**:
   ```bash
   npm run dist:win
   npm run portable
   ```
7. **Test**: Run all unit and e2e tests (e.g., `npm run test`, `npm run test:e2e`)
8. **Artifact Handling**: Upload build artifacts (installers, zips) using `actions/upload-artifact@v3`
9. **Release**: Use `semantic-release` for versioning and changelog management
10. **Cache Dependencies**: Use `actions/cache@v3` for `node_modules` and build outputs
11. **Notifications**: Send build status to Slack, Teams, or email as needed

# 3. Best Practices

- Fail fast: Stop workflow on first error
- Use secrets for signing keys and tokens
- Keep workflow YAMLs DRY with reusable jobs/steps
- Document all workflow triggers and environment variables
- Regularly review and update build matrix for new OS versions

# 4. Release Management

- Tag releases with semantic versioning
- Publish release artifacts to GitHub Releases
- Automate changelog generation
- Ensure all builds are virus-scanned before publishing

# 5. Troubleshooting

- On failure, upload logs as artifacts for debugging
- Use `continue-on-error: false` for critical steps
- Document known issues and workarounds in the repository
