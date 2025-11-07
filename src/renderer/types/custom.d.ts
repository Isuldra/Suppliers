// Declaration for image files so TypeScript recognizes them as valid imports
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.png";
declare module "*.gif";
declare module "*.svg";
declare module "*.webp";

import type { DashboardStats, SupplierStat, WeekStat } from "./Dashboard";

declare global {
  interface ElectronAPI {
    sendEmailViaEmlAndCOM: (payload: {
      to: string;
      subject: string;
      html: string;
    }) => Promise<{ success: boolean; error?: string }>;
    getDashboardStats: () => Promise<{
      success: boolean;
      data?: DashboardStats;
      error?: string;
    }>;
    getTopSuppliers: (limit?: number) => Promise<{
      success: boolean;
      data?: SupplierStat[];
      error?: string;
    }>;
    getOrdersByWeek: (
      weeksAhead?: number,
      weeksBehind?: number
    ) => Promise<{
      success: boolean;
      data?: WeekStat[];
      error?: string;
    }>;
  }

  interface Window {
    electron: ElectronAPI;
  }
}
