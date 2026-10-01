# Sikkerhet

Rapporter sårbarheter privat til repoets eier eller virksomhetens etablerte sikkerhetskanal. Ta med appversjon, berørt flyt og en reproduksjon uten ekte ordredata, mottakere eller hemmeligheter.

## Kontroller i repoet

`bun run security-audit` kontrollerer avhengighetene i Bun-låsefilen. CI kjører samme kontroll i `.github/workflows/security-audit.yml`. Et godkjent audit-resultat erstatter ikke kontroll av appens prosessgrenser.

Renderer kjører uten Node-integrasjon og bruker preload-API-et. Main bruker CSP og navigasjonsbegrensninger. Excel-verdier må behandles som data i SQL, PowerShell og e-post-HTML.

Ved avhengighetsendringer oppdateres `package.json` og `bun.lock` sammen, og appens tester og bygg kontrolleres. En versjonsoppdatering er ikke automatisk en bekreftet sikkerhetsretting.

Se [arkitektur](docs/architecture.md) for prosessgrensene og [endringshistorikk](docs/CHANGELOG.md) for utført arbeid.
