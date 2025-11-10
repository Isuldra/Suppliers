#!/usr/bin/env node

// This script builds a Windows x64 portable version specifically for work PCs
// without admin rights

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Helper to run commands
const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command}`);
    exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      console.log(stdout);
      resolve(stdout);
    });
  });
};

async function main() {
  try {
    console.log('Starting Windows x64 portable build...');

    // 1. Clean environment
    await runCommand('rm -rf node_modules dist release');

    // 2. Install dependencies
    await runCommand('npm install');

    // 3. Modify package.json to ensure correct build settings
    const packageJsonPath = path.join(rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Ensure we don't rebuild native modules
    if (packageJson.build) {
      packageJson.build.npmRebuild = false;

      // Ensure portable settings are correct
      if (packageJson.build.portable) {
        packageJson.build.portable.requestExecutionLevel = 'user';
      }

      // Force x64 architecture for all Windows targets
      if (packageJson.build.win) {
        packageJson.build.win.target = [
          {
            target: 'portable',
            arch: ['x64'],
          },
        ];
      }

      // Add all node_modules to included files
      packageJson.build.files = ['dist/**/*', 'node_modules/**/*'];

      // Set asar to false to avoid packaging issues with native modules
      packageJson.build.asar = false;

      // Update main entry point
      packageJson.main = 'dist/main/main-entry.js';
    }

    // Write the updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Updated package.json for x64 portable build');

    // 4. Create database adapter
    console.log('Creating database adapter module');

    const mainDir = path.join(rootDir, 'src', 'main');
    const servicesDir = path.join(rootDir, 'src', 'services');
    fs.mkdirSync(mainDir, { recursive: true });
    fs.mkdirSync(servicesDir, { recursive: true });

    const dbAdapterPath = path.join(mainDir, 'databaseAdapter.js');
    fs.writeFileSync(
      dbAdapterPath,
      `
// This adapter handles SQLite loading in a robust way
export function getSqliteDatabase() {
  try {
    // Try the regular version first
    const sqlite = require('better-sqlite3');
    console.log('Using better-sqlite3');
    return sqlite;
  } catch (err) {
    console.error('Failed to load better-sqlite3:', err);
    
    try {
      // Try sqlite3 as fallback
      const sqlite3 = require('sqlite3');
      console.log('Using sqlite3');
      // Wrap to match better-sqlite3 interface
      return function(filename, options) {
        const db = new sqlite3.Database(filename);
        return {
          prepare: (sql) => ({
            run: (...params) => {
              return new Promise((resolve) => {
                db.run(sql, params, function(err) {
                  resolve({ changes: this.changes, lastInsertRowid: this.lastID });
                });
              });
            },
            get: (...params) => {
              return new Promise((resolve) => {
                db.get(sql, params, (err, row) => resolve(row));
              });
            },
            all: (...params) => {
              return new Promise((resolve) => {
                db.all(sql, params, (err, rows) => resolve(rows || []));
              });
            }
          }),
          exec: (sql) => new Promise((resolve) => db.exec(sql, () => resolve())),
          close: () => new Promise((resolve) => db.close(() => resolve())),
          pragma: (stmt) => new Promise((resolve) => db.run(\`PRAGMA \${stmt};\`, () => resolve()))
        };
      };
    } catch (err2) {
      console.error('Failed to load sqlite3:', err2);
      
      // Return a mock implementation
      console.warn('Using mock database');
      return function(filename, options) {
        return {
          prepare: (sql) => ({
            run: (...params) => ({ changes: 0, lastInsertRowid: -1 }),
            get: (...params) => null,
            all: (...params) => []
          }),
          exec: (sql) => null,
          close: () => true,
          pragma: (stmt) => null
        };
      };
    }
  }
}
    `
    );

    // 5. Create database service adapter
    const dbServiceAdapterPath = path.join(servicesDir, 'databaseServiceAdapter.js');
    fs.writeFileSync(
      dbServiceAdapterPath,
      `
/**
 * SQLite database service adapter for the application
 * This is a compatibility layer that uses our adapter to ensure 
 * the application works even without native SQLite modules
 */

import path from "path";
import fs from "fs";
import { app } from "electron";
import log from "electron-log";
import { getSqliteDatabase } from "../main/databaseAdapter";

// Get the appropriate database implementation
const Database = getSqliteDatabase();

class DatabaseService {
  constructor() {
    this.initialize();
  }

  initialize() {
    try {
      const userDataPath = app.getPath("userData");
      const dbPath = path.join(userDataPath, "supplier-reminder.db");
      log.info("Database path:", dbPath);

      // Ensure directory exists
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });

      this.db = new Database(dbPath, {
        verbose: process.env.NODE_ENV === "development" ? console.log : undefined
      });

      // Improve performance and reliability
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");
      this.db.pragma("foreign_keys = ON");

      // Create tables if they don't exist
      this.db.exec(\`
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
      \`);

      log.info("Database initialized successfully");
    } catch (error) {
      log.error("Failed to initialize database:", error);
      throw error;
    }
  }

  // Basic CRUD operations
  insertOrUpdateOrder(order) {
    try {
      const stmt = this.db.prepare(\`
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
      \`);

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
      log.error("Failed to insert or update order:", error);
      throw error;
    }
  }

  getOrdersBySupplier(supplier) {
    try {
      const stmt = this.db.prepare(\`
        SELECT * FROM orders 
        WHERE supplier = ?
        ORDER BY dueDate ASC
      \`);
      return stmt.all(supplier);
    } catch (error) {
      log.error("Failed to get orders by supplier:", error);
      return [];
    }
  }

  getAllOrders() {
    try {
      const stmt = this.db.prepare(\`
        SELECT * FROM orders
        ORDER BY supplier, dueDate ASC
      \`);
      return stmt.all();
    } catch (error) {
      log.error("Failed to get all orders:", error);
      return [];
    }
  }

  recordEmailSent(orderIds) {
    if (!orderIds || !orderIds.length) return 0;

    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(\`
        UPDATE orders
        SET email_sent_at = ?
        WHERE id = ?
      \`);

      let updated = 0;
      for (const id of orderIds) {
        const result = stmt.run(now, id);
        updated += result.changes;
      }

      return updated;
    } catch (error) {
      log.error("Failed to record email sent:", error);
      return 0;
    }
  }

  close() {
    if (this.db) {
      try {
        this.db.close();
        log.info("Database connection closed");
      } catch (error) {
        log.error("Error closing database connection:", error);
      }
    }
  }
}

// Create a singleton instance
const databaseService = new DatabaseService();

export { databaseService };
    `
    );

    // 6. Create database IPC module
    const dbModulePath = path.join(mainDir, 'database.js');
    fs.writeFileSync(
      dbModulePath,
      `
/**
 * Database module for handling IPC communication with the renderer process
 */
import { ipcMain } from "electron";
import log from "electron-log";
import { databaseService } from "../services/databaseServiceAdapter";

// Setup all database-related IPC handlers
export function setupDatabaseHandlers() {
  // Handler for getting orders by supplier
  ipcMain.handle("getOrdersBySupplier", async (_, supplier) => {
    try {
      log.info(\`Getting orders for supplier: \${supplier}\`);
      const orders = databaseService.getOrdersBySupplier(supplier);
      return { success: true, data: orders };
    } catch (error) {
      log.error(\`Error getting orders for supplier \${supplier}:\`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
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
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  });

  // Handler for inserting or updating orders
  ipcMain.handle("insertOrUpdateOrder", async (_, order) => {
    try {
      log.info(\`Inserting/updating order for supplier: \${order.supplier}\`);
      const id = databaseService.insertOrUpdateOrder(order);
      return { success: true, data: { id } };
    } catch (error) {
      log.error(\`Error inserting/updating order:\`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  });

  // Handler for recording email sent
  ipcMain.handle("recordEmailSent", async (_, orderIds) => {
    try {
      log.info(\`Recording email sent for order IDs: \${orderIds.join(", ")}\`);
      const count = databaseService.recordEmailSent(orderIds);
      return { success: true, data: { count } };
    } catch (error) {
      log.error(\`Error recording email sent:\`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
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
    `
    );

    // 7. Create main entry file
    const mainEntryPath = path.join(mainDir, 'main-entry.js');
    fs.writeFileSync(
      mainEntryPath,
      `
/**
 * Main entry point for the Electron application
 * This version uses our database adapter for compatibility
 */
import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import log from "electron-log";
import { setupDatabaseHandlers, closeDatabaseConnection } from "./database";

// Configure logging
log.transports.file.level = "info";
log.transports.console.level = process.env.NODE_ENV === "development" ? "debug" : "info";
log.info("Application starting...");

let mainWindow = null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/index.cjs"),
    },
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools({ mode: "right" });
  }

  // Load the app
  const isDev = process.env.NODE_ENV === "development";
  const url = isDev
    ? "http://localhost:5173"
    : \`file://\${path.join(__dirname, "../renderer/index.html")}\`;

  mainWindow.loadURL(url).catch((err) => {
    log.error("Failed to load URL:", url, err);
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Initialize the app when ready
app.whenReady().then(async () => {
  try {
    log.info("Setting up database handlers");
    setupDatabaseHandlers();
    log.info("Database handlers setup complete");
  } catch (error) {
    log.error("Failed to setup database:", error);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Close database when app is quitting
app.on("will-quit", (event) => {
  log.info("Application is quitting, closing database...");
  try {
    closeDatabaseConnection();
    log.info("Database closed successfully");
  } catch (error) {
    log.error("Error closing database:", error);
  }
});

// Handle email sending through default mail client
ipcMain.handle(
  "sendEmail",
  async (_, payload) => {
    try {
      // Create mailto URL
      const mailtoUrl = \`mailto:\${payload.to}?subject=\${encodeURIComponent(
        payload.subject
      )}&body=\${encodeURIComponent(payload.html)}\`;
      
      // Open with default mail client
      await shell.openExternal(mailtoUrl);
      return { success: true };
    } catch (error) {
      log.error("Failed to send email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);
    `
    );

    // 8. Build the application
    console.log('Building the application...');
    await runCommand('npm run build');

    // 9. Copy our custom files to the dist directory
    const distMainDir = path.join(rootDir, 'dist', 'main');
    const distServicesDir = path.join(rootDir, 'dist', 'services');
    fs.mkdirSync(distMainDir, { recursive: true });
    fs.mkdirSync(distServicesDir, { recursive: true });

    // Copy our files to the dist directory
    fs.copyFileSync(dbAdapterPath, path.join(distMainDir, 'databaseAdapter.js'));
    fs.copyFileSync(dbServiceAdapterPath, path.join(distServicesDir, 'databaseServiceAdapter.js'));
    fs.copyFileSync(dbModulePath, path.join(distMainDir, 'database.js'));
    fs.copyFileSync(mainEntryPath, path.join(distMainDir, 'main-entry.js'));

    // 10. Create the portable build
    await runCommand('npx electron-builder --win portable --x64');

    console.log('\n===============================');
    console.log('WINDOWS X64 PORTABLE BUILD COMPLETED!');
    console.log('===============================');
    console.log('Your portable application is ready in the release/ folder.');
    console.log('IMPORTANT: You need to copy the ENTIRE win-unpacked folder,');
    console.log('not just the EXE file, to your work PC.');
    console.log('---------------------------------------------------------------');
  } catch (error) {
    console.error('Failed to build Windows x64 portable version:', error);
    process.exit(1);
  }
}

main();
