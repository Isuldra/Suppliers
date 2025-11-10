# Plan 1: Backend Foundation - Dashboard Enhancement

## 🎯 Overview

This is Phase 1 of 3 for the Dashboard Enhancement project. In this phase, we build the complete backend foundation that will power the advanced dashboard visualizations.

**Goal**: Create all DatabaseService methods, IPC handlers, and type definitions needed to aggregate and serve dashboard data.

**Estimated Time**: 30-40 minutes

## 📋 Prerequisites

Before starting this plan, ensure:

- ✅ The application builds and runs without errors
- ✅ You have access to `src/services/databaseService.ts`
- ✅ The `purchase_order` table exists in SQLite database
- ✅ Sample data is available in the database (imported from BP Excel)

## 📦 Dependencies to Install

```bash
npm install recharts@^2.10.0 date-fns@^2.30.0
npm install --save-dev @types/recharts
```

## 📂 File Structure

This phase will create/modify:

```
docs/planning/dashboard-enhancement/
├── Requirements.md ✓ (moved)
├── design.md ✓ (moved)
└── tasks.md ✓ (moved)

src/
├── services/
│   └── databaseService.ts (MODIFY - add 5 new methods + caching)
├── main/
│   └── index.ts (MODIFY - add 4 new IPC handlers)
├── preload/
│   └── index.ts (MODIFY - extend electronAPI)
└── renderer/
    └── types/
        └── Dashboard.ts (CREATE - new type definitions)
```

## 🔨 Implementation Steps

### Step 1: Create TypeScript Type Definitions

**File**: `src/renderer/types/Dashboard.ts`

Create comprehensive TypeScript interfaces for all dashboard data structures:

```typescript
// Dashboard Stats - Main data structure returned from backend
export interface DashboardStats {
  // KPI metrics
  totalOutstandingLines: number;
  uniqueSuppliers: number;
  overdueOrders: number;
  nextFollowUpDate: Date | null;

  // Metadata
  lastUpdated: Date;
  dataSource: 'cache' | 'database';
}

// Supplier statistics for bar chart
export interface SupplierStat {
  name: string;
  outstandingQty: number;
  orderCount: number;
  value?: number;
  oldestOrderDate?: Date;
}

// Planner statistics for pie chart
export interface PlannerStat {
  planner: string;
  orderCount: number;
  outstandingQty: number;
  percentage: number;
}

// Week statistics for timeline chart
export interface WeekStat {
  week: number;
  year: number;
  weekLabel: string;
  orderCount: number;
  overdueCount: number;
  dateRange: string;
  isCurrentWeek: boolean;
}

// Filter interface for dashboard filtering
export interface DashboardFilter {
  type: 'planner' | 'supplier' | 'week';
  value: string;
  label?: string;
}
```

**Requirements Met**: Requirement 1.1, 2.1, 3.1, 4.1

---

### Step 2: Implement DatabaseService Methods

**File**: `src/services/databaseService.ts`

Add these new methods to the DatabaseService class:

#### 2.1: Add Cache Property

At the top of the class, add caching mechanism:

```typescript
private dashboardCache: {
  data: DashboardStats | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

#### 2.2: getDashboardStats()

```typescript
public getDashboardStats(): DashboardStats {
  if (!this.db) {
    throw new Error('Database not connected');
  }

  // Check cache first
  const now = Date.now();
  if (this.dashboardCache.data &&
      (now - this.dashboardCache.timestamp) < this.CACHE_TTL) {
    log.info('Returning cached dashboard stats');
    return { ...this.dashboardCache.data, dataSource: 'cache' as const };
  }

  try {
    log.info('Fetching fresh dashboard stats from database');

    // Total outstanding lines (WHERE outstanding_qty > 0)
    const totalOutstandingLines = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM purchase_order
      WHERE outstanding_qty > 0
    `).get() as { count: number };

    // Unique suppliers (DISTINCT supplier_name)
    const uniqueSuppliers = this.db.prepare(`
      SELECT COUNT(DISTINCT COALESCE(supplier_name, ftgnavn)) as count
      FROM purchase_order
      WHERE outstanding_qty > 0
        AND COALESCE(supplier_name, ftgnavn) IS NOT NULL
        AND COALESCE(supplier_name, ftgnavn) != ''
    `).get() as { count: number };

    // Overdue orders (WHERE eta_supplier < CURRENT_DATE AND outstanding_qty > 0)
    const overdueOrders = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM purchase_order
      WHERE outstanding_qty > 0
        AND eta_supplier IS NOT NULL
        AND eta_supplier != ''
        AND date(eta_supplier) < date('now')
    `).get() as { count: number };

    // Next follow-up date (MIN(eta_supplier) WHERE eta_supplier >= CURRENT_DATE)
    const nextFollowUp = this.db.prepare(`
      SELECT MIN(eta_supplier) as next_date
      FROM purchase_order
      WHERE outstanding_qty > 0
        AND eta_supplier IS NOT NULL
        AND eta_supplier != ''
        AND date(eta_supplier) >= date('now')
    `).get() as { next_date: string | null };

    const stats: DashboardStats = {
      totalOutstandingLines: totalOutstandingLines.count,
      uniqueSuppliers: uniqueSuppliers.count,
      overdueOrders: overdueOrders.count,
      nextFollowUpDate: nextFollowUp.next_date ? new Date(nextFollowUp.next_date) : null,
      lastUpdated: new Date(),
      dataSource: 'database' as const
    };

    // Cache the results
    this.dashboardCache = {
      data: stats,
      timestamp: now
    };

    log.info('Dashboard stats fetched successfully', stats);
    return stats;
  } catch (error) {
    log.error('Error getting dashboard stats:', error);
    throw new Error(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

**Requirements Met**: Requirement 1.1, 1.2, 1.3, 1.4, 7.1, 7.2

#### 2.3: getTopSuppliersByOutstanding()

```typescript
public getTopSuppliersByOutstanding(limit: number = 5): SupplierStat[] {
  if (!this.db) {
    throw new Error('Database not connected');
  }

  try {
    const sql = `
      SELECT
        COALESCE(supplier_name, ftgnavn) as name,
        SUM(outstanding_qty) as outstandingQty,
        COUNT(*) as orderCount,
        MIN(date(eta_supplier)) as oldestOrderDate
      FROM purchase_order
      WHERE outstanding_qty > 0
        AND COALESCE(supplier_name, ftgnavn) IS NOT NULL
        AND COALESCE(supplier_name, ftgnavn) != ''
      GROUP BY COALESCE(supplier_name, ftgnavn)
      ORDER BY SUM(outstanding_qty) DESC
      LIMIT ?
    `;

    const rows = this.db.prepare(sql).all(limit) as Array<{
      name: string;
      outstandingQty: number;
      orderCount: number;
      oldestOrderDate: string | null;
    }>;

    return rows.map(row => ({
      name: row.name,
      outstandingQty: row.outstandingQty,
      orderCount: row.orderCount,
      oldestOrderDate: row.oldestOrderDate ? new Date(row.oldestOrderDate) : undefined
    }));
  } catch (error) {
    log.error('Error getting top suppliers:', error);
    throw error;
  }
}
```

**Requirements Met**: Requirement 2.1, 2.2

#### 2.4: getOrdersByPlanner()

```typescript
public getOrdersByPlanner(): PlannerStat[] {
  if (!this.db) {
    throw new Error('Database not connected');
  }

  try {
    // First get total count for percentage calculation
    const totalResult = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM purchase_order
      WHERE outstanding_qty > 0
        AND purchaser IS NOT NULL
        AND purchaser != ''
    `).get() as { total: number };

    const total = totalResult.total;

    const sql = `
      SELECT
        purchaser as planner,
        COUNT(*) as orderCount,
        SUM(outstanding_qty) as outstandingQty
      FROM purchase_order
      WHERE outstanding_qty > 0
        AND purchaser IS NOT NULL
        AND purchaser != ''
      GROUP BY purchaser
      ORDER BY COUNT(*) DESC
    `;

    const rows = this.db.prepare(sql).all() as Array<{
      planner: string;
      orderCount: number;
      outstandingQty: number;
    }>;

    return rows.map(row => ({
      planner: row.planner,
      orderCount: row.orderCount,
      outstandingQty: row.outstandingQty,
      percentage: total > 0 ? (row.orderCount / total) * 100 : 0
    }));
  } catch (error) {
    log.error('Error getting orders by planner:', error);
    throw error;
  }
}
```

**Requirements Met**: Requirement 3.1, 3.2

#### 2.5: getOrdersByWeek()

```typescript
public getOrdersByWeek(weeksAhead: number = 8, weeksBehind: number = 2): WeekStat[] {
  if (!this.db) {
    throw new Error('Database not connected');
  }

  try {
    const sql = `
      SELECT
        CAST(strftime('%W', eta_supplier) AS INTEGER) as week,
        CAST(strftime('%Y', eta_supplier) AS INTEGER) as year,
        COUNT(*) as orderCount,
        SUM(CASE WHEN date(eta_supplier) < date('now') THEN 1 ELSE 0 END) as overdueCount
      FROM purchase_order
      WHERE outstanding_qty > 0
        AND eta_supplier IS NOT NULL
        AND eta_supplier != ''
        AND date(eta_supplier) BETWEEN
          date('now', '-' || ? || ' days') AND
          date('now', '+' || ? || ' days')
      GROUP BY strftime('%W', eta_supplier), strftime('%Y', eta_supplier)
      ORDER BY year ASC, week ASC
    `;

    const rows = this.db.prepare(sql).all(weeksBehind * 7, weeksAhead * 7) as Array<{
      week: number;
      year: number;
      orderCount: number;
      overdueCount: number;
    }>;

    const now = new Date();
    const currentWeek = parseInt(now.toISOString().split('T')[0].split('-').slice(0, 2).join(''));

    return rows.map(row => {
      // Calculate date range for the week
      const firstDayOfYear = new Date(row.year, 0, 1);
      const daysOffset = (row.week - 1) * 7;
      const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      const formatDate = (date: Date) => {
        const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
        return `${date.getDate()}. ${months[date.getMonth()]}`;
      };

      return {
        week: row.week,
        year: row.year,
        weekLabel: `Uke ${row.week}`,
        orderCount: row.orderCount,
        overdueCount: row.overdueCount,
        dateRange: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
        isCurrentWeek: row.week === parseInt(now.toISOString().slice(5, 7).replace('-', ''))
      };
    });
  } catch (error) {
    log.error('Error getting orders by week:', error);
    throw error;
  }
}
```

**Requirements Met**: Requirement 4.1, 4.2, 4.5

#### 2.6: Invalidate Cache Method

Add a public method to clear cache when data is imported:

```typescript
public invalidateDashboardCache(): void {
  this.dashboardCache = { data: null, timestamp: 0 };
  log.info('Dashboard cache invalidated');
}
```

Call this method in your `importAlleArk` function or wherever data import happens.

---

### Step 3: Add IPC Handlers

**File**: `src/main/index.ts` (or wherever your IPC handlers are)

Add these IPC handlers in your main process initialization:

```typescript
// Dashboard data handlers
ipcMain.handle('get-dashboard-stats', async () => {
  try {
    const stats = databaseService.getDashboardStats();
    return { success: true, data: stats };
  } catch (error) {
    log.error('Error in get-dashboard-stats handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

ipcMain.handle('get-top-suppliers', async (_, limit: number = 5) => {
  try {
    const suppliers = databaseService.getTopSuppliersByOutstanding(limit);
    return { success: true, data: suppliers };
  } catch (error) {
    log.error('Error in get-top-suppliers handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

ipcMain.handle('get-orders-by-planner', async () => {
  try {
    const planners = databaseService.getOrdersByPlanner();
    return { success: true, data: planners };
  } catch (error) {
    log.error('Error in get-orders-by-planner handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

ipcMain.handle('get-orders-by-week', async (_, weeksAhead: number = 8, weeksBehind: number = 2) => {
  try {
    const weeks = databaseService.getOrdersByWeek(weeksAhead, weeksBehind);
    return { success: true, data: weeks };
  } catch (error) {
    log.error('Error in get-orders-by-week handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
```

**Requirements Met**: Requirement 7.1

---

### Step 4: Extend Preload Bridge

**File**: `src/preload/index.ts`

Find your `electronAPI` object and add these new methods:

```typescript
const electronAPI = {
  // ... existing methods ...

  // Dashboard methods
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  getTopSuppliers: (limit?: number) => ipcRenderer.invoke('get-top-suppliers', limit),
  getOrdersByPlanner: () => ipcRenderer.invoke('get-orders-by-planner'),
  getOrdersByWeek: (weeksAhead?: number, weeksBehind?: number) =>
    ipcRenderer.invoke('get-orders-by-week', weeksAhead, weeksBehind),
};
```

Also update your TypeScript declarations if you have a separate `.d.ts` file:

```typescript
interface ElectronAPI {
  // ... existing declarations ...
  getDashboardStats: () => Promise<{
    success: boolean;
    data?: DashboardStats;
    error?: string;
  }>;
  getTopSuppliers: (
    limit?: number
  ) => Promise<{ success: boolean; data?: SupplierStat[]; error?: string }>;
  getOrdersByPlanner: () => Promise<{
    success: boolean;
    data?: PlannerStat[];
    error?: string;
  }>;
  getOrdersByWeek: (
    weeksAhead?: number,
    weeksBehind?: number
  ) => Promise<{ success: boolean; data?: WeekStat[]; error?: string }>;
}
```

**Requirements Met**: Requirement 7.1

---

## ✅ Verification Steps

After completing this phase, verify everything works:

### 1. Build the Application

```bash
npm run build
```

Should complete without TypeScript errors.

### 2. Test DatabaseService Methods

Create a test file or use your existing test setup:

```typescript
// Test in Electron DevTools Console or create a test handler
window.electron.getDashboardStats().then(console.log);
window.electron.getTopSuppliers(5).then(console.log);
window.electron.getOrdersByPlanner().then(console.log);
window.electron.getOrdersByWeek().then(console.log);
```

### 3. Verify Data Structure

Check that returned data matches TypeScript interfaces:

- `getDashboardStats()` returns `DashboardStats` with all KPIs
- `getTopSuppliers()` returns array of `SupplierStat`
- `getOrdersByPlanner()` returns array of `PlannerStat` with percentages
- `getOrdersByWeek()` returns array of `WeekStat` with week labels

### 4. Test Caching

Call `getDashboardStats()` twice within 5 minutes:

- First call should have `dataSource: 'database'`
- Second call should have `dataSource: 'cache'`

---

## 🎉 Success Criteria

Phase 1 is complete when:

✅ All 5 DatabaseService methods are implemented and working
✅ All 4 IPC handlers respond correctly
✅ Preload bridge exposes all new methods
✅ TypeScript types are defined in Dashboard.ts
✅ No TypeScript compilation errors
✅ Test calls return expected data structures
✅ Caching mechanism works (5-minute TTL)
✅ Dependencies (recharts, date-fns) are installed

---

## 📝 Next Steps

Once this phase is complete, proceed to **Plan 2: Chart Components** where you will:

- Create KPICard component
- Implement TopSuppliersChart with Recharts BarChart
- Implement PlannerDistributionChart with PieChart
- Implement OrderTimelineChart with LineChart
- Create DashboardFilters component

All backend data will be ready to consume!

---

## 🐛 Troubleshooting

**Issue**: TypeScript errors about missing types

- **Solution**: Ensure `@types/recharts` is installed and `Dashboard.ts` is properly imported

**Issue**: Database queries return no data

- **Solution**: Verify `purchase_order` table has data with `outstanding_qty > 0`

**Issue**: IPC handlers not responding

- **Solution**: Check that handlers are registered before app is ready, verify handler names match

**Issue**: Cache not working

- **Solution**: Check that `CACHE_TTL` is set correctly and `dashboardCache` is initialized

---

## 📚 Reference Documents

- `Requirements.md` - Requirements 1-7
- `design.md` - Backend architecture and data models (pages 1-10)
- `tasks.md` - Tasks 1, 2, 3 (dependencies, backend, IPC)
