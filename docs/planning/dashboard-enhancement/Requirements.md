# Requirements Document

## Introduction

Dette dokumentet beskriver kravene for å utvide det eksisterende dashboardet i OneMed SupplyChain Pulse-applikasjonen. Målet er å transformere det nåværende enkle dashboardet til et avansert, visuelt dashboard som gir innkjøpere en komplett oversikt over restordrer, leverandører og oppgaver på 10 sekunder. Dashboardet skal bruke profesjonelle visualiseringsbiblioteker (Recharts) og gi brukeren mulighet til å raskt identifisere kritiske områder som krever oppfølging.

## Glossary

- **Dashboard System**: React-komponenten som viser oversiktsdata og visualiseringer
- **KPI Card**: Et visuelt kort som viser en nøkkelindikator med tall og ikon
- **Recharts Component**: En visualiseringskomponent fra Recharts-biblioteket
- **Outstanding Order**: En ordre med restantall (bestrestant > 0)
- **Overdue Order**: En ordre hvor lovet leveringsdato (bestlovlevdat) er passert
- **Planner**: En innkjøper identifisert ved ID (f.eks. joha04, Hekr01)
- **Supplier**: En leverandør identifisert ved ftgnr og ftgnamn
- **BP Data**: Bestillingsdata fra BP.csv med ordrelinjer
- **Item Data**: Artikkeldata fra ITEM.csv med beskrivelser
- **Supplier Data**: Leverandørdata fra Leverandør.csv med kontaktinformasjon

## Requirements

### Requirement 1: KPI-kort for kritiske nøkkeltall

**User Story:** Som innkjøper vil jeg se de viktigste nøkkeltallene øverst på dashboardet, slik at jeg raskt kan vurdere situasjonen uten å måtte grave i data.

#### Acceptance Criteria

1. WHEN Dashboard System starter, THE Dashboard System SHALL vise totalt antall restlinjer som et KPI Card med count av alle rader hvor bestrestant > 0
2. WHEN Dashboard System starter, THE Dashboard System SHALL vise antall unike leverandører som et KPI Card med distinct count på ftgnamn
3. WHEN Dashboard System starter, THE Dashboard System SHALL vise antall forfalte ordrelinjer som et KPI Card med count av linjer hvor bestlovlevdat er eldre enn dagens dato
4. WHEN Dashboard System starter, THE Dashboard System SHALL vise neste oppfølgingsdato som et KPI Card med den tidligste bestlovlevdat som er i fremtiden
5. THE Dashboard System SHALL vise hvert KPI Card med et beskrivende ikon, en tittel og en tallverdi formatert med tusendelsskilletegn

### Requirement 2: Visualisering av topp leverandører

**User Story:** Som innkjøper vil jeg se hvilke leverandører som har mest restantall, slik at jeg kan prioritere oppfølging av de største leverandørene.

#### Acceptance Criteria

1. THE Dashboard System SHALL vise et Recharts Component som et stolpediagram (BarChart) med topp 5 leverandører sortert etter sum av bestrestant
2. WHEN Recharts Component viser leverandørdata, THE Recharts Component SHALL vise ftgnamn på X-aksen og sum av bestrestant på Y-aksen
3. WHEN Recharts Component viser leverandørdata, THE Recharts Component SHALL formatere Y-aksen med tusendelsskilletegn for lesbarhet
4. WHEN bruker holder musepeker over en stolpe, THE Recharts Component SHALL vise en tooltip med leverandørnavn, totalt restantall og antall ordrelinjer
5. THE Dashboard System SHALL oppdatere Recharts Component når nye data lastes inn

### Requirement 3: Visualisering av restordrer per innkjøper

**User Story:** Som leder vil jeg se arbeidsfordelingen mellom innkjøpere, slik at jeg kan identifisere ubalanse i arbeidsbelastning.

#### Acceptance Criteria

1. THE Dashboard System SHALL vise et Recharts Component som et kakediagram (PieChart) med fordeling av restordrer per Planner
2. WHEN Recharts Component viser innkjøperdata, THE Recharts Component SHALL gruppere på Kolonne1 (Planner ID) og vise antall restlinjer per innkjøper
3. WHEN Recharts Component viser innkjøperdata, THE Recharts Component SHALL bruke distinkte farger for hver innkjøper
4. WHEN bruker holder musepeker over en kakeseksjon, THE Recharts Component SHALL vise en tooltip med innkjøper-ID, antall ordrelinjer og prosentandel av totalen
5. THE Dashboard System SHALL vise en forklaring (legend) som mapper farger til innkjøper-IDer

### Requirement 4: Tidsbasert visualisering av forfalte ordre

**User Story:** Som innkjøper vil jeg se en tidslinje over når ordre forfaller, slik at jeg kan planlegge oppfølgingsarbeidet mitt.

#### Acceptance Criteria

1. THE Dashboard System SHALL vise et Recharts Component som et linjediagram (LineChart) med antall forfalte ordre per uke for de neste 8 ukene
2. WHEN Recharts Component viser tidsdata, THE Recharts Component SHALL gruppere Outstanding Order etter ukenummer basert på bestlovlevdat
3. WHEN Recharts Component viser tidsdata, THE Recharts Component SHALL markere nåværende uke med en vertikal linje eller annen visuell indikator
4. WHEN bruker holder musepeker over et datapunkt, THE Recharts Component SHALL vise en tooltip med ukenummer, dato-range og antall ordre
5. THE Dashboard System SHALL inkludere både forfalte ordre (fortid) og kommende ordre (fremtid) i visualiseringen

### Requirement 5: Responsivt layout og lasting

**User Story:** Som bruker vil jeg at dashboardet skal laste raskt og fungere på ulike skjermstørrelser, slik at jeg kan bruke det effektivt uansett arbeidssituasjon.

#### Acceptance Criteria

1. THE Dashboard System SHALL vise en loading-indikator mens data hentes fra databasen
2. WHEN data ikke kan lastes, THE Dashboard System SHALL vise en feilmelding med mulighet til å prøve på nytt
3. THE Dashboard System SHALL organisere KPI Cards i et responsivt grid som tilpasser seg skjermbredde (4 kolonner på desktop, 2 på tablet, 1 på mobil)
4. THE Dashboard System SHALL organisere Recharts Components i et responsivt grid som tilpasser seg skjermbredde
5. WHEN skjermbredde endres, THE Recharts Component SHALL justere størrelse og layout for optimal visning

### Requirement 6: Interaktivitet og navigasjon

**User Story:** Som innkjøper vil jeg kunne klikke på visualiseringer for å se mer detaljert informasjon, slik at jeg raskt kan gå fra oversikt til detaljer.

#### Acceptance Criteria

1. WHEN bruker klikker på en leverandør i Recharts Component, THE Dashboard System SHALL navigere til detaljvisning for den leverandøren
2. WHEN bruker klikker på en innkjøper i kakediagrammet, THE Dashboard System SHALL filtrere dashboardet til å vise kun data for den innkjøperen
3. WHEN Dashboard System er filtrert, THE Dashboard System SHALL vise en tydelig indikator på hvilket filter som er aktivt
4. WHEN Dashboard System er filtrert, THE Dashboard System SHALL vise en knapp for å fjerne filteret og returnere til full oversikt
5. THE Dashboard System SHALL bevare brukerens filtervalg når bruker navigerer tilbake til dashboardet

### Requirement 7: Dataoppdatering og cache

**User Story:** Som bruker vil jeg at dashboardet skal vise oppdatert data uten å måtte laste siden på nytt, slik at jeg alltid ser den nyeste informasjonen.

#### Acceptance Criteria

1. THE Dashboard System SHALL hente data fra Electron backend ved oppstart
2. WHEN Dashboard System har lastet data, THE Dashboard System SHALL cache dataene i minnet for rask gjenbruk
3. THE Dashboard System SHALL tilby en "Oppdater"-knapp som henter ferske data fra databasen
4. WHEN bruker klikker "Oppdater", THE Dashboard System SHALL vise en loading-indikator mens nye data hentes
5. WHEN nye data er hentet, THE Dashboard System SHALL oppdatere alle KPI Cards og Recharts Components med de nye dataene
