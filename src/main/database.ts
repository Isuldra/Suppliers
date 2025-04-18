import { ipcMain } from "electron";
import { databaseService } from "../services/databaseService";
import { ExcelRow } from "../types/ExcelRow";

// Database interface for IPC communication
export function setupDatabaseHandlers() {
  // Initialize database
  try {
    // Database is automatically initialized when the singleton is accessed
    console.log("Database service initialized");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }

  // Handle insert or update of a single order
  ipcMain.handle("db:insertOrUpdateOrder", async (_event, order: ExcelRow) => {
    try {
      return databaseService.insertOrUpdateOrder(order);
    } catch (error) {
      console.error("Error inserting or updating order:", error);
      throw error;
    }
  });

  // Handle batch insert/update of orders
  ipcMain.handle(
    "db:insertOrUpdateOrders",
    async (_event, orders: ExcelRow[]) => {
      try {
        const results = [];
        for (const order of orders) {
          const id = databaseService.insertOrUpdateOrder(order);
          results.push(id);
        }
        return results;
      } catch (error) {
        console.error("Error inserting or updating orders:", error);
        throw error;
      }
    }
  );

  // Get orders by supplier
  ipcMain.handle("db:getOrdersBySupplier", async (_event, supplier: string) => {
    try {
      return databaseService.getOrdersBySupplier(supplier);
    } catch (error) {
      console.error("Error getting orders by supplier:", error);
      throw error;
    }
  });

  // Get all orders
  ipcMain.handle("db:getAllOrders", async () => {
    try {
      return databaseService.getAllOrders();
    } catch (error) {
      console.error("Error getting all orders:", error);
      throw error;
    }
  });

  // Get orders due within a certain number of days
  ipcMain.handle("db:getOrdersDueWithinDays", async (_event, days: number) => {
    try {
      return databaseService.getOrdersDueWithinDays(days);
    } catch (error) {
      console.error("Error getting orders due within days:", error);
      throw error;
    }
  });

  // Mark an order as confirmed
  ipcMain.handle(
    "db:markOrderAsConfirmed",
    async (_event, supplier: string, orderNumber: string | null) => {
      try {
        return databaseService.markOrderAsConfirmed(supplier, orderNumber);
      } catch (error) {
        console.error("Error marking order as confirmed:", error);
        throw error;
      }
    }
  );

  // Delete an order
  ipcMain.handle(
    "db:deleteOrder",
    async (_event, supplier: string, orderNumber: string | null) => {
      try {
        return databaseService.deleteOrder(supplier, orderNumber);
      } catch (error) {
        console.error("Error deleting order:", error);
        throw error;
      }
    }
  );
}

// Clean up database when app is closing
export function closeDatabaseConnection() {
  try {
    // Clear all timeouts and intervals if needed

    // Close the database connection
    databaseService.close();
    console.log("Database connection closed successfully");

    // Return true to indicate successful closure
    return true;
  } catch (error) {
    console.error("Error closing database connection:", error);

    // Even with an error, return true so the app can continue shutting down
    // Better to have a slightly messy shutdown than getting stuck
    return true;
  }
}
