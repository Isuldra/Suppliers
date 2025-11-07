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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const log = require("electron-log/main"); // Required for CJS interop in Electron main process
import { databaseService } from "../services/databaseService";
import { setupDatabaseHandlers } from "./database";
import { checkForUpdatesManually } from "./auto-updater";
import fs from "fs";
import os from "os";
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

// Add IPC handler for getting system language
ipcMain.handle("get-system-language", () => {
  return {
    locale: app.getLocale(), // e.g., 'nb', 'sv', 'da', 'fi'
    systemLocale: app.getSystemLocale(), // e.g., 'nb-NO', 'sv-SE'
    preferredLanguages: app.getPreferredSystemLanguages(), // ['nb-NO', 'en-US', ...]
  };
});

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  log.info("Main window created (URL not loaded yet).");
  return mainWindow;
}

function loadWindowURL(window: BrowserWindow): void {
  const isDev = process.env.NODE_ENV === "development";
  const url = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../renderer/index.html")}`;

  log.info(`Loading window URL: ${url}`);
  window.loadURL(url).catch((err) => {
    log.error("Failed to load main window URL:", url, err);
    dialog.showErrorBox(
      "Load Error",
      `Could not load the application window. Please check logs.\nError: ${err.message}`
    );
    app.quit();
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

    // 2.5. Sync Product Catalog from Supabase (background, non-blocking)
    log.info("Starting product catalog sync from Supabase...");
    import("../services/productCatalogService")
      .then(({ productCatalogService }) => {
        return productCatalogService.syncFromCloud();
      })
      .then((result) => {
        if (result.success) {
          log.info(
            `Product catalog synced successfully: ${result.count} products`
          );
        } else {
          log.warn(
            `Product catalog sync failed: ${result.error || "Unknown error"}`
          );
        }
      })
      .catch((error) => {
        log.error("Error during product catalog sync:", error);
      });

    // 3. Create Main Window (but don't load URL yet)
    log.info("Creating main window...");
    const mainWindow = createWindow();

    // 4. Load the renderer URL after everything is set up
    log.info("Loading renderer URL...");
    loadWindowURL(mainWindow);

    // --- Added: Create Menu with "Open Log File" only ---
    try {
      const logFilePath = log.transports.file.getFile().path;
      // Determine the folder containing the logs
      const logsFolder = path.dirname(logFilePath);

      const isDev = process.env.NODE_ENV === "development";
      const template: Electron.MenuItemConstructorOptions[] = [
        { role: "fileMenu" }, // standard File menu
        { role: "editMenu" }, // standard Edit menu
        // Custom View menu: hide DevTools in production builds
        isDev
          ? { role: "viewMenu" }
          : {
              label: "View",
              submenu: [
                { role: "resetZoom" },
                { role: "zoomIn" },
                { role: "zoomOut" },
                { type: "separator" },
                { role: "togglefullscreen" },
              ],
            },
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
      // Invalidate dashboard cache after successful import
      databaseService.invalidateDashboardCache();
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
        // Invalidate dashboard cache after successful import
        databaseService.invalidateDashboardCache();
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

      // Use the provided email address directly if it contains @, otherwise lookup in database
      const emailTo = payload.to.includes("@")
        ? payload.to
        : databaseService.getSupplierEmail(payload.to) || payload.to;
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

      // Properly encode the subject for UTF-8
      const encodedSubject = Buffer.from(payload.subject, "utf8").toString(
        "base64"
      );
      const headers = [
        `From: OneMed Norge AS <${senderEmail}>`,
        `Reply-To: ${senderEmail}`,
        `Sender: ${senderEmail}`,
        `Return-Path: ${senderEmail}`,
        `To: ${emailTo}`,
        `Subject: =?UTF-8?B?${encodedSubject}?=`,
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

// Handle batch email sending via PowerShell - OPTIMIZED VERSION
ipcMain.handle(
  "sendBatchEmails",
  async (_, payload: Array<{ to: string; subject: string; html: string }>) => {
    const tempFiles: string[] = [];

    try {
      log.info(`Starting batch email sending for ${payload.length} emails`);

      // Only available on Windows
      if (process.platform !== "win32") {
        log.warn("Batch email sending only available on Windows");
        return {
          success: false,
          error: "Batch sending er kun tilgjengelig på Windows",
        };
      }

      // Create temporary files for all emails
      const emailData: Array<{
        to: string;
        htmlFile: string;
        subjectFile: string;
        resolvedEmail: string;
      }> = [];

      for (let i = 0; i < payload.length; i++) {
        const email = payload[i];

        // Use the provided email address directly if it contains @, otherwise lookup in database
        const emailTo = email.to.includes("@")
          ? email.to
          : databaseService.getSupplierEmail(email.to) || email.to;

        // Ensure we have a valid email address
        if (!emailTo.includes("@")) {
          log.warn(`No valid email address found for supplier: ${email.to}`);
          continue; // Skip this email
        }

        // Create temporary files for this email
        const htmlFile = path.join(
          os.tmpdir(),
          `onemed-batch-${Date.now()}-${i}.html`
        );
        const subjectFile = path.join(
          os.tmpdir(),
          `onemed-batch-subject-${Date.now()}-${i}.txt`
        );

        await fs.promises.writeFile(htmlFile, email.html, {
          encoding: "utf-8",
        });
        await fs.promises.writeFile(subjectFile, email.subject, {
          encoding: "utf-8",
        });

        tempFiles.push(htmlFile, subjectFile);
        emailData.push({
          to: email.to,
          htmlFile,
          subjectFile,
          resolvedEmail: emailTo,
        });
      }

      if (emailData.length === 0) {
        return {
          success: false,
          error: "Ingen gyldige e-postadresser funnet",
        };
      }

      // Create batch PowerShell script
      const batchScript = `
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$emails = @(
${emailData
  .map(
    (email) => `  @{
    to = "${email.resolvedEmail}"
    htmlFile = "${email.htmlFile.replace(/\\/g, "\\\\")}"
    subjectFile = "${email.subjectFile.replace(/\\/g, "\\\\")}"
    supplier = "${email.to}"
  }`
  )
  .join(",\n")}
)

$successCount = 0
$failCount = 0
$results = @()

try {
  Write-Output "DEBUG: Starting batch Outlook COM automation for $($emails.Count) emails..."
  
  $outlook = New-Object -ComObject Outlook.Application
  Write-Output "DEBUG: Outlook application object created"
  
  foreach ($email in $emails) {
    try {
      Write-Output "DEBUG: Processing email for $($email.supplier) -> $($email.to)"
      
      # Check if files exist
      if (-not (Test-Path $email.htmlFile)) {
        throw "HTML file not found: $($email.htmlFile)"
      }
      if (-not (Test-Path $email.subjectFile)) {
        throw "Subject file not found: $($email.subjectFile)"
      }
      
      # Read content from files
      $htmlContent = Get-Content -Path $email.htmlFile -Raw -Encoding UTF8
      $subjectContent = (Get-Content -Path $email.subjectFile -Raw -Encoding UTF8).Trim()
      
      # Create and send email
      $mail = $outlook.CreateItem(0)
      $mail.To = $email.resolvedEmail
      $mail.Subject = $subjectContent
      $mail.HTMLBody = $htmlContent
      $mail.SentOnBehalfOfName = "supply.planning.no@onemed.com"
      
      $mail.Send()
      $successCount++
      Write-Output "SUCCESS: Email sent to $($email.resolvedEmail)"
      
      $results += @{
        supplier = $email.supplier
        email = $email.resolvedEmail
        success = $true
        error = $null
      }
      
    } catch {
      $failCount++
      $errorMsg = $_.Exception.Message
      Write-Output "ERROR: Failed to send to $($email.resolvedEmail): $errorMsg"
      
      $results += @{
        supplier = $email.supplier
        email = $email.resolvedEmail
        success = $false
        error = $errorMsg
      }
    }
  }
  
  Write-Output "BATCH_COMPLETE: Success: $successCount, Failed: $failCount"
  
} catch {
  Write-Output "BATCH_ERROR: $($_.Exception.Message)"
} finally {
  # Clean up temporary files
  foreach ($email in $emails) {
    try {
      if (Test-Path $email.htmlFile) {
        Remove-Item -Path $email.htmlFile -Force
      }
      if (Test-Path $email.subjectFile) {
        Remove-Item -Path $email.subjectFile -Force
      }
    } catch {
      Write-Output "WARN: Failed to clean up files for $($email.supplier)"
    }
  }
  
  # Output results as JSON
  $resultsJson = $results | ConvertTo-Json -Depth 3
  Write-Output "RESULTS_JSON: $resultsJson"
}
`;

      return new Promise((resolve) => {
        const psProcess = spawn(
          "powershell",
          ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "-"],
          {
            windowsHide: true,
            stdio: ["pipe", "pipe", "pipe"],
          }
        );

        let output = "";
        let errorOutput = "";

        if (psProcess.stdin) {
          psProcess.stdin.setDefaultEncoding("utf-8");
          psProcess.stdin.write(batchScript + "\r\n", "utf-8");
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
          log.info(`Batch PowerShell process exited with code: ${code}`);
          log.info(`Batch PowerShell output:\n${output}`);

          if (errorOutput) {
            log.warn(`Batch PowerShell stderr:\n${errorOutput}`);
          }

          // Parse results
          const resultsMatch = output.match(/RESULTS_JSON: (.+)/);
          if (resultsMatch) {
            try {
              const results = JSON.parse(resultsMatch[1]);
              const successCount = results.filter(
                (r: { success: boolean }) => r.success
              ).length;
              const failCount = results.filter(
                (r: { success: boolean }) => !r.success
              ).length;

              log.info(
                `Batch sending completed: ${successCount} success, ${failCount} failed`
              );

              resolve({
                success: true,
                results: results,
                summary: {
                  total: results.length,
                  success: successCount,
                  failed: failCount,
                },
              });
            } catch (parseError) {
              log.error("Failed to parse batch results:", parseError);
              resolve({
                success: false,
                error: "Failed to parse batch results",
              });
            }
          } else {
            resolve({
              success: false,
              error: "No results found in PowerShell output",
            });
          }
        });

        psProcess.on("error", (error: Error) => {
          log.error("Batch PowerShell process failed:", error);
          resolve({
            success: false,
            error: `PowerShell prosess feil: ${error.message}`,
          });
        });
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("Batch email sending error:", errorMessage);

      // Clean up temp files
      for (const tempFile of tempFiles) {
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        } catch (cleanupError) {
          log.warn(`Failed to clean up temp file ${tempFile}:`, cleanupError);
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
);

// REMOVED: PowerShell function for macOS - using simple .eml approach instead
/*
async function handleEmailViaPowerShellMac(
  payload: { to: string; subject: string; html: string },
  emailTo: string
): Promise<{ success: boolean; error?: string }> {
  try {
    log.info(`Attempting PowerShell email send on macOS to: ${emailTo}`);
    log.info(`Subject: ${payload.subject}`);

    // Ensure we have a valid email address
    if (!emailTo.includes("@")) {
      log.warn(`No valid email address found for supplier: ${payload.to}`);
      return {
        success: false,
        error: `Ingen e-postadresse funnet for ${payload.to}. Sjekk leverandør e-post innstillinger.`,
      };
    }

    // Create a temporary HTML file for PowerShell to use
    const tempDir = app.getPath("temp");
    const htmlFileName = `onemed-reminder-${Date.now()}.html`;
    const htmlFilePath = path.join(tempDir, htmlFileName);

    // Clean up the HTML content
    const cleanHtml = payload.html
      .replace(/<style>.*?<\/style>/gs, "")
      .replace(/<head>.*?<\/head>/gs, "")
      .replace(/<script>.*?<\/script>/gs, "")
      .trim();

    fs.writeFileSync(htmlFilePath, cleanHtml, "utf8");
    log.info(`Created HTML file for PowerShell: ${htmlFilePath}`);

    // PowerShell script that uses Exchange Online PowerShell
    const powershellScript = `
      try {
        Write-Output "Starting PowerShell email send on macOS using Exchange Online..."
        
        # Create HTML content from file
        $htmlContent = Get-Content -Path '${htmlFilePath.replace(
          /'/g,
          "''"
        )}' -Raw
        
        # Send email using Exchange Online PowerShell
        Write-Output "Sending email via Exchange Online PowerShell..."
        
        # Try to establish Exchange Online session if not already connected
        try {
          # Check if we're already connected to Exchange Online
          $existingSession = Get-PSSession | Where-Object { $_.ConfigurationName -eq "Microsoft.Exchange" -and $_.State -eq "Opened" }
          
          if ($existingSession) {
            Write-Output "Found existing Exchange Online session, using it..."
            $session = $existingSession
          } else {
            # Check if we can use existing Azure AD authentication
            try {
              Write-Output "Checking for existing Azure AD authentication..."
              $context = Get-AzContext -ErrorAction SilentlyContinue
              if ($context) {
                Write-Output "Found existing Azure AD context, attempting to use it for Exchange Online..."
                # Try to connect using existing Azure AD context
                Connect-ExchangeOnline -UserPrincipalName "supply.planning.no@onemed.com" -ShowProgress:$false -ShowBanner:$false
                Write-Output "Connected to Exchange Online using existing Azure AD authentication"
                $session = Get-PSSession | Where-Object { $_.ConfigurationName -eq "Microsoft.Exchange" -and $_.State -eq "Opened" }
              } else {
                throw "No existing Azure AD context found"
              }
            } catch {
              Write-Output "No existing Azure AD context available, proceeding with standard authentication..."
            }
            
            Write-Output "No existing Exchange Online session found, attempting to connect..."
            
            # Try to connect to Exchange Online using modern authentication
            try {
              # Import Exchange Online module if available
              if (Get-Module -ListAvailable -Name "ExchangeOnlineManagement") {
                Import-Module ExchangeOnlineManagement -Force
                Write-Output "ExchangeOnlineManagement module imported"
                
                # Connect to Exchange Online with proper parameters
                # Try device code authentication first (works with SSO/MFA)
                try {
                  Connect-ExchangeOnline -UserPrincipalName "supply.planning.no@onemed.com" -ShowProgress:$false -ShowBanner:$false -Device
                  Write-Output "Connected to Exchange Online successfully using device code authentication"
                } catch {
                  Write-Output "Device code authentication failed, trying interactive authentication..."
                  # Fallback to interactive authentication (may not work in non-interactive environment)
                  try {
                    Connect-ExchangeOnline -UserPrincipalName "supply.planning.no@onemed.com" -ShowProgress:$false -ShowBanner:$false
                    Write-Output "Connected to Exchange Online successfully using interactive authentication"
                  } catch {
                    Write-Output "Interactive authentication also failed: $($_.Exception.Message)"
                    throw "All Exchange Online authentication methods failed"
                  }
                }
                
                # Get the session we just created
                $session = Get-PSSession | Where-Object { $_.ConfigurationName -eq "Microsoft.Exchange" -and $_.State -eq "Opened" }
                if (-not $session) {
                  throw "Exchange Online session was not established properly"
                }
                Write-Output "Exchange Online session verified and ready"
              } else {
                Write-Output "ExchangeOnlineManagement module not available, trying alternative method..."
                throw "ExchangeOnlineManagement module not found"
              }
            } catch {
              Write-Output "Failed to connect to Exchange Online: $($_.Exception.Message)"
              Write-Output "Falling back to SMTP method..."
              
              # Fallback to SMTP with non-interactive credentials using .NET SMTP client
              # Load credentials from environment variables for security
              $smtpUser = "supply.planning.no@onemed.com"
              $smtpPass = $env:ONEMED_EMAIL_PASSWORD
              
              # Check if environment variable is set
              if (-not $smtpPass) {
                Write-Output "ONEMED_EMAIL_PASSWORD environment variable is not set. Trying alternative authentication methods..."
                
                # Try to use default credentials (Windows authentication)
                try {
                  Write-Output "Attempting to use default credentials for SMTP..."
                  $smtpClient = New-Object System.Net.Mail.SmtpClient("smtp.office365.com", 587)
                  $smtpClient.EnableSsl = $true
                  $smtpClient.UseDefaultCredentials = $true
                  Write-Output "Using default credentials for SMTP authentication"
                } catch {
                  Write-Output "Default credentials failed: $($_.Exception.Message)"
                  throw "No valid SMTP authentication method available. Please set ONEMED_EMAIL_PASSWORD environment variable with your Office 365 email password or app password."
                }
              } else {
                # Convert the password to a SecureString
                $securePassword = ConvertTo-SecureString $smtpPass -AsPlainText -Force
                
                # Create the non-interactive credential object
                $credential = New-Object System.Management.Automation.PSCredential($smtpUser, $securePassword)
                
                $smtpClient = New-Object System.Net.Mail.SmtpClient("smtp.office365.com", 587)
                $smtpClient.EnableSsl = $true
                $smtpClient.Credentials = $credential
                Write-Output "Using provided credentials for SMTP authentication"
              }
              
              # Create and send email message
              $mailMessage = New-Object System.Net.Mail.MailMessage
              $mailMessage.From = "supply.planning.no@onemed.com"
              $mailMessage.To.Add("${emailTo}")
              $mailMessage.Subject = "${payload.subject.replace(/"/g, '\\"')}"
              $mailMessage.Body = $htmlContent
              $mailMessage.IsBodyHtml = $true
              
              $smtpClient.Send($mailMessage)
              Write-Output "SUCCESS: Email sent via .NET SMTP fallback to ${emailTo}"
              exit 0
            }
          }
        } catch {
          Write-Output "Exchange Online connection failed: $($_.Exception.Message)"
          Write-Output "Falling back to SMTP method..."
          
          # Final SMTP fallback
          try {
            $smtpUser = "supply.planning.no@onemed.com"
            $smtpPass = $env:ONEMED_EMAIL_PASSWORD
            
            if (-not $smtpPass) {
              throw "ONEMED_EMAIL_PASSWORD environment variable is not set. Please set this variable with your Office 365 email password or app password."
            }
            
            $securePassword = ConvertTo-SecureString $smtpPass -AsPlainText -Force
            $credential = New-Object System.Management.Automation.PSCredential($smtpUser, $securePassword)
            
            $smtpClient = New-Object System.Net.Mail.SmtpClient("smtp.office365.com", 587)
            $smtpClient.EnableSsl = $true
            $smtpClient.Credentials = $credential
            
            $mailMessage = New-Object System.Net.Mail.MailMessage
            $mailMessage.From = "supply.planning.no@onemed.com"
            $mailMessage.To.Add("${emailTo}")
            $mailMessage.Subject = "${payload.subject.replace(/"/g, '\\"')}"
            $mailMessage.Body = $htmlContent
            $mailMessage.IsBodyHtml = $true
            
            $smtpClient.Send($mailMessage)
            Write-Output "SUCCESS: Email sent via .NET SMTP with environment credentials to ${emailTo}"
          } catch {
            Write-Output "All email methods failed: $($_.Exception.Message)"
            throw
          }
        }
        
      } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
        Write-Output "ERROR_DETAILS: $($_.Exception.ToString())"
        exit 1
      } finally {
        # Clean up HTML file
        if (Test-Path '${htmlFilePath.replace(/'/g, "''")}') {
          try { Remove-Item -Path '${htmlFilePath.replace(/'/g, "''")}' -Force }
          catch { Write-Output "WARN: Failed to cleanup HTML file." }
        }
      }
    `;

    // Execute PowerShell script
    const { spawn } = await import("child_process");

    return new Promise((resolve) => {
      const psProcess = spawn("pwsh", ["-Command", powershellScript], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      psProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        stdout += output;
        log.info(`PowerShell stdout: ${output.trim()}`);
      });

      psProcess.stderr?.on("data", (data) => {
        const output = data.toString();
        stderr += output;
        log.warn(`PowerShell stderr: ${output.trim()}`);
      });

      psProcess.on("close", (code) => {
        log.info(`PowerShell process exited with code: ${code}`);

        if (code === 0) {
          log.info("PowerShell email send completed successfully");
          resolve({
            success: true,
            error: undefined,
          });
        } else {
          log.error(`PowerShell email send failed with code ${code}`);
          resolve({
            success: false,
            error: `PowerShell e-post sending feilet: ${stderr || stdout}`,
          });
        }
      });

      psProcess.on("error", (error) => {
        log.error("Failed to start PowerShell process:", error);
        resolve({
          success: false,
          error: `Kunne ikke starte PowerShell: ${error.message}`,
        });
      });
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    log.error("Error in PowerShell email sending on macOS:", errorMessage);
    return {
      success: false,
      error: `Feil ved PowerShell e-post sending: ${errorMessage}`,
    };
  }
}
*/

// Handle automatic email sending via Outlook COM API (LEGACY - kept for single emails)
ipcMain.handle(
  "sendEmailAutomatically",
  async (_, payload: { to: string; subject: string; html: string }) => {
    let tempHtmlFilePath: string | null = null; // To ensure cleanup
    let tempSubjectFilePath: string | null = null; // To ensure cleanup

    try {
      log.info(`Attempting automatic email send to: ${payload.to}`);
      log.info(`Subject: ${payload.subject}`);

      // Check if payload.to is already an email address or a supplier name
      let emailTo: string;
      if (payload.to.includes("@")) {
        // payload.to is already an email address
        emailTo = payload.to;
        log.info(`Using provided email address: ${emailTo}`);
      } else {
        // payload.to is a supplier name, look it up in database
        emailTo = databaseService.getSupplierEmail(payload.to) || payload.to;
        log.info(
          `Resolved email address for supplier ${payload.to}: ${emailTo}`
        );
      }

      // For all platforms, use the simple .eml file approach
      log.info("Using .eml file approach for email sending");

      // Ensure we have a valid email address
      if (!emailTo.includes("@")) {
        log.warn(`No valid email address found for supplier: ${payload.to}`);
        return {
          success: false,
          error: `Ingen e-postadresse funnet for ${payload.to}. Sjekk leverandør e-post innstillinger.`,
        };
      }

      // 🚀 NEW APPROACH: Write HTML to temporary file to avoid string embedding issues
      // 1. Create a temporary file for the HTML content (use raw, unescaped payload.html)
      //    We will write it as UTF-8, and PowerShell will read it as UTF-8.
      tempHtmlFilePath = path.join(
        os.tmpdir(),
        `onemed-outlook-${Date.now()}.html`
      );
      await fs.promises.writeFile(tempHtmlFilePath, payload.html, {
        encoding: "utf-8",
      });
      log.info(
        `HTML content written to temporary file: ${tempHtmlFilePath} (Length: ${payload.html.length})`
      );

      // Write subject to a separate temp file to avoid PowerShell encoding issues
      tempSubjectFilePath = path.join(
        os.tmpdir(),
        `onemed-subject-${Date.now()}.txt`
      );
      await fs.promises.writeFile(tempSubjectFilePath, payload.subject, {
        encoding: "utf-8",
      });
      log.info(`Subject written to temp file: ${tempSubjectFilePath}`);

      // Escape tempFilePath for PowerShell string
      const escapedTempSubjectFilePath = tempSubjectFilePath.replace(
        /'/g,
        "''"
      );

      const escapedTempHtmlFilePath = tempHtmlFilePath.replace(/'/g, "''"); // Escape single quotes for PS literal string

      // PowerShell script will now READ HTML and SUBJECT from temp files.
      // This avoids all encoding issues with Norwegian characters.
      const powershellScript = `
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$tempHtmlPath = '${escapedTempHtmlFilePath}' # Use single quotes for literal path
$tempSubjectPath = '${escapedTempSubjectFilePath}' # Subject file path
$htmlFileReadError = $null
$subjectFileReadError = $null

try {
  Write-Output "DEBUG: Starting Outlook COM automation..."
  
  # Check if temp HTML file exists before trying to read
  if (-not (Test-Path $tempHtmlPath)) {
    throw "Temporary HTML file not found at: $tempHtmlPath"
  }
  
  # Check if temp subject file exists before trying to read
  if (-not (Test-Path $tempSubjectPath)) {
    throw "Temporary subject file not found at: $tempSubjectPath"
  }

  # Read HTML content from the temporary file as UTF-8
  $htmlContent = Get-Content -Path $tempHtmlPath -Raw -Encoding UTF8
  Write-Output "DEBUG: HTML content read from file. Length in PS: $($htmlContent.Length)"
  
  # Read subject from the temporary file as UTF-8
  $subjectContent = Get-Content -Path $tempSubjectPath -Raw -Encoding UTF8
  # Trim any trailing whitespace/newlines from the subject
  $subjectContent = $subjectContent.Trim()
  Write-Output "DEBUG: Subject read from file: '$subjectContent'"

  $outlook = New-Object -ComObject Outlook.Application
  Write-Output "DEBUG: Outlook application object created"
  $mail = $outlook.CreateItem(0)
  Write-Output "DEBUG: Mail item created"

  $mail.To = "${emailTo}"
  Write-Output "DEBUG: Recipient set to ${emailTo}"

  $mail.Subject = $subjectContent
  Write-Output "DEBUG: Subject set from file"

  $mail.HTMLBody = $htmlContent # Assign the content read from file
  Write-Output "DEBUG: HTML body set successfully from file content."

  $mail.SentOnBehalfOfName = "supply.planning.no@onemed.com"
  Write-Output "DEBUG: Sender information set"

  $mail.Send()
  Write-Output "DEBUG: Send command executed"
  Write-Output "SUCCESS: Email sent successfully to ${emailTo}"
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
  if ($htmlFileReadError) {
    Write-Output "ADDITIONAL_ERROR_READING_HTML_FILE: $htmlFileReadError"
  }
  Write-Output "ERROR_DETAILS: $($_.Exception.ToString())"
  Write-Output "ERROR_TYPE: $($_.Exception.GetType().FullName)"
} finally {
  # Clean up the temporary HTML file
  if ($tempHtmlPath -and (Test-Path $tempHtmlPath)) {
    try {
      Remove-Item -Path $tempHtmlPath -Force
      Write-Output "DEBUG: Temporary HTML file cleaned up: $tempHtmlPath"
    } catch {
      Write-Output "WARN: Failed to clean up temporary HTML file '$tempHtmlPath': $($_.Exception.Message)"
    }
  }
  
  # Clean up the temporary subject file
  if ($tempSubjectPath -and (Test-Path $tempSubjectPath)) {
    try {
      Remove-Item -Path $tempSubjectPath -Force
      Write-Output "DEBUG: Temporary subject file cleaned up: $tempSubjectPath"
    } catch {
      Write-Output "WARN: Failed to clean up temporary subject file '$tempSubjectPath': $($_.Exception.Message)"
    }
  }
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
          psProcess.stdin.setDefaultEncoding("utf-8");
          psProcess.stdin.write(powershellScript + "\r\n", "utf-8");
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
      log.error(
        "Automatic email sending error (outer try-catch):",
        errorMessage
      );

      // Ensure temp files are cleaned up if created before an outer error
      if (tempHtmlFilePath) {
        try {
          if (fs.existsSync(tempHtmlFilePath)) {
            fs.unlinkSync(tempHtmlFilePath);
            log.info("Outer catch: Cleaned up temp HTML file");
          }
        } catch (cleanupError) {
          log.warn(
            "Outer catch: Failed to cleanup temp HTML file",
            cleanupError
          );
        }
      }

      if (tempSubjectFilePath) {
        try {
          if (fs.existsSync(tempSubjectFilePath)) {
            fs.unlinkSync(tempSubjectFilePath);
            log.info("Outer catch: Cleaned up temp subject file");
          }
        } catch (cleanupError) {
          log.warn(
            "Outer catch: Failed to cleanup temp subject file",
            cleanupError
          );
        }
      }

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

// Expose suppliers with outstanding orders to the renderer
ipcMain.handle("getSuppliersWithOutstandingOrders", async () => {
  try {
    const dbsvc = databaseService;
    if (!dbsvc.getDbInstance()) {
      return { success: false, error: "Database not connected" };
    }
    const suppliers = dbsvc.getSuppliersWithOutstandingOrders();
    return { success: true, data: suppliers };
  } catch (err) {
    log.error("IPC getSuppliersWithOutstandingOrders error:", err);
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

// Add IPC handlers for supplier planning
ipcMain.handle(
  "getSuppliersForWeekday",
  async (event, weekday: string, plannerName: string) => {
    try {
      const suppliers = databaseService.getSuppliersForWeekday(
        weekday,
        plannerName
      );
      return { success: true, data: suppliers };
    } catch (error) {
      log.error("Error getting suppliers for weekday:", error);
      return { success: false, error: String(error) };
    }
  }
);

ipcMain.handle("getAllSupplierPlanning", async () => {
  try {
    const planning = databaseService.getAllSupplierPlanning();
    return { success: true, data: planning };
  } catch (error) {
    log.error("Error getting all supplier planning:", error);
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

// Handle automatic email sending via Outlook COM using .eml and OpenSharedItem
ipcMain.handle(
  "sendEmailViaEmlAndCOM",
  async (_, payload: { to: string; subject: string; html: string }) => {
    let tempEmlFilePath: string | null = null;
    try {
      log.info(
        `Attempting automatic email send via .eml/COM to: ${payload.to}`
      );
      log.info(`Subject: ${payload.subject}`);

      // Use the provided email address directly if it contains @, otherwise lookup in database
      const emailTo = payload.to.includes("@")
        ? payload.to
        : databaseService.getSupplierEmail(payload.to) || payload.to;

      // For all platforms, use the simple .eml file approach
      log.info("Using .eml file approach for email sending");
      log.info(`Resolved email address: ${emailTo}`);

      if (!emailTo.includes("@")) {
        log.warn(`No valid email address found for supplier: ${payload.to}`);
        return {
          success: false,
          error: `Ingen e-postadresse funnet for ${payload.to}. Sjekk leverandør e-post innstillinger.`,
        };
      }

      // Create .eml file with proper MIME headers for HTML
      const senderEmail = "supply.planning.no@onemed.com";
      const EOL = "\r\n";

      // Properly encode the subject for UTF-8
      const encodedSubject = Buffer.from(payload.subject, "utf8").toString(
        "base64"
      );
      const headers = [
        `From: OneMed Norge AS <${senderEmail}>`,
        `To: ${emailTo}`,
        `Subject: =?UTF-8?B?${encodedSubject}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: 8bit`,
        `X-Mailer: OneMed SupplyChain`,
        ``,
      ].join(EOL);

      const cleanHtml = payload.html
        .replace(/<style>.*?<\/style>/gs, "")
        .replace(/<head>.*?<\/head>/gs, "")
        .replace(/<script>.*?<\/script>/gs, "")
        .trim();
      const body = cleanHtml.replace(/\r?\n/g, EOL);
      const emlContent = headers + body;

      // Write to temp .eml file
      const tempDir = app.getPath("temp");
      const fileName = `onemed-reminder-${Date.now()}.eml`;
      tempEmlFilePath = path.join(tempDir, fileName);
      fs.writeFileSync(tempEmlFilePath, emlContent, "utf8");
      log.info(`Created .eml file: ${tempEmlFilePath}`);

      // PowerShell script to load .eml, extract HTML, and send via new MailItem
      const powershellScript = `
        $tempEmlPath = '${tempEmlFilePath.replace(/'/g, "''")}'
        $sender = 'supply.planning.no@onemed.com'
        
        try {
            Write-Output "STAGE 1: Loading .eml via OpenSharedItem..."
            $outlook = New-Object -ComObject Outlook.Application
            $sourceMail = $outlook.Session.OpenSharedItem($tempEmlPath)
            if ($null -eq $sourceMail) { throw "Failed to load .eml into an Outlook item." }

            # Action 6: Extract all required properties from the source mail item
            Write-Output "STAGE 1: .eml loaded. Extracting properties..."
            $recipient = $sourceMail.To
            $subject = $sourceMail.Subject
            $cleanHtml = $sourceMail.HTMLBody
            Write-Output "STAGE 1: Properties extracted. Subject: '$subject'"

            Write-Output "STAGE 1: Closing source mail item..."
            $sourceMail.Close(2) # 2 = olDiscard

            Write-Output "STAGE 2: Creating new, final MailItem..."
            $finalMail = $outlook.CreateItem(0)

            # Action 7: Populate the new mail item with the extracted properties
            $finalMail.To = $recipient
            $finalMail.Subject = $subject
            $finalMail.SentOnBehalfOfName = $sender
            $finalMail.HTMLBody = $cleanHtml
            
            Write-Output "STAGE 2: Sending final email..."
            $finalMail.Send()
            Write-Output "SUCCESS: Email sent successfully to $recipient"
        } catch {
            Write-Output "ERROR: $($_.Exception.Message)"
            Write-Output "ERROR_DETAILS: $($_.Exception.ToString())"
        } finally {
            if ($tempEmlPath -and (Test-Path $tempEmlPath)) {
                try { Remove-Item -Path $tempEmlPath -Force }
                catch { Write-Output "WARN: Failed to cleanup temporary file." }
            }
        }
      `;

      return await new Promise((resolve) => {
        const psProcess = spawn(
          "powershell",
          ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "-"],
          {
            windowsHide: true,
            stdio: ["pipe", "pipe", "pipe"],
          }
        );
        let output = "";
        let errorOutput = "";
        if (psProcess.stdin) {
          psProcess.stdin.setDefaultEncoding("utf-8");
          psProcess.stdin.write(powershellScript + "\r\n", "utf-8");
          psProcess.stdin.end();
        } else {
          log.error("PowerShell process stdin is not available.");
          resolve({ success: false, error: "PowerShell stdin utilgjengelig." });
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
          log.info(`PowerShell output:\n${output}`);
          if (errorOutput) {
            log.warn(`PowerShell stderr:\n${errorOutput}`);
          }
          if (output.includes("SUCCESS")) {
            log.info(`Email sent automatically via .eml/COM to: ${emailTo}`);
            resolve({ success: true });
          } else {
            const errorMatch = output.match(/ERROR:\s*(.*)/);
            const errorMsg =
              errorMatch && errorMatch[1]
                ? errorMatch[1].trim()
                : `PowerShell failed. Code: ${code}. See logs.`;
            log.error(
              "PowerShell automation via .eml/COM failed:",
              errorMsg,
              "Full output:",
              output,
              "Full stderr:",
              errorOutput
            );
            resolve({
              success: false,
              error: `Automatisk sending via .eml feilet: ${errorMsg}`,
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
      log.error("Automatic email sending via .eml/COM error:", errorMessage);
      // Ensure temp file is cleaned up if created before an outer error
      if (tempEmlFilePath) {
        try {
          if (fs.existsSync(tempEmlFilePath)) {
            fs.unlinkSync(tempEmlFilePath);
            log.info("Outer catch: Cleaned up temp .eml file");
          }
        } catch (cleanupError) {
          log.warn(
            "Outer catch: Failed to cleanup temp .eml file",
            cleanupError
          );
        }
      }
      return { success: false, error: errorMessage };
    }
  }
);
