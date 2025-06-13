import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  Menu,
  IpcMainInvokeEvent,
} from "electron";
import path from "path";
import * as log from "electron-log";
import { databaseService } from "../services/databaseService";
import { setupDatabaseHandlers } from "./database";
import { checkForUpdatesManually } from "./auto-updater";
import fs from "fs";
import * as Database from "better-sqlite3"; // Import better-sqlite3
import { importAlleArk } from "./importer"; // Import the Excel importer
import child_process, { spawn } from "child_process"; // Added for send-logs-to-support
import { autoUpdater } from "electron-updater"; // Added for update:install
import type { ExcelData } from "../renderer/types/ExcelData";

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
  log.transports.file.resolvePathFn = () => logFilePath;

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "../../supplychain.png"),
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
    // 1. Initialize or Load Database (this now also connects/initializes DatabaseService)
    // The function createOrLoadDatabase will now ensure the databaseService is connected and initialized.
    await createOrLoadDatabase();

    // Ensure DatabaseService has a DB instance after createOrLoadDatabase
    if (!databaseService.getDbInstance()) {
      log.error(
        "DatabaseService has no DB instance after createOrLoadDatabase completed."
      );
      throw new Error(
        "Critical error: DatabaseService not properly initialized."
      );
    }
    log.info(
      "Database Service connection and schema initialization is handled by createOrLoadDatabase."
    );

    // 2. Setup IPC Handlers (which should now use the connected databaseService)
    log.info("Setting up IPC Handlers...");
    setupDatabaseHandlers();
    log.info("IPC Handlers setup complete.");

    // 3. Create Main Window
    log.info("Creating main window...");
    createWindow();
    log.info("Main window created.");

    // --- Added: Create Menu with "Open Log File" only ---
    try {
      const logFilePath = log.transports.file.getFile().path;
      // Determine the folder containing the logs
      const logsFolder = path.dirname(logFilePath);

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
  const dbPath = path.join(userDataPath, "app.sqlite");
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

  let dbForReturn: Database.Database | null = null;
  let needsImport = false;
  let rawDbInstanceForInitialization: Database.Database | null = null;

  if (fs.existsSync(dbPath)) {
    log.info("Existing database file found. Attempting to open...");
    try {
      rawDbInstanceForInitialization = new Database.default(dbPath);
      log.info("Successfully opened existing database.");
      // Connect and initialize schema for existing database via DatabaseService
      log.info("Connecting and initializing schema for existing database...");
      databaseService.connect(rawDbInstanceForInitialization);
      log.info(
        "Existing database schema initialization complete via DatabaseService."
      );
      dbForReturn = databaseService.getDbInstance();
    } catch (err: unknown) {
      log.error(
        `Failed to open or initialize existing database file at ${dbPath}:`,
        err
      );
      const backupPath = `${dbPath}.corrupt.${Date.now()}`;
      try {
        log.warn(`Attempting to rename corrupt database to: ${backupPath}`);
        // If rawDbInstanceForInitialization is open due to partial success, close it before rename
        if (
          rawDbInstanceForInitialization &&
          rawDbInstanceForInitialization.open
        ) {
          rawDbInstanceForInitialization.close();
        }
        fs.renameSync(dbPath, backupPath);
        log.info("Corrupt database renamed.");
      } catch (renameErr: unknown) {
        log.error(`Failed to rename corrupt database ${dbPath}:`, renameErr);
        const renameErrorMessage =
          renameErr instanceof Error ? renameErr.message : String(renameErr);
        throw new Error(
          `Could not open or rename the existing database file. Please check permissions or delete the file manually at ${dbPath}. Error: ${renameErrorMessage}`
        );
      }
      rawDbInstanceForInitialization = null; // Ensure it's null for the import path
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

    let tempDbInstance: Database.Database | null = null;
    try {
      // Create the new database file
      log.info(`Creating new database file at: ${dbPath}`);
      tempDbInstance = new Database.default(dbPath);
      log.info("New database file created successfully.");

      // Connect and initialize the schema via DatabaseService
      log.info("Connecting and initializing schema for new database...");
      databaseService.connect(tempDbInstance); // This will call .initialize()
      log.info("New database schema initialized via DatabaseService.");

      // Get the (now initialized) instance from the service for the import
      const initializedDbForImport = databaseService.getDbInstance();
      if (!initializedDbForImport) {
        log.error(
          "Failed to get initialized DB instance from DatabaseService after connection."
        );
        if (tempDbInstance && tempDbInstance.open) tempDbInstance.close();
        throw new Error(
          "Database service could not provide an initialized database instance for import."
        );
      }

      // Run the import process
      log.info(`Starting Excel import from: ${xlsxPath}`);
      const importSuccess = await importAlleArk(
        xlsxPath,
        initializedDbForImport
      );

      if (!importSuccess) {
        log.error(`Excel import failed from file: ${xlsxPath}`);
        // databaseService.close() will handle closing the db instance
        throw new Error("Failed to import data from the selected Excel file.");
      }

      log.info("Excel import completed successfully.");
      dbForReturn = initializedDbForImport;
    } catch (err: unknown) {
      log.error("Error during database creation or initial import:", err);
      const importErrorMessage =
        err instanceof Error ? err.message : String(err);

      // Attempt to close and delete the problematic DB file
      if (databaseService.getDbInstance()) {
        databaseService.close(); // Closes the instance managed by the service
      } else if (tempDbInstance && tempDbInstance.open) {
        tempDbInstance.close(); // Closes the raw instance if service didn't connect
      }

      if (fs.existsSync(dbPath)) {
        try {
          fs.unlinkSync(dbPath);
          log.info(
            "Cleaned up database file after import/initialization error."
          );
        } catch (cleanupErr) {
          log.error(
            "Error during cleanup of database file after import error:",
            cleanupErr
          );
        }
      }
      throw new Error(`Database initialization failed: ${importErrorMessage}`);
    }
  }

  // If dbForReturn is not set, it means an existing DB was expected but failed to open/initialize,
  // and the import path was not taken or also failed.
  if (!dbForReturn) {
    log.error(
      "Database instance (dbForReturn) is null after initialization process. This indicates a critical logical error."
    );
    throw new Error(
      "Failed to obtain a valid database connection. The database service may not be connected."
    );
  }

  // The actual database instance used by the app is now managed by DatabaseService.
  // We return the instance that was successfully connected and initialized.
  return dbForReturn;
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

      log.info("Calling importAlleArk with buffer...");
      // Pass buffer directly to importer (it needs adaptation)
      const success = await importAlleArk(payload.fileBuffer, db);
      log.info(`importAlleArk finished with success: ${success}`);

      if (success) {
        return { success: true, message: "Import completed successfully." };
      } else {
        // Check if importAlleArk provides more specific error info
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

/**
 * Validate that the parsed Excel data has all required fields before saving.
 */
ipcMain.handle(
  "validateData",
  async (event: IpcMainInvokeEvent, parsedData: ExcelData) => {
    if (!parsedData) {
      throw new Error("No parsed data provided");
    }
    const { bp } = parsedData;

    // Only validate BP data now - it's the only required sheet
    if (!Array.isArray(bp) || bp.length === 0) {
      throw new Error("Missing or empty BP data");
    }

    // Validate that BP data has required fields
    const invalidRows = bp.filter(
      (row) =>
        !row.poNumber ||
        !row.supplier ||
        row.poNumber.trim() === "" ||
        row.supplier.trim() === ""
    );

    if (invalidRows.length > 0) {
      throw new Error(
        `Found ${invalidRows.length} rows with missing PO number or supplier information`
      );
    }

    return {
      success: true,
      data: {
        bpCount: bp.length,
      },
    };
  }
);

// Handle email sending via .eml file for proper HTML rendering
ipcMain.handle(
  "sendEmail",
  async (_, payload: { to: string; subject: string; html: string }) => {
    try {
      log.info(`Creating HTML email draft for: ${payload.to}`);
      log.info(`Subject: ${payload.subject}`);

      // Get the email address from supplier_emails table
      const emailTo =
        databaseService.getSupplierEmail(payload.to) || payload.to;
      log.info(`Resolved email address: ${emailTo}`);

      // Ensure we have a valid email address
      if (!emailTo.includes("@")) {
        log.warn(`No valid email address found for supplier: ${payload.to}`);
        return {
          success: false,
          error: `Ingen e-postadresse funnet for ${payload.to}. Sjekk leverandør e-post innstillinger.`,
        };
      }

      // Create .eml file with proper MIME headers for HTML
      // Use the official supply planning email address for all communications
      const senderEmail = "supply.planning.no@onemed.com";
      const EOL = "\r\n";
      const headers = [
        `From: OneMed Norge AS <${senderEmail}>`,
        `Reply-To: ${senderEmail}`,
        `Sender: ${senderEmail}`,
        `Return-Path: ${senderEmail}`,
        `To: ${emailTo}`,
        `Subject: ${payload.subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: 8bit`,
        `X-Mailer: OneMed SupplyChain`,
        ``,
      ].join(EOL);

      // Ensure proper line endings for email and clean up the HTML
      const cleanHtml = payload.html
        .replace(/<style>.*?<\/style>/gs, "")
        .replace(/<head>.*?<\/head>/gs, "")
        .replace(/<script>.*?<\/script>/gs, "")
        .trim();

      const body = cleanHtml.replace(/\r?\n/g, EOL);
      const emlContent = headers + body;

      // Write to temp file
      const tempDir = app.getPath("temp");
      const fileName = `onemed-reminder-${Date.now()}.eml`;
      const filePath = path.join(tempDir, fileName);

      fs.writeFileSync(filePath, emlContent, "utf8");
      log.info(`Created .eml file: ${filePath}`);

      // Open in default mail client as HTML draft
      await shell.openPath(filePath);
      log.info(`Opened HTML email draft in default mail client`);

      return { success: true, filePath };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("Error creating email draft:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

// Handle automatic email sending via Outlook COM API
ipcMain.handle(
  "sendEmailAutomatically",
  async (_, payload: { to: string; subject: string; html: string }) => {
    try {
      log.info(`Attempting automatic email send to: ${payload.to}`);
      log.info(`Subject: ${payload.subject}`);

      // Only available on Windows
      if (process.platform !== "win32") {
        log.warn("Automatic Outlook sending only available on Windows");
        return {
          success: false,
          error: "Automatisk sending er kun tilgjengelig på Windows",
        };
      }

      // Get the email address from supplier_emails table
      const emailTo =
        databaseService.getSupplierEmail(payload.to) || payload.to;
      log.info(`Resolved email address: ${emailTo}`);

      // Ensure we have a valid email address
      if (!emailTo.includes("@")) {
        log.warn(`No valid email address found for supplier: ${payload.to}`);
        return {
          success: false,
          error: `Ingen e-postadresse funnet for ${payload.to}. Sjekk leverandør e-post innstillinger.`,
        };
      }

      // 🔍 DEBUG: Log the HTML content being sent to PowerShell
      log.info("HTML content length (before escaping):", payload.html.length);
      log.info(
        "HTML preview (first 200 chars):",
        payload.html.substring(0, 200)
      );

      // Escape special characters for PowerShell script embedding
      // Order matters: escape backticks first, then dollar signs, then quotes
      const escapedHtml = payload.html
        .replace(/`/g, "``") // Escape backticks first (PowerShell escape char)
        .replace(/\$/g, "`$") // Escape dollar signs (PowerShell variables)
        .replace(/"/g, '""'); // Escape double quotes (PowerShell strings)

      const escapedSubject = payload.subject
        .replace(/`/g, "``")
        .replace(/\$/g, "`$")
        .replace(/"/g, '""');

      // 🔍 DEBUG: Log escaped HTML info
      log.info(
        "HTML content length (after escaping, for PS script):",
        escapedHtml.length
      );
      log.info(
        "Escaped HTML preview (first 200 chars):",
        escapedHtml.substring(0, 200)
      );

      // PowerShell script to send email via Outlook COM
      // This script will be sent via stdin to avoid command-line length limits
      const powershellScript = `
try {
  Write-Output "DEBUG: Starting Outlook COM automation..."
  $outlook = New-Object -ComObject Outlook.Application
  Write-Output "DEBUG: Outlook application object created"
  $mail = $outlook.CreateItem(0)
  Write-Output "DEBUG: Mail item created"

  $mail.To = "${emailTo}"
  Write-Output "DEBUG: Recipient set to ${emailTo}"

  $mail.Subject = @"
${escapedSubject}
"@
  Write-Output "DEBUG: Subject set"

  # Using here-string for HTMLBody to handle multi-line content robustly
  $htmlContent = @"
${escapedHtml}
"@
  Write-Output "DEBUG: HTML content length in PS: $($htmlContent.Length)"
  Write-Output "DEBUG: HTML preview in PS: $($htmlContent.Substring(0, [Math]::Min(100, $htmlContent.Length)))"
  $mail.HTMLBody = $htmlContent
  Write-Output "DEBUG: HTML body set successfully"

  $mail.SentOnBehalfOfName = "supply.planning.no@onemed.com"
  Write-Output "DEBUG: Sender information set"

  $mail.Send()
  Write-Output "DEBUG: Send command executed"
  Write-Output "SUCCESS: Email sent successfully to ${emailTo}"
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
  Write-Output "ERROR_DETAILS: $($_.Exception.ToString())"
  Write-Output "ERROR_TYPE: $($_.Exception.GetType().FullName)"
}
`;

      return new Promise((resolve) => {
        // 🚀 CRITICAL FIX: Use stdin to avoid command-line length limits and escaping issues
        // -NoProfile: Clean environment, avoids Conda profile issues
        // -ExecutionPolicy Bypass: Bypasses execution policy for this session
        // -Command -: Read script from stdin
        const psProcess = spawn(
          "powershell",
          ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "-"],
          {
            windowsHide: true,
            stdio: ["pipe", "pipe", "pipe"], // stdin, stdout, stderr
          }
        );

        let output = "";
        let errorOutput = "";

        // Write the PowerShell script to stdin
        if (psProcess.stdin) {
          psProcess.stdin.write(powershellScript + "\r\n"); // Add newline for safety
          psProcess.stdin.end();
        } else {
          log.error("PowerShell process stdin is not available.");
          resolve({
            success: false,
            error: "PowerShell stdin utilgjengelig.",
          });
          return;
        }

        psProcess.stdout.on("data", (data: Buffer) => {
          output += data.toString();
        });

        psProcess.stderr.on("data", (data: Buffer) => {
          errorOutput += data.toString();
        });

        psProcess.on("close", (code: number | null) => {
          log.info(`PowerShell process exited with code: ${code}`);
          log.info(`PowerShell output:\n${output}`); // Log full output

          if (errorOutput) {
            log.warn(`PowerShell stderr:\n${errorOutput}`); // Log full stderr
          }

          if (output.includes("SUCCESS")) {
            log.info(`Email sent automatically via Outlook to: ${emailTo}`);
            resolve({ success: true });
          } else {
            const errorMatch = output.match(/ERROR:\s*(.*)/);
            const errorMsg =
              errorMatch && errorMatch[1]
                ? errorMatch[1].trim()
                : `PowerShell failed. Code: ${code}. See logs.`;

            log.error(
              "PowerShell automation failed:",
              errorMsg,
              "Full output:",
              output,
              "Full stderr:",
              errorOutput
            );
            resolve({
              success: false,
              error: `Automatisk sending feilet: ${errorMsg}`,
            });
          }
        });

        psProcess.on("error", (error: Error) => {
          log.error(
            "PowerShell process failed to spawn or other error:",
            error
          );
          resolve({
            success: false,
            error: `PowerShell prosess feil: ${error.message}`,
          });
        });
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("Automatic email sending error:", errorMessage);
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

// Expose outstanding POs to the renderer
ipcMain.handle("getOutstandingOrders", async (_event, supplier: string) => {
  try {
    const dbsvc = databaseService;
    if (!dbsvc.getDbInstance()) {
      // It's better to return a structured error response
      return { success: false, error: "Database not connected" };
    }
    const orders = dbsvc.getOutstandingOrders(supplier);
    return { success: true, data: orders }; // Wrap the response
  } catch (err) {
    log.error("IPC getOutstandingOrders error:", err);
    // Ensure a structured error response is also returned on catch
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
});

// Add new IPC handler to get all supplier names for debugging
ipcMain.handle("getAllSupplierNames", async () => {
  try {
    const suppliers = databaseService.getAllSupplierNames();
    return { success: true, data: suppliers };
  } catch (error) {
    log.error("Error getting supplier names:", error);
    return { success: false, error: String(error) };
  }
});

// Add IPC handler for getting supplier email
ipcMain.handle("getSupplierEmail", async (event, supplierName: string) => {
  try {
    const email = databaseService.getSupplierEmail(supplierName);
    return { success: true, data: email };
  } catch (error) {
    log.error("Error getting supplier email:", error);
    return { success: false, error: String(error) };
  }
});

// Add IPC handler for saving debug HTML files
ipcMain.handle(
  "saveDebugHtml",
  async (
    _,
    payload: {
      filename: string;
      content: string;
      description: string;
    }
  ) => {
    try {
      log.info(`Saving debug HTML: ${payload.description}`);

      // Create debug directory in user data
      const debugDir = path.join(app.getPath("userData"), "debug");
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }

      // Create full file path
      const filePath = path.join(debugDir, payload.filename);

      // Write HTML content to file
      await fs.promises.writeFile(filePath, payload.content, "utf8");

      log.info(`Debug HTML saved to: ${filePath}`);
      return { success: true, filePath };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      log.error("Error saving debug HTML:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

// Add IPC handler for opening debug folder
ipcMain.handle("openDebugFolder", async () => {
  try {
    const debugDir = path.join(app.getPath("userData"), "debug");

    // Ensure the directory exists
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    // Open the directory in the default file explorer
    const errorMsg = await shell.openPath(debugDir);
    if (errorMsg) {
      log.error(`Failed to open debug folder: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    log.info(`Opened debug folder: ${debugDir}`);
    return { success: true, path: debugDir };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    log.error("Error opening debug folder:", errorMessage);
    return { success: false, error: errorMessage };
  }
});

// 🚀 NEW: Hybrid method - Create .eml file and send via PowerShell COM
ipcMain.handle(
  "sendEmailViaEmlAndCOM",
  async (
    _,
    payload: {
      to: string;
      subject: string;
      html: string;
    }
  ) => {
    try {
      log.info(
        `🚀 DIRECT: Creating .eml file and sending via Direct Open-and-Send method to: ${payload.to}`
      );

      // Only available on Windows
      if (process.platform !== "win32") {
        log.warn("Direct .eml + COM sending only available on Windows");
        return {
          success: false,
          error: "Direct .eml sending er kun tilgjengelig på Windows",
        };
      }

      // Get the email address from supplier_emails table
      const emailTo =
        databaseService.getSupplierEmail(payload.to) || payload.to;
      log.info(`Resolved email address: ${emailTo}`);

      // Ensure we have a valid email address
      if (!emailTo.includes("@")) {
        log.warn(`No valid email address found for supplier: ${payload.to}`);
        return {
          success: false,
          error: `Ingen e-postadresse funnet for ${payload.to}. Sjekk leverandør e-post innstillinger.`,
        };
      }

      // 1. Create .eml file with proper MIME headers (same as existing method)
      const senderEmail = "supply.planning.no@onemed.com";
      const EOL = "\r\n";
      const headers = [
        `From: OneMed Norge AS <${senderEmail}>`,
        `Reply-To: ${senderEmail}`,
        `Sender: ${senderEmail}`,
        `Return-Path: ${senderEmail}`,
        `To: ${emailTo}`,
        `Subject: ${payload.subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: 8bit`,
        `X-Mailer: OneMed SupplyChain`,
        ``,
      ].join(EOL);

      // Clean up the HTML (remove any remaining style tags, scripts, etc.)
      const cleanHtml = payload.html
        .replace(/<style>.*?<\/style>/gs, "")
        .replace(/<head>.*?<\/head>/gs, "")
        .replace(/<script>.*?<\/script>/gs, "")
        .trim();

      const body = cleanHtml.replace(/\r?\n/g, EOL);
      const emlContent = headers + body;

      // Write to temp file
      const tempDir = app.getPath("temp");
      const fileName = `onemed-direct-${Date.now()}.eml`;
      const filePath = path.join(tempDir, fileName);

      fs.writeFileSync(filePath, emlContent, "utf8");
      log.info(`🚀 DIRECT: Created .eml file: ${filePath}`);

      // 2. Use PowerShell COM to open .eml file and send it directly (Possibility 1)
      const escapedFilePath = filePath
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '""');

      const powershellScript = `
      try {
        Write-Output "🚀 DIRECT: Starting Direct Open-and-Send method..."
        
        # Create Outlook application object
        $outlook = New-Object -ComObject Outlook.Application
        Write-Output "🚀 DIRECT: Outlook application object created"
        
        # Open the .eml file using Session.OpenSharedItem
        $emlPath = "${escapedFilePath}"
        Write-Output "🚀 DIRECT: Opening .eml file: $emlPath"
        Write-Output "🚀 DIRECT: File exists check: $(Test-Path $emlPath)"
        Write-Output "🚀 DIRECT: File size: $((Get-Item $emlPath -ErrorAction SilentlyContinue).Length) bytes"
        
        # This opens the .eml file and creates a MailItem (may briefly show window)
        $mailItem = $outlook.Session.OpenSharedItem($emlPath)
        Write-Output "🚀 DIRECT: .eml file opened as MailItem"
        
        # Verify the mail item was created successfully
        if ($mailItem -eq $null) {
          throw "Failed to open .eml file as MailItem"
        }
        
        # Log mail item properties for debugging
        Write-Output "🚀 DIRECT: Mail item properties:"
        Write-Output "  - To: $($mailItem.To)"
        Write-Output "  - Subject: $($mailItem.Subject)"
        Write-Output "  - HTML Body Length: $($mailItem.HTMLBody.Length)"
        Write-Output "  - Body Format: $($mailItem.BodyFormat)"
        
        # Send the email directly (this is the critical moment for security prompts)
        Write-Output "🚀 DIRECT: Attempting to send email..."
        $mailItem.Send()
        Write-Output "🚀 DIRECT: Send command executed successfully"
        
        # Close the mail item window (if it was opened) - olDiscard = 2
        try {
          $mailItem.Close(2)
          Write-Output "🚀 DIRECT: Mail item window closed"
        } catch {
          Write-Output "🚀 DIRECT: Note: Could not close mail item window (may not have been visible): $($_.Exception.Message)"
        }
        
        # Clean up the temporary .eml file after a brief delay
        Start-Sleep -Seconds 2
        if (Test-Path $emlPath) {
          Remove-Item $emlPath -Force
          Write-Output "🚀 DIRECT: Temporary .eml file cleaned up"
        }
        
        Write-Output "SUCCESS: Direct .eml email sent successfully to ${emailTo}"
      } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
        Write-Output "ERROR_DETAILS: $($_.Exception.ToString())"
        Write-Output "ERROR_TYPE: $($_.Exception.GetType().FullName)"
        
        # If we have a mail item reference, try to close it
        if ($mailItem -ne $null) {
          try {
            $mailItem.Close(2)  # olDiscard
            Write-Output "🚀 DIRECT: Closed mail item after error"
          } catch {
            Write-Output "🚀 DIRECT: Could not close mail item after error"
          }
        }
        
        # Clean up .eml file on error
        if (Test-Path "${escapedFilePath}") {
          try {
            Remove-Item "${escapedFilePath}" -Force
            Write-Output "🚀 DIRECT: Cleaned up .eml file after error"
          } catch {
            Write-Output "🚀 DIRECT: Could not clean up .eml file: $($_.Exception.Message)"
          }
        }
      }
    `;

      return new Promise((resolve) => {
        const process = spawn("powershell", ["-Command", powershellScript], {
          windowsHide: true,
          stdio: ["pipe", "pipe", "pipe"],
        });

        let output = "";
        let errorOutput = "";

        process.stdout.on("data", (data: Buffer) => {
          output += data.toString();
        });

        process.stderr.on("data", (data: Buffer) => {
          errorOutput += data.toString();
        });

        process.on("close", (code: number | null) => {
          log.info(`🚀 DIRECT: PowerShell process exited with code: ${code}`);
          log.info(`🚀 DIRECT: PowerShell output: ${output}`);

          if (errorOutput) {
            log.warn(`🚀 DIRECT: PowerShell stderr: ${errorOutput}`);
          }

          // Clean up .eml file if it still exists (backup cleanup)
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              log.info(`🚀 DIRECT: Backup cleanup of .eml file completed`);
            }
          } catch (cleanupError) {
            log.warn(`🚀 DIRECT: Backup cleanup failed:`, cleanupError);
          }

          if (output.includes("SUCCESS")) {
            log.info(
              `🚀 DIRECT: Email sent successfully via Direct Open-and-Send method to: ${emailTo}`
            );
            resolve({ success: true });
          } else {
            const errorMsg = output.includes("ERROR:")
              ? output.split("ERROR:")[1].trim()
              : `PowerShell failed with code ${code}. Output: ${output}`;

            log.error("🚀 DIRECT: PowerShell automation failed:", errorMsg);
            resolve({
              success: false,
              error: `Direct sending feilet: ${errorMsg}`,
            });
          }
        });

        process.on("error", (error: Error) => {
          log.error("🚀 DIRECT: PowerShell process error:", error);

          // Clean up .eml file on process error
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              log.info(`🚀 DIRECT: Cleaned up .eml file after process error`);
            }
          } catch (cleanupError) {
            log.warn(
              `🚀 DIRECT: Cleanup after process error failed:`,
              cleanupError
            );
          }

          resolve({
            success: false,
            error: `Direct PowerShell prosess feil: ${error.message}`,
          });
        });
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("🚀 DIRECT: Email sending error:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);
