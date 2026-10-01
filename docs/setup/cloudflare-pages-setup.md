# Cloudflare Pages

Cloudflare Pages serverer nedlastingssiden og oppdateringsmetadata fra `docs/updates/`. Programfilene ligger i GitHub Releases.

Appens oppdateringsfeed er `https://suppliers-anx.pages.dev/`. Publiserte klienter trenger at dette endepunktet fortsatt gir gyldig metadata.

## Git-integrert oppsett

Bruk følgende oppsett når Pages-prosjektet kobles til repoet:

| Felt                         | Verdi                       |
| ---------------------------- | --------------------------- |
| Produksjonsbranch            | `main`                      |
| Automatisk produksjonsdeploy | Aktivert                    |
| Preview-branches             | Ingen                       |
| Framework                    | Ingen                       |
| Rotmappe                     | Repoets rot                 |
| Byggekommando                | `exit 0`                    |
| Output-mappe                 | `docs/updates`              |
| Miljøvariabel                | `SKIP_DEPENDENCY_INSTALL=1` |

Kontroller faktisk konfigurasjon i Pages-prosjektets innstillinger. Pages serverer filene direkte, uten Electron-bygg eller appavhengigheter.

## Innhold

`index.html` er nedlastingssiden. `latest.yml` er feeden for appens versjonssjekk. `latest.json` inneholder generert nedlastingsmetadata. `_headers`, `_redirects`, `404.html` og logoen følger med som statisk innhold.

`bun run release:prepare` genererer versjonsmetadata fra det lokale Windows-bygget. `bun run deploy:cloudflare` kontrollerer lokale filer; den utfører ingen deploy.

## Publiseringsrekkefølge

1. Bygg og kontroller programfilene.
2. Last dem opp til riktig GitHub-release.
3. Få generert metadata inn i Pages sin produksjonsbranch.
4. Kontroller Pages-deployen, feeden og nedlastingslenkene.

Release-workflowen lager en metadata-PR mot `main`. Merge den først når GitHub-filene er kontrollert, og verifiser deretter Pages-deployen. Se [publiseringsguiden](../development/publishing-updates.md).
