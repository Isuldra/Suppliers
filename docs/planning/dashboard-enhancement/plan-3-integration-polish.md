# Plan 3: Integration & Polish - Dashboard Enhancement

## 🎯 Overview

This is Phase 3 of 3 for the Dashboard Enhancement project. In this final phase, we integrate all components into Dashboard.tsx, implement complete data loading, add error handling, responsive design, performance optimizations, and accessibility features.

**Goal**: Complete the dashboard by integrating all components, implementing full functionality, and polishing the user experience.

**Estimated Time**: 20-30 minutes

## 📋 Prerequisites

Before starting this plan, ensure:

- ✅ Plan 1 (Backend Foundation) is complete
- ✅ Plan 2 (Chart Components) is complete
- ✅ All 5 chart components exist and export correctly
- ✅ Backend methods return data correctly
- ✅ No TypeScript errors in existing code

## 📂 Files to Modify

```
src/renderer/components/
└── Dashboard.tsx (MAJOR UPDATES)
```

## 🔨 Implementation Steps

### Step 1: Update Dashboard State and Imports

Add imports for all new components and types:

```typescript
// At the top of Dashboard.tsx, add these imports:
import { KPICard } from "./dashboard/KPICard";
import { TopSuppliersChart } from "./dashboard/TopSuppliersChart";
import { PlannerDistributionChart } from "./dashboard/PlannerDistributionChart";
import { OrderTimelineChart } from "./dashboard/OrderTimelineChart";
import { DashboardFilters } from "./dashboard/DashboardFilters";
import type {
  DashboardStats,
  SupplierStat,
  PlannerStat,
  WeekStat,
  DashboardFilter,
} from "../types/Dashboard";
import {
  ChartBarIcon,
  UsersIcon,
  ClockIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
```

Add new state variables:

```typescript
const [stats, setStats] = useState<DashboardStats | null>(null);
const [topSuppliers, setTopSuppliers] = useState<SupplierStat[]>([]);
const [planners, setPlanners] = useState<PlannerStat[]>([]);
const [weeklyData, setWeeklyData] = useState<WeekStat[]>([]);
const [activeFilter, setActiveFilter] = useState<DashboardFilter | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [appVersion, setAppVersion] = useState<string>("");

// For filters
const [availablePlanners, setAvailablePlanners] = useState<string[]>([]);
const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([]);
```

**Requirements Met**: Requirement 5.1, 7.3

---

### Step 2: Implement Data Loading Function

Replace the existing `loadDashboardData` function with comprehensive data loading:

```typescript
const loadDashboardData = async () => {
  try {
    setIsLoading(true);
    setError(null);

    // Timeout promise (10 seconds)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Request timed out after 10 seconds")),
        10000
      )
    );

    // Load all dashboard data in parallel
    const [statsResponse, suppliersResponse, plannersResponse, weeksResponse] =
      await Promise.race([
        Promise.all([
          window.electron.getDashboardStats(),
          window.electron.getTopSuppliers(5),
          window.electron.getOrdersByPlanner(),
          window.electron.getOrdersByWeek(8, 2),
        ]),
        timeoutPromise,
      ]);

    // Check for errors
    if (!statsResponse.success) {
      throw new Error(statsResponse.error || "Failed to load dashboard stats");
    }
    if (!suppliersResponse.success) {
      throw new Error(suppliersResponse.error || "Failed to load suppliers");
    }
    if (!plannersResponse.success) {
      throw new Error(plannersResponse.error || "Failed to load planners");
    }
    if (!weeksResponse.success) {
      throw new Error(weeksResponse.error || "Failed to load weekly data");
    }

    // Set data
    setStats(statsResponse.data!);
    setTopSuppliers(suppliersResponse.data!);
    setPlanners(plannersResponse.data!);
    setWeeklyData(weeksResponse.data!);

    // Extract available filters
    setAvailablePlanners(plannersResponse.data!.map((p) => p.planner));
    setAvailableSuppliers(suppliersResponse.data!.map((s) => s.name));

    log.info("Dashboard data loaded successfully");
  } catch (err) {
    console.error("Error loading dashboard data:", err);
    setError(err instanceof Error ? err.message : "Unknown error");
  } finally {
    setIsLoading(false);
  }
};
```

Add useEffect to load data on mount:

```typescript
useEffect(() => {
  loadDashboardData();

  // Fetch app version
  const fetchVersion = async () => {
    try {
      const version = await window.electron.getAppVersion();
      setAppVersion(version);
    } catch (error) {
      console.error("Failed to fetch app version:", error);
    }
  };

  fetchVersion();
}, []);
```

**Requirements Met**: Requirement 5.1, 5.2, 7.1, 7.3, 7.4

---

### Step 3: Implement Refresh Handler

Add a manual refresh function:

```typescript
const handleRefresh = () => {
  loadDashboardData();
};
```

Add refresh button to the UI (in the header area):

```typescript
<button
  onClick={handleRefresh}
  className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-3 py-2 rounded transition-all text-sm"
  title="Oppdater dashboard"
  disabled={isLoading}
>
  {isLoading ? "Laster..." : "Oppdater"}
</button>
```

**Requirements Met**: Requirement 7.3, 7.5

---

### Step 4: Implement Filter Handler

Add filter change handler (note: filtering is currently client-side for simplicity):

```typescript
const handleFilterChange = (filter: DashboardFilter | null) => {
  setActiveFilter(filter);

  // Note: In a future version, you could reload data with filters from backend
  // For now, filtering is just visual indication
  // The components themselves don't need filtered data as they show top-level stats
};
```

**Requirements Met**: Requirement 6.2, 6.5

---

### Step 5: Replace Existing Dashboard Content

Remove the old hardcoded KPI cards and charts, and replace with the new components:

```typescript
return (
  <div className="min-h-screen flex flex-col bg-gradient-glass">
    {/* Header - keep existing header */}
    <div className="bg-gradient-to-r from-primary via-primary to-primary-dark text-neutral-white shadow-lg backdrop-blur-lg">
      <div className="container-app py-4 px-4">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {appVersion && (
              <span className="text-xs text-neutral-white/70 bg-white/10 backdrop-blur-sm border border-white/20 px-2 py-1 rounded">
                v{appVersion}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-3 py-2 rounded transition-all text-sm"
              disabled={isLoading}
            >
              {isLoading ? "Laster..." : "Oppdater"}
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-3 py-2 rounded transition-all text-sm"
            >
              <HomeIcon className="w-5 h-5" />
              Tilbake til hovedside
            </Link>
            <LanguageSelector mode="compact" />
            <button
              onClick={() => setShowSettings(true)}
              className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-3 py-2 rounded transition-all text-sm"
              title="Innstillinger"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Title row */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-1 flex items-center justify-center gap-3">
            <PresentationChartBarIcon className="w-8 h-8" />
            Pulse Dashboard
            <PresentationChartBarIcon className="w-8 h-8" />
          </h1>
          <p className="text-sm text-neutral-white/80">
            Oversikt over leverandører og utestående ordre
          </p>
        </div>
      </div>
    </div>

    {/* Main Content */}
    <div className="flex-1 p-6 container-app mx-auto">
      <div className="bg-white/30 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-8">
        {/* Filters */}
        {!isLoading && !error && (
          <DashboardFilters
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            availablePlanners={availablePlanners}
            availableSuppliers={availableSuppliers}
          />
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <h2 className="text-xl font-bold text-neutral mb-4">
              Feil ved lasting av dashboard
            </h2>
            <p className="text-neutral-secondary mb-4">{error}</p>
            <button onClick={handleRefresh} className="btn btn-primary">
              Prøv igjen
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-200 animate-pulse rounded-xl"
                ></div>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && !error && stats && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KPICard
                title="Totalt restlinjer"
                value={stats.totalOutstandingLines}
                icon={<ChartBarIcon className="w-6 h-6 text-blue-600" />}
                formatType="number"
                loading={isLoading}
              />
              <KPICard
                title="Unike leverandører"
                value={stats.uniqueSuppliers}
                icon={<UsersIcon className="w-6 h-6 text-green-600" />}
                formatType="number"
                loading={isLoading}
              />
              <KPICard
                title="Forfalte ordre"
                value={stats.overdueOrders}
                icon={<ClockIcon className="w-6 h-6 text-red-600" />}
                formatType="number"
                loading={isLoading}
              />
              <KPICard
                title="Neste oppfølging"
                value={stats.nextFollowUpDate}
                icon={<CalendarIcon className="w-6 h-6 text-yellow-600" />}
                formatType="date"
                loading={isLoading}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TopSuppliersChart
                data={topSuppliers}
                loading={isLoading}
                onSupplierClick={(supplier) => {
                  console.log("Clicked supplier:", supplier);
                  // TODO: Implement navigation or filtering
                }}
              />
              <PlannerDistributionChart
                data={planners}
                loading={isLoading}
                onPlannerClick={(planner) => {
                  console.log("Clicked planner:", planner);
                  handleFilterChange({
                    type: "planner",
                    value: planner,
                    label: `Innkjøper: ${planner}`,
                  });
                }}
              />
            </div>

            {/* Timeline Chart - Full Width */}
            <div className="mb-6">
              <OrderTimelineChart data={weeklyData} loading={isLoading} />
            </div>

            {/* Data Source Indicator */}
            {stats.dataSource === "cache" && (
              <div className="text-center text-sm text-neutral-secondary mt-4">
                Data fra cache (sist oppdatert:{" "}
                {new Date(stats.lastUpdated).toLocaleString("nb-NO")})
              </div>
            )}
          </>
        )}
      </div>
    </div>

    {/* Settings Modal */}
    <SettingsModal
      isOpen={showSettings}
      onClose={() => setShowSettings(false)}
    />
  </div>
);
```

**Requirements Met**: Requirement 1.1, 1.2, 1.3, 1.4, 1.5, 2.1-2.4, 3.1-3.5, 4.1-4.5, 5.3, 5.4, 6.2-6.5

---

### Step 6: Add Performance Optimizations

Wrap chart components with React.memo (in their respective files):

```typescript
// In TopSuppliersChart.tsx, PlannerDistributionChart.tsx, OrderTimelineChart.tsx
export const TopSuppliersChart = React.memo<TopSuppliersChartProps>(
  ({ data, onSupplierClick, loading = false }) => {
    // ... existing code
  }
);
```

Add debouncing to filter changes (if needed in the future):

```typescript
// Optional: Add debouncing utility
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

**Requirements Met**: Requirement 7.1, 7.2

---

### Step 7: Add Accessibility Features

Add ARIA labels and keyboard navigation:

```typescript
// In DashboardFilters.tsx
<select
  aria-label="Filtrer på innkjøper"
  value={activeFilter?.type === "planner" ? activeFilter.value : ""}
  onChange={handlePlannerChange}
  // ... other props
>

// In chart click handlers
<Bar
  dataKey="outstandingQty"
  onClick={(data: SupplierStat) => {
    if (onSupplierClick) {
      onSupplierClick(data.name);
    }
  }}
  onKeyPress={(e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      // Handle keyboard activation
    }
  }}
  tabIndex={0}
  aria-label="Leverandør stolpediagram"
/>
```

Add focus indicators (already in Tailwind classes with `focus:ring-2`).

**Requirements Met**: Requirement 6.1

---

### Step 8: Test Responsive Design

Verify layouts work on different screen sizes:

```css
/* Already implemented in Tailwind classes */
/* Mobile: 1 column */
grid-cols-1

/* Tablet: 2 columns */
md:grid-cols-2

/* Desktop: 4 columns */
lg:grid-cols-4
```

Test:

- Mobile (< 640px): Single column layout
- Tablet (640-1024px): 2-column KPI grid, stacked charts
- Desktop (> 1024px): 4-column KPI grid, side-by-side charts

**Requirements Met**: Requirement 5.3, 5.4, 5.5

---

## ✅ Verification Steps

### 1. Build and Run

```bash
npm run build
npm run dev
```

Verify no compilation errors.

### 2. Test Data Loading

1. Open Dashboard
2. Verify loading skeleton shows
3. Wait for data to load
4. Verify all 4 KPI cards show numbers
5. Verify all 3 charts show data

### 3. Test Error Handling

1. Disconnect from database (or break backend temporarily)
2. Refresh dashboard
3. Verify error message shows
4. Click "Prøv igjen"
5. Verify it attempts to reload

### 4. Test Filters

1. Select a planner from dropdown
2. Verify "Aktivt filter" indicator shows
3. Click "Fjern filter"
4. Verify filter clears

### 5. Test Interactions

1. Click on bar in TopSuppliersChart
2. Check console for log message
3. Click on pie slice in PlannerDistributionChart
4. Verify filter applies

### 6. Test Responsive Design

1. Open DevTools
2. Use responsive design mode
3. Test at 375px (mobile), 768px (tablet), 1024px+ (desktop)
4. Verify layouts adapt correctly

### 7. Test Cache

1. Load dashboard (should say "database")
2. Wait 1 minute
3. Refresh page
4. Should say "cache" with timestamp
5. Wait 6+ minutes
6. Refresh again
7. Should fetch fresh data from "database"

---

## 🎉 Success Criteria

Phase 3 is complete when:

✅ All components integrated into Dashboard.tsx
✅ Data loads from backend correctly
✅ All 4 KPI cards show real data
✅ All 3 charts render with real data
✅ Loading states work correctly
✅ Error states show with retry option
✅ Filters work (even if just visual)
✅ Refresh button updates data
✅ Cache indicator shows correctly
✅ No console errors
✅ Responsive layouts work on all screen sizes
✅ Click interactions work (console logs)
✅ Application builds without errors

---

## 🎊 Project Complete!

Congratulations! The Dashboard Enhancement project is now complete. You have:

✅ **Phase 1**: Built complete backend with DatabaseService methods, IPC handlers, and caching
✅ **Phase 2**: Created 5 reusable React components with Recharts visualizations
✅ **Phase 3**: Integrated everything into a polished, functional dashboard

### What You've Built

1. **Backend**: 4 new aggregation methods with 5-minute caching
2. **Frontend**: 5 new components (KPICard + 4 charts)
3. **Features**: Real-time data, filters, responsive design, error handling
4. **Performance**: Caching, React.memo, efficient queries
5. **UX**: Loading states, error recovery, glassmorphism design

### Next Steps (Optional Enhancements)

1. **Real Filtering**: Implement backend filtering instead of client-side
2. **Export**: Add PDF/image export functionality
3. **Date Range**: Add custom date range selector
4. **Alerts**: Configure alerts for critical KPIs
5. **Drill-Down**: Implement navigation to detailed views
6. **Real-Time**: Add WebSocket updates for live data

---

## 🐛 Troubleshooting

**Issue**: Dashboard is blank/white screen

- **Solution**: Check browser console for errors. Verify backend is running. Check that database has data.

**Issue**: "Cannot read property 'map' of undefined"

- **Solution**: Add null checks before mapping data arrays. Verify API responses have `data` property.

**Issue**: Charts not rendering

- **Solution**: Verify ResponsiveContainer has width="100%" and height value. Check data structure matches interface.

**Issue**: Cache not working

- **Solution**: Verify `invalidateDashboardCache()` is called after import. Check CACHE_TTL value (5 minutes).

**Issue**: Filters don't work

- **Solution**: Filters are currently visual only. For real filtering, implement backend queries with WHERE clauses.

**Issue**: Slow performance

- **Solution**:
  - Verify React.memo is used on charts
  - Check database indexes on `supplier_name`, `purchaser`, `eta_supplier`
  - Use Chrome DevTools Performance tab to profile

---

## 📚 Reference Documents

- `Requirements.md` - All 7 requirements fully implemented
- `design.md` - Complete architecture and component designs
- `tasks.md` - All 14 tasks completed
- `plan-1-backend-foundation.md` - Backend implementation
- `plan-2-chart-components.md` - Component implementation
