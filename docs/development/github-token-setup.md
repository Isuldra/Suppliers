# GitHub-tilgang for publisering

Appen trenger ingen GitHub-token for normal bruk eller e-postsending. Token brukes bare av vedlikeholderen når en release publiseres lokalt.

## Lokal release

`scripts/create-github-release.js` leser `GITHUB_TOKEN` fra prosessmiljøet og skriver til `Isuldra/Suppliers`.

Bruk en token med tilgang til det aktuelle repoet og tillatelse til å skrive releaseinnhold. Legg den inn gjennom et egnet hemmelighetslager eller i den aktuelle terminalsesjonen. Ikke skriv tokenverdien i dokumentasjon, scripts, committer eller feillogger.

Kontroller at variabelen finnes uten å skrive ut verdien:

```powershell
Test-Path Env:GITHUB_TOKEN
```

Deretter kan en kontrollert release publiseres med `bun run release:github`. Kommandoen kan slette eksisterende assets ved ny kjøring; se [publiseringsguiden](publishing-updates.md) først.

## GitHub Actions

Release-workflowen bruker GitHubs innebygde `GITHUB_TOKEN` med `contents: write`. Den krever ikke en lokalt lagret personlig token for dette steget.

PR-oppretting kan være begrenset av repoets Actions-innstillinger og workflowens tillatelser. At GitHub-assets ble lastet opp, beviser ikke at metadata-PR-en ble opprettet.

En tag pushet med innebygd workflow-token utløser normalt ikke en ny tag-workflow. Se [GitHubs beskrivelse](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) og [CI-guiden](ci-cd-pipeline.md).

## Ved tilgangsfeil

Kontroller repo, tokenutløp, nødvendige tillatelser og eventuell organisasjonsgodkjenning. Les feilen fra GitHub uten å dele hemmeligheten. Dokumentasjonen kan ikke avgjøre om din PC eller GitHub-konto allerede er konfigurert.
