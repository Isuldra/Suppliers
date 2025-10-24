import { ExcelData } from "../renderer/types/ExcelData";
import { ExcelRow } from "../types/ExcelRow";

// Define specific type for validateData return value
type ValidateDataResult = {
  success: boolean;
  data?: {
    bpCount: number;
  };
  error?: string;
};

// Define the interface for the API exposed via contextBridge
interface ElectronAPI {
  send: (channel: string, data: unknown) => void;
  receive: (
    channel: string,
    func: (...args: unknown[]) => void
  ) => (() => void) | undefined;
  handleError: (error: Error) => void;
  parseExcel: (data: unknown) => void;
  onExcelValidation: (callback: (data: unknown) => void) => () => void;
  validateData: (data: ExcelData) => Promise<ValidateDataResult>;
  sendEmail: (payload: {
    to: string;
    subject: string;
    html: string;
  }) => Promise<{ success: boolean; error?: string }>;
  sendEmailAutomatically: (payload: {
    to: string;
    subject: string;
    html: string;
  }) => Promise<{ success: boolean; error?: string }>;
  sendEmailViaEmlAndCOM: (payload: {
    to: string;
    subject: string;
    html: string;
  }) => Promise<{ success: boolean; error?: string }>;
  sendBatchEmails: (
    payload: Array<{
      to: string;
      subject: string;
      html: string;
    }>
  ) => Promise<{
    success: boolean;
    results?: Array<{
      supplier: string;
      email: string;
      success: boolean;
      error?: string;
    }>;
    summary?: {
      total: number;
      success: number;
      failed: number;
    };
    error?: string;
  }>;

  getSuppliers: () => Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }>;
  saveOrdersToDatabase: (
    // Use payload type consistent with main process handler
    payload: { fileBuffer: ArrayBuffer }
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  getOutstandingOrders: (
    supplier: string,
    beforeCurrentWeek?: boolean
  ) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  recordEmailSent: (
    supplier: string,
    recipient: string,
    subject: string,
    orderCount: number
  ) => Promise<{ success: boolean; message?: string; error?: string }>;

  // New database API methods
  insertOrUpdateOrder: (order: ExcelRow) => Promise<number>;
  insertOrUpdateOrders: (orders: ExcelRow[]) => Promise<number[]>;
  getOrdersBySupplier: (supplier: string) => Promise<ExcelRow[]>;
  getAllOrders: () => Promise<ExcelRow[]>;
  getOrdersDueWithinDays: (days: number) => Promise<ExcelRow[]>;
  markOrderAsConfirmed: (
    supplier: string,
    orderNumber: string | null
  ) => Promise<boolean>;
  deleteOrder: (
    supplier: string,
    orderNumber: string | null
  ) => Promise<boolean>;

  // Auto-updater methods
  checkForUpdates: () => Promise<void>;
  onUpdateAvailable: (callback: (info: unknown) => void) => () => void;
  onUpdateDownloaded: (callback: (info: unknown) => void) => () => void;
  onUpdateError: (callback: (error: Error) => void) => () => void;
  installUpdate: () => Promise<void>;

  // New API methods
  openExternalLink: (
    url: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Logging functions
  getLogs: () => Promise<{
    success: boolean;
    logs?: string;
    path?: string;
    error?: string;
  }>;

  sendLogsToSupport: () => Promise<{
    success: boolean;
    error?: string;
  }>;

  // Add showLogs and readLogTail to the API definition
  showLogs: () => Promise<{ success: boolean; error?: string }>;
  readLogTail: (lineCount?: number) => Promise<{
    success: boolean;
    logs?: string;
    error?: string;
  }>;

  getAllSupplierNames: () => Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }>;

  getSuppliersWithOutstandingOrders: () => Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }>;

  getSupplierEmail: (
    supplierName: string
  ) => Promise<{ success: boolean; data?: string | null; error?: string }>;

  // Supplier planning methods
  getSuppliersForWeekday: (
    weekday: string,
    plannerName: string
  ) => Promise<{ success: boolean; data?: string[]; error?: string }>;
  getAllSupplierPlanning: () => Promise<{
    success: boolean;
    data?: Array<{
      supplier_name: string;
      weekday: string;
      planner_name: string;
    }>;
    error?: string;
  }>;

  // Settings methods
  getSettings: () => Promise<{
    success: boolean;
    data?: import("../renderer/types/Settings").SettingsData;
    error?: string;
  }>;
  saveSettings: (
    settings: import("../renderer/types/Settings").SettingsData
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  // Debug methods
  saveDebugHtml: (payload: {
    filename: string;
    content: string;
    description: string;
  }) => Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }>;
  openDebugFolder: () => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;

  // System language detection
  getSystemLanguage: () => Promise<{
    locale: string;
    systemLocale: string;
    preferredLanguages: string[];
  }>;
}

// Extend the global Window interface
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
