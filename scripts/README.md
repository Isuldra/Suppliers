# Scripts

Pakkekommandoene ligger i `package.json`. Bun bruker `bun.lock`; pakkescripts bruker også Node/npm.

## Bygg

| Script                        | Bruk                                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| `ensure-electron-modules.js`  | Bygge SQLite-modulen mot Electron før dev                            |
| `bun-environment.js`          | Finne Bun for child processes                                        |
| `create-minimal-manifest.js`  | Lage appmanifest i `dist/` før pakking                               |
| `build-with-version.js`       | `dist:clean`: bygge og pakke; `--skip-vite-build` gjenbruker `dist/` |
| `clean-build-cache.js`        | Fjerne repoets `dist/`, `release/`, `out/` og `node_modules/.cache/` |
| `test-sqlite-dependencies.js` | Kontrollere SQLite-lesing og skriving under Electron                 |

Cacheoppryddingen fjerner ikke brukerdata eller globale nedlastingscacher. Se [utviklingsoppsett](../docs/development/setup.md) og [native moduler](../docs/development/troubleshoot-native-modules.md).

## Versjon og release

| Script                          | Bruk                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `sync-version.js`               | Status, sync eller bump; endringer kan committe, tagge og eventuelt pushe        |
| `validate-version.js`           | Pakkeversjon og tag må samsvare; HEAD må være taggens commit                     |
| `release-artifacts.js`          | Felles validering av lokale programfiler, hashes og metadata                     |
| `prepare-cloudflare-release.js` | Generere metadata og oppdatere nedlastingssiden                                  |
| `create-github-release.js`      | Skrive release og erstatte håndterte assets, med feil ved mislykket opplasting   |
| `validate-release.js`           | Kontrollere lokale filer og GitHub-assets; `--published` kontrollerer Cloudflare |
| `simple-cloudflare-deploy.js`   | Kontrollere lokale webfiler, uten deploy                                         |
| `parse-changelog.js`            | Lese `## Version X.Y.Z:`-seksjoner for releasen                                  |
| `create-changelog-entry.js`     | Legge til versjonsoverskrift med konkret tittel                                  |

Følg [publiseringsguiden](../docs/development/publishing-updates.md) og [versjonering](../docs/development/VERSIONING.md) før kommandoer med eksterne sideeffekter.

Avhengighetskontroll kjøres med `bun run security-audit`. Se [CI-guiden](../docs/development/ci-cd-pipeline.md).
