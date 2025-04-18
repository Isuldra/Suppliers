import { contextBridge, ipcRenderer } from "electron";
import { ExcelData } from "../renderer/types/ExcelData";
import { ExcelRow } from "../types/ExcelRow";

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
  validateData: (data: ExcelData) => Promise<any>;
  sendEmail: (payload: any) => Promise<{ success: boolean; error?: string }>;
  getSuppliers: () => Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }>;
  saveOrdersToDatabase: (
    data: ExcelData
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  getOutstandingOrders: (
    supplier: string,
    beforeCurrentWeek?: boolean
  ) => Promise<{ success: boolean; data?: any[]; error?: string }>;
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
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onUpdateDownloaded: (callback: (info: any) => void) => () => void;
  onUpdateError: (callback: (error: any) => void) => () => void;
  installUpdate: () => Promise<void>;
}

// Whitelist of valid channels
const validChannels = [
  "toMain",
  "fromMain",
  "error",
  "excel:parse",
  "excel:validate",
  "excel:error",
  "validateData",
  "sendEmail",
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
];

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("electron", {
  send: (channel: string, data: unknown) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: unknown[]) => void) => {
    if (validChannels.includes(channel)) {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        ...args: unknown[]
      ) => func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
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
  sendEmail: async (payload: any) => {
    return await ipcRenderer.invoke("sendEmail", payload);
  },
  // Get suppliers
  getSuppliers: async () => {
    return await ipcRenderer.invoke("getSuppliers");
  },
  // Database methods
  saveOrdersToDatabase: async (data: ExcelData) => {
    return await ipcRenderer.invoke("saveOrdersToDatabase", data);
  },
  getOutstandingOrders: async (supplier: string, beforeCurrentWeek = false) => {
    return await ipcRenderer.invoke(
      "getOutstandingOrders",
      supplier,
      beforeCurrentWeek
    );
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
  onUpdateAvailable: (callback: (info: any) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, info: any) =>
      callback(info);
    ipcRenderer.on("update:available", subscription);
    return () => {
      ipcRenderer.removeListener("update:available", subscription);
    };
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, info: any) =>
      callback(info);
    ipcRenderer.on("update:downloaded", subscription);
    return () => {
      ipcRenderer.removeListener("update:downloaded", subscription);
    };
  },
  onUpdateError: (callback: (error: any) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, error: any) =>
      callback(error);
    ipcRenderer.on("update:error", subscription);
    return () => {
      ipcRenderer.removeListener("update:error", subscription);
    };
  },
  installUpdate: async () => {
    return await ipcRenderer.invoke("update:install");
  },
} as ElectronAPI);
