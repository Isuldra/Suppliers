# Dashboard

Dashboardet viser statistikk fra de importerte, utestående innkjøpslinjene. Datagrunnlaget er et lokalt snapshot. Firmakode 87 holdes utenfor spørringene.

## Nøkkeltall

| Kort                        | Beregning                                            |
| --------------------------- | ---------------------------------------------------- |
| Totalt restlinjer           | Antall linjer med positiv restmengde                 |
| Gjennomsnittlig forsinkelse | Gjennomsnittlige dager etter ETA for forfalte linjer |
| Over 30 dager forsinket     | Linjer mer enn 30 dager etter ETA                    |
| Innen leveringsfrist        | Andel åpne linjer med dato som ennå ikke er forfalt  |
| Forfalte restlinjer         | Åpne linjer med ETA før dagens dato                  |
| Tidligste leveringsdato     | Tidligste ETA blant åpne linjer                      |

`Innen leveringsfrist` måler ikke historisk leveringspresisjon. Kortet beregnes fra åpne linjer som har dato. `Tidligste leveringsdato` bruker leveringsdato, ikke datoen ordren ble opprettet. Antall i disse spørringene er restlinjer.

## Visninger

- `Oversikt` viser nøkkeltall og leverandørfordeling. Topp leverandører rangeres etter antall åpne linjer.
- `Varenummer` viser artikler rangert etter samlet restmengde.
- `Timeline` viser ISO-uker med to uker bakover og åtte fremover.

Dashboardet viser hele datagrunnlaget; det har ingen leverandørfilter.

Hovedstatistikken har en fem minutters cache i databasetjenesten. De andre datakallene har egne spørringer. Dashboardet gir ingen direkte ERP-oppdatering.

Se [åpne forbedringer](../planning/planned-features.md) for mulige videre funksjoner.
