/**
 * Type definitions for Dashboard data structures
 */

// Dashboard Stats - Main data structure returned from backend
export interface DashboardStats {
  // KPI metrics
  totalOutstandingLines: number;
  uniqueSuppliers: number;
  overdueOrders: number;
  nextFollowUpDate: Date | null;
  averageDelayDays: number; // Gjennomsnittlig forsinkelse (dager)
  criticallyDelayedOrders: number; // Antall ordre forsinket >30 dager
  onTimeDeliveryRate: number; // Prosent ordre levert i tide (0-100)
  oldestOutstandingOrderDate: Date | null; // Eldste utestående ordre dato

  // Metadata
  lastUpdated: Date;
  dataSource: "cache" | "database";
}

// Supplier statistics for bar chart
export interface SupplierStat {
  name: string;
  outstandingQty: number; // Keep for backward compatibility, but prefer outstandingLines
  outstandingLines: number; // Antall linjer (ikke stykker)
  orderCount: number;
  value?: number;
  oldestOrderDate?: Date;
  averageDelayDays?: number; // Gjennomsnittlig forsinkelse per leverandør
  onTimeDeliveryRate?: number; // Leverandørens on-time delivery % (0-100)
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
  type: "planner" | "supplier" | "week";
  value: string;
  label?: string;
}
