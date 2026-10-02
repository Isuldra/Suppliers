# Endringshistorikk

Dette er en kort oversikt over endringer i repoet. En pakkeversjon eller Git-tag bekrefter ikke alene at filer er publisert og testet. Tagdatoene er datoen på committen som taggen peker til.

## Version 1.5.5: Outlook-sending, ny e-post og språk

- Purringer sendes igjen via Outlook. 1.5.4 lastet e-posten som `.eml`, som Outlook avviste med «Ugyldig bane eller URL-adresse».
- E-posten til leverandøren har fått Pulse-utseende på alle språk, med linjene gruppert per PO og antall dager forsinket under bekreftet ETA.
- «Velg alle» og «Fjern alle» tar med eller tar ut alle linjene filteret viser. Linjer som alt er tatt ut, beholder grunnen.
- E-postspråket kan endres rett ved leverandørnavnet på Purring.
- Leverandører viser bare leverandørene i filen som ble importert sist, med Lev.nr fra arket «Leverandør», også uten åpne ordrer. Leverandører fra tidligere filer blir ikke liggende igjen.
- Ordrelinjene kobles til leverandøren på leverandørnummeret (ftgnr, Company ID i «Leverandør»), så en leverandør som er stavet ulikt i ordrearket og i «Leverandør», vises som én leverandør med adresse og purredager.
- Arket «Leverandør» bestemmer leverandørregisteret når det finnes. Manglende e-post hentes fra entydige treff i «Sjekkliste Leverandører». Filer med bare sjekklisten beholder også leverandører uten e-post eller åpne ordrer.
- Tvetydige leverandørtreff og konflikter mellom registrerte navn og nummer velger ikke mottaker automatisk. Fullførte ordre skaper ikke konflikter for åpne ordre.
- Danske leverandører med ordre får purredager mandag–fredag også ved import med bare sjekklisten.
- Arbeidsflaten er oversatt til dansk, svensk, finsk og engelsk, med datoer og tall i språkets format, og språkvelgeren er tilbake øverst.

## Version 1.5.4: Ny arbeidsflate

- Ny arbeidsflate med leverandørregister, linjevalg, ukestatus og gjennomgang før sending.
- Delt mottakervalidering for flere komma- eller semikolonseparerte adresser.
- Sendekøen stopper når historikken ikke kan lagres etter bekreftet sending; lagringsretry sender ikke på nytt.
- E-postforhåndsvisningen flytter fokus inn i dialogen og holder tastaturnavigasjonen der til lukking.
- Ubrukte skjermer, duplisert e-posttjeneste, gamle malgeneratorer og avhengigheter fjernet.
- Dashboardets misvisende KPI-navn rettet og filterkontroller uten datavirkning fjernet.
- IPC-typene samlet; innstillinger viser bare aktive valg.
- Release-scripts validerer filer før opplasting og feiler ved ufullstendige resultater; metadata-PR går til `main`.
- Dokumentasjonen er samlet og korrigert mot dagens kode.

Andre repoendringer i 2026 etter de eldre versjonene:

- Oktober: oppdateringsflyt, renderer-CSP, Bun/PATH-rettinger og CI etter merge.
- Oktober: lokale forretningsdata tatt ut av Git.
- Juli: PowerShell-escaping og prosessgrenser styrket; datoer, ISO-uker og leverandøravgrensning rettet.
- Juli: Slack- og Supabase-integrasjonene fjernet, sammen med døde avhengigheter og eldre kode.

1.5.3 ble aldri publisert som release. Lokale bygg fra januar kan bære det versjonsnummeret, så denne releasen bruker 1.5.4 for å være nyere enn dem.

## Version 1.5.2: Danmark og Bun

Tagcommit: 2026-01-05. Danmark-arbeid, lagerfilter og overgang til Bun i workflows.

## Version 1.5.1: Språkvalg

Tagcommit: 2025-12-08. Rettelser i språkvalg og Danmark-støtte.

## Version 1.5.0: Dansk import

Tagcommit: 2025-12-04. Dansk importoppsett, flere e-postspråk og byggrettinger.

## Version 1.4.5: Pulse og distribusjon

Tagcommit: 2025-11-20. Pulse-navn og rettelser i bygg, nedlastingsside og distribusjon.

## Version 1.4.2: Ordrevalg

Tagcommit: 2025-11-13. Rettelser i avkryssing og UI.

## Version 1.4.1: Windows x64

Tagcommit: 2025-11-13. Windows-bygg endret til x64.

## Version 1.4.0: Dashboard

Tagcommit: 2025-11-07. Dashboardutvidelse og daværende produktkatalogintegrasjon gjennom Supabase. Supabase ble senere fjernet; dagens import kan hente produkttekst fra lokale Excel-ark.

## Version 1.3.8: E-postforhåndsvisning

Tagcommit: 2025-11-05. Justeringer av e-postforhåndsvisning og layout.

## Version 1.3.6: Appversjon

Tagcommit: 2025-10-30. Appversjon via IPC og DevTools deaktivert i produksjon.

## Version 1.3.4: GitHub-lenker

Tagcommit: 2025-10-27. URL-koding av filnavn. `v1.3.3` peker til samme commit.

## Version 1.1.6: PowerShell-input

Tagcommit: 2025-06-13. HTML overført til PowerShell via stdin for å unngå kommandolinjens lengdegrense.

## Version 1.1.5: EML og COM

Tagcommit: 2025-06-13. EML/COM og reserveflyt i den eldre e-posttjenesten.

## Version 1.1.4: Outlook-formatering

Tagcommit: 2025-06-13. Rettelser i behandling av HTML. Versjon 1.1.3 introduserte CSS-inlining dagen før.

## Version 1.1.2: Oppdatering

Tagcommit: 2025-06-12. Updater og manuell portable-oppdatering.

## Version 1.1.1: Redigerbar mottaker

Tagcommit: 2025-06-12. Mottakerfeltet kunne redigeres før sending.

## Version 1.1.0: Portable-bygg

Tagcommit: 2025-06-12. Portable-byggemålet lagt tilbake.

Mellomliggende tags og detaljer finnes i Git:

```powershell
git tag --list
git log --oneline --decorate
git log v1.5.1..v1.5.2 --oneline
```
