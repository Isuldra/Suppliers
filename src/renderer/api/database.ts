import { ipcRenderer } from "electron";
import { ExcelRow } from "../../types/ExcelRow";

export interface DatabaseAPI {
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
}

export const databaseAPI: DatabaseAPI = {
  insertOrUpdateOrder: (order: ExcelRow) => {
    return ipcRenderer.invoke("db:insertOrUpdateOrder", order);
  },

  insertOrUpdateOrders: (orders: ExcelRow[]) => {
    return ipcRenderer.invoke("db:insertOrUpdateOrders", orders);
  },

  getOrdersBySupplier: (supplier: string) => {
    return ipcRenderer.invoke("db:getOrdersBySupplier", supplier);
  },

  getAllOrders: () => {
    return ipcRenderer.invoke("db:getAllOrders");
  },

  getOrdersDueWithinDays: (days: number) => {
    return ipcRenderer.invoke("db:getOrdersDueWithinDays", days);
  },

  markOrderAsConfirmed: (supplier: string, orderNumber: string | null) => {
    return ipcRenderer.invoke("db:markOrderAsConfirmed", supplier, orderNumber);
  },

  deleteOrder: (supplier: string, orderNumber: string | null) => {
    return ipcRenderer.invoke("db:deleteOrder", supplier, orderNumber);
  },
};
