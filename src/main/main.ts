import { app, BrowserWindow, session } from "electron";
import { join } from "path";
import { setupAutoUpdater } from "./auto-updater";
import log from "electron-log";

let mainWindow: BrowserWindow | null = null;
let securityHeadersListener: any = null;
let cspListener: any = null;

const isDevelopment = process.env.NODE_ENV === "development";

// Configure logging
log.transports.file.level = "info";
log.transports.console.level = isDevelopment ? "debug" : "info";

// Define Content Security Policy
const cspPolicy = {
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
  "worker-src": ["'self'", "blob:"],
};

// Remove any existing handlers to prevent duplicates
function clearExistingHandlers() {
  try {
    // For Electron API, we should just create new listeners and not try to
    // remove the old ones, as the API doesn't support direct removal.
    // The new listeners will replace the old ones.
  } catch (error) {
    console.error("Error clearing handlers:", error);
  }
}

async function createWindow() {
  // Clean up existing handlers first
  clearExistingHandlers();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      // Sandbox causes issues with certain integrations, so we'll disable it for now
      // but keep other security measures
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Set Content-Security-Policy - only add it once
  if (!cspListener) {
    cspListener = (details: any, callback: any) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            Object.entries(cspPolicy)
              .map(([key, values]) => `${key} ${values.join(" ")}`)
              .join("; "),
          ],
        },
      });
    };

    session.defaultSession.webRequest.onHeadersReceived(cspListener);
  }

  if (isDevelopment) {
    // In development, wait a bit for the dev server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const port = process.argv[2] || 5173;
      const url = `http://localhost:${port}`;
      log.info(`Loading URL: ${url}`);

      await mainWindow.loadURL(url);
      mainWindow.webContents.openDevTools();

      // Enable hot reload
      mainWindow.webContents.on("did-fail-load", () => {
        log.info("Page failed to load, retrying...");
        setTimeout(async () => {
          try {
            await mainWindow?.loadURL(url);
          } catch (err) {
            log.error("Failed to reload:", err);
          }
        }, 1000);
      });
    } catch (err) {
      log.error("Failed to load development URL:", err);
    }
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Set global security settings - only add them once
  if (!securityHeadersListener) {
    securityHeadersListener = (details: any, callback: any) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "X-Content-Type-Options": ["nosniff"],
          "X-Frame-Options": ["SAMEORIGIN"],
          "X-XSS-Protection": ["1; mode=block"],
        },
      });
    };

    session.defaultSession.webRequest.onHeadersReceived(
      securityHeadersListener
    );
  }

  // Initialiser auto-updater
  setupAutoUpdater();
  log.info("App version:", app.getVersion());

  createWindow();

  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
});

// Create a single handler for app cleanup
function cleanupApp() {
  log.info("Cleaning up application resources...");

  // We don't need to call app.quit() here since it will be handled by will-quit
  // Just let the natural process continue

  // Only actually quit for non-macOS platforms
  // On macOS, the app stays running when all windows are closed
  // This is standard macOS behavior
  if (process.platform !== "darwin") {
    // Instead of calling quit directly, we'll set a short timeout
    // This helps prevent multiple quit attempts happening simultaneously
    setTimeout(() => {
      log.info("Platform is not macOS, exiting app...");
      app.quit();
    }, 100);
  }
}

// Handle window-all-closed event for app
app.on("window-all-closed", cleanupApp);

// Also handle app before-quit event to ensure cleanup
app.on("before-quit", () => {
  log.info("Application is about to quit, performing cleanup...");
  // Clear any global listeners or resources here if needed
});
