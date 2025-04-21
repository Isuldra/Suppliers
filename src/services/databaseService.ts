/**
 * SQLite database service for the application
 * Handles database connections, queries, and data management
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { app } from "electron";
import { ExcelRow } from "../types/ExcelRow";
import log from "electron-log";

// Types
export interface DbOrder extends ExcelRow {
  id?: number;
  inserted_at?: string;
  updated_at?: string;
  email_sent_at?: string | null;
}

export interface OutstandingOrdersResult {
  total: number;
  overdue: number;
  overduePercentage: number;
  totalValue: number;
  orders: DbOrder[];
}

export class DatabaseService {
  private db: Database.Database | null = null;
  private static instance: DatabaseService;
  private queryCounter: number = 0;
  private lastBackupTime: number = 0;
  private backupInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private backupIntervalId: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;

  private constructor() {
    this.isShuttingDown = false;
  }

  public connect(dbInstance: Database.Database): void {
    if (this.db) {
      log.warn(
        "DatabaseService already connected. Ignoring new connection attempt."
      );
      return;
    }
    if (!dbInstance) {
      log.error(
        "Attempted to connect DatabaseService with a null/undefined database instance."
      );
      throw new Error("Invalid database instance provided for connection.");
    }

    log.info("Connecting DatabaseService with provided instance...");
    this.db = dbInstance;

    try {
      // Improve performance and reliability - apply PRAGMAs
      log.info(
        "Applying PRAGMAs: WAL journal mode, NORMAL synchronous, foreign keys ON"
      );
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");
      this.db.pragma("foreign_keys = ON");

      // Initialize schema (create tables)
      log.info("Initializing database schema...");
      this.initialize(); // Call the existing initialize method

      // Setup backup schedule only if not shutting down
      if (!this.isShuttingDown) {
        log.info("Setting up backup schedule...");
        this.setupBackupSchedule();
      }
      log.info("DatabaseService connected and initialized successfully.");
    } catch (error) {
      log.error(
        "Error during DatabaseService connection/initialization:",
        error
      );
      // Attempt to close the problematic connection if it was assigned
      if (this.db) {
        try {
          this.db.close();
        } catch (_closeErr) {
          log.error(
            "Error closing database during backup creation:",
            _closeErr
          );
        }
        this.db = null;
      }
      throw error; // Re-throw the error to signal failure
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Add a public getter for the database instance
  public getDbInstance(): Database.Database | null {
    return this.db;
  }

  private initialize(): void {
    if (!this.db) {
      log.error("Initialize called but database is not connected.");
      throw new Error("Database not connected during schema initialization.");
    }
    try {
      // Create tables if they don't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reference TEXT,
          supplier TEXT NOT NULL,
          orderNumber TEXT,
          orderDate TEXT,
          dueDate TEXT,
          category TEXT,
          description TEXT,
          value REAL,
          currency TEXT,
          confirmed INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          email_sent_at TEXT -- Added email sent tracking
        );

        CREATE INDEX IF NOT EXISTS idx_supplier ON orders(supplier);
        CREATE INDEX IF NOT EXISTS idx_dueDate ON orders(dueDate);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_ordernum ON orders(supplier, orderNumber); -- Added uniqueness constraint

        -- Add audit log table
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id INTEGER,
          old_value TEXT,
          new_value TEXT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT
        );

        -- Add weekly status table from importer
        CREATE TABLE IF NOT EXISTS weekly_status (
          leverandor TEXT,
          dag         TEXT,
          uke         TEXT,
          status      TEXT,
          email       TEXT,
          UNIQUE(leverandor, dag, uke) ON CONFLICT REPLACE
        );
        CREATE INDEX IF NOT EXISTS idx_weekly_status_leverandor ON weekly_status(leverandor);
        CREATE INDEX IF NOT EXISTS idx_weekly_status_uke ON weekly_status(uke);

        -- Add purchase order table from importer
        CREATE TABLE IF NOT EXISTS purchase_order (
          nøkkel      TEXT PRIMARY KEY,
          ordreNr     TEXT,
          itemNo      TEXT,
          beskrivelse TEXT,
          dato        TEXT,
          ftgnavn     TEXT
        );
         CREATE INDEX IF NOT EXISTS idx_po_ordreNr ON purchase_order(ordreNr);
         CREATE INDEX IF NOT EXISTS idx_po_ftgnavn ON purchase_order(ftgnavn);

         -- Add potentially missing email_sent_at column to orders table
         ALTER TABLE orders ADD COLUMN email_sent_at TEXT;
      `);
      log.info("Database schema initialization checked/updated successfully");
    } catch (error: unknown) {
      // Check if it's an Error object before accessing message
      if (error instanceof Error) {
        // Ignore "duplicate column name" error for ALTER TABLE
        if (
          error.message &&
          error.message.includes("duplicate column name: email_sent_at")
        ) {
          log.info("Column 'email_sent_at' already exists in 'orders' table.");
        } else {
          log.error("Failed to initialize database schema:", error);
          throw error;
        }
      } else {
        // Handle cases where the caught value is not an Error
        log.error(
          "Failed to initialize database schema with non-Error value:",
          error
        );
        throw error;
      }
    }
  }

  private logOperation(
    action: string,
    tableName: string,
    recordId?: number,
    oldValue?: unknown,
    newValue?: unknown
  ): void {
    if (this.isShuttingDown || !this.db) return;

    try {
      const stmt = this.db!.prepare(`
        INSERT INTO audit_log (action, table_name, record_id, old_value, new_value)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        action,
        tableName,
        recordId || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null
      );
    } catch (error) {
      log.error("Failed to log database operation:", error);
    }
  }

  private setupBackupSchedule(): void {
    if (!this.db) return;
    this.clearBackupSchedule();
    this.backupIntervalId = setInterval(() => {
      if (!this.isShuttingDown) {
        this.performBackupIfNeeded();
      }
    }, 60 * 60 * 1000);
  }

  private clearBackupSchedule(): void {
    if (this.backupIntervalId) {
      clearInterval(this.backupIntervalId);
      this.backupIntervalId = null;
    }
  }

  private performBackupIfNeeded(): void {
    if (this.isShuttingDown || !this.db) return;

    const now = Date.now();

    // Only backup if it's been at least 24 hours since last backup
    if (now - this.lastBackupTime >= this.backupInterval) {
      try {
        const userDataPath = app.getPath("userData");
        const backupDir = path.join(userDataPath, "backups");

        // Ensure backup directory exists
        fs.mkdirSync(backupDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(
          backupDir,
          `supplier-reminder-${timestamp}.db`
        );

        log.info(`Attempting to backup database to: ${backupPath}`);
        const backupPromise = this.db!.backup(backupPath);

        backupPromise
          .then(() => {
            if (!this.isShuttingDown) {
              log.info(`Database backed up to ${backupPath}`);
              this.lastBackupTime = now;

              // Clean up old backups (keep last 7)
              this.cleanupOldBackups(backupDir, 7);
            }
          })
          .catch((err) => {
            if (!this.isShuttingDown) {
              log.error("Database backup failed:", err);
            }
          });
      } catch (error) {
        if (!this.isShuttingDown) {
          log.error("Error during backup process:", error);
        }
      }
    }
  }

  private cleanupOldBackups(backupDir: string, keepCount: number): void {
    if (!this.db) return;

    try {
      const files = fs
        .readdirSync(backupDir)
        .filter(
          (file) =>
            file.startsWith("supplier-reminder-") && file.endsWith(".db")
        )
        .map((file) => ({
          name: file,
          path: path.join(backupDir, file),
          time: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time); // Sort by modification time, newest first

      // Delete all but the most recent 'keepCount' backups
      files.slice(keepCount).forEach((file) => {
        fs.unlinkSync(file.path);
        log.info(`Deleted old backup: ${file.path}`);
      });
    } catch (error) {
      if (!this.isShuttingDown) {
        log.error("Error cleaning up old backups:", error);
      }
    }
  }

  public insertOrUpdateOrder(order: ExcelRow): number {
    if (!this.db) throw new Error("Database not connected.");
    try {
      // First check if the order exists
      const existingOrder = this.db!.prepare(
        `
        SELECT id FROM orders 
        WHERE supplier = ? AND 
              (orderNumber = ? OR (orderNumber IS NULL AND ? IS NULL))
      `
      ).get(order.supplier, order.orderNumber, order.orderNumber) as
        | { id: number }
        | undefined;

      if (existingOrder) {
        // Update existing order
        const stmt = this.db!.prepare(`
          UPDATE orders SET
            reference = ?,
            orderDate = ?,
            dueDate = ?,
            category = ?,
            description = ?,
            value = ?,
            currency = ?,
            confirmed = ?,
            updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `);

        stmt.run(
          order.reference || null,
          order.orderDate ? new Date(order.orderDate).toISOString() : null,
          order.dueDate ? new Date(order.dueDate).toISOString() : null,
          order.category || null,
          order.description || null,
          order.value || null,
          order.currency || null,
          order.confirmed ? 1 : 0,
          existingOrder.id
        );

        this.logOperation("update", "orders", existingOrder.id, null, order);
        return existingOrder.id;
      } else {
        // Insert new order
        const stmt = this.db!.prepare(`
          INSERT INTO orders (
            reference, supplier, orderNumber, orderDate, dueDate,
            category, description, value, currency, confirmed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const info = stmt.run(
          order.reference || null,
          order.supplier,
          order.orderNumber || null,
          order.orderDate ? new Date(order.orderDate).toISOString() : null,
          order.dueDate ? new Date(order.dueDate).toISOString() : null,
          order.category || null,
          order.description || null,
          order.value || null,
          order.currency || null,
          order.confirmed ? 1 : 0
        );

        const newId = info.lastInsertRowid as number;
        this.logOperation("insert", "orders", newId, null, order);
        return newId;
      }
    } catch (error) {
      log.error("Error inserting or updating order:", error);
      throw error;
    }
  }

  public getOrdersBySupplier(supplier: string): ExcelRow[] {
    if (!this.db) throw new Error("Database not connected.");
    try {
      const stmt = this.db!.prepare(`
        SELECT 
          id,
          reference,
          supplier,
          orderNumber,
          orderDate,
          dueDate,
          category,
          description,
          value,
          currency,
          confirmed
        FROM orders
        WHERE supplier = ?
        ORDER BY dueDate ASC
      `);

      const rows = stmt.all(supplier) as DbOrder[];

      this.queryCounter++;
      log.debug(
        `[Query #${this.queryCounter}] Fetched ${rows.length} orders for supplier: ${supplier}`
      );

      return rows.map((row) => ({
        reference: row.reference,
        supplier: row.supplier,
        orderNumber: row.orderNumber,
        orderDate: row.orderDate ? new Date(row.orderDate) : undefined,
        dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
        category: row.category,
        description: row.description,
        value: row.value,
        currency: row.currency,
        confirmed: !!row.confirmed,
      }));
    } catch (error) {
      log.error(`Error getting orders for supplier ${supplier}:`, error);
      throw error;
    }
  }

  public getAllOrders(): ExcelRow[] {
    if (!this.db) throw new Error("Database not connected.");
    try {
      const stmt = this.db!.prepare(`
        SELECT 
          id,
          reference,
          supplier,
          orderNumber,
          orderDate,
          dueDate,
          category,
          description,
          value,
          currency,
          confirmed
        FROM orders
        ORDER BY dueDate ASC
      `);

      const rows = stmt.all() as DbOrder[];

      this.queryCounter++;
      log.debug(
        `[Query #${this.queryCounter}] Fetched all ${rows.length} orders`
      );

      return rows.map((row) => ({
        reference: row.reference,
        supplier: row.supplier,
        orderNumber: row.orderNumber,
        orderDate: row.orderDate ? new Date(row.orderDate) : undefined,
        dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
        category: row.category,
        description: row.description,
        value: row.value,
        currency: row.currency,
        confirmed: !!row.confirmed,
      }));
    } catch (error) {
      log.error("Error getting all orders:", error);
      throw error;
    }
  }

  public getOrdersDueWithinDays(days: number): ExcelRow[] {
    if (!this.db) throw new Error("Database not connected.");
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const stmt = this.db!.prepare(`
        SELECT 
          id,
          reference,
          supplier,
          orderNumber,
          orderDate,
          dueDate,
          category,
          description,
          value,
          currency,
          confirmed
        FROM orders
        WHERE dueDate BETWEEN ? AND ?
          AND confirmed = 0
        ORDER BY dueDate ASC
      `);

      const rows = stmt.all(
        today.toISOString(),
        futureDate.toISOString()
      ) as DbOrder[];

      this.queryCounter++;
      log.debug(
        `[Query #${this.queryCounter}] Fetched ${
          rows.length
        } orders due within ${days} days (from ${today.toISOString()} to ${futureDate.toISOString()})`
      );

      return rows.map((row) => ({
        reference: row.reference,
        supplier: row.supplier,
        orderNumber: row.orderNumber,
        orderDate: row.orderDate ? new Date(row.orderDate) : undefined,
        dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
        category: row.category,
        description: row.description,
        value: row.value,
        currency: row.currency,
        confirmed: !!row.confirmed,
      }));
    } catch (error) {
      log.error(`Error getting orders due within ${days} days:`, error);
      throw error;
    }
  }

  public upsertOrders(orders: ExcelRow[]): number {
    if (!this.db) throw new Error("Database not connected.");
    let updatedCount = 0;
    const upsert = this.db!.transaction((orderBatch: ExcelRow[]) => {
      for (const order of orderBatch) {
        this.insertOrUpdateOrder(order);
        updatedCount++;
      }
    });

    try {
      upsert(orders);
      log.info(`Upserted ${updatedCount} orders successfully.`);
      return updatedCount;
    } catch (error) {
      log.error("Error during batch upsert:", error);
      throw error;
    }
  }

  public getOutstandingOrders(supplier: string): DbOrder[] {
    if (!this.db) throw new Error("Database not connected.");
    try {
      const stmt = this.db!.prepare(`
        SELECT 
          id,
          reference,
          supplier,
          orderNumber,
          orderDate,
          dueDate,
          category,
          description,
          value,
          currency,
          confirmed,
          createdAt as inserted_at,
          updatedAt as updated_at
        FROM orders
        WHERE supplier = ? AND confirmed = 0
        ORDER BY dueDate ASC
      `);

      const rows = stmt.all(supplier) as DbOrder[];

      this.queryCounter++;
      log.debug(
        `[Query #${this.queryCounter}] Fetched ${rows.length} outstanding orders for supplier: ${supplier}`
      );

      return rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        supplier: row.supplier,
        orderNumber: row.orderNumber,
        orderDate: row.orderDate ? new Date(row.orderDate) : undefined,
        dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
        category: row.category,
        description: row.description,
        value: row.value,
        currency: row.currency,
        confirmed: !!row.confirmed,
        inserted_at: row.inserted_at,
        updated_at: row.updated_at,
        email_sent_at: null, // Default value since it's not in the table yet
      }));
    } catch (error) {
      log.error("Error getting outstanding orders:", error);
      throw error;
    }
  }

  public recordEmailSent(orderIds: number[]): number {
    if (!this.db) throw new Error("Database not connected.");
    if (!orderIds || orderIds.length === 0) return 0;

    try {
      // First, add the email_sent_at column if it doesn't exist
      try {
        this.db!.exec(`ALTER TABLE orders ADD COLUMN email_sent_at TEXT;`);
      } catch (_e: unknown) {
        // Column might already exist, ignore the error
      }

      const now = new Date().toISOString();
      // Use non-null assertion: this.db!
      const stmt = this.db!.prepare(`
        UPDATE orders
        SET email_sent_at = ?
        WHERE id = ? AND email_sent_at IS NULL -- Only update if not already sent
      `);

      let updatedCount = 0;
      const updateTx = this.db!.transaction((ids: number[]) => {
        for (const id of ids) {
          const result = stmt.run(now, id);
          if (result.changes > 0) {
            updatedCount++;
            this.logOperation("update", "orders", id, null, {
              email_sent_at: now,
            });
          }
        }
      });

      updateTx(orderIds);
      log.info(
        `Recorded email sent for ${updatedCount} orders (out of ${orderIds.length})`
      );
      return updatedCount;
    } catch (error) {
      log.error("Error recording email sent:", error);
      throw error;
    }
  }

  public markOrderAsConfirmed(
    supplier: string,
    orderNumber: string | null
  ): boolean {
    if (!this.db) throw new Error("Database not connected.");
    try {
      // Use non-null assertion: this.db!
      const stmt = this.db!.prepare(`
        UPDATE orders
        SET confirmed = 1,
            updatedAt = CURRENT_TIMESTAMP
        WHERE supplier = ? AND 
              (orderNumber = ? OR (orderNumber IS NULL AND ? IS NULL))
      `);

      const info = stmt.run(supplier, orderNumber, orderNumber);
      const success = info.changes > 0;
      if (success) {
        log.info(
          `Marked order as confirmed for supplier: ${supplier}, orderNumber: ${
            orderNumber || "NULL"
          }`
        );
        this.logOperation("update", "orders", undefined, null, {
          supplier,
          orderNumber,
          confirmed: 1,
        });
      }
      return success;
    } catch (error) {
      log.error(
        `Error marking order confirmed for supplier ${supplier}:`,
        error
      );
      throw error;
    }
  }

  public deleteOrder(supplier: string, orderNumber: string | null): boolean {
    if (!this.db) throw new Error("Database not connected.");
    try {
      // Use non-null assertion: this.db!
      const stmt = this.db!.prepare(`
        DELETE FROM orders
        WHERE supplier = ? AND 
              (orderNumber = ? OR (orderNumber IS NULL AND ? IS NULL))
      `);

      const info = stmt.run(supplier, orderNumber, orderNumber);
      const success = info.changes > 0;
      if (success) {
        log.info(
          `Deleted order for supplier: ${supplier}, orderNumber: ${
            orderNumber || "NULL"
          }`
        );
        this.logOperation(
          "delete",
          "orders",
          undefined,
          { supplier, orderNumber },
          null
        );
      }
      return success;
    } catch (error) {
      log.error(`Error deleting order for supplier ${supplier}:`, error);
      throw error;
    }
  }

  public close(): void {
    try {
      this.isShuttingDown = true;
      this.clearBackupSchedule();

      // Only close if the db instance exists
      if (this.db) {
        this.db.close();
        this.db = null; // Set to null after closing
        log.info("Database connection closed");
      } else {
        log.info("Database connection was already closed or not connected.");
      }
    } catch (error) {
      log.error("Error closing database:", error);
    }
  }
}

// Export a singleton instance - it will be initialized/connected later
export const databaseService = DatabaseService.getInstance();
