# Lagring og sikkerhetskopier

Pulse lagrer importerte data i SQLite og arbeidsflatens kontaktvalg og historikk i rendererens lokale lagring. De to lagrene har forskjellige gjenopprettingsbehov.

## SQLite

Main-prosessen åpner `app.sqlite` under Electron-mappen `app.getPath('userData')`. På Windows er standardplasseringen under `%APPDATA%\one-med-supplychain-app`; oppstartsloggen viser den faktiske banen.

`src/services/databaseService.ts` oppretter tabeller og legger til manglende kolonner. Det finnes ikke et separat rammeverk med nummererte migreringer. Databasen bruker WAL, `synchronous = NORMAL` og aktiverte foreign keys.

| Tabell              | Bruk                                                   |
| ------------------- | ------------------------------------------------------ |
| `purchase_order`    | Gjeldende BP-import med produkt-, lager- og datofelter |
| `supplier_emails`   | Importerte leverandørkontakter og språk                |
| `supplier_planning` | Leverandør, purredag og planlegger                     |
| `orders`            | Eldre ordre-API, blant annet `email_sent_at`           |
| `audit_log`         | Endringer gjennom det eldre ordre-API-et               |
| `weekly_status`     | Eldre import- og ukestatus                             |

`orders.email_sent_at` og `weekly_status` er ikke sendingshistorikken som dagens arbeidsflate bruker. `audit_log` er heller ikke en full revisjonslogg over arbeidsflatehandlinger.

En ny BP-import erstatter `purchase_order`. Feltet `nøkkel` er en sammensatt, serialisert radidentitet. SQL-spørringene og importoppsettet i kode er den fullstendige skjemareferansen.

## Arbeidsflatens lokale lagring

Nøkkelen `pulse-workspace-v1` inneholder:

| Felt                     | Innhold                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `contacts`               | Lokale overstyringer av e-post, språk og purredager         |
| `excluded`               | Utelatte linjer med fingeravtrykk og årsak                  |
| `history`                | Leverandør, tidspunkt, sendt/avvent-status og antall linjer |
| `fileName`, `importedAt` | Siste import vist i arbeidsflaten                           |

Dette lagres gjennom `src/renderer/workspace/model.ts`. Historikken hindrer ny purring av samme leverandør i samme ISO-uke. Den deles ikke mellom maskiner.

En vellykket import tømmer `contacts`, men beholder historikken. Et utelatelsesvalg brukes bare når linjens fingeravtrykk fortsatt stemmer.

## Automatiske databasekopier

Main-prosessen kontrollerer periodisk om det er tid for en databasekopi. Importeren forsøker også å lage en kopi etter import, og venter på at backup-operasjonen er ferdig før den melder suksess. Kopiene ligger i `backups` under appens datamappe.

Det finnes to oppryddingsrutiner: den periodiske rutinen beholder opptil sju kopier, mens importens rutine beholder opptil fem `.db`-kopier. De deler mappe, så sju kopier er ikke en garanti. Kontroller at en kopi faktisk ble opprettet når den er nødvendig.

SQLite-kopiene inneholder ikke rendererens lokale lagring.

## Manuell sikring og gjenoppretting

Lukk Pulse før du tar en manuell kopi av hele datamappen. Behold originalen til resultatet er kontrollert. Ved en hel mappekopi bør eventuelle WAL- og SHM-filer følge med; kopiering av bare en åpen `app.sqlite` kan utelate nyere endringer.

En SQLite-backup kan gjenopprette ordresnapshot og importerte kontakter. Den gjenoppretter ikke lokale kontaktvalg eller sendingshistorikk. For full gjenoppretting må også appprofilen med rendererens lokale lagring bevares.

Importer kan sette en ugyldig database til side som `app.sqlite.corrupt.<tidspunkt>` før ny database opprettes. Ta vare på denne filen ved feilsøking. Ikke slett datamappen som et generelt første tiltak; det kan fjerne historikken som forebygger doble purringer.
