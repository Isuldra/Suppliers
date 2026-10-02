# Leverandørregister

Registeret kombinerer kontakter fra databasen med leverandørnavn i de importerte ordrene. Det kan derfor vise leverandører uten utestående linjer.

Søk etter leverandøren og åpne detaljene for å endre e-postadresse, e-postspråk eller purredager. En leverandør kan ha flere purredager. Lagre endringene før du forlater detaljene.

Endringene lagres lokalt på denne PC-en og overstyrer de importerte kontaktopplysningene. En vellykket innkjøpsimport nullstiller disse lokale overstyringene og henter kontaktgrunnlaget fra databasen igjen. Oppdater Excel-kilden hvis en endring skal følge fremtidige importer.

`Purre nå` åpner leverandøren i arbeidsflaten og velger den til purring. Derfra må du kontrollere linjene og gjennomføre sendingen.

Purrestatus viser lokalt registrerte sendinger og utsettelser. En sending fra en annen PC blir ikke lagt til automatisk.

## Hvor kontaktene kommer fra

- `Leverandør`-arket angir navn, Company ID, språk, purredag og e-post. Når filen har arket, erstatter det registeret.
- `BP` bidrar med leverandører som har ordrelinjer. Linjene kobles til leverandøren på leverandørnummeret (`ftgnr` = Company ID), ellers på navnet.

Har filen ikke `Leverandør`-arket, beholdes registeret fra forrige import. `Sjekkliste Leverandører` brukes ikke. Se [Excel-import](excel-import.md) for oppsettet av arkene.
