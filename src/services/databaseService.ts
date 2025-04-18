/**
 * SQLite database service for the application
 * Handles database connections, queries, and data management
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { app } from "electron";
import { ExcelRow } from "../types/ExcelRow";
import { formatDate } from "../utils/dateUtils";
import log from "electron-log";
import crypto from "crypto";

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

// Create a mock database implementation for development or error cases
class MockDatabase {
  private static isDevMode = process.env.NODE_ENV === "development";

  constructor() {
    log.info("Using mock database implementation");
  }

  prepare(sql: string) {
    if (MockDatabase.isDevMode) log.debug("Mock SQL:", sql);
    return {
      run: (...args: any[]) => ({ changes: 0, lastInsertRowid: 1 }),
      get: (...args: any[]) => null,
      all: (...args: any[]) => [],
    };
  }

  exec(sql: string) {
    if (MockDatabase.isDevMode) log.debug("Mock SQL Exec:", sql);
    return null;
  }

  pragma(statement: string) {
    if (MockDatabase.isDevMode) log.debug("Mock PRAGMA:", statement);
    return null;
  }

  close() {
    log.info("Mock database closed");
    return true;
  }

  backup(destination: string) {
    log.info("Mock backup to:", destination);
    return Promise.resolve(true);
  }
}

export class DatabaseService {
  private db: Database.Database | MockDatabase;
  private static instance: DatabaseService;
  private queryCounter: number = 0;
  private lastBackupTime: number = 0;
  private backupInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private backupIntervalId: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;
  private useMock: boolean = false;

  private constructor() {
    this.isShuttingDown = false;

    try {
      const userDataPath = app.getPath("userData");
      const dbPath = path.join(userDataPath, "supplier-reminder.db");
      log.info("Database path:", dbPath);

      // Ensure directory exists
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });

      try {
        // Attempt to load the native module
        this.db = new Database(dbPath, {
          verbose:
            process.env.NODE_ENV === "development" ? log.info : undefined,
        });

        // Improve performance and reliability
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("synchronous = NORMAL");
        this.db.pragma("foreign_keys = ON");

        this.useMock = false;
        log.info("Using native SQLite database");
      } catch (nativeError) {
        // If native module fails, use a mock implementation
        log.warn(
          "Native SQLite module failed to load, using mock implementation:",
          nativeError
        );
        this.db = new MockDatabase();
        this.useMock = true;
      }

      this.initialize();

      // Only set up backup schedule if not in shutdown process and using real DB
      if (!this.isShuttingDown && !this.useMock) {
        this.setupBackupSchedule();
      }
    } catch (error) {
      log.error("Error initializing database:", error);

      // Create mock database as fallback
      this.db = new MockDatabase();
      this.useMock = true;
      log.warn("Using mock database after initialization error");

      // Don't throw error to allow app to continue functioning with mock DB
      // throw new Error("Database initialization failed");
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initialize(): void {
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
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_supplier ON orders(supplier);
        CREATE INDEX IF NOT EXISTS idx_dueDate ON orders(dueDate);
        
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
      `);

      log.info("Database schema initialized successfully");
    } catch (error) {
      log.error("Failed to initialize database schema:", error);
      throw error;
    }
  }

  // Helper to log database operations
  private logOperation(
    action: string,
    tableName: string,
    recordId?: number,
    oldValue?: any,
    newValue?: any
  ): void {
    if (this.isShuttingDown) return;

    try {
      const stmt = this.db.prepare(`
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
      // Don't throw here to prevent disrupting main operations
    }
  }

  // Set up regular database backups
  private setupBackupSchedule(): void {
    // Clear any existing interval first
    this.clearBackupSchedule();

    // Check and perform backup every hour if needed
    this.backupIntervalId = setInterval(() => {
      if (!this.isShuttingDown) {
        this.performBackupIfNeeded();
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  private clearBackupSchedule(): void {
    if (this.backupIntervalId) {
      clearInterval(this.backupIntervalId);
      this.backupIntervalId = null;
    }
  }

  private performBackupIfNeeded(): void {
    if (this.isShuttingDown) return;

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

        // Create backup
        this.db
          .backup(backupPath)
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
    if (this.isShuttingDown) return;

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
    try {
      // First check if the order exists
      const existingOrder = this.db
        .prepare(
          `
        SELECT id FROM orders 
        WHERE supplier = ? AND 
              (orderNumber = ? OR (orderNumber IS NULL AND ? IS NULL))
      `
        )
        .get(order.supplier, order.orderNumber, order.orderNumber) as
        | { id: number }
        | undefined;

      if (existingOrder) {
        // Update existing order
        const stmt = this.db.prepare(`
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

        return existingOrder.id;
      } else {
        // Insert new order
        const stmt = this.db.prepare(`
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

        return info.lastInsertRowid as number;
      }
    } catch (error) {
      console.error("Error inserting or updating order:", error);
      throw error;
    }
  }

  public getOrdersBySupplier(supplier: string): ExcelRow[] {
    try {
      const stmt = this.db.prepare(`
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

      const rows = stmt.all(supplier) as any[];

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
      console.error("Error getting orders by supplier:", error);
      throw error;
    }
  }

  public getAllOrders(): ExcelRow[] {
    try {
      const stmt = this.db.prepare(`
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

      const rows = stmt.all() as any[];

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
      console.error("Error getting all orders:", error);
      throw error;
    }
  }

  public getOrdersDueWithinDays(days: number): ExcelRow[] {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const stmt = this.db.prepare(`
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
      ) as any[];

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
      console.error("Error getting orders due within days:", error);
      throw error;
    }
  }

  public upsertOrders(orders: ExcelRow[]): number {
    try {
      // Start a transaction
      this.db.prepare("BEGIN").run();

      let insertedCount = 0;

      for (const order of orders) {
        // Use the existing insertOrUpdateOrder method for each order
        this.insertOrUpdateOrder(order);
        insertedCount++;
      }

      // Commit the transaction
      this.db.prepare("COMMIT").run();

      return insertedCount;
    } catch (error) {
      // Rollback on error
      this.db.prepare("ROLLBACK").run();
      console.error("Error upserting orders:", error);
      throw error;
    }
  }

  public getOutstandingOrders(supplier: string): DbOrder[] {
    try {
      const stmt = this.db.prepare(`
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

      const rows = stmt.all(supplier) as any[];

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
      console.error("Error getting outstanding orders:", error);
      throw error;
    }
  }

  public recordEmailSent(orderIds: number[]): number {
    try {
      // First, add the email_sent_at column if it doesn't exist
      try {
        this.db.exec(`ALTER TABLE orders ADD COLUMN email_sent_at TEXT;`);
      } catch (e) {
        // Column might already exist, ignore the error
      }

      // Start a transaction
      this.db.prepare("BEGIN").run();

      // Update each order
      const stmt = this.db.prepare(`
        UPDATE orders
        SET email_sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      let updatedCount = 0;
      for (const id of orderIds) {
        const result = stmt.run(id);
        updatedCount += result.changes;
      }

      // Commit the transaction
      this.db.prepare("COMMIT").run();

      return updatedCount;
    } catch (error) {
      // Rollback on error
      this.db.prepare("ROLLBACK").run();
      console.error("Error recording email sent:", error);
      throw error;
    }
  }

  public markOrderAsConfirmed(
    supplier: string,
    orderNumber: string | null
  ): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE orders
        SET confirmed = 1,
            updatedAt = CURRENT_TIMESTAMP
        WHERE supplier = ? AND 
              (orderNumber = ? OR (orderNumber IS NULL AND ? IS NULL))
      `);

      const info = stmt.run(supplier, orderNumber, orderNumber);
      return info.changes > 0;
    } catch (error) {
      console.error("Error marking order as confirmed:", error);
      throw error;
    }
  }

  public deleteOrder(supplier: string, orderNumber: string | null): boolean {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM orders
        WHERE supplier = ? AND 
              (orderNumber = ? OR (orderNumber IS NULL AND ? IS NULL))
      `);

      const info = stmt.run(supplier, orderNumber, orderNumber);
      return info.changes > 0;
    } catch (error) {
      console.error("Error deleting order:", error);
      throw error;
    }
  }

  public close(): void {
    try {
      // Mark as shutting down to prevent new operations
      this.isShuttingDown = true;

      // Clear any active backup intervals
      this.clearBackupSchedule();

      // Close database connection
      if (this.db) {
        this.db.close();
        log.info("Database connection closed");
      }
    } catch (error) {
      log.error("Error closing database:", error);
    }
  }
}

// Export a singleton instance
export const databaseService = DatabaseService.getInstance();
