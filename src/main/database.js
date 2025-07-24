/**
 * Database module for handling IPC communication with the renderer process
 */
import { ipcMain } from "electron";
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const log = require("electron-log/main");
// Import the already initialized singleton databaseService
import { databaseService } from "../services/databaseService"; // Adjust path/extension if build process changes this

// Add guard flag
let handlersInstalled = false;

// Setup all database-related IPC handlers
export function setupDatabaseHandlers() {
  // Add check for the guard flag
  if (handlersInstalled) {
    log.info(
      "Attempted to call setupDatabaseHandlers more than once. Skipping."
    );
    return;
  }

  if (!databaseService) {
    log.error(
      "setupDatabaseHandlers called, but databaseService is not available. This indicates an initialization error."
    );
    // Optional: Throw an error or handle this case appropriately
    return;
  }
  log.info("Setting up database IPC handlers...");

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
  ipcMain.handle(
    "recordEmailSent",
    async (_, supplier, recipient, subject, orderCount) => {
      try {
        log.info(
          `Recording email sent to ${supplier} (${recipient}) with ${orderCount} orders`
        );

        // Get the outstanding orders for this supplier to mark them as emailed
        const outstandingOrders =
          databaseService.getOutstandingOrders(supplier);
        const orderIds = outstandingOrders
          .map((order) => order.id)
          .filter((id) => id !== undefined);

        if (orderIds.length > 0) {
          const count = databaseService.recordEmailSent(orderIds);
          log.info(
            `Marked ${count} orders as emailed for supplier: ${supplier}`
          );
          return {
            success: true,
            data: { count },
            message: `Email recorded for ${count} orders`,
          };
        } else {
          log.warn(
            `No orders found to mark as emailed for supplier: ${supplier}`
          );
          return {
            success: true,
            data: { count: 0 },
            message: "No orders found to mark as emailed",
          };
        }
      } catch (error) {
        log.error(`Error recording email sent:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  );

  log.info("Database IPC handlers setup complete.");
  handlersInstalled = true; // Set flag after handlers are registered
}

// Close database connection (now just calls the service's close method)
export function closeDatabaseConnection() {
  // REMOVED: This function is no longer needed here as closing is handled
  //          by the databaseService itself via the 'will-quit' event in index.ts.
  //          Keeping the export might be okay, but the call should likely be removed
  //          from index.ts if it's still there. For safety, let's make it a no-op.
  log.warn(
    "closeDatabaseConnection in database.js called, but closing is handled by databaseService. This call should likely be removed."
  );
  // try {
  //   log.info("Closing database connection via database.js (should not happen)");
  //   // databaseService.close(); // The service handles its own closing
  //   log.info("Database connection closed (via database.js - likely no-op)");
  // } catch (error) {
  //   log.error("Error closing database connection (via database.js):", error);
  //   // throw error; // Avoid throwing here if possible
  // }
}
