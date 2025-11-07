# Plan 2: Chart Components - Dashboard Enhancement

## 🎯 Overview

This is Phase 2 of 3 for the Dashboard Enhancement project. In this phase, we build all the React chart components using Recharts that will visualize the dashboard data.

**Goal**: Create all chart components (KPICard, TopSuppliersChart, PlannerDistributionChart, OrderTimelineChart, DashboardFilters) with proper styling, loading states, and interactivity.

**Estimated Time**: 30-40 minutes

## 📋 Prerequisites

Before starting this plan, ensure:

- ✅ Plan 1 (Backend Foundation) is complete
- ✅ Dependencies are installed (recharts, date-fns, @types/recharts)
- ✅ Type definitions exist in `src/renderer/types/Dashboard.ts`
- ✅ Backend methods are working (can test via IPC calls)
- ✅ Dashboard folder exists: `src/renderer/components/dashboard/`

## 📂 File Structure

This phase will create:

```
src/renderer/components/dashboard/
├── KPICard.tsx (CREATE)
├── TopSuppliersChart.tsx (CREATE)
├── PlannerDistributionChart.tsx (CREATE)
├── OrderTimelineChart.tsx (CREATE)
└── DashboardFilters.tsx (CREATE)
```

## 🔨 Implementation Steps

### Step 1: Implement KPICard Component

**File**: `src/renderer/components/dashboard/KPICard.tsx`

Create a reusable KPI card component with loading states and formatting:

```typescript
import React from "react";
import { format } from "date-fns";

interface KPICardProps {
  title: string;
  value: number | string | Date | null;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  onClick?: () => void;
  loading?: boolean;
  formatType?: "number" | "currency" | "date" | "percentage";
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  trend,
  onClick,
  loading = false,
  formatType = "number",
}) => {
  const formatValue = (val: number | string | Date | null): string => {
    if (loading) return "---";
    if (val === null) return "N/A";

    if (formatType === "date" && val instanceof Date) {
      return format(val, "dd.MM.yyyy");
    }

    if (typeof val === "string") return val;

    if (formatType === "number") {
      return val.toLocaleString("nb-NO");
    }

    if (formatType === "currency") {
      return `${val.toLocaleString("nb-NO")} kr`;
    }

    if (formatType === "percentage") {
      return `${val.toFixed(1)}%`;
    }

    return String(val);
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6 transition-all duration-300 hover:bg-white/70 hover:shadow-2xl ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center">
        <div className="p-3 bg-blue-100 rounded-full">{icon}</div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-neutral-secondary">{title}</p>
          {loading ? (
            <div className="animate-pulse h-8 w-24 bg-gray-200 rounded mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-neutral">
              {formatValue(value)}
            </p>
          )}
          {trend && !loading && (
            <div
              className={`flex items-center mt-1 text-sm ${
                trend.direction === "up" ? "text-green-600" : "text-red-600"
              }`}
            >
              <span>{trend.direction === "up" ? "↑" : "↓"}</span>
              <span className="ml-1">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

**Requirements Met**: Requirement 1.5

---

### Step 2: Implement TopSuppliersChart Component

**File**: `src/renderer/components/dashboard/TopSuppliersChart.tsx`

Create a bar chart showing top suppliers by outstanding quantity:

```typescript
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { SupplierStat } from "../../types/Dashboard";

interface TopSuppliersChartProps {
  data: SupplierStat[];
  onSupplierClick?: (supplier: string) => void;
  loading?: boolean;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export const TopSuppliersChart: React.FC<TopSuppliersChartProps> = ({
  data,
  onSupplierClick,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
        <h3 className="text-lg font-bold text-neutral mb-4">
          Topp 5 leverandører - Restantall
        </h3>
        <p className="text-neutral-secondary">Ingen data tilgjengelig</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-neutral">{data.name}</p>
          <p className="text-sm text-neutral-secondary">
            Restantall: {data.outstandingQty.toLocaleString("nb-NO")}
          </p>
          <p className="text-sm text-neutral-secondary">
            Antall ordre: {data.orderCount}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6 transition-all duration-300 hover:bg-white/70 hover:shadow-2xl">
      <h3 className="text-lg font-bold text-neutral mb-4">
        Topp 5 leverandører - Restantall
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
        >
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => value.toLocaleString("nb-NO")}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="outstandingQty"
            onClick={(data: SupplierStat) => {
              if (onSupplierClick) {
                onSupplierClick(data.name);
              }
            }}
            style={{ cursor: onSupplierClick ? "pointer" : "default" }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

**Requirements Met**: Requirement 2.1, 2.2, 2.3, 2.4

---

### Step 3: Implement PlannerDistributionChart Component

**File**: `src/renderer/components/dashboard/PlannerDistributionChart.tsx`

Create a pie chart showing order distribution by planner:

```typescript
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PlannerStat } from "../../types/Dashboard";

interface PlannerDistributionChartProps {
  data: PlannerStat[];
  onPlannerClick?: (planner: string) => void;
  loading?: boolean;
}

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#f97316",
  "#ef4444",
];

export const PlannerDistributionChart: React.FC<
  PlannerDistributionChartProps
> = ({ data, onPlannerClick, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
        <h3 className="text-lg font-bold text-neutral mb-4">
          Restordrer per innkjøper
        </h3>
        <p className="text-neutral-secondary">Ingen data tilgjengelig</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-neutral">{data.planner}</p>
          <p className="text-sm text-neutral-secondary">
            Antall ordre: {data.orderCount}
          </p>
          <p className="text-sm text-neutral-secondary">
            Restantall: {data.outstandingQty.toLocaleString("nb-NO")}
          </p>
          <p className="text-sm text-neutral-secondary">
            Prosentandel: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6 transition-all duration-300 hover:bg-white/70 hover:shadow-2xl">
      <h3 className="text-lg font-bold text-neutral mb-4">
        Restordrer per innkjøper
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percentage }) => `${percentage.toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="orderCount"
            onClick={(data: PlannerStat) => {
              if (onPlannerClick) {
                onPlannerClick(data.planner);
              }
            }}
            style={{ cursor: onPlannerClick ? "pointer" : "default" }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value, entry: any) =>
              `${entry.payload.planner}: ${entry.payload.orderCount} ordre`
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
```

**Requirements Met**: Requirement 3.1, 3.2, 3.3, 3.4, 3.5

---

### Step 4: Implement OrderTimelineChart Component

**File**: `src/renderer/components/dashboard/OrderTimelineChart.tsx`

Create a line chart showing orders over time by week:

```typescript
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { WeekStat } from "../../types/Dashboard";

interface OrderTimelineChartProps {
  data: WeekStat[];
  loading?: boolean;
}

export const OrderTimelineChart: React.FC<OrderTimelineChartProps> = ({
  data,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
        <h3 className="text-lg font-bold text-neutral mb-4">Ordre tidslinje</h3>
        <p className="text-neutral-secondary">Ingen data tilgjengelig</p>
      </div>
    );
  }

  const currentWeekIndex = data.findIndex((week) => week.isCurrentWeek);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-neutral">{data.weekLabel}</p>
          <p className="text-sm text-neutral-secondary">{data.dateRange}</p>
          <p className="text-sm text-blue-600">
            Totale ordre: {data.orderCount}
          </p>
          <p className="text-sm text-red-600">
            Forfalte ordre: {data.overdueCount}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6 transition-all duration-300 hover:bg-white/70 hover:shadow-2xl">
      <h3 className="text-lg font-bold text-neutral mb-4">
        Ordre tidslinje (per uke)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
        >
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {currentWeekIndex >= 0 && (
            <ReferenceLine
              x={data[currentWeekIndex].weekLabel}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label="Nåværende uke"
            />
          )}
          <Line
            type="monotone"
            dataKey="orderCount"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Totale ordre"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="overdueCount"
            stroke="#ef4444"
            strokeWidth={2}
            name="Forfalte ordre"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

**Requirements Met**: Requirement 4.1, 4.2, 4.3, 4.4, 4.5

---

### Step 5: Implement DashboardFilters Component

**File**: `src/renderer/components/dashboard/DashboardFilters.tsx`

Create filter controls for the dashboard:

```typescript
import React from "react";
import { DashboardFilter } from "../../types/Dashboard";

interface DashboardFiltersProps {
  activeFilter: DashboardFilter | null;
  onFilterChange: (filter: DashboardFilter | null) => void;
  availablePlanners: string[];
  availableSuppliers: string[];
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  activeFilter,
  onFilterChange,
  availablePlanners,
  availableSuppliers,
}) => {
  const handlePlannerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "") {
      onFilterChange(null);
    } else {
      onFilterChange({
        type: "planner",
        value,
        label: `Innkjøper: ${value}`,
      });
    }
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "") {
      onFilterChange(null);
    } else {
      onFilterChange({
        type: "supplier",
        value,
        label: `Leverandør: ${value}`,
      });
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-4 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-secondary">
            Filtrer på innkjøper:
          </label>
          <select
            value={activeFilter?.type === "planner" ? activeFilter.value : ""}
            onChange={handlePlannerChange}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Alle innkjøpere</option>
            {availablePlanners.map((planner) => (
              <option key={planner} value={planner}>
                {planner}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-secondary">
            Filtrer på leverandør:
          </label>
          <select
            value={activeFilter?.type === "supplier" ? activeFilter.value : ""}
            onChange={handleSupplierChange}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Alle leverandører</option>
            {availableSuppliers.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
        </div>

        {activeFilter && (
          <button
            onClick={() => onFilterChange(null)}
            className="px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors"
          >
            Fjern filter
          </button>
        )}

        {activeFilter && (
          <div className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
            {activeFilter.label}
          </div>
        )}
      </div>
    </div>
  );
};
```

**Requirements Met**: Requirement 6.2, 6.3, 6.4

---

## ✅ Verification Steps

After completing this phase, verify:

### 1. All Components Build

```bash
npm run build
# Should complete without TypeScript errors
```

### 2. Test with Mock Data (in a test file or DevTools)

```typescript
// Test KPICard
import { KPICard } from "./components/dashboard/KPICard";

<KPICard
  title="Test KPI"
  value={1234}
  icon={<div>Icon</div>}
  formatType="number"
/>;

// Test TopSuppliersChart
const mockSuppliers = [
  { name: "Supplier 1", outstandingQty: 1000, orderCount: 5 },
  { name: "Supplier 2", outstandingQty: 800, orderCount: 3 },
];

<TopSuppliersChart data={mockSuppliers} />;
```

### 3. Verify Component Exports

Check that all components can be imported:

```typescript
import { KPICard } from "./components/dashboard/KPICard";
import { TopSuppliersChart } from "./components/dashboard/TopSuppliersChart";
import { PlannerDistributionChart } from "./components/dashboard/PlannerDistributionChart";
import { OrderTimelineChart } from "./components/dashboard/OrderTimelineChart";
import { DashboardFilters } from "./components/dashboard/DashboardFilters";
```

### 4. Check Recharts Functionality

- Charts should render empty state when data is empty
- Loading state should show skeleton
- Tooltips should appear on hover
- Click handlers should be called (test with console.log)

---

## 🎉 Success Criteria

Phase 2 is complete when:

✅ All 5 component files are created in `src/renderer/components/dashboard/`
✅ Each component exports a React.FC with proper TypeScript types
✅ Loading states render correctly (skeleton loaders)
✅ Empty states show appropriate messages
✅ Recharts charts render without console errors
✅ Custom tooltips display correct information
✅ Click handlers are implemented (even if just console.log)
✅ No TypeScript compilation errors
✅ Components follow existing style patterns (glassmorphism)

---

## 📝 Next Steps

Once this phase is complete, proceed to **Plan 3: Integration & Polish** where you will:

- Integrate all components into Dashboard.tsx
- Implement complete data loading from backend
- Add error handling and timeout logic
- Implement responsive grid layouts
- Add React.memo for performance
- Add accessibility features (ARIA labels, keyboard navigation)
- Test the complete dashboard functionality

All components will be ready to use!

---

## 🐛 Troubleshooting

**Issue**: `Cannot find module 'recharts'`

- **Solution**: Run `npm install recharts@^2.10.0` again
- Verify node_modules/recharts exists

**Issue**: TypeScript errors about Recharts types

- **Solution**: Install `npm install --save-dev @types/recharts`
- Check tsconfig.json includes node_modules

**Issue**: Charts not rendering

- **Solution**:
  - Verify ResponsiveContainer wraps each chart
  - Check that data prop is passed correctly
  - Look for console errors about missing data keys

**Issue**: Styles not applying (backdrop-blur not working)

- **Solution**:
  - Verify Tailwind CSS is configured correctly
  - Check that backdrop-blur is supported in your Electron version
  - Try standard bg-white with opacity instead

**Issue**: Date formatting errors in KPICard

- **Solution**:
  - Verify date-fns is installed (should be from Plan 1)
  - Check that value is actually a Date object
  - Add null checks before formatting

---

## 📚 Reference Documents

- `Requirements.md` - Requirements 1-7 for component specifications
- `design.md` - Detailed component designs (pages 95-180)
- `tasks.md` - Tasks 5-9 covering component implementation
- `plan-1-backend-foundation.md` - Backend setup that feeds these components
