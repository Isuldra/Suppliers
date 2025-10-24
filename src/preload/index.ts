import { contextBridge, ipcRenderer } from "electron";
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

// Define types for the API
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
  saveOrdersToDatabase: (payload: {
    fileBuffer: ArrayBuffer;
  }) => Promise<{ success: boolean; message?: string; error?: string }>;
  getOutstandingOrders: (supplier: string) => Promise<ExcelRow[]>;
  getSuppliersWithOutstandingOrders: () => Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }>;
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

  getAllSupplierNames: () => Promise<string[]>;
  getSupplierEmail: (supplierName: string) => Promise<string>;

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

// Valid send channels for IPC communication
const validSendChannels = [
  "toMain",
  "fromMain",
  "error",
  "excel:parse",
  "excel:validate",
  "excel:error",
  "validateData",
  "sendEmail",
  "sendEmailAutomatically",
  "sendEmailViaEmlAndCOM",
  "sendBatchEmails",
  "getSuppliers",
  "saveOrdersToDatabase",
  "getOutstandingOrders",
  "recordEmailSent",
  // New database API channels
  "db:insertOrUpdateOrder",
  "db:insertOrUpdateOrders",
  "db:getOrdersBySupplier",
  "db:getAllOrders",
  "db:getOrdersDueWithinDays",
  "db:markOrderAsConfirmed",
  "db:deleteOrder",
  // Auto-updater channels
  "update:check",
  "update:available",
  "update:downloaded",
  "update:error",
  "update:install",
  // New API channels
  "openExternalLink",
  "check-for-updates",
  "show-about-dialog",
  "show-logs",
  "read-log-tail",
  "getSettings",
  "saveSettings",
  "saveDebugHtml",
  "openDebugFolder",
  "get-system-language",
] as const;

// Valid receive channels for IPC communication
const validReceiveChannels = [
  "toMain",
  "fromMain",
  "error",
  "excel:parse",
  "excel:validate",
  "excel:error",
  "validateData",
  "sendEmail",
  "sendEmailAutomatically",
  "sendEmailViaEmlAndCOM",
  "sendBatchEmails",
  "getSuppliers",
  "saveOrdersToDatabase",
  "getOutstandingOrders",
  "recordEmailSent",
  // New database API channels
  "db:insertOrUpdateOrder",
  "db:insertOrUpdateOrders",
  "db:getOrdersBySupplier",
  "db:getAllOrders",
  "db:getOrdersDueWithinDays",
  "db:markOrderAsConfirmed",
  "db:deleteOrder",
  // Auto-updater channels
  "update:check",
  "update:available",
  "update:downloaded",
  "update:error",
  "update:install",
  // New API channels
  "openExternalLink",
  "check-for-updates",
  "show-about-dialog",
  "show-logs",
  "read-log-tail",
  "getSettings",
  "saveSettings",
  "saveDebugHtml",
  "openDebugFolder",
  "get-system-language",
] as const;

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("electron", {
  send: (channel: (typeof validSendChannels)[number], data: unknown) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (
    channel: (typeof validReceiveChannels)[number],
    func: (...args: unknown[]) => void
  ) => {
    if (validReceiveChannels.includes(channel)) {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        ...args: unknown[]
      ) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
    return () => {
      /* Do nothing for invalid channels */
    };
  },
  // Add error handling
  handleError: (error: Error) => {
    console.error("Preload error:", error);
    ipcRenderer.send("error", error.message);
  },
  // Excel specific methods
  parseExcel: (data: unknown) => {
    ipcRenderer.send("excel:parse", data);
  },
  onExcelValidation: (callback: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) =>
      callback(data);
    ipcRenderer.on("excel:validate", subscription);

    return () => {
      ipcRenderer.removeListener("excel:validate", subscription);
    };
  },
  // Data validation
  validateData: async (data: ExcelData) => {
    return await ipcRenderer.invoke("validateData", data);
  },
  // Email sending
  sendEmail: async (payload: { to: string; subject: string; html: string }) => {
    return await ipcRenderer.invoke("sendEmail", payload);
  },
  // Automatic email sending via Outlook COM
  sendEmailAutomatically: async (payload: {
    to: string;
    subject: string;
    html: string;
  }) => {
    return await ipcRenderer.invoke("sendEmailAutomatically", payload);
  },
  // Automatic email sending via .eml + OpenSharedItem
  sendEmailViaEmlAndCOM: async (payload: {
    to: string;
    subject: string;
    html: string;
  }) => {
    return await ipcRenderer.invoke("sendEmailViaEmlAndCOM", payload);
  },
  // Batch email sending via PowerShell - OPTIMIZED
  sendBatchEmails: async (
    payload: Array<{
      to: string;
      subject: string;
      html: string;
    }>
  ) => {
    return await ipcRenderer.invoke("sendBatchEmails", payload);
  },
  // Get suppliers
  getSuppliers: async () => {
    return await ipcRenderer.invoke("getSuppliers");
  },
  // Database methods
  saveOrdersToDatabase: async (payload: { fileBuffer: ArrayBuffer }) => {
    return await ipcRenderer.invoke("saveOrdersToDatabase", payload);
  },
  getOutstandingOrders: async (supplier: string) => {
    return await ipcRenderer.invoke("getOutstandingOrders", supplier);
  },
  getSuppliersWithOutstandingOrders: async () => {
    return await ipcRenderer.invoke("getSuppliersWithOutstandingOrders");
  },
  recordEmailSent: async (
    supplier: string,
    recipient: string,
    subject: string,
    orderCount: number
  ) => {
    return await ipcRenderer.invoke(
      "recordEmailSent",
      supplier,
      recipient,
      subject,
      orderCount
    );
  },

  // New database API methods
  insertOrUpdateOrder: async (order: ExcelRow) => {
    return await ipcRenderer.invoke("db:insertOrUpdateOrder", order);
  },
  insertOrUpdateOrders: async (orders: ExcelRow[]) => {
    return await ipcRenderer.invoke("db:insertOrUpdateOrders", orders);
  },
  getOrdersBySupplier: async (supplier: string) => {
    return await ipcRenderer.invoke("db:getOrdersBySupplier", supplier);
  },
  getAllOrders: async () => {
    return await ipcRenderer.invoke("db:getAllOrders");
  },
  getOrdersDueWithinDays: async (days: number) => {
    return await ipcRenderer.invoke("db:getOrdersDueWithinDays", days);
  },
  markOrderAsConfirmed: async (
    supplier: string,
    orderNumber: string | null
  ) => {
    return await ipcRenderer.invoke(
      "db:markOrderAsConfirmed",
      supplier,
      orderNumber
    );
  },
  deleteOrder: async (supplier: string, orderNumber: string | null) => {
    return await ipcRenderer.invoke("db:deleteOrder", supplier, orderNumber);
  },

  // Auto-updater methods
  checkForUpdates: async () => {
    return await ipcRenderer.invoke("update:check");
  },
  onUpdateAvailable: (callback: (info: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, info: unknown) =>
      callback(info);
    ipcRenderer.on("update:available", subscription);
    return () => {
      ipcRenderer.removeListener("update:available", subscription);
    };
  },
  onUpdateDownloaded: (callback: (info: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, info: unknown) =>
      callback(info);
    ipcRenderer.on("update:downloaded", subscription);
    return () => {
      ipcRenderer.removeListener("update:downloaded", subscription);
    };
  },
  onUpdateError: (callback: (error: Error) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, error: Error) =>
      callback(error);
    ipcRenderer.on("update:error", subscription);
    return () => {
      ipcRenderer.removeListener("update:error", subscription);
    };
  },
  installUpdate: async () => {
    return await ipcRenderer.invoke("update:install");
  },

  // New API methods
  openExternalLink: async (url: string) => {
    return await ipcRenderer.invoke("openExternalLink", url);
  },

  // Logging functions
  getLogs: async () => {
    try {
      return await ipcRenderer.invoke("get-logs");
    } catch (error) {
      console.error("Error getting logs:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  sendLogsToSupport: async () => {
    try {
      return await ipcRenderer.invoke("send-logs-to-support");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  // Expose the new log methods
  showLogs: async () => {
    return await ipcRenderer.invoke("show-logs");
  },
  readLogTail: async (lineCount?: number) => {
    // Pass lineCount to main process, defaulting if undefined
    return await ipcRenderer.invoke("read-log-tail", lineCount);
  },

  getAllSupplierNames: async () => {
    return await ipcRenderer.invoke("getAllSupplierNames");
  },

  getSupplierEmail: async (supplierName: string) => {
    return await ipcRenderer.invoke("getSupplierEmail", supplierName);
  },

  // Supplier planning methods
  getSuppliersForWeekday: async (weekday: string, plannerName: string) => {
    return await ipcRenderer.invoke(
      "getSuppliersForWeekday",
      weekday,
      plannerName
    );
  },
  getAllSupplierPlanning: async () => {
    return await ipcRenderer.invoke("getAllSupplierPlanning");
  },

  // Settings methods
  getSettings: async () => {
    return await ipcRenderer.invoke("getSettings");
  },
  saveSettings: async (
    settings: import("../renderer/types/Settings").SettingsData
  ) => {
    return await ipcRenderer.invoke("saveSettings", settings);
  },

  // Debug methods
  saveDebugHtml: async (payload: {
    filename: string;
    content: string;
    description: string;
  }) => {
    return await ipcRenderer.invoke("saveDebugHtml", payload);
  },
  openDebugFolder: async () => {
    return await ipcRenderer.invoke("openDebugFolder");
  },

  // System language detection
  getSystemLanguage: async () => {
    return await ipcRenderer.invoke("get-system-language");
  },
} as ElectronAPI);
