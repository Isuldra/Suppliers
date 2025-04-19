/**
 * Database module for handling IPC communication with the renderer process
 */
import { ipcMain } from "electron";
import log from "electron-log";

// Import database service with robust error handling
let databaseService;
try {
  // Try importing with the .js extension first
  const module = require("../services/databaseServiceAdapter.js");
  databaseService = module.databaseService;
  log.info("Database service adapter loaded successfully with .js extension");
  if (databaseService && databaseService.dbPath) {
    log.info(`Database file in use: ${databaseService.dbPath}`);
  }
} catch (error) {
  log.error(
    "Error loading database service adapter with .js extension:",
    error
  );
  try {
    // Try without extension as fallback (some bundlers may strip it)
    const module = require("../services/databaseServiceAdapter");
    databaseService = module.databaseService;
    log.info("Database service adapter loaded successfully without extension");
  } catch (innerError) {
    log.error(
      "Error loading database service adapter without extension:",
      innerError
    );
    // Provide a mock service as fallback
    databaseService = {
      getOrdersBySupplier: () => [],
      getAllOrders: () => [],
      insertOrUpdateOrder: () => -1,
      recordEmailSent: () => 0,
      close: () => {},
    };
    log.warn("Using mock database service due to import errors");
    // Proactive: Show a dialog if running in production with mock DB
    if (process.env.NODE_ENV !== "development") {
      const { dialog } = require("electron");
      dialog.showErrorBox(
        "Database Error",
        "App is running with a mock database. Features will not work. Please contact support."
      );
    }
  }
}

// Setup all database-related IPC handlers
export function setupDatabaseHandlers() {
  // Handler for getting orders by supplier
  ipcMain.handle("getOrdersBySupplier", async (_, supplier) => {
    try {
      log.info(`Getting orders for supplier: ${supplier}`);
      const orders = databaseService.getOrdersBySupplier(supplier);
      return { success: true, data: orders };
    } catch (error) {
      log.error(`Error getting orders for supplier ${supplier}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Handler for getting all orders
  ipcMain.handle("getAllOrders", async () => {
    try {
      log.info("Getting all orders");
      const orders = databaseService.getAllOrders();
      return { success: true, data: orders };
    } catch (error) {
      log.error("Error getting all orders:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Handler for inserting or updating orders
  ipcMain.handle("insertOrUpdateOrder", async (_, order) => {
    try {
      log.info(`Inserting/updating order for supplier: ${order.supplier}`);
      const id = databaseService.insertOrUpdateOrder(order);
      return { success: true, data: { id } };
    } catch (error) {
      log.error(`Error inserting/updating order:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Handler for recording email sent
  ipcMain.handle("recordEmailSent", async (_, orderIds) => {
    try {
      log.info(`Recording email sent for order IDs: ${orderIds.join(", ")}`);
      const count = databaseService.recordEmailSent(orderIds);
      return { success: true, data: { count } };
    } catch (error) {
      log.error(`Error recording email sent:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  log.info("Database IPC handlers setup complete");
}

// Close database connection
export function closeDatabaseConnection() {
  try {
    log.info("Closing database connection");
    databaseService.close();
    log.info("Database connection closed");
  } catch (error) {
    log.error("Error closing database connection:", error);
    throw error;
  }
}
