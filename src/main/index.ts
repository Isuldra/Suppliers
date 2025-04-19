import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import path from "path";
import { ExcelData, ValidationResult } from "../renderer/types/ExcelData";
import log from "electron-log";
import { databaseService } from "../services/databaseService";
import { startOfWeek } from "../utils/dateUtils"; // We'll create this file later
import { setupDatabaseHandlers, closeDatabaseConnection } from "./database";
import { checkForUpdatesManually } from "./auto-updater";
import { fileURLToPath } from "url";
import fs from "fs";

// Configure detailed logging for troubleshooting
log.transports.file.level = "debug"; // Set to debug for maximum logging
log.transports.console.level = "debug";

// Set log file size and rotation
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

// Create logs directory in userData if it doesn't exist
const logsDir = path.join(app.getPath("userData"), "logs");
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Set a custom log file path for easier identification
  const logFilePath = path.join(logsDir, "supplier-reminder-app.log");
  log.transports.file.resolvePath = () => logFilePath;

  log.info("Log file location:", logFilePath);
} catch (err) {
  console.error("Failed to set up logging directory:", err);
}

// Add a global error handler for uncaught exceptions
process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception:", error);

  // Show dialog to user in development mode
  if (process.env.NODE_ENV === "development") {
    dialog.showErrorBox(
      "Uncaught Exception",
      `En uventet feil oppstod: ${
        error.message
      }\n\nDetaljer er logget til: ${log.transports.file.getFile()}`
    );
  }
});

// Add a global error handler for unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  log.error("Unhandled Promise Rejection:", reason);
});

// Log startup information
log.info("Application starting...");
log.info("App version:", app.getVersion());
log.info("Electron version:", process.versions.electron);
log.info("Chrome version:", process.versions.chrome);
log.info("Node version:", process.versions.node);
log.info(
  "OS:",
  process.platform,
  process.arch,
  process.getSystemVersion?.() || ""
);
log.info("User data path:", app.getPath("userData"));
log.info(
  "[Startup] Running main process from src/main/index.ts (dist/main/main.js)"
);

// Add IPC handler for retrieving logs
ipcMain.handle("get-logs", async () => {
  try {
    const logFile = log.transports.file.getFile();
    if (logFile) {
      const logFilePath = String(logFile);
      if (fs.existsSync(logFilePath)) {
        // Read last 1000 lines or so
        const fileContent = fs.readFileSync(logFilePath, "utf8");
        const lines = fileContent.split("\n").slice(-1000).join("\n");
        return { success: true, logs: lines, path: logFilePath };
      }
    }
    return { success: false, error: "Log file not found" };
  } catch (error) {
    log.error("Error reading logs:", error);
    return { success: false, error: String(error) };
  }
});

// Declare the odbc module interface instead of importing directly
let odbcModule: any = null;

// Custom interfaces for database results
interface SupplierResult {
  Supplier: string;
}

interface QueryResult<T> {
  count: number;
  columns: string[];
  rows: T[];
}

// Mock ODBC functionality for development
const mockOdbcConnection = {
  query: async (sql: string) => {
    // Return mock data for development testing
    if (sql.includes("COUNT") && sql.includes("Supplier")) {
      return [{ count: 5 }];
    } else if (sql.includes("DISTINCT Supplier")) {
      return [{ Supplier: "Mock Supplier 1" }, { Supplier: "Mock Supplier 2" }];
    }
    return [];
  },
  close: async () => {},
};

const mockOdbc = {
  connect: async () => mockOdbcConnection,
};

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/index.cjs"),
    },
  });

  // Open DevTools in renderer
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools({ mode: "right" });
  }

  // Load the index.html file
  const isDev = process.env.NODE_ENV === "development";
  const url = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../renderer/index.html")}`;

  mainWindow.loadURL(url).catch((err) => {
    log.error("Failed to load URL:", url, err);
    throw err;
  });
}

// Initialize database when the app is ready
app.whenReady().then(async () => {
  try {
    // Initialize database - the service is auto-initialized on singleton creation
    log.info("Database initialized successfully");

    // Setup IPC handlers for database operations
    setupDatabaseHandlers();
    log.info("Database IPC handlers setup");

    // Add this after the app is ready and before using the database
    try {
      // Dynamically resolve the path to the native binary
      // This assumes better-sqlite3 is installed in node_modules
      const betterSqlite3 = require.resolve("better-sqlite3");
      const nodeBinary = path.join(
        path.dirname(betterSqlite3),
        "build",
        "Release",
        process.platform === "win32"
          ? "better-sqlite3.node"
          : "better_sqlite3.node"
      );
      log.info(`Resolved better-sqlite3 module: ${betterSqlite3}`);
      log.info(`Checking for native binary at: ${nodeBinary}`);
      if (fs.existsSync(nodeBinary)) {
        log.info("better-sqlite3 native binary found.");
      } else {
        log.error(
          "better-sqlite3 native binary NOT found! App may fail to start."
        );
      }
    } catch (e) {
      log.error("Error resolving better-sqlite3 native binary:", e);
    }
  } catch (error) {
    log.error("Failed to initialize database:", error);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Close database when app is about to quit
app.on("will-quit", async (event) => {
  // Prevent the app from quitting until we've closed the database
  event.preventDefault();

  try {
    // Close the database connection
    closeDatabaseConnection();
    log.info("Database closed successfully");

    // Force exit after a short delay to ensure all resources are released
    setTimeout(() => {
      log.info("Forcefully exiting application");
      app.exit(0); // Use exit instead of quit to avoid the event loop
    }, 500);
  } catch (error) {
    log.error("Error closing database:", error);

    // Force exit even on error
    setTimeout(() => {
      log.info("Forcefully exiting application after error");
      app.exit(1); // Exit with error code
    }, 500);
  }
});

// Get the ODBC module - either the real one in production or mock in development
async function getOdbcModule() {
  if (odbcModule) {
    return odbcModule;
  }

  if (process.env.NODE_ENV === "development") {
    log.info("Using mock ODBC in development mode");
    odbcModule = mockOdbc;
  } else {
    try {
      log.info("Importing real ODBC module in production");
      // Only import the real odbc module in production
      const importedModule = await import("odbc");
      odbcModule = importedModule.default;
    } catch (error) {
      log.error("Failed to import ODBC module:", error);
      // Fallback to mock if real module fails
      odbcModule = mockOdbc;
    }
  }

  return odbcModule;
}

// ODBC connection with retry logic
async function connectWithRetry(
  maxRetries: number = 3,
  initialDelay: number = 500
): Promise<any> {
  const odbc = await getOdbcModule();
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (process.env.NODE_ENV === "development") {
        // In development, just return the mock connection
        return mockOdbcConnection;
      }

      const connection = await odbc.connect(process.env.ODBC_DSN!);
      return connection;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown ODBC error");
      log.warn(`ODBC connection attempt ${i + 1} failed:`, lastError.message);

      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to connect to ODBC after retries");
}

// Handle data validation
ipcMain.handle(
  "validateData",
  async (_, data: ExcelData): Promise<ValidationResult> => {
    // Remove the supplier check since supplier selection happens later in the wizard flow
    // Supplier is only needed for ODBC validation, which we'll skip if no supplier is provided
    try {
      if (data.supplier) {
        // Only perform ODBC validation if a supplier is selected
        const connection = await connectWithRetry();

        try {
          // Validate Hovedliste data
          const hovedlisteResult = await connection.query(
            `
            SELECT COUNT(*) as count 
            FROM Hovedliste 
            WHERE Supplier = ? AND OrderQty > ReceivedQty
          `,
            [data.supplier]
          );

          // Validate BP data
          const bpResult = await connection.query(
            `
            SELECT COUNT(*) as count 
            FROM BP 
            WHERE Supplier = ? AND OrderQty > ReceivedQty
          `,
            [data.supplier]
          );

          await connection.close();

          return {
            success: true,
            data: {
              hovedlisteCount: Number(hovedlisteResult[0]?.count || 0),
              bpCount: Number(bpResult[0]?.count || 0),
            },
          };
        } catch (error) {
          await connection.close();
          throw error;
        }
      } else {
        // Skip ODBC validation if no supplier is provided yet
        // Just validate basic file structure
        return {
          success: true,
          data: {
            hovedlisteCount: data.hovedliste.length,
            bpCount: data.bp.length,
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("Data validation failed:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
);

// Handle email sending
ipcMain.handle(
  "sendEmail",
  async (_, payload: { to: string; subject: string; html: string }) => {
    try {
      const { shell } = require("electron");

      // Clean up the HTML to extract text content
      let cleanText = payload.html
        .replace(/<style>.*?<\/style>/gs, "")
        .replace(/<head>.*?<\/head>/gs, "")
        .replace(/<script>.*?<\/script>/gs, "")
        .replace(/<[^>]*>/g, "\n")
        .replace(/\n{2,}/g, "\n\n")
        .trim();

      // Ensure the supplier email is in a valid format
      // For demonstration, we'll use a placeholder if not specified
      let emailTo = payload.to;
      if (!emailTo.includes("@")) {
        // This is just a supplier name, not an email
        // In a real app, you might want to look up the email from a contacts database
        // For now, just logging this situation
        log.info(
          `No valid email for supplier: ${payload.to}, using placeholder`
        );
        emailTo = "supplier@example.com";
      }

      // Create the mailto: URL
      let mailtoUrl = `mailto:${encodeURIComponent(
        emailTo
      )}?subject=${encodeURIComponent(
        payload.subject
      )}&body=${encodeURIComponent(cleanText)}`;

      // Open the default mail client
      log.info(`Opening mail client with mailto: URL for ${emailTo}`);
      await shell.openExternal(mailtoUrl);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("Email sending failed:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

// Handle supplier list retrieval
ipcMain.handle(
  "getSuppliers",
  async (): Promise<{ success: boolean; data?: string[]; error?: string }> => {
    try {
      const connection = await connectWithRetry();

      try {
        // Get unique suppliers from both tables
        const hovedlisteQuery = `
          SELECT DISTINCT Supplier 
          FROM Hovedliste 
          WHERE OrderQty > ReceivedQty
        `;

        const bpQuery = `
          SELECT DISTINCT Supplier 
          FROM BP 
          WHERE OrderQty > ReceivedQty
        `;

        const hovedlisteResult = (await connection.query(
          hovedlisteQuery
        )) as unknown as SupplierResult[];
        const bpResult = (await connection.query(
          bpQuery
        )) as unknown as SupplierResult[];

        await connection.close();

        // Combine and deduplicate suppliers
        const suppliers = new Set<string>();

        hovedlisteResult.forEach((row) => suppliers.add(row.Supplier));
        bpResult.forEach((row) => suppliers.add(row.Supplier));

        return {
          success: true,
          data: Array.from(suppliers).sort(),
        };
      } catch (error) {
        await connection.close();
        throw error;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("Failed to get suppliers:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
);

// Add new IPC handlers for database operations

// Save orders to database
ipcMain.handle("saveOrdersToDatabase", async (_, data: ExcelData) => {
  try {
    // Combine all orders from hovedliste and bp
    const allOrders = [...data.hovedliste, ...data.bp];
    await databaseService.upsertOrders(allOrders);

    return {
      success: true,
      message: `Successfully saved ${allOrders.length} orders to database`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    log.error("Error saving orders to database:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
});

// Get outstanding orders for a supplier
ipcMain.handle(
  "getOutstandingOrders",
  async (_, supplier: string, beforeCurrentWeek?: boolean) => {
    try {
      // Get orders for the supplier
      const orders = await databaseService.getOutstandingOrders(supplier);

      // Filter orders if beforeCurrentWeek is true
      let filteredOrders = orders;
      if (beforeCurrentWeek) {
        const weekStart = startOfWeek(new Date());
        filteredOrders = orders.filter((order) => {
          if (!order.dueDate) return false;
          return new Date(order.dueDate) < weekStart;
        });
      }

      return {
        success: true,
        data: filteredOrders,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("Error getting outstanding orders:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
);

// Record email sent to supplier
ipcMain.handle(
  "recordEmailSent",
  async (
    _,
    supplier: string,
    recipient: string,
    subject: string,
    orderCount: number
  ) => {
    try {
      // Get order IDs for the supplier
      const orders = await databaseService.getOutstandingOrders(supplier);
      const orderIds = orders
        .map((order) => order.id)
        .filter((id) => id !== undefined) as number[];

      // Record email sent for these orders
      await databaseService.recordEmailSent(orderIds);

      return {
        success: true,
        message: `Successfully recorded email to ${supplier}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("Error recording email:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
);

// Add IPC handler for manual update check
ipcMain.handle("update:check", async () => {
  try {
    return await checkForUpdatesManually();
  } catch (error) {
    log.error("Error checking for updates:", error);
    return {
      updateAvailable: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Add IPC handler for installing updates
ipcMain.handle("update:install", async () => {
  try {
    // This will only work if an update has been downloaded
    const { autoUpdater } = require("electron-updater");
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    log.error("Error installing update:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Åpne eksterne lenker (brukes for support-epost)
ipcMain.handle("openExternalLink", async (_, url: string) => {
  try {
    log.info(`Forsøker å åpne ekstern lenke: ${url}`);

    // Sikre at URL er trygg og riktig formatert
    if (!url || typeof url !== "string") {
      throw new Error(`Ugyldig URL format: ${url}`);
    }

    // Legg til mer detaljert logging og plattformspesifikk håndtering
    const platform = process.platform;
    log.info(`Plattform: ${platform}, URL: ${url}`);

    // For mailto-lenker på Windows, legg til ekstra feilhåndtering
    if (url.startsWith("mailto:") && platform === "win32") {
      log.info("Håndterer mailto-lenke på Windows");

      // Ekstra sikring for Windows - bruk shell.openExternal med ekstra alternativer
      await shell.openExternal(url, {
        activate: true,
        workingDirectory: process.cwd(),
      });
    } else {
      // Standard måte å åpne lenker på
      await shell.openExternal(url);
    }

    log.info(`Åpnet ekstern lenke: ${url} vellykket`);
    return { success: true };
  } catch (error) {
    log.error(`Feil ved åpning av ekstern lenke: ${url}`, error);
    // Send mer detaljert feilmelding tilbake til UI
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ukjent feil",
      platform: process.platform,
      url,
    };
  }
});

// Handle show-about request from renderer
ipcMain.on("show-about-dialog", () => {
  dialog.showMessageBox({
    type: "info",
    title: "Om OneMed SupplyChain",
    message: "OneMed SupplyChain",
    detail: `Versjon: ${app.getVersion()}\nElectron: ${
      process.versions.electron
    }\nNode: ${process.versions.node}\nChrome: ${
      process.versions.chrome
    }\n\n© ${new Date().getFullYear()} OneMed AS`,
    buttons: ["OK"],
    icon: path.join(process.resourcesPath, "icon.png"),
  });
});

// Handle show-logs request from renderer
ipcMain.on("show-logs", () => {
  log.info("Opening logs window");

  try {
    // Create a new window for logs
    let logsWindow: BrowserWindow | undefined = new BrowserWindow({
      width: 900,
      height: 700,
      parent: mainWindow || undefined,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "../preload/index.cjs"),
      },
    });

    // Load the same app URL but with a logs query parameter
    const isDevEnv = process.env.NODE_ENV === "development";
    const url = isDevEnv
      ? `http://localhost:5173/#/logs`
      : `file://${path.join(__dirname, "../renderer/index.html")}#/logs`;

    logsWindow.loadURL(url).catch((err: any) => {
      log.error("Failed to load logs window URL:", url, err);
      const { dialog } = require("electron");
      dialog.showErrorBox(
        "Logger Error",
        `Could not open logs window.\n${err?.message || err}`
      );
    });

    logsWindow.once("ready-to-show", () => {
      logsWindow?.show();
    });

    logsWindow.on("closed", () => {
      logsWindow = undefined;
    });
  } catch (err: any) {
    log.error("Failed to open logs window:", err);
    const { dialog } = require("electron");
    dialog.showErrorBox(
      "Logger Error",
      `Could not open logs window.\n${err?.message || err}`
    );
  }
});

// Add new IPC handler 'send-logs-to-support'
ipcMain.handle("send-logs-to-support", async () => {
  try {
    const os = require("os");
    const { shell } = require("electron");
    const child_process = require("child_process");
    const logFile = log.transports.file.getFile();
    const supportEmail = "andreas.elvethun@onemed.com";
    const subject = "Supplier Reminder Pro Support Logs";
    const logFilePath = logFile ? String(logFile) : undefined;
    if (logFilePath && fs.existsSync(logFilePath)) {
      if (process.platform === "win32") {
        // Try to open Outlook Desktop with attachment
        const outlookPath = "outlook.exe";
        try {
          child_process.spawn(
            "cmd",
            ["/c", "start", "", outlookPath, "/a", logFilePath],
            {
              detached: true,
              stdio: "ignore",
            }
          );
          log.info("Opened Outlook with log attachment: " + logFilePath);
          return { success: true };
        } catch (err) {
          log.error("Failed to open Outlook with attachment:", err);
          // Fallback to mailto (no attachment)
        }
      }
      // Fallback for non-Windows or if Outlook fails
      const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(
        "Se vedlagt loggfil fra appen. (Vedlegg kunne ikke legges til automatisk, vennligst legg ved filen manuelt om mulig.) Loggfil: " +
          logFilePath
      )}`;
      await shell.openExternal(mailtoUrl);
      log.info("Opened mailto link for support logs (no attachment)");
      return {
        success: true,
        error:
          "Kunne ikke legge ved logg automatisk. Åpnet e-post uten vedlegg.",
      };
    } else {
      log.error("Log file not found for support log sending.");
      return { success: false, error: "Fant ikke loggfilen." };
    }
  } catch (error) {
    log.error("Error in send-logs-to-support:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ukjent feil",
    };
  }
});
