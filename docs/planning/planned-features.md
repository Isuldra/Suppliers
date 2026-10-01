# Åpne forbedringer

| Område           | Hva som gjenstår                                                                      |
| ---------------- | ------------------------------------------------------------------------------------- |
| Historikk        | Sendingshistorikk ligger i localStorage, uten SQLite-backup eller deling mellom PC-er |
| Kontaktendringer | Lokale overstyringer nullstilles ved import; avklar ønsket arbeidsflyt                |
| Oversettelse     | Arbeidsflaten har norske tekster utenom i18next                                       |

En endring i historikklagring må bevare ukesperren mot doble purringer og håndtere eksisterende `pulse-workspace-v1`-data.

Mulige videre funksjoner trenger avklaring:

- Delt historikk når flere personer purrer samme leverandør.
- Reelle dashboardfiltre med filtrerte SQL-spørringer.
- Eksport av et kontrollert ordreutvalg.
- Historiske leverandørmålinger basert på mottak, utover dagens restliste.

Se [dashboardguiden](../features/dashboard.md) for dagens beregninger.
