# Pulse

Pulse er en Windows-app for å importere innkjøpslinjer fra Excel, kontrollere restordrer og sende leverandørpurringer gjennom Outlook. Appen bygger på Electron, React, TypeScript og SQLite.

## Bruke appen

Last ned fra [Pulse-siden](https://suppliers-anx.pages.dev/) eller [GitHub Releases](https://github.com/Isuldra/Suppliers/releases).

- [Kom i gang](docs/getting-started.md)
- [Brukerveiledning](docs/user-guide.md)
- [Veiledning på fem språk](docs/user-guide-multilang.md)
- [All dokumentasjon](docs/README.md)

Importen krever en `.xlsx`-fil med arket `BP`. E-postsending krever Outlook med COM-støtte og rettigheter til avsenderpostkassen. Arbeidsdata og sendingshistorikk lagres lokalt.

## Utvikle

CI bruker Node.js 22 og Bun 1.3.14. Fra repoets rot:

```powershell
bun install --frozen-lockfile
bun run dev
```

`bun.lock` er låsefilen. Kontakter og planlegging importeres fra Excel til SQLite. Eldre lokale JSON-filer og produktkatalogen holdes utenfor Git.

```powershell
bun run quality
bun run build
```

Se [utviklingsoppsett](docs/development/setup.md) og [arkitektur](docs/architecture.md) for innganger, lagring og bygg.

## Distribuere

`bun run dist:clean` lager Windows-pakker lokalt. Den publiserer ikke en release.

Publisering krever både programfiler i GitHub Releases og oppdateringsmetadata på Cloudflare. Følg [publiseringsguiden](docs/development/publishing-updates.md).

[Endringshistorikk](docs/CHANGELOG.md) og [åpne forbedringer](docs/planning/planned-features.md).
