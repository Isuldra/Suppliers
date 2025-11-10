# Design Document: Avansert Dashboard

## Overview

Dette designdokumentet beskriver den tekniske løsningen for å utvide det eksisterende dashboardet i OneMed SupplyChain Pulse-applikasjonen. Løsningen transformerer det nåværende enkle dashboardet til et avansert, visuelt dashboard med profesjonelle visualiseringer ved hjelp av Recharts-biblioteket.

Designet bygger på den eksisterende arkitekturen med React frontend, Electron backend og SQLite database. Vi vil utvide den eksisterende `Dashboard.tsx`-komponenten og legge til nye backend-metoder for å hente aggregerte data.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Dashboard.tsx (Enhanced)                    │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  KPI Cards  │  │   Recharts   │  │   Filters   │  │  │
│  │  │  Component  │  │  Components  │  │  Component  │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           │ IPC Calls                        │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Electron Preload Bridge                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ IPC
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         DatabaseService (Enhanced)                    │  │
│  │  • getDashboardStats()                                │  │
│  │  • getTopSuppliersByOutstanding()                     │  │
│  │  • getOrdersByPlanner()                               │  │
│  │  • getOrdersByWeek()                                  │  │
│  │  • getOverdueOrders()                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           │ SQL Queries                      │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              SQLite Database                          │  │
│  │  • purchase_order table                               │  │
│  │  • supplier_planning table                            │  │
│  │  • weekly_status table                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Dashboard Load**: Dashboard-komponenten kaller `window.electron.getDashboardStats()` ved oppstart
2. **IPC Communication**: Preload bridge sender forespørsel til main process
3. **Database Query**: DatabaseService kjører SQL-spørringer mot SQLite
4. **Data Aggregation**: Resultater aggregeres og formateres i main process
5. **Response**: Data sendes tilbake til renderer process via IPC
6. **Rendering**: React-komponenter oppdateres med nye data
7. **Visualization**: Recharts-komponenter rendrer visualiseringer

## Components and Interfaces

### Frontend Components

#### 1. Dashboard Component (Enhanced)

**File**: `src/renderer/components/Dashboard.tsx`

**Responsibilities**:

- Orkestrere alle dashboard-komponenter
- Håndtere data-lasting og feilhåndtering
- Administrere filter-state
- Koordinere oppdateringer

**State**:

```typescript
interface DashboardState {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  activeFilter: DashboardFilter | null;
  lastUpdated: Date | null;
}

interface DashboardFilter {
  type: 'planner' | 'supplier' | 'week';
  value: string;
}
```

#### 2. KPICard Component (New)

**File**: `src/renderer/components/dashboard/KPICard.tsx`

**Purpose**: Gjenbrukbar komponent for å vise KPI-kort

**Props**:

```typescript
interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  onClick?: () => void;
  loading?: boolean;
  format?: 'number' | 'currency' | 'date' | 'percentage';
}
```

**Features**:

- Animert lasting-state
- Hover-effekter
- Klikk-handling for drill-down
- Formatering av tall med tusendelsskilletegn
- Trend-indikator (valgfri)

#### 3. TopSuppliersChart Component (New)

**File**: `src/renderer/components/dashboard/TopSuppliersChart.tsx`

**Purpose**: Stolpediagram for topp 5 leverandører

**Props**:

```typescript
interface TopSuppliersChartProps {
  data: SupplierStat[];
  onSupplierClick?: (supplier: string) => void;
  loading?: boolean;
}

interface SupplierStat {
  name: string;
  outstandingQty: number;
  orderCount: number;
  value?: number;
}
```

**Recharts Configuration**:

- `<BarChart>` med responsiv bredde
- `<XAxis>` med leverandørnavn (rotert 45° hvis lange navn)
- `<YAxis>` med formatert tall
- `<Tooltip>` med custom content
- `<Bar>` med gradient fill og onClick-handler

#### 4. PlannerDistributionChart Component (New)

**File**: `src/renderer/components/dashboard/PlannerDistributionChart.tsx`

**Purpose**: Kakediagram for fordeling av restordrer per innkjøper

**Props**:

```typescript
interface PlannerDistributionChartProps {
  data: PlannerStat[];
  onPlannerClick?: (planner: string) => void;
  loading?: boolean;
}

interface PlannerStat {
  planner: string;
  orderCount: number;
  percentage: number;
}
```

**Recharts Configuration**:

- `<PieChart>` med responsiv størrelse
- `<Pie>` med dataKey="orderCount"
- Custom `<Cell>` med distinkte farger
- `<Legend>` med planner-navn
- `<Tooltip>` med prosentandel

#### 5. OrderTimelineChart Component (New)

**File**: `src/renderer/components/dashboard/OrderTimelineChart.tsx`

**Purpose**: Linjediagram for ordre over tid

**Props**:

```typescript
interface OrderTimelineChartProps {
  data: WeekStat[];
  currentWeek: number;
  loading?: boolean;
}

interface WeekStat {
  week: number;
  year: number;
  weekLabel: string;
  orderCount: number;
  overdueCount: number;
  dateRange: string;
}
```

**Recharts Configuration**:

- `<LineChart>` med responsiv bredde
- `<XAxis>` med uke-labels
- `<YAxis>` med antall ordre
- `<Line>` for totale ordre (blå)
- `<Line>` for forfalte ordre (rød)
- `<ReferenceLine>` for nåværende uke (stiplet)
- `<Tooltip>` med dato-range og tall

#### 6. DashboardFilters Component (New)

**File**: `src/renderer/components/dashboard/DashboardFilters.tsx`

**Purpose**: Filter-kontroller for dashboard

**Props**:

```typescript
interface DashboardFiltersProps {
  activeFilter: DashboardFilter | null;
  onFilterChange: (filter: DashboardFilter | null) => void;
  availablePlanners: string[];
  availableSuppliers: string[];
}
```

**Features**:

- Dropdown for innkjøper-filter
- Dropdown for leverandør-filter
- "Fjern filter"-knapp
- Visuell indikator for aktivt filter

### Backend Services

#### DatabaseService Extensions

**File**: `src/services/databaseService.ts`

**New Methods**:

```typescript
// 1. Hent dashboard-statistikk
getDashboardStats(): DashboardStats {
  // SQL: Aggreger data fra purchase_order
  // - Total restlinjer (WHERE outstanding_qty > 0)
  // - Unike leverandører (DISTINCT supplier_name)
  // - Forfalte ordre (WHERE eta_supplier < CURRENT_DATE)
  // - Neste oppfølging (MIN(eta_supplier) WHERE eta_supplier >= CURRENT_DATE)
}

// 2. Hent topp leverandører
getTopSuppliersByOutstanding(limit: number = 5): SupplierStat[] {
  // SQL: GROUP BY supplier_name
  // ORDER BY SUM(outstanding_qty) DESC
  // LIMIT limit
}

// 3. Hent ordre per innkjøper
getOrdersByPlanner(): PlannerStat[] {
  // SQL: GROUP BY purchaser
  // COUNT(*) as orderCount
  // Calculate percentage
}

// 4. Hent ordre per uke
getOrdersByWeek(weeksAhead: number = 8, weeksBehind: number = 2): WeekStat[] {
  // SQL: GROUP BY strftime('%W', eta_supplier)
  // Include both past and future weeks
  // Mark overdue orders
}

// 5. Hent forfalte ordre
getOverdueOrders(): DbOrder[] {
  // SQL: WHERE eta_supplier < CURRENT_DATE
  // AND outstanding_qty > 0
  // ORDER BY eta_supplier ASC
}

// 6. Hent filtrerte dashboard-data
getFilteredDashboardStats(filter: DashboardFilter): DashboardStats {
  // Apply WHERE clause based on filter type
  // Return filtered stats
}
```

#### IPC Handlers

**File**: `src/main/index.ts` (eller relevant main process fil)

**New IPC Handlers**:

```typescript
// Register IPC handlers
ipcMain.handle('get-dashboard-stats', async () => {
  try {
    const stats = databaseService.getDashboardStats();
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-top-suppliers', async (_, limit: number) => {
  try {
    const suppliers = databaseService.getTopSuppliersByOutstanding(limit);
    return { success: true, data: suppliers };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-orders-by-planner', async () => {
  try {
    const planners = databaseService.getOrdersByPlanner();
    return { success: true, data: planners };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-orders-by-week', async (_, weeksAhead: number, weeksBehind: number) => {
  try {
    const weeks = databaseService.getOrdersByWeek(weeksAhead, weeksBehind);
    return { success: true, data: weeks };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-filtered-dashboard-stats', async (_, filter: DashboardFilter) => {
  try {
    const stats = databaseService.getFilteredDashboardStats(filter);
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

#### Preload Bridge Extensions

**File**: `src/preload/index.ts`

**New API Methods**:

```typescript
const electronAPI = {
  // ... existing methods ...

  // Dashboard methods
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  getTopSuppliers: (limit: number) => ipcRenderer.invoke('get-top-suppliers', limit),
  getOrdersByPlanner: () => ipcRenderer.invoke('get-orders-by-planner'),
  getOrdersByWeek: (weeksAhead: number, weeksBehind: number) =>
    ipcRenderer.invoke('get-orders-by-week', weeksAhead, weeksBehind),
  getFilteredDashboardStats: (filter: DashboardFilter) =>
    ipcRenderer.invoke('get-filtered-dashboard-stats', filter),
};
```

## Data Models

### DashboardStats

```typescript
interface DashboardStats {
  // KPI metrics
  totalOutstandingLines: number;
  uniqueSuppliers: number;
  overdueOrders: number;
  nextFollowUpDate: Date | null;

  // Aggregated data for charts
  topSuppliers: SupplierStat[];
  plannerDistribution: PlannerStat[];
  weeklyTimeline: WeekStat[];

  // Metadata
  lastUpdated: Date;
  dataSource: 'cache' | 'database';
}
```

### SupplierStat

```typescript
interface SupplierStat {
  name: string;
  outstandingQty: number;
  orderCount: number;
  value?: number; // Optional: total value of outstanding orders
  oldestOrderDate?: Date; // Optional: for prioritization
}
```

### PlannerStat

```typescript
interface PlannerStat {
  planner: string;
  orderCount: number;
  outstandingQty: number;
  percentage: number; // Calculated: (orderCount / total) * 100
}
```

### WeekStat

```typescript
interface WeekStat {
  week: number; // ISO week number
  year: number;
  weekLabel: string; // e.g., "Uke 45"
  orderCount: number;
  overdueCount: number;
  dateRange: string; // e.g., "6. nov - 12. nov"
  isCurrentWeek: boolean;
}
```

### DashboardFilter

```typescript
interface DashboardFilter {
  type: 'planner' | 'supplier' | 'week';
  value: string;
  label?: string; // For display purposes
}
```

## Error Handling

### Frontend Error Handling

1. **Loading States**: Vis skeleton loaders mens data hentes
2. **Error States**: Vis feilmeldinger med "Prøv igjen"-knapp
3. **Empty States**: Vis informative meldinger når ingen data finnes
4. **Timeout Handling**: Implementer timeout for lange database-spørringer (10 sekunder)

```typescript
const loadDashboardData = async () => {
  try {
    setIsLoading(true);
    setError(null);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 10000)
    );

    const dataPromise = window.electron.getDashboardStats();

    const response = await Promise.race([dataPromise, timeoutPromise]);

    if (!response.success) {
      throw new Error(response.error || 'Ukjent feil');
    }

    setStats(response.data);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Backend Error Handling

1. **Database Errors**: Logg feil og returner strukturerte feilmeldinger
2. **Invalid Data**: Valider input og returner spesifikke feilmeldinger
3. **Connection Errors**: Håndter database-tilkoblingsfeil gracefully

```typescript
public getDashboardStats(): DashboardStats {
  if (!this.db) {
    throw new Error('Database not connected');
  }

  try {
    // Execute queries...
  } catch (error) {
    log.error('Error getting dashboard stats:', error);
    throw new Error(`Failed to load dashboard data: ${error.message}`);
  }
}
```

## Testing Strategy

### Unit Tests

1. **Component Tests** (React Testing Library):
   - KPICard: Rendering, formatting, click handlers
   - Charts: Data transformation, Recharts props
   - Filters: State management, callbacks

2. **Service Tests** (Jest):
   - DatabaseService methods: SQL queries, data aggregation
   - Data transformations: Date formatting, calculations

### Integration Tests

1. **IPC Communication**:
   - Test full flow from renderer to main process
   - Verify data structure consistency

2. **Database Queries**:
   - Test with sample data
   - Verify aggregations and calculations

### Manual Testing

1. **Visual Testing**:
   - Verify chart rendering on different screen sizes
   - Test responsive layout
   - Verify color schemes and accessibility

2. **Performance Testing**:
   - Test with large datasets (1000+ orders)
   - Measure load times
   - Verify smooth interactions

3. **User Flow Testing**:
   - Test filter interactions
   - Test drill-down navigation
   - Test refresh functionality

## Performance Considerations

### Frontend Optimization

1. **Memoization**: Bruk `React.memo` for chart-komponenter
2. **Lazy Loading**: Last Recharts dynamisk med `React.lazy`
3. **Debouncing**: Debounce filter-endringer (300ms)
4. **Virtual Scrolling**: Hvis vi viser store lister

```typescript
const TopSuppliersChart = React.memo(({ data, onSupplierClick }: Props) => {
  // Component implementation
});
```

### Backend Optimization

1. **Query Optimization**:
   - Bruk indekser på `supplier_name`, `purchaser`, `eta_supplier`
   - Kombiner spørringer hvor mulig
   - Bruk `EXPLAIN QUERY PLAN` for å optimalisere

2. **Caching**:
   - Cache dashboard-data i minnet (5 minutter)
   - Invalider cache ved data-import

```typescript
private dashboardCache: {
  data: DashboardStats | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

public getDashboardStats(): DashboardStats {
  const now = Date.now();

  if (this.dashboardCache.data &&
      (now - this.dashboardCache.timestamp) < this.CACHE_TTL) {
    return { ...this.dashboardCache.data, dataSource: 'cache' };
  }

  // Fetch fresh data...
  const stats = this.fetchDashboardStatsFromDb();

  this.dashboardCache = {
    data: stats,
    timestamp: now
  };

  return { ...stats, dataSource: 'database' };
}
```

3. **Batch Operations**: Hent all data i én transaksjon

## Responsive Design

### Breakpoints

```typescript
const breakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
};
```

### Layout Grid

- **Mobile** (< 640px): 1 kolonne for alt
- **Tablet** (640px - 1024px): 2 kolonner for KPI-kort, 1 kolonne for charts
- **Desktop** (> 1024px): 4 kolonner for KPI-kort, 2 kolonner for charts

### Chart Responsiveness

```typescript
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>
    {/* Chart configuration */}
  </BarChart>
</ResponsiveContainer>
```

## Accessibility

1. **Keyboard Navigation**: Alle interaktive elementer skal være tilgjengelige via tastatur
2. **ARIA Labels**: Legg til beskrivende labels for skjermlesere
3. **Color Contrast**: Sørg for WCAG AA-kompatible farger
4. **Focus Indicators**: Tydelige focus-indikatorer på alle interaktive elementer

```typescript
<button
  onClick={handleRefresh}
  aria-label="Oppdater dashboard-data"
  className="focus:ring-2 focus:ring-primary"
>
  <RefreshIcon />
</button>
```

## Dependencies

### New Dependencies

```json
{
  "dependencies": {
    "recharts": "^2.10.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/recharts": "^1.8.29"
  }
}
```

### Existing Dependencies (Used)

- React 18+
- TypeScript
- Electron
- better-sqlite3
- Tailwind CSS

## Migration Strategy

### Phase 1: Backend Implementation

1. Implementer nye DatabaseService-metoder
2. Legg til IPC handlers
3. Utvid preload bridge
4. Test med eksisterende data

### Phase 2: Component Development

1. Opprett nye komponenter (KPICard, Charts)
2. Implementer med mock data
3. Test isolert

### Phase 3: Integration

1. Integrer komponenter i Dashboard.tsx
2. Koble til backend
3. Implementer filter-funksjonalitet
4. Test full flyt

### Phase 4: Polish

1. Legg til animasjoner
2. Optimaliser ytelse
3. Forbedre feilhåndtering
4. Accessibility audit

## Design Decisions

### Why Recharts?

- **Pros**: React-native, deklarativ API, god TypeScript-støtte, responsiv
- **Cons**: Større bundle size enn noen alternativer
- **Alternatives Considered**: Chart.js, Victory, D3.js
- **Decision**: Recharts gir best balanse mellom funksjonalitet og utvikleropplevelse

### Why Client-Side Filtering?

- **Pros**: Raskere respons, mindre server-load
- **Cons**: Må laste all data først
- **Decision**: For dashboard-visning er datasettet lite nok til at client-side filtering er effektivt

### Why Cache Dashboard Data?

- **Pros**: Raskere lasting, mindre database-load
- **Cons**: Kan vise utdatert data
- **Decision**: 5 minutters cache med manuell refresh-knapp gir god balanse

## Future Enhancements

1. **Export Functionality**: Eksporter dashboard som PDF eller bilde
2. **Custom Date Ranges**: La bruker velge tidsperiode for visualiseringer
3. **Comparison Mode**: Sammenlign data fra forskjellige perioder
4. **Alerts**: Konfigurer varsler for kritiske KPI-er
5. **Drill-Down Views**: Detaljerte visninger når man klikker på chart-elementer
6. **Real-Time Updates**: WebSocket-baserte oppdateringer ved data-endringer
