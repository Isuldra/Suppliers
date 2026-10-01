# Cloudflare Pages: static update hosting

The existing `suppliers-anx.pages.dev` project serves update metadata for installed
Pulse clients. Electron installers are built on Windows; Cloudflare only needs
to publish the committed static files in `docs/updates`.

## Account settings to apply

In **Workers & Pages > suppliers-anx > Settings > Builds & deployments**, use:

| Setting                          | Value                       |
| -------------------------------- | --------------------------- |
| Production branch                | `main`                      |
| Automatic production deployments | Enabled                     |
| Preview branch deployments       | **None**                    |
| Framework preset                 | None                        |
| Root directory                   | Repository root             |
| Build command                    | `exit 0`                    |
| Build output directory           | `docs/updates`              |
| Environment variable             | `SKIP_DEPENDENCY_INSTALL=1` |

Save both production and preview controls. This disables branch/PR preview builds
and publishes static files without installing npm/Bun dependencies or building
Electron. These account settings must be changed in the Cloudflare dashboard;
committing this document does not apply them.

The existing `npm run deploy:cloudflare` helper generates a placeholder download
page; it does not actually deploy. Replace that command in Cloudflare with
`exit 0` before retiring the helper. Metadata must be generated from the release's
Windows build using `bun run release:prepare`, not during a Cloudflare build.

Keep the existing update URL available to installed clients. Verify
`https://suppliers-anx.pages.dev/latest.yml` after a metadata deployment. Publish
matching GitHub Release assets before merging new metadata into `main`.

## Official references

- [Branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)
- [Static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
- [Skip dependency installation](https://developers.cloudflare.com/pages/configuration/build-image/#skip-dependency-install)
