# Excel-import

Importen leser `.xlsx`-filer. Renderer bruker SheetJS til validering og forhåndslesing; main-prosessen bruker ExcelJS til å skrive dataene til SQLite.

## BP: innkjøpslinjer

`BP` er det eneste obligatoriske arket. Overskriftene ligger på rad 5 og dataene begynner på rad 6. I pakket app kontrollerer filvelgeren også at arket har forventet minimumsstørrelse; utviklingsmodus har enklere validering.

Importer søker etter ERP-overskriftene først. Hvis de mangler, brukes posisjoner fra norsk eller dansk kolonneoppsett.

| Overskrift      | Betydning                    | Norsk reservekolonne | Dansk reservekolonne |
| --------------- | ---------------------------- | -------------------- | -------------------- |
| `foretagkod`    | Firmakode                    | A                    | A                    |
| `bestnr`        | Innkjøpsordre                | C                    | B                    |
| `ftgnr`         | Leverandørnummer             | D                    | C                    |
| `lagstalle`     | Lager                        | E                    | D                    |
| `besttyp`       | Ordretype                    | F                    | E                    |
| `artnr`         | Internt artikkelnummer       | H                    | G                    |
| `artnrlev`      | Leverandørens artikkelnummer | I                    | H                    |
| `bestberlevdat` | Beregnet leveringsdato       | J                    | I                    |
| `bestlovlevdat` | Lovet leveringsdato          | K                    | J                    |
| `orpradtext`    | Kommentar                    | L                    | K                    |
| `bestant`       | Bestilt mengde               | M                    | L                    |
| `bestlevant`    | Mottatt mengde               | N                    | M                    |
| `bestrestant`   | Restmengde                   | O                    | N                    |
| `ftgnamn`       | Leverandørnavn               | P                    | O                    |
| `bestradnr`     | Ordrelinjenummer             | Q                    | P                    |

Oppsettet ligger i `src/config/columnMappings.ts`. Norske data bruker firmakode 40, danske data 80. Landoppsettet oppdages fra filnavn og innhold. Behold ERP-overskriftene hvis eksporten har ekstra kolonner; da kan importen finne feltene uten å stole på reserveposisjonene.

Firmakode 87 holdes utenfor ordrespørringene. Lager 87 er et annet felt og kan være et gyldig dansk lager. Ordretype 70 kan inkluderes gjennom ICT-valget i arbeidsflaten.

## Valgfrie støtteark

### ITEM: produkttekst

Overskrifter på rad 5, data fra rad 6:

- `foretagkod`
- `artnr`
- `artbeskr`
- `artbeskrspec` hvis spesifikasjon finnes

Oppslag gjøres på firmakode og internt artikkelnummer. Dette gir produkttekst utover leverandørens artikkelnummer i BP.

### ARS: tilgjengelig lagerbeholdning

Overskrifter på rad 5, data fra rad 6:

- `foretagkod`
- `artnr`
- `lagstalle`
- `lagsaldo`
- `lagresant`

Tilgjengelig beholdning beregnes som `lagsaldo - lagresant` for samme firma, lager og artikkel. Manglende eller ugyldige tall behandles som ukjent beholdning. Importen henter ikke en annen lagersaldo som reserve.

### Leverandør: kontakt og purredag

Overskrifter på rad 1, data fra rad 2:

| Kolonne | Innhold                |
| ------- | ---------------------- |
| A       | Leverandørnavn         |
| B       | Company ID (= `ftgnr`) |
| C       | Språk                  |
| D       | Purredag               |
| E       | E-postadresse          |

Hver rad med leverandørnavn blir en leverandør i registeret, også uten purredag eller e-post. Company ID er Jeeves-nummeret, det samme som `ftgnr` i BP: rader med samme Company ID er én leverandør uansett hvordan navnet er skrevet. Importen normaliserer norske og engelske ukedager.

Når arket finnes, erstatter det hele leverandørregisteret: kontakter og purredager. Når det mangler, beholdes registeret fra forrige import. Danske leverandører får i tillegg oppføring for arbeidsdagene gjennom importens Danmark-oppsett.

Arket `Sjekkliste Leverandører` leses ikke.

## Hva en ny import endrer

Innkjøpslinjene i `purchase_order` erstattes i én transaksjon. Linjer som ikke finnes i den nye filen, forsvinner fra ordresnapshotet. Radnøkkelen skiller firma, lager, leverandør, ordre, artikkel og ordrelinje.

Leverandørregisteret lagres i samme transaksjon som innkjøpslinjene. Feiler noe, feiler hele importen, og forrige ordrer, kontakter og purredager beholdes.

Arbeidsflaten nullstiller lokale kontaktendringer etter vellykket import. Utelatte linjer beholdes bare når identitet og innhold stemmer. Lokal sendingshistorikk beholdes.

## Når resultatet ser feil ut

Kontroller ark, overskriftsrad og landoppsett først. Ved feil produkttekst eller saldo må du kontrollere nøklene i ITEM og ARS. Sammenlign den aktuelle BP-raden med visningen i Pulse, og les importfeilen i apploggen.

Ikke endre `columnMappings.ts` for én feilformatert eksport før du har avklart om filen eller ERP-formatet faktisk har endret seg.
