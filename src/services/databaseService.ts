/**
 * SQLite database service for the application
 * Handles database connections, queries, and data management
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { app } from "electron";
import { ExcelRow } from "../types/ExcelRow";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const log = require("electron-log/main");

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
      log.info(
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

      // --- Migration: ensure importer 'key' column exists on orders table ---
      try {
        // query table_info and extract column names
        const existingCols = (
          this.db.prepare("PRAGMA table_info(orders)").all() as Array<{
            name: string;
          }>
        ).map((row) => row.name);
        if (!existingCols.includes("key")) {
          log.info("Adding missing column 'key' to orders table");
          this.db.exec("ALTER TABLE orders ADD COLUMN key TEXT");
        }
      } catch (migrationErr) {
        log.error(
          "Error during migrating 'key' column for orders table:",
          migrationErr
        );
      }
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
          ftgnavn     TEXT,
          status      TEXT,
          producer_item TEXT,
          specification TEXT,
          note        TEXT,
          inventory_balance REAL DEFAULT 0,
          order_qty   INTEGER DEFAULT 0,
          received_qty INTEGER DEFAULT 0,
          purchaser   TEXT,
          incoming_date TEXT,
          eta_supplier TEXT,
          supplier_name TEXT,
          warehouse   TEXT,
          outstanding_qty INTEGER DEFAULT 0
        );
         CREATE INDEX IF NOT EXISTS idx_po_ordreNr ON purchase_order(ordreNr);
         CREATE INDEX IF NOT EXISTS idx_po_ftgnavn ON purchase_order(ftgnavn);

        -- Add supplier emails table
        CREATE TABLE IF NOT EXISTS supplier_emails (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_name TEXT NOT NULL UNIQUE,
          email_address TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_supplier_emails_name ON supplier_emails(supplier_name);

        -- Add supplier planning table for ark 6 (Leverandør) data
        CREATE TABLE IF NOT EXISTS supplier_planning (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_name TEXT NOT NULL,
          weekday TEXT NOT NULL,
          planner_name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(supplier_name, weekday, planner_name) ON CONFLICT REPLACE
        );
        CREATE INDEX IF NOT EXISTS idx_supplier_planning_supplier ON supplier_planning(supplier_name);
        CREATE INDEX IF NOT EXISTS idx_supplier_planning_weekday ON supplier_planning(weekday);
        CREATE INDEX IF NOT EXISTS idx_supplier_planning_planner ON supplier_planning(planner_name);
      `); // End of initial CREATE TABLE/INDEX statements

      // --- Migrations for purchase_order table ---
      const poColumns = [
        { name: "status", type: "TEXT" },
        { name: "producer_item", type: "TEXT" },
        { name: "specification", type: "TEXT" },
        { name: "note", type: "TEXT" },
        { name: "inventory_balance", type: "REAL" },
        { name: "order_qty", type: "REAL" },
        { name: "received_qty", type: "REAL DEFAULT 0" },
        { name: "purchaser", type: "TEXT" },
        { name: "from_restliste", type: "INTEGER DEFAULT 0" },
        { name: "incoming_date", type: "TEXT" },
        { name: "eta_supplier", type: "TEXT" },
        { name: "supplier_name", type: "TEXT" },
        { name: "warehouse", type: "TEXT" },
        { name: "outstanding_qty", type: "REAL DEFAULT 0" },
        { name: "order_row_number", type: "TEXT" },
      ];

      for (const col of poColumns) {
        try {
          // Each ALTER TABLE is a separate execution
          this.db.exec(
            `ALTER TABLE purchase_order ADD COLUMN ${col.name} ${col.type}`
          );
          log.info(`Added column '${col.name}' to 'purchase_order' table.`);
        } catch (e: unknown) {
          if (
            e instanceof Error &&
            e.message.includes(`duplicate column name: ${col.name}`)
          ) {
            log.info(
              `Column '${col.name}' already exists in 'purchase_order' table.`
            );
          } else {
            log.error(
              `Failed to add column '${col.name}' to 'purchase_order':`,
              e
            );
          }
        }
      }

      // --- Migration for orders table (email_sent_at) ---
      try {
        this.db.exec(`ALTER TABLE orders ADD COLUMN email_sent_at TEXT`);
        log.info(
          "Added column 'email_sent_at' to 'orders' table (if it was missing)."
        );
      } catch (e: unknown) {
        if (
          e instanceof Error &&
          e.message.includes("duplicate column name: email_sent_at")
        ) {
          log.info("Column 'email_sent_at' already exists in 'orders' table.");
        } else {
          log.error("Failed to add 'email_sent_at' to 'orders':", e);
        }
      }
      log.info("Database schema initialization checked/updated successfully");

      // Clean up any corrupted supplier data
      this.cleanupCorruptedSupplierData();
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
      ).get(order.supplier, order.poNumber, order.poNumber) as
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
          order.poNumber || null,
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
          orderNumber AS poNumber,
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

      return rows.map(
        (row) =>
          ({
            key: String(row.id || ""),
            poNumber: row.poNumber,
            status: "",
            itemNo: "",
            supplier: row.supplier,
            description: row.description || "",
            orderQty: row.value || 0,
            receivedQty: 0,
            reference: row.reference,
            orderDate: row.orderDate ? new Date(row.orderDate) : undefined,
            dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
            category: row.category,
            value: row.value,
            currency: row.currency,
            confirmed: !!row.confirmed,
          } as ExcelRow)
      );
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
          orderNumber AS poNumber,
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

      return rows.map(
        (row) =>
          ({
            key: String(row.id || ""),
            poNumber: row.poNumber,
            status: "",
            itemNo: "",
            supplier: row.supplier,
            description: row.description || "",
            orderQty: row.value || 0,
            receivedQty: 0,
            reference: row.reference,
            orderDate: row.orderDate ? new Date(row.orderDate) : undefined,
            dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
            category: row.category,
            value: row.value,
            currency: row.currency,
            confirmed: !!row.confirmed,
          } as ExcelRow)
      );
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
          orderNumber AS poNumber,
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

      return rows.map(
        (row) =>
          ({
            key: String(row.id || ""),
            poNumber: row.poNumber,
            status: "",
            itemNo: "",
            supplier: row.supplier,
            description: row.description || "",
            orderQty: row.value || 0,
            receivedQty: 0,
            reference: row.reference,
            orderDate: row.orderDate ? new Date(row.orderDate) : undefined,
            dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
            category: row.category,
            value: row.value,
            currency: row.currency,
            confirmed: !!row.confirmed,
          } as ExcelRow)
      );
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

  public getOutstandingOrders(supplierName: string): DbOrder[] {
    if (!this.db) {
      log.warn("getOutstandingOrders called but DB is not connected.");
      return [];
    }
    this.queryCounter += 1;
    log.info(
      `[Query #${this.queryCounter}] Fetching outstanding orders (from purchase_order) for supplier: ${supplierName}`
    );

    try {
      const sql = `
      SELECT
        (ordreNr || '-' || itemNo) AS key,
        ordreNr AS poNumber,
        status,
        itemNo,
        incoming_date AS dueDate,      -- Stored as YYYY-MM-DD string, will be converted to Date object
        eta_supplier AS supplierETA,   -- Stored as YYYY-MM-DD string, will be converted to Date object
        producer_item AS producerItemNo,
        COALESCE(supplier_name, ftgnavn) AS supplier,
        beskrivelse AS description,
        specification,
        note,
        inventory_balance AS inventoryBalance,
        order_qty AS orderQty,
        received_qty AS receivedQty,
        COALESCE(outstanding_qty, (order_qty - COALESCE(received_qty, 0))) AS outstandingQty,
        purchaser,
        warehouse,
        order_row_number AS orderRowNumber
      FROM purchase_order
      WHERE COALESCE(supplier_name, ftgnavn) LIKE ? 
        AND (outstanding_qty > 0 OR (order_qty - COALESCE(received_qty, 0)) > 0)
        AND eta_supplier IS NOT NULL 
        AND eta_supplier != ''
      ORDER BY date(eta_supplier) ASC, ordreNr ASC, itemNo ASC
    `;

      // Use LIKE with wildcards for more flexible matching
      const searchPattern = `%${supplierName.trim()}%`;
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(searchPattern) as DbOrder[];

      // Convert date strings to Date objects
      rows.forEach((row) => {
        // Ensure the properties exist and are strings before attempting to convert
        if (row.dueDate && typeof row.dueDate === "string") {
          row.dueDate = new Date(row.dueDate);
        }
        if (row.supplierETA && typeof row.supplierETA === "string") {
          row.supplierETA = new Date(row.supplierETA);
        }
      });

      log.info(
        `[Query #${this.queryCounter}] Fetched ${rows.length} outstanding orders for supplier: ${supplierName}`
      );

      // Log first few results for debugging
      if (rows.length > 0 && process.env.NODE_ENV === "development") {
        log.info(
          "Sample results:",
          rows.slice(0, 3).map((r) => ({
            supplier: r.supplier,
            poNumber: r.poNumber,
            itemNo: r.itemNo,
            outstandingQty: r.outstandingQty,
          }))
        );
      }

      return rows;
    } catch (error) {
      log.error("Error getting outstanding orders from purchase_order:", error);
      throw error;
    }
  }

  public getAllSupplierNames(): string[] {
    if (!this.db) {
      log.warn("getAllSupplierNames called but DB is not connected.");
      return [];
    }

    try {
      const sql = `
        SELECT DISTINCT COALESCE(supplier_name, ftgnavn) AS supplier
        FROM purchase_order
        WHERE COALESCE(supplier_name, ftgnavn) IS NOT NULL 
          AND COALESCE(supplier_name, ftgnavn) != ''
          AND COALESCE(supplier_name, ftgnavn) != '[object Object]'
        ORDER BY supplier
      `;
      const stmt = this.db.prepare(sql);
      const rows = stmt.all() as { supplier: string }[];
      const suppliers = rows
        .map((row) => row.supplier)
        .filter(
          (supplier) =>
            supplier &&
            supplier.trim() !== "" &&
            supplier !== "[object Object]" &&
            !supplier.includes("[object Object]")
        );

      log.info(`Found ${suppliers.length} unique suppliers in database`);
      if (process.env.NODE_ENV === "development") {
        log.info("Available suppliers:", suppliers.slice(0, 10)); // Log first 10
      }

      return suppliers;
    } catch (error) {
      log.error("Error getting supplier names:", error);
      return [];
    }
  }

  public getSuppliersWithOutstandingOrders(): string[] {
    if (!this.db) {
      log.warn(
        "getSuppliersWithOutstandingOrders called but DB is not connected."
      );
      return [];
    }

    try {
      const sql = `
        SELECT DISTINCT COALESCE(supplier_name, ftgnavn) AS supplier
        FROM purchase_order
        WHERE COALESCE(supplier_name, ftgnavn) IS NOT NULL 
          AND COALESCE(supplier_name, ftgnavn) != ''
          AND COALESCE(supplier_name, ftgnavn) != '[object Object]'
          AND (outstanding_qty > 0 OR (order_qty - COALESCE(received_qty, 0)) > 0)
          AND eta_supplier IS NOT NULL 
          AND eta_supplier != ''
        ORDER BY supplier
      `;
      const stmt = this.db.prepare(sql);
      const rows = stmt.all() as { supplier: string }[];
      const suppliers = rows
        .map((row) => row.supplier)
        .filter(
          (supplier) =>
            supplier &&
            supplier.trim() !== "" &&
            supplier !== "[object Object]" &&
            !supplier.includes("[object Object]")
        );

      log.info(`Found ${suppliers.length} suppliers with outstanding orders`);
      if (process.env.NODE_ENV === "development") {
        log.info("Suppliers with outstanding orders:", suppliers.slice(0, 10)); // Log first 10
      }

      return suppliers;
    } catch (error) {
      log.error("Error getting suppliers with outstanding orders:", error);
      return [];
    }
  }

  public recordEmailSent(orderIds: number[]): number {
    if (!this.db) throw new Error("Database not connected.");
    if (!orderIds || orderIds.length === 0) return 0;

    try {
      // First, add the email_sent_at column if it doesn't exist
      try {
        this.db!.exec(`ALTER TABLE orders ADD COLUMN email_sent_at TEXT;`);
      } catch {
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

  public getSupplierEmail(supplierName: string): string | null {
    if (!this.db) {
      log.warn("getSupplierEmail called but DB is not connected.");
      return null;
    }

    try {
      const stmt = this.db.prepare(`
        SELECT email_address 
        FROM supplier_emails 
        WHERE supplier_name = ? 
        OR supplier_name LIKE ?
        ORDER BY 
          CASE WHEN supplier_name = ? THEN 1 ELSE 2 END
        LIMIT 1
      `);
      const row = stmt.get(supplierName, `%${supplierName}%`, supplierName) as
        | { email_address: string }
        | undefined;
      return row ? row.email_address : null;
    } catch (error) {
      log.error("Error getting supplier email:", error);
      return null;
    }
  }

  public cleanupCorruptedSupplierData(): void {
    if (!this.db) {
      log.warn("cleanupCorruptedSupplierData called but DB is not connected.");
      return;
    }

    try {
      // Remove entries with [object Object] or other corrupted supplier names
      const deleteStmt = this.db.prepare(`
        DELETE FROM purchase_order 
        WHERE COALESCE(supplier_name, ftgnavn) = '[object Object]'
           OR COALESCE(supplier_name, ftgnavn) LIKE '%[object Object]%'
           OR COALESCE(supplier_name, ftgnavn) = 'undefined'
           OR COALESCE(supplier_name, ftgnavn) = 'null'
      `);

      const result = deleteStmt.run();
      if (result.changes > 0) {
        log.info(
          `Cleaned up ${result.changes} corrupted supplier entries from database`
        );
      }

      // Also clean up supplier_emails table
      const deleteEmailStmt = this.db.prepare(`
        DELETE FROM supplier_emails 
        WHERE supplier_name = '[object Object]'
           OR supplier_name LIKE '%[object Object]%'
           OR supplier_name = 'undefined'
           OR supplier_name = 'null'
      `);

      const emailResult = deleteEmailStmt.run();
      if (emailResult.changes > 0) {
        log.info(
          `Cleaned up ${emailResult.changes} corrupted supplier email entries`
        );
      }
    } catch (error) {
      log.error("Error cleaning up corrupted supplier data:", error);
    }
  }

  // Supplier planning methods for ark 6 (Leverandør) data
  public clearSupplierPlanning(): void {
    if (!this.db) {
      log.warn("clearSupplierPlanning called but DB is not connected.");
      return;
    }

    try {
      const deleteStmt = this.db.prepare("DELETE FROM supplier_planning");
      const result = deleteStmt.run();
      log.info(`Cleared ${result.changes} supplier planning records`);
    } catch (error) {
      log.error("Error clearing supplier planning:", error);
    }
  }

  public insertSupplierPlanning(
    supplierName: string,
    weekday: string,
    plannerName: string
  ): void {
    if (!this.db) {
      log.warn("insertSupplierPlanning called but DB is not connected.");
      return;
    }

    try {
      const insertStmt = this.db.prepare(`
        INSERT OR REPLACE INTO supplier_planning 
        (supplier_name, weekday, planner_name, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      insertStmt.run(supplierName, weekday, plannerName);
    } catch (error) {
      log.error("Error inserting supplier planning:", error);
    }
  }

  public getSuppliersForWeekday(
    weekday: string,
    plannerName: string
  ): string[] {
    if (!this.db) {
      log.warn("getSuppliersForWeekday called but DB is not connected.");
      return [];
    }

    try {
      const stmt = this.db.prepare(`
        SELECT DISTINCT supplier_name 
        FROM supplier_planning 
        WHERE weekday = ? AND planner_name = ?
        ORDER BY supplier_name
      `);
      const rows = stmt.all(weekday, plannerName) as {
        supplier_name: string;
      }[];
      return rows.map((row) => row.supplier_name);
    } catch (error) {
      log.error("Error getting suppliers for weekday:", error);
      return [];
    }
  }

  public getAllSupplierPlanning(): Array<{
    supplier_name: string;
    weekday: string;
    planner_name: string;
  }> {
    if (!this.db) {
      log.warn("getAllSupplierPlanning called but DB is not connected.");
      return [];
    }

    try {
      const stmt = this.db.prepare(`
        SELECT supplier_name, weekday, planner_name 
        FROM supplier_planning 
        ORDER BY planner_name, weekday, supplier_name
      `);
      return stmt.all() as Array<{
        supplier_name: string;
        weekday: string;
        planner_name: string;
      }>;
    } catch (error) {
      log.error("Error getting all supplier planning:", error);
      return [];
    }
  }
}

// Export a singleton instance - it will be initialized/connected later
export const databaseService = DatabaseService.getInstance();
