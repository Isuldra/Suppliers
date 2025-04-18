/**
 * Example of using the database service in the application
 *
 * This file provides examples of common database operations
 * and is meant as a reference for developers.
 */

import { databaseService } from "../services/databaseService";
import { ExcelRow } from "../renderer/types/ExcelData";
import { startOfWeek } from "../utils/dateUtils";
import log from "electron-log";

/**
 * Example of initializing and using the database
 */
async function databaseExample() {
  try {
    // Initialize database connection
    await databaseService.initialize();
    log.info("Database initialized successfully");

    // Example data for demonstration
    const sampleOrders: ExcelRow[] = [
      {
        key: "order-001",
        supplier: "Acme Supplies",
        date: new Date(),
        orderQty: 100,
        receivedQty: 50,
        poNumber: "PO-2023-001",
        itemNo: "ITEM-001",
        description: "Medical supplies",
        specification: "High quality",
      },
      {
        key: "order-002",
        supplier: "Acme Supplies",
        date: new Date(),
        orderQty: 200,
        receivedQty: 0,
        poNumber: "PO-2023-002",
        itemNo: "ITEM-002",
        description: "Surgical masks",
        specification: "N95",
      },
    ];

    // Insert data into the database
    log.info("Inserting sample orders into database...");
    await databaseService.upsertOrders(sampleOrders);
    log.info("Sample orders inserted successfully");

    // Query data from the database
    log.info("Querying outstanding orders...");
    const supplier = "Acme Supplies";

    // Get all outstanding orders
    const allOrders = await databaseService.getOutstandingOrders(supplier);
    log.info(`Found ${allOrders.length} outstanding orders for ${supplier}`);

    // Get orders before the current week
    const weekStart = startOfWeek(new Date());
    const oldOrders = await databaseService.getOutstandingOrders(
      supplier,
      weekStart.toISOString()
    );
    log.info(
      `Found ${
        oldOrders.length
      } outstanding orders before ${weekStart.toDateString()}`
    );

    // Record an email sent
    log.info("Recording email sent...");
    await databaseService.recordEmailSent(
      supplier,
      "supplier@example.com",
      "Outstanding orders reminder",
      allOrders.length,
      "sent"
    );
    log.info("Email recorded successfully");

    // Close the database connection
    await databaseService.close();
    log.info("Database connection closed");

    return {
      success: true,
      ordersInserted: sampleOrders.length,
      outstandingOrders: allOrders.length,
    };
  } catch (error) {
    log.error("Database example error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Example function to get outstanding orders for a report
 */
export async function getOutstandingOrdersReport(supplier: string) {
  try {
    await databaseService.initialize();

    // Get orders before the current week (considered "overdue")
    const weekStart = startOfWeek(new Date());
    const overdueOrders = await databaseService.getOutstandingOrders(
      supplier,
      weekStart.toISOString()
    );

    // Get all outstanding orders
    const allOrders = await databaseService.getOutstandingOrders(supplier);

    // Calculate statistics
    const totalOutstanding = allOrders.length;
    const overdueCount = overdueOrders.length;
    const overduePercentage =
      totalOutstanding > 0
        ? Math.round((overdueCount / totalOutstanding) * 100)
        : 0;

    // Calculate total value
    const totalValue = allOrders.reduce((sum, order) => {
      const outstandingQty = order.orderQty - order.receivedQty;
      // Assuming each item has a value of 100 (in a real app, you'd use actual prices)
      return sum + outstandingQty * 100;
    }, 0);

    await databaseService.close();

    return {
      success: true,
      supplier,
      totalOutstanding,
      overdueCount,
      overduePercentage,
      totalValue,
      currency: "NOK",
      asOfDate: new Date().toISOString(),
    };
  } catch (error) {
    log.error("Report generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Export the example function
export default databaseExample;
