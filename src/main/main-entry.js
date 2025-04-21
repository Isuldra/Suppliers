/**
 * Main entry point for the Electron application
 * This version uses our database adapter for compatibility
 */
import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import log from "electron-log";

// Configure logging
log.transports.file.level = "info";
log.transports.console.level =
  process.env.NODE_ENV === "development" ? "debug" : "info";
log.info("Application starting...");

// Import the database handlers with proper error handling
let setupDatabaseHandlers, closeDatabaseConnection;
try {
  const databaseModule = await import("./database.js");
  setupDatabaseHandlers = databaseModule.setupDatabaseHandlers;
  closeDatabaseConnection = databaseModule.closeDatabaseConnection;
  log.info("Database module loaded successfully");
} catch (error) {
  log.error("Error loading database module:", error);
  // Provide empty functions as fallback
  setupDatabaseHandlers = () =>
    log.warn("Database handlers setup skipped due to import error");
  closeDatabaseConnection = () =>
    log.warn("Database connection close skipped due to import error");
}

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
    : `file://${path.join(__dirname, "../renderer/index.html")}`;

  mainWindow.loadURL(url).catch((err) => {
    log.error("Failed to load URL:", url, err);
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
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
app.on("will-quit", (_event) => {
  log.info("Application is quitting, closing database...");
  try {
    closeDatabaseConnection();
    log.info("Database closed successfully");
  } catch (error) {
    log.error("Error closing database:", error);
  }
});

// Handle email sending through default mail client
ipcMain.handle("sendEmail", async (_, payload) => {
  try {
    // Create mailto URL
    const mailtoUrl = `mailto:${payload.to}?subject=${encodeURIComponent(
      payload.subject
    )}&body=${encodeURIComponent(payload.html)}`;

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
});
