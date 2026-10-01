# Versjonering

Appversjonen ligger i `package.json`. Release-tags bruker normalt `vX.Y.Z`. Navn på installasjonsfiler og oppdateringsmetadata må bruke samme versjon.

## Lese status

```powershell
bun run version:info
bun run version:help
```

`bun run version:sync` henter versjon fra nærmeste tilgjengelige Git-tag og skriver den til `package.json`. Kommandoen krever rent arbeidstre, Git-identitet og en branch. Hvis versjonen endres, committer den `package.json`.

## Øke versjon

`scripts/sync-version.js` bruker npm sin versjonskommando. Skriptet krever Git-identitet, en branch og rent arbeidstre.

| Kommando                     | Endring       |
| ---------------------------- | ------------- |
| `bun run version:bump`       | Patch         |
| `bun run version:bump:minor` | Minor         |
| `bun run version:bump:major` | Major         |
| `bun run version:bump:push`  | Patch og push |

Bump skriver `package.json`, committer den filen og lager en annotert tag. Det er ikke bare en filredigering.

For å se hva en minor-økning ville gjøre:

```powershell
node scripts/sync-version.js bump minor --dry-run
```

For en minor-økning med push brukes det underliggende skriptet:

```powershell
node scripts/sync-version.js bump minor --push
```

`--push` pusher branch og tags gjennom `--follow-tags`. En `v*`-tag kan utløse release-workflowen, så dette inngår i publisering. `TAG_PREFIX` kan overstyre tagprefikset.

## Velge releaseversjon

Bruk patch for feilrettinger, minor for funksjonalitet og major når kompatibilitetsbrudd krever det. Metadata-skriptet for dagens oppdateringsfeed forventer en stabil `X.Y.Z`-versjon; ikke anta at støtte for prerelease i versjonsskriptet betyr at hele publiseringsflyten støtter den.

Kontroller alltid resultatet mot `package.json` og ønsket Git-tag. En eksisterende tag skal ikke flyttes til et annet bygg for å rette en publisert release.
