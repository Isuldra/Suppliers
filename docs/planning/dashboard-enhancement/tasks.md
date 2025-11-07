# Implementation Plan

- [ ] 1. Installer avhengigheter og oppsett
  - Installer Recharts og date-fns npm-pakker
  - Installer TypeScript type definitions for Recharts
  - Opprett dashboard-mappe under src/renderer/components/dashboard
  - _Requirements: 5.1, 5.2_

- [ ] 2. Implementer backend DatabaseService-metoder
  - [ ] 2.1 Implementer getDashboardStats() metode
    - Skriv SQL-spørring for å aggregere total restlinjer, unike leverandører, forfalte ordre
    - Beregn neste oppfølgingsdato fra eta_supplier
    - Returner DashboardStats-objekt med alle KPI-verdier
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ] 2.2 Implementer getTopSuppliersByOutstanding() metode
    - Skriv SQL-spørring med GROUP BY supplier_name
    - Sorter etter SUM(outstanding_qty) DESC
    - Returner topp N leverandører med orderCount og outstandingQty
    - _Requirements: 2.1, 2.2_
  
  - [ ] 2.3 Implementer getOrdersByPlanner() metode
    - Skriv SQL-spørring med GROUP BY purchaser
    - Beregn COUNT(*) og SUM(outstanding_qty) per innkjøper
    - Beregn prosentandel av totalen
    - _Requirements: 3.1, 3.2_
  
  - [ ] 2.4 Implementer getOrdersByWeek() metode
    - Skriv SQL-spørring med strftime('%W', eta_supplier) for å gruppere per uke
    - Inkluder både forfalte (fortid) og kommende (fremtid) ordre
    - Beregn orderCount og overdueCount per uke
    - Generer weekLabel og dateRange for hver uke
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [ ] 2.5 Implementer caching-mekanisme
    - Legg til dashboardCache property i DatabaseService
    - Implementer cache-sjekk med 5 minutters TTL
    - Invalider cache ved data-import
    - _Requirements: 7.1, 7.2_

- [ ] 3. Implementer IPC handlers og preload bridge
  - [ ] 3.1 Legg til IPC handlers i main process
    - Registrer 'get-dashboard-stats' handler
    - Registrer 'get-top-suppliers' handler
    - Registrer 'get-orders-by-planner' handler
    - Registrer 'get-orders-by-week' handler
    - Implementer feilhåndtering for alle handlers
    - _Requirements: 7.1_
  
  - [ ] 3.2 Utvid preload bridge med nye API-metoder
    - Legg til getDashboardStats() i electronAPI
    - Legg til getTopSuppliers() i electronAPI
    - Legg til getOrdersByPlanner() i electronAPI
    - Legg til getOrdersByWeek() in electronAPI
    - Oppdater TypeScript type definitions
    - _Requirements: 7.1_

- [ ] 4. Opprett TypeScript type definitions
  - Opprett src/renderer/types/Dashboard.ts fil
  - Definer DashboardStats interface
  - Definer SupplierStat interface
  - Definer PlannerStat interface
  - Definer WeekStat interface
  - Definer DashboardFilter interface
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ] 5. Implementer KPICard-komponenten
  - Opprett src/renderer/components/dashboard/KPICard.tsx
  - Implementer props interface med title, value, icon, trend, onClick, loading, format
  - Implementer tall-formatering med tusendelsskilletegn
  - Implementer loading skeleton state
  - Implementer hover-effekter og onClick-handler
  - Legg til støtte for ulike formater (number, currency, date, percentage)
  - _Requirements: 1.5_

- [ ] 6. Implementer TopSuppliersChart-komponenten
  - [ ] 6.1 Opprett TopSuppliersChart.tsx med Recharts BarChart
    - Implementer ResponsiveContainer med 100% bredde og 300px høyde
    - Konfigurer BarChart med data prop
    - Konfigurer XAxis med leverandørnavn (rotert 45° for lange navn)
    - Konfigurer YAxis med formatert tall (tusendelsskilletegn)
    - Implementer Bar med gradient fill
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 6.2 Implementer custom Tooltip og onClick-handler
    - Opprett custom Tooltip-komponent med leverandørnavn, restantall og antall ordre
    - Implementer onClick-handler på Bar for navigasjon til leverandør-detaljer
    - _Requirements: 2.4, 6.1_

- [ ] 7. Implementer PlannerDistributionChart-komponenten
  - Opprett src/renderer/components/dashboard/PlannerDistributionChart.tsx
  - Implementer ResponsiveContainer med PieChart
  - Konfigurer Pie med dataKey="orderCount"
  - Implementer custom Cell med distinkte farger for hver innkjøper
  - Implementer Legend med planner-navn
  - Implementer custom Tooltip med innkjøper-ID, antall og prosentandel
  - Implementer onClick-handler for filtrering
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.2_

- [ ] 8. Implementer OrderTimelineChart-komponenten
  - Opprett src/renderer/components/dashboard/OrderTimelineChart.tsx
  - Implementer ResponsiveContainer med LineChart
  - Konfigurer XAxis med uke-labels
  - Konfigurer YAxis med antall ordre
  - Implementer Line for totale ordre (blå farge)
  - Implementer Line for forfalte ordre (rød farge)
  - Implementer ReferenceLine for nåværende uke (stiplet linje)
  - Implementer custom Tooltip med ukenummer, dato-range og tall
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 9. Implementer DashboardFilters-komponenten
  - Opprett src/renderer/components/dashboard/DashboardFilters.tsx
  - Implementer dropdown for innkjøper-filter
  - Implementer dropdown for leverandør-filter
  - Implementer "Fjern filter"-knapp
  - Implementer visuell indikator for aktivt filter
  - Implementer onFilterChange callback
  - _Requirements: 6.2, 6.3, 6.4_

- [ ] 10. Integrer komponenter i Dashboard.tsx
  - [ ] 10.1 Oppdater Dashboard state og data-lasting
    - Legg til DashboardStats state
    - Legg til activeFilter state
    - Implementer loadDashboardData() funksjon med timeout-håndtering
    - Implementer handleRefresh() funksjon
    - Implementer handleFilterChange() funksjon
    - _Requirements: 5.1, 5.2, 7.3, 7.4, 7.5_
  
  - [ ] 10.2 Erstatt eksisterende KPI-kort med KPICard-komponenter
    - Erstatt hardkodede KPI-kort med KPICard-komponenter
    - Koble til data fra DashboardStats
    - Implementer ikoner fra Heroicons
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 10.3 Legg til chart-komponenter i dashboard layout
    - Legg til TopSuppliersChart under KPI-kort
    - Legg til PlannerDistributionChart ved siden av TopSuppliersChart
    - Legg til OrderTimelineChart under de andre charts
    - Implementer responsivt grid layout (1-2 kolonner avhengig av skjermstørrelse)
    - _Requirements: 5.3, 5.4_
  
  - [ ] 10.4 Legg til DashboardFilters-komponenten
    - Plasser DashboardFilters øverst i dashboard
    - Koble til activeFilter state
    - Implementer filter-logikk for å hente filtrerte data
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 11. Implementer feilhåndtering og loading states
  - Implementer skeleton loaders for alle komponenter
  - Implementer error state med "Prøv igjen"-knapp
  - Implementer empty state når ingen data finnes
  - Implementer timeout-håndtering (10 sekunder)
  - _Requirements: 5.1, 5.2_

- [ ] 12. Implementer responsivt design
  - Konfigurer Tailwind breakpoints for mobile, tablet, desktop
  - Implementer 1-kolonne layout for mobile (< 640px)
  - Implementer 2-kolonne layout for tablet (640px - 1024px)
  - Implementer 4-kolonne layout for desktop (> 1024px)
  - Test chart responsiveness på ulike skjermstørrelser
  - _Requirements: 5.3, 5.4, 5.5_

- [ ]* 13. Implementer ytelsesoptimalisering
  - Legg til React.memo på alle chart-komponenter
  - Implementer debouncing på filter-endringer (300ms)
  - Verifiser at caching fungerer korrekt
  - _Requirements: 7.1, 7.2_

- [ ]* 14. Implementer accessibility-forbedringer
  - Legg til ARIA labels på alle interaktive elementer
  - Implementer keyboard navigation for alle kontroller
  - Verifiser color contrast (WCAG AA)
  - Legg til focus indicators på alle interaktive elementer
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
