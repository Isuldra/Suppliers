/**
 * SQLite database service adapter for the application
 * This is a compatibility layer that uses our adapter to ensure
 * the application works even without native SQLite modules
 */

import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import log from 'electron-log';
import { getSqliteDatabase } from '../main/databaseAdapter';

// Get the appropriate database implementation
const Database = getSqliteDatabase();

class DatabaseService {
  constructor() {
    this.initialize();
  }

  initialize() {
    try {
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'supplier-reminder.db');
      log.info('Database path:', dbPath);

      // Ensure directory exists
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });

      this.db = new Database(dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
      });

      // Improve performance and reliability
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('foreign_keys = ON');

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
          email_sent_at TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_supplier ON orders(supplier);
        CREATE INDEX IF NOT EXISTS idx_dueDate ON orders(dueDate);
      `);

      log.info('Database initialized successfully');
    } catch (error) {
      log.error('Failed to initialize database:', error);
      throw error;
    }
  }

  // Basic CRUD operations
  insertOrUpdateOrder(order) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO orders (
          reference, supplier, orderNumber, orderDate, dueDate, 
          category, description, value, currency, confirmed, 
          updatedAt
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (supplier, orderNumber) DO UPDATE SET
          reference = excluded.reference,
          orderDate = excluded.orderDate,
          dueDate = excluded.dueDate,
          category = excluded.category,
          description = excluded.description,
          value = excluded.value,
          currency = excluded.currency,
          confirmed = excluded.confirmed,
          updatedAt = CURRENT_TIMESTAMP
      `);

      const result = stmt.run(
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

      return result.lastInsertRowid;
    } catch (error) {
      log.error('Failed to insert or update order:', error);
      throw error;
    }
  }

  getOrdersBySupplier(supplier) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM orders 
        WHERE supplier = ?
        ORDER BY dueDate ASC
      `);
      return stmt.all(supplier);
    } catch (error) {
      log.error('Failed to get orders by supplier:', error);
      return [];
    }
  }

  getAllOrders() {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM orders
        ORDER BY supplier, dueDate ASC
      `);
      return stmt.all();
    } catch (error) {
      log.error('Failed to get all orders:', error);
      return [];
    }
  }

  recordEmailSent(orderIds) {
    if (!orderIds || !orderIds.length) return 0;

    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        UPDATE orders
        SET email_sent_at = ?
        WHERE id = ?
      `);

      let updated = 0;
      for (const id of orderIds) {
        const result = stmt.run(now, id);
        updated += result.changes;
      }

      return updated;
    } catch (error) {
      log.error('Failed to record email sent:', error);
      return 0;
    }
  }

  close() {
    if (this.db) {
      try {
        this.db.close();
        log.info('Database connection closed');
      } catch (error) {
        log.error('Error closing database connection:', error);
      }
    }
  }
}

// Create a singleton instance
const databaseService = new DatabaseService();

export { databaseService };
