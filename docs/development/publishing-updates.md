# Publisere en oppdatering

En release består av Windows-programfiler i GitHub Releases og oppdateringsmetadata på Cloudflare Pages. Publiser programfilene før metadataene som peker til dem.

## Før publisering

Bruk en stabil `X.Y.Z`-versjon og en konkret endringsbeskrivelse i [changeloggen](../CHANGELOG.md). Kontroller tester, bygg, signatur og at pakken starter og importerer en representativ fil. Test Outlook-sending med en kontrollert mottaker.

Se [versjonering](VERSIONING.md), [signering](CODE-SIGNING.md) og [utviklingsoppsett](setup.md).

## GitHub Actions

Start `Release Workflow` i Actions med versjonen, eller push en `vX.Y.Z`-tag fra lokal Git. Workflowen:

1. Kontrollerer at versjonen stemmer med `package.json` i valgt commit, og at en eventuell eksisterende tag peker til samme commit. Installerer fra låsefilen uten å endre pakkeversjonen.
2. Kjører kvalitetssjekk, bygger appen og kontrollerer SQLite under Electron.
3. Pakker Windows-filene.
4. Genererer metadata fra installasjonsprogrammet og portable-filen.
5. Oppretter eller oppdaterer GitHub-releasen med endringsbeskrivelsen og filene.
6. Lager en metadata-PR mot `main`.

Alle stegene må lykkes. En feil ved PR-oppretting kan skje etter at GitHub-filene er publisert. Merge metadata-PR-en og kontroller Pages-deployen før oppdateringen regnes som tilgjengelig for klientene.

## Lokal publisering

Fra repoets rot på Windows:

```powershell
bun run validate:version
bun run quality
bun run dist:clean
bun run release:prepare
```

Versjonskontrollen krever at pakkeversjonen samsvarer med nærmeste tag, og at HEAD er committen taggen peker til. Bygg og metadata-generering publiserer ikke en release.

Når filene er kontrollert og `GITHUB_TOKEN` er satt:

```powershell
bun run release:github
```

Skriptet kontrollerer begge programfiler og metadata før første GitHub-endring. Ved ny kjøring lastes installer, portable, `latest.yml` og eventuell blockmap først opp med midlertidige navn. De eksisterende filene beholdes til alle opplastinger er bekreftet. Deretter byttes navnene, og gamle filer slettes først når alle erstatningene har sine endelige navn. Ved feil i navnebyttet forsøker skriptet å gjenopprette de gamle navnene; mislykket gjenoppretting varsles og reservefilene beholdes for manuell gjenoppretting. Andre vedlegg beholdes. Kontroller releasen før metadata publiseres etter en feil.

Commit de genererte filene i `docs/updates/` og få dem inn i Pages sin produksjonsbranch når GitHub-filene er tilgjengelige. `bun run deploy:cloudflare` kontrollerer bare lokale webfiler.

## Filer og metadata

| Fil                             | Rolle                                                 |
| ------------------------------- | ----------------------------------------------------- |
| `release/Pulse-X.Y.Z-setup.exe` | NSIS-installasjonsprogram                             |
| `release/Pulse-Portable.exe`    | Portable-programfil                                   |
| `release/*.blockmap`            | Eventuell blokkmetadata                               |
| `docs/updates/latest.yml`       | Versjon, SHA-512, størrelse og GitHub-URL for updater |
| `docs/updates/latest.json`      | Metadata for portable-nedlasting                      |
| `docs/updates/index.html`       | Nedlastingsside                                       |

`release:prepare` krever begge programfilene, regner hash og størrelse fra dem og skriver metadata. Programfilene kopieres ikke til Cloudflare.

Begge appvariantene sjekker `latest.yml`. Portable-utgaven varsler og krever manuell utskifting; `latest.json` er nedlastingsmetadata.

## Kontroll etter publisering

```powershell
bun run validate:release
bun run validate:release -- --published
```

Første kommando kontrollerer lokale hashes og metadata samt GitHub-assetsenes navn, størrelse og URL. `--published` kontrollerer også at de to publiserte Cloudflare-feedene samsvarer med lokale filer. Avvik gir feilkode. Kontrollen laster ikke ned og hasher programfilene fra GitHub.

Åpne nedlastingssiden, prøv lenkene og test oppdatering fra eldre installer- og portable-utgaver. Installerutgaven laster ned automatisk; portable-filen erstattes manuelt med appen lukket.
