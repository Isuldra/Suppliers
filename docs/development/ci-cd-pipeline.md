# CI og workflows

Workflowene ligger i `.github/workflows/`.

| Workflow             | Trigger                                     | Arbeid                                                               |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| `build.yml`          | PR mot `main` merges                        | Windows-pakker og artifacts med tre dagers oppbevaring               |
| `quality.yml`        | PR mot `main` merges                        | Format, lint, typekontroll og Vitest på Ubuntu                       |
| `release.yml`        | `v*`-tag eller manuell dispatch med versjon | Kontroller, Windows-pakker, GitHub-release og metadata-PR mot `main` |
| `security-audit.yml` | PR mot `main` og ukentlig                   | Audit av låste avhengigheter; rapport som artifact ved audit-feil    |

Build og quality kjører etter merge i `Isuldra/Suppliers`, ikke på hver åpen PR. Kjør relevante kontroller lokalt før merge.

CI bruker Node.js 22 og Bun 1.3.14 med `bun install --frozen-lockfile`. Build-jobbet publiserer ingen release.

Release-workflowen stopper ved feil i kontroller, pakking, opplasting eller PR-oppretting. GitHub-assets kan allerede være publisert dersom metadata-PR feiler. PR-en går til `main`; merging publiserer metadata hvis Pages er konfigurert som beskrevet i [Pages-oppsettet](../setup/cloudflare-pages-setup.md). Workflowen kontrollerer ikke den etterfølgende Pages-deployen.

Se [publisering](publishing-updates.md) for rekkefølge og kontroller.
