# E-postspråk

Purringer støtter språkverdiene `no`, `en`, `se`, `da` og `fi`: norsk, engelsk, svensk, dansk og finsk.

Språket kommer fra leverandørens importerte kontaktopplysninger når en støttet verdi finnes. Lokale endringer i leverandørregisteret overstyrer importen. Du kan også velge språk for den aktuelle purringen i gjennomgangen.

Ukjente eller manglende språkverdier får en reserveverdi i arbeidsflatens modell. Kontroller språkvalget i registeret hvis Excel-filen har fritekst eller andre språkkoder.

## Tre forskjellige valg

| Valg                           | Hva det påvirker                                |
| ------------------------------ | ----------------------------------------------- |
| Leverandørens e-postspråk      | Emne og innhold i purringen                     |
| Land oppdaget fra innkjøpsdata | Importoppsett, lagerfilter og avsenderpostkasse |
| Appens i18next-språk           | Tekster i komponenter som bruker oversettelsene |

Arbeidsflaten har fortsatt norske knappetekster. Et bytte av appspråk oversetter ikke hele arbeidsflaten.

Språkvalg alene bestemmer ikke avsenderpostkasse. Se [Outlook-oppsett](email-setup.md) og [Excel-import](excel-import.md).
