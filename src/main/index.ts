import { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeTheme } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import * as Database from "better-sqlite3";
import { importExcelData } from "./importer";
import child_process from "node:child_process";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import { databaseService } from "../services/databaseService";
import { setupDatabaseHandlers } from "./database";
import { checkForUpdatesManually } from "./auto-updater";

// Calculate __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure electron-log
log.transports.file.resolvePathFn = () => join(app.getPath("userData"), "logs", "supplier-reminder-app.log");
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.initialize({ preload: true });

log.info('App starting...');
console.log("App starting..."); // Keep console log for early stage debugging

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
process.on("unhandledRejection", (reason, _promise) => {
  log.error("Unhandled Promise Rejection:", reason);
  // Optionally show an error box here, or just log
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

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;
let tray: Tray | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: join(__dirname, "../../supplychain.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.cjs"),
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
    : `file://${join(__dirname, "../renderer/index.html")}`;

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
      const logsFolder = dirname(logFilePath);

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
  } catch (error: unknown) {
    // Catch errors during the critical startup sequence
    log.error("FATAL STARTUP ERROR:", error);
    dialog.showErrorBox(
      "Application Initialization Failed",
      `Could not initialize the application due to a database error: ${
        error instanceof Error ? error.message : String(error)
      }\n\nPlease check the logs for more details. The application will now close.`
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
  } catch (error: unknown) {
    log.error("Error closing database via databaseService:", error);
  } finally {
    log.info("Proceeding with application exit.");
    // Use process.exit instead of app.quit to force exit after cleanup attempt
    process.exit(0);
    // If you want to allow the default quit process after a delay:
    // setTimeout(() => { app.quit(); }, 500);
  }
});

// Function to create the main application window
async function createOrLoadDatabase(): Promise<Database.Database> {
  const userDataPath = app.getPath("userData");
  const dbPath = join(userDataPath, "app.sqlite");
  log.info(`Database path determined: ${dbPath}`);

  // Ensure the user data directory exists
  try {
    if (!fs.existsSync(userDataPath)) {
      log.info(`User data directory not found, creating: ${userDataPath}`);
      fs.mkdirSync(userDataPath, { recursive: true });
    }
  } catch (err: unknown) {
    log.error(`Failed to create user data directory ${userDataPath}:`, err);
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not create application data directory: ${message}`);
  }

  let db: Database.Database | null = null;
  let needsImport = false;

  if (fs.existsSync(dbPath)) {
    log.info("Existing database file found. Attempting to open...");
    try {
      db = new Database.default(dbPath);
      log.info("Successfully opened existing database.");
      // Optional: Add a quick integrity check or version check here if needed
    } catch (err: unknown) {
      log.error(`Failed to open existing database file at ${dbPath}:`, err);
      const __openErrorMessage =
        err instanceof Error ? err.message : String(err);
      // Decide how to handle corruption - e.g., backup and delete?
      const backupPath = `${dbPath}.corrupt.${Date.now()}`;
      try {
        log.warn(`Attempting to rename corrupt database to: ${backupPath}`);
        fs.renameSync(dbPath, backupPath);
        log.info("Corrupt database renamed.");
      } catch (renameErr: unknown) {
        log.error(`Failed to rename corrupt database ${dbPath}:`, renameErr);
        const renameErrorMessage =
          renameErr instanceof Error ? renameErr.message : String(renameErr);
        // If renaming fails, we might be stuck. Throw a specific error.
        throw new Error(
          `Could not open or rename the existing database file. Please check permissions or delete the file manually at ${dbPath}. Error: ${renameErrorMessage}`
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
      db = new Database.default(dbPath);
      log.info("New database file created successfully.");

      // Run the import process
      const importSuccess = await importExcelData(xlsxPath, db);

      if (!importSuccess) {
        log.error(`Excel import failed from file: ${xlsxPath}`);
        if (db) {
          try {
            db.close();
          } catch (_e: unknown) {
            /* ignore */
          }
        }
        // Try to delete the partially created/empty DB file
        try {
          fs.unlinkSync(dbPath);
        } catch (_e: unknown) {
          /* ignore */
        }
        throw new Error("Failed to import data from the selected Excel file.");
      }

      log.info("Excel import completed successfully.");
    } catch (err: unknown) {
      log.error("Error during database creation or initial import:", err);
      const importErrorMessage =
        err instanceof Error ? err.message : String(err);
      if (db) {
        try {
          db.close();
        } catch (_e: unknown) {
          /* ignore */
        }
      }
      // Attempt cleanup of potentially empty db file
      if (fs.existsSync(dbPath)) {
        try {
          fs.unlinkSync(dbPath);
          log.info("Cleaned up potentially empty DB file after error.");
        } catch (_e: unknown) {
          /* ignore */
        }
      }
      throw new Error(`Database initialization failed: ${importErrorMessage}`);
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

// --- IPC Handler for Excel Import ---
ipcMain.handle(
  "saveOrdersToDatabase",
  async (_event, payload: { fileBuffer: ArrayBuffer }) => {
    log.info(`Received 'saveOrdersToDatabase' request with file buffer.`);
    if (!payload || !payload.fileBuffer) {
      log.error("IPC 'saveOrdersToDatabase' call missing fileBuffer.");
      return { success: false, error: "No file data received." };
    }
    try {
      const db = databaseService.getDbInstance();
      if (!db) {
        log.error(
          "Database service not connected or DB connection unavailable."
        );
        throw new Error("Database connection is not available.");
      }

      log.info("Calling importExcelData with buffer...");
      // Pass buffer directly to importer (it needs adaptation)
      const success = await importExcelData(payload.fileBuffer, db);
      log.info(`importExcelData finished with success: ${success}`);

      if (success) {
        return { success: true, message: "Import completed successfully." };
      } else {
        // Check if importExcelData provides more specific error info
        throw new Error("Import process failed. Check logs for details.");
      }
    } catch (err: unknown) {
      log.error("Error during saveOrdersToDatabase handling:", err);
      // Send the actual message & stack back to renderer
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : "<no stacktrace>",
      };
    }
  }
);
// --- End IPC Handler ---

// Handle email sending
ipcMain.handle(
  "sendEmail",
  async (_, payload: { to: string; subject: string; html: string }) => {
    try {
      // Use the imported shell directly
      // const { shell } = require("electron"); // Removed

      // Clean up the HTML to extract text content
      const cleanText = payload.html
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
      const mailtoUrl = `mailto:${encodeURIComponent(
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
    // Use the imported autoUpdater
    // const { autoUpdater } = require("electron-updater"); // Removed
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
    icon: join(process.resourcesPath, "icon.png"),
  });
});

// Handle request to SHOW LOGS FOLDER
ipcMain.handle("show-logs", async () => {
  const logsDir = join(app.getPath("userData"), "logs");
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
  } catch (err: unknown) {
    log.error(`Failed to open logs directory ${logsDir}:`, err);
    const message = err instanceof Error ? err.message : String(err);
    // Show dialog to the user in the main process
    dialog.showErrorBox(
      "Error Opening Logs",
      `Could not open the logs directory.\nPath: ${logsDir}\nError: ${message}`
    );
    // Return failure status to the renderer
    return { success: false, error: message };
  }
});

// Add new IPC handler to READ LOG FILE TAIL
ipcMain.handle("read-log-tail", async (_event, lineCount: number = 200) => {
  const logFilePath = join(
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
  } catch (err: unknown) {
    log.error(`Failed to read log file tail ${logFilePath}:`, err);
    const message = err instanceof Error ? err.message : String(err);
    // Don't show error box here, just return error to renderer
    return {
      success: false,
      error: `Failed to read log file: ${message}`,
      logs: "",
    };
  }
});

// Add new IPC handler 'send-logs-to-support'
ipcMain.handle("send-logs-to-support", async () => {
  try {
    // Use imported modules
    // const os = require("os"); // Removed
    // const { shell } = require("electron"); // Removed
    // const child_process = require("child_process"); // Removed

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
