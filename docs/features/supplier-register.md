# Leverandørregister

Registeret kombinerer kontakter fra databasen med leverandørnavn i de importerte ordrene. Det kan derfor vise leverandører uten utestående linjer.

Søk etter leverandøren og åpne detaljene for å endre e-postadresse, e-postspråk eller purredager. En leverandør kan ha flere purredager. Lagre endringene før du forlater detaljene.

Endringene lagres lokalt på denne PC-en og overstyrer de importerte kontaktopplysningene. En vellykket innkjøpsimport nullstiller disse lokale overstyringene og henter kontaktgrunnlaget fra databasen igjen. Oppdater Excel-kilden hvis en endring skal følge fremtidige importer.

`Purre nå` åpner leverandøren i arbeidsflaten og velger den til purring. Derfra må du kontrollere linjene og gjennomføre sendingen.

Purrestatus viser lokalt registrerte sendinger og utsettelser. En sending fra en annen PC blir ikke lagt til automatisk.

## Hvor kontaktene kommer fra

- `Leverandør`-arket kan angi navn, språk, purredag og e-post.
- `Sjekkliste Leverandører` kan bidra med navn og e-postadresse.
- `BP` bidrar med leverandører som har ordrelinjer.

Kontaktarkene er valgfrie. Tidligere databasekontakter kan bli stående når de ikke erstattes av importen. Se [Excel-import](excel-import.md) for oppsettet av arkene.
