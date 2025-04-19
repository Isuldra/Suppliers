import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from "electron";
import path from "path";
import { ExcelData, ValidationResult } from "../renderer/types/ExcelData";
import log from "electron-log";
import { databaseService } from "../services/databaseService";
import { startOfWeek } from "../utils/dateUtils"; // We'll create this file later
import { setupDatabaseHandlers, closeDatabaseConnection } from "./database";
import { checkForUpdatesManually } from "./auto-updater";
import { fileURLToPath } from "url";
import fs from "fs";
import Database from "better-sqlite3"; // Import better-sqlite3
import { importAlleArk } from "./importer"; // Import the Excel importer

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
  dialog.showErrorBox(
    "Fatal Application Error",
    `An unexpected error occurred: ${error.message}\n\nDetails: ${
      error.stack || "No stack trace"
    }\n\nThe application will now close. Please report this issue.`
  );
  // Ensure app quits cleanly
  app.quit();
});

// Add a global error handler for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  log.error("Unhandled Promise Rejection:", reason);
  // Optionally show an error box here too, or just log
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

  log.info(`Loading window URL: ${url}`);
  mainWindow.loadURL(url).catch((err) => {
    log.error("Failed to load main window URL:", url, err);
    dialog.showErrorBox(
      "Load Error",
      `Could not load the application window. Please check logs.\nError: ${err.message}`
    );
    app.quit();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Initialize database when the app is ready
app.whenReady().then(async () => {
  log.info("App is ready. Initializing database and application...");
  try {
    // 1. Initialize or Load Database
    const dbInstance = await createOrLoadDatabase();

    // 2. Connect the DatabaseService
    log.info("Connecting Database Service...");
    databaseService.connect(dbInstance); // Pass the obtained instance
    log.info("Database Service connected.");

    // 3. Setup IPC Handlers (which should now use the connected databaseService)
    log.info("Setting up IPC Handlers...");
    setupDatabaseHandlers();
    log.info("IPC Handlers setup complete.");

    // 4. Create Main Window
    log.info("Creating main window...");
    createWindow();
    log.info("Main window created.");

    // --- Added: Create Menu with "Open Log File" only ---
    try {
      const logFilePath = log.transports.file.getFile().path;
      // Determine the folder containing the logs
      const logsFolder = require("path").dirname(logFilePath);

      const template: Electron.MenuItemConstructorOptions[] = [
        { role: "fileMenu" }, // standard File menu
        { role: "editMenu" }, // standard Edit menu
        { role: "viewMenu" }, // standard View menu
        {
          label: "Help",
          submenu: [
            {
              label: "Open Log Folder",
              click: () => {
                log.info(`Opening log folder: ${logsFolder}`);
                // On Windows, this will open Explorer at that folder.
                shell.openPath(logsFolder).catch((err) => {
                  log.error("Failed to open log folder:", err);
                  dialog.showErrorBox(
                    "Error Opening Log Folder",
                    `Could not open the log folder:\n${logsFolder}\n\nError: ${err.message}`
                  );
                });
              },
            },
            // Re-add other Help items if they were removed in the paste
            {
              label: "Check for Updates...",
              click: () => {
                log.info("Manual update check triggered from menu.");
                checkForUpdatesManually();
              },
            },
            {
              label: "Learn More (Wiki)",
              click: async () => {
                const wikiUrl = "https://github.com/Isuldra/Suppliers/wiki";
                log.info(`Attempting to open external link: ${wikiUrl}`);
                await shell.openExternal(wikiUrl);
              },
            },
          ],
        },
      ];

      // On macOS, prepend the app name menu
      if (process.platform === "darwin") {
        template.unshift({
          label: app.getName(),
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        });
      }

      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
      log.info("Application menu with 'Open Log Folder' created.");
    } catch (err) {
      log.error("Failed to create application menu:", err);
    }
    // --- End Added Section ---
  } catch (error: any) {
    // Catch errors during the critical startup sequence
    log.error("FATAL STARTUP ERROR:", error);
    dialog.showErrorBox(
      "Application Initialization Failed",
      `Could not initialize the application due to a database error: ${error.message}\n\nPlease check the logs for more details. The application will now close.`
    );
    app.quit();
    return; // Stop further execution in this callback
  }

  // Activate logic remains the same
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      log.info("App activated with no windows open, creating main window...");
      createWindow();
    }
  });
});

// Close database when app is about to quit
app.on("will-quit", async (event) => {
  log.info("'will-quit' event received. Attempting to close database...");
  event.preventDefault(); // Prevent immediate quitting

  try {
    // Use the refactored databaseService close method
    databaseService.close();
    log.info("Database closed successfully via databaseService.close()");
  } catch (error) {
    log.error("Error closing database via databaseService:", error);
  } finally {
    log.info("Proceeding with application exit.");
    // Use process.exit instead of app.quit to force exit after cleanup attempt
    process.exit(0);
    // If you want to allow the default quit process after a delay:
    // setTimeout(() => { app.quit(); }, 500);
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
    log.info(`Attempting to open external link: ${url}`);
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    log.error(`Error opening external link ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
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

// Handle request to SHOW LOGS FOLDER
ipcMain.handle("show-logs", async () => {
  const logsDir = path.join(app.getPath("userData"), "logs");
  log.info(`Request received to open logs directory: ${logsDir}`);

  try {
    // Ensure the directory exists before trying to open it
    if (!fs.existsSync(logsDir)) {
      log.warn(
        `Logs directory does not exist, attempting to create: ${logsDir}`
      );
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Open the directory in the default file explorer
    // shell.openPath returns a promise resolving to a string
    // containing an error message if it failed, or an empty string if successful.
    const errorMsg = await shell.openPath(logsDir);
    if (errorMsg) {
      log.error(`shell.openPath failed to open ${logsDir}: ${errorMsg}`);
      throw new Error(errorMsg); // Throw error to be caught below
    }
    log.info(`Successfully initiated opening of logs directory: ${logsDir}`);
    return { success: true }; // Indicate success to renderer if needed
  } catch (err: any) {
    log.error(`Failed to open logs directory ${logsDir}:`, err);
    // Show dialog to the user in the main process
    dialog.showErrorBox(
      "Error Opening Logs",
      `Could not open the logs directory.\nPath: ${logsDir}\nError: ${
        err.message || err
      }`
    );
    // Return failure status to the renderer
    return { success: false, error: err.message || String(err) };
  }
});

// Add new IPC handler to READ LOG FILE TAIL
ipcMain.handle("read-log-tail", async (_event, lineCount: number = 200) => {
  const logFilePath = path.join(
    app.getPath("userData"),
    "logs",
    "supplier-reminder-app.log"
  );
  log.info(
    `Request received to read log tail (${lineCount} lines) from: ${logFilePath}`
  );

  try {
    if (!fs.existsSync(logFilePath)) {
      log.warn(`Log file not found at: ${logFilePath}`);
      return { success: false, error: "Log file not found.", logs: "" };
    }

    const data = await fs.promises.readFile(logFilePath, "utf-8");
    const lines = data.trim().split(/\r?\n/); // Split by newline, handling Windows/Unix
    const tailLines = lines.slice(-lineCount); // Get the last N lines

    log.info(`Returning last ${tailLines.length} lines from log file.`);
    return { success: true, logs: tailLines.join("\n") };
  } catch (err: any) {
    log.error(`Failed to read log file tail ${logFilePath}:`, err);
    // Don't show error box here, just return error to renderer
    return {
      success: false,
      error: `Failed to read log file: ${err.message || err}`,
      logs: "",
    };
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

// Function to create the main application window
async function createOrLoadDatabase(): Promise<Database.Database> {
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "app.sqlite");
  log.info(`Database path determined: ${dbPath}`);

  // Ensure the user data directory exists
  try {
    if (!fs.existsSync(userDataPath)) {
      log.info(`User data directory not found, creating: ${userDataPath}`);
      fs.mkdirSync(userDataPath, { recursive: true });
    }
  } catch (err: any) {
    log.error(`Failed to create user data directory ${userDataPath}:`, err);
    throw new Error(
      `Could not create application data directory: ${err.message}`
    );
  }

  let db: Database.Database | null = null;
  let needsImport = false;

  if (fs.existsSync(dbPath)) {
    log.info("Existing database file found. Attempting to open...");
    try {
      db = new Database(dbPath);
      log.info("Successfully opened existing database.");
      // Optional: Add a quick integrity check or version check here if needed
    } catch (err: any) {
      log.error(`Failed to open existing database file at ${dbPath}:`, err);
      // Decide how to handle corruption - e.g., backup and delete?
      const backupPath = `${dbPath}.corrupt.${Date.now()}`;
      try {
        log.warn(`Attempting to rename corrupt database to: ${backupPath}`);
        fs.renameSync(dbPath, backupPath);
        log.info("Corrupt database renamed.");
      } catch (renameErr: any) {
        log.error(`Failed to rename corrupt database ${dbPath}:`, renameErr);
        // If renaming fails, we might be stuck. Throw a specific error.
        throw new Error(
          `Could not open or rename the existing database file. Please check permissions or delete the file manually at ${dbPath}. Error: ${renameErr.message}`
        );
      }
      db = null; // Ensure db is null so we proceed to import
      needsImport = true;
    }
  } else {
    log.info("No existing database file found. Import needed.");
    needsImport = true;
  }

  if (needsImport) {
    log.info("Prompting user to select Excel file for initial import...");
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Select Master Excel File",
      message:
        "Please select the master Excel (.xlsx) file to initialize the database.",
      filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
      properties: ["openFile"],
    });

    if (canceled || filePaths.length === 0) {
      log.error("User canceled Excel file selection.");
      throw new Error("Excel file selection is required for the first run.");
    }

    const xlsxPath = filePaths[0];
    log.info(`User selected Excel file: ${xlsxPath}`);

    try {
      // Create the new database file *before* importing
      log.info(`Creating new database file at: ${dbPath}`);
      db = new Database(dbPath);
      log.info("New database file created successfully.");

      // Run the import process
      const importSuccess = await importAlleArk(xlsxPath, db);

      if (!importSuccess) {
        log.error(`Excel import failed from file: ${xlsxPath}`);
        if (db) {
          try {
            db.close();
          } catch (e) {
            /* ignore */
          }
        }
        // Try to delete the partially created/empty DB file
        try {
          fs.unlinkSync(dbPath);
        } catch (e) {
          /* ignore */
        }
        throw new Error("Failed to import data from the selected Excel file.");
      }

      log.info("Excel import completed successfully.");
    } catch (err: any) {
      log.error("Error during database creation or initial import:", err);
      if (db) {
        try {
          db.close();
        } catch (e) {
          /* ignore */
        }
      }
      // Attempt cleanup of potentially empty db file
      if (fs.existsSync(dbPath)) {
        try {
          fs.unlinkSync(dbPath);
          log.info("Cleaned up potentially empty DB file after error.");
        } catch (e) {
          /* ignore */
        }
      }
      throw new Error(`Database initialization failed: ${err.message}`);
    }
  }

  // If we reach here, db should be a valid, open connection
  if (!db) {
    // This should theoretically not happen if logic above is correct
    log.error(
      "Database instance is null after initialization process. This indicates a logical error."
    );
    throw new Error("Failed to obtain a valid database connection.");
  }

  return db;
}
