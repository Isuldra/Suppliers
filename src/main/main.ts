import {
  app,
  BrowserWindow,
  session,
  Menu,
  dialog,
  shell,
  ipcMain,
} from "electron";
import type { OnHeadersReceivedListenerDetails } from "electron";
import { join } from "path";
import { setupAutoUpdater, checkForUpdatesManually } from "./auto-updater";
import log from "electron-log";

let mainWindow: BrowserWindow | null = null;
let securityHeadersListener:
  | ((
      details: OnHeadersReceivedListenerDetails,
      callback: (response: {
        responseHeaders?: Record<string, string[]>;
      }) => void
    ) => void)
  | null = null;
let cspListener:
  | ((
      details: OnHeadersReceivedListenerDetails,
      callback: (response: {
        responseHeaders?: Record<string, string[]>;
      }) => void
    ) => void)
  | null = null;

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

// Create application menu
function createApplicationMenu() {
  const isMac = process.platform === "darwin";
  log.info("Creating application menu...");

  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
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
          },
        ]
      : []),

    // File menu
    {
      label: "Fil",
      submenu: [isMac ? { role: "close" } : { role: "quit", label: "Avslutt" }],
    },

    // Edit menu
    {
      label: "Rediger",
      submenu: [
        { role: "undo", label: "Angre" },
        { role: "redo", label: "Gjør om" },
        { type: "separator" },
        { role: "cut", label: "Klipp ut" },
        { role: "copy", label: "Kopier" },
        { role: "paste", label: "Lim inn" },
        ...(isMac
          ? [
              { role: "delete", label: "Slett" },
              { role: "selectAll", label: "Velg alt" },
            ]
          : [
              { role: "delete", label: "Slett" },
              { type: "separator" },
              { role: "selectAll", label: "Velg alt" },
            ]),
      ],
    },

    // View menu
    {
      label: "Vis",
      submenu: [
        { role: "reload", label: "Last på nytt" },
        { role: "forceReload", label: "Tving opplasting" },
        { role: "toggleDevTools", label: "Vis/skjul utviklerverktøy" },
        { type: "separator" },
        { role: "resetZoom", label: "Tilbakestill zoom" },
        { role: "zoomIn", label: "Zoom inn" },
        { role: "zoomOut", label: "Zoom ut" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Fullskjerm" },
      ],
    },

    // Help menu - bruk samme mønster som i testmenyen
    {
      label: "Hjelp",
      submenu: [
        {
          label: "Sjekk for oppdateringer",
          click: async () => {
            if (isDevelopment) {
              dialog.showMessageBox({
                type: "info",
                title: "Utviklermodus",
                message:
                  "Automatiske oppdateringer er deaktivert i utviklermodus.",
                buttons: ["OK"],
              });
              return;
            }

            try {
              const result = await checkForUpdatesManually();

              // If no update is available, show a message
              if (!result.updateAvailable) {
                dialog.showMessageBox({
                  type: "info",
                  title: "Ingen oppdateringer",
                  message: "Du har den nyeste versjonen av OneMed SupplyChain.",
                  buttons: ["OK"],
                });
              }
              // If update is available, it will be handled by the auto-updater events
            } catch (error) {
              dialog.showMessageBox({
                type: "error",
                title: "Feil ved oppdateringssjekk",
                message: "Kunne ikke sjekke for oppdateringer.",
                detail: error instanceof Error ? error.message : "Ukjent feil",
                buttons: ["OK"],
              });
            }
          },
        },
        {
          label: "Kontakt support",
          click: async () => {
            await shell.openExternal(
              "mailto:andreas.elvethun@onemed.com?subject=Supplier%20Reminder%20Pro%20Support"
            );
          },
        },
        { type: "separator" },
        {
          label: "Om OneMed SupplyChain",
          click: async () => {
            dialog.showMessageBox({
              type: "info",
              title: "Om OneMed SupplyChain",
              message: `OneMed SupplyChain v${app.getVersion()}`,
              detail:
                "En applikasjon for håndtering av leverandørkjeden til OneMed.\n\n© 2024 OneMed",
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ];

  try {
    log.info("Setting application menu...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const menu = Menu.buildFromTemplate(template as any);
    Menu.setApplicationMenu(menu);
    log.info("Application menu set successfully!");
  } catch (error: unknown) {
    log.error("Failed to set application menu:", error);
  }
}

// Remove any existing handlers to prevent duplicates
function clearExistingHandlers() {
  try {
    // For Electron API, we should just create new listeners and not try to
    // remove the old ones, as the API doesn't support direct removal.
    // The new listeners will replace the old ones.
  } catch (error: unknown) {
    log.error("Error clearing handlers:", error);
  }
}

// Setup IPC handlers for help menu functions
function setupHelpMenuHandlers() {
  log.info("Setting up help menu IPC handlers...");

  // Handler for opening external URLs (needs handle for invoke calls)
  ipcMain.handle("openExternalLink", async (_event, url: string) => {
    log.info("Opening external URL:", url);
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error: unknown) {
      log.error("Failed to open external URL:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Handler for checking updates
  ipcMain.on("check-for-updates", async (_event) => {
    log.info("Check for updates requested");
    try {
      if (isDevelopment) {
        log.info("In development mode, showing dialog");
        dialog.showMessageBox({
          type: "info",
          title: "Utviklermodus",
          message: "Automatiske oppdateringer er deaktivert i utviklermodus.",
          buttons: ["OK"],
        });
        return;
      }

      log.info("Checking for updates...");
      const result = await checkForUpdatesManually();
      log.info("Update check result:", result);

      // If no update is available, show a message
      if (!result.updateAvailable) {
        dialog.showMessageBox({
          type: "info",
          title: "Ingen oppdateringer",
          message: "Du har den nyeste versjonen av OneMed SupplyChain.",
          buttons: ["OK"],
        });
      }
      // If update is available, it will be handled by the auto-updater events
    } catch (error: unknown) {
      log.error("Failed to check for updates:", error);
      dialog.showMessageBox({
        type: "error",
        title: "Feil ved oppdateringssjekk",
        message: "Kunne ikke sjekke for oppdateringer.",
        detail: error instanceof Error ? error.message : "Ukjent feil",
        buttons: ["OK"],
      });
    }
  });

  // Handler for showing about dialog
  ipcMain.on("show-about-dialog", () => {
    log.info("Showing about dialog");
    dialog.showMessageBox({
      type: "info",
      title: "Om OneMed SupplyChain",
      message: `OneMed SupplyChain v${app.getVersion()}`,
      detail:
        "En applikasjon for håndtering av leverandørkjeden til OneMed.\n\n© 2024 OneMed",
      buttons: ["OK"],
    });
  });
}

async function createWindow() {
  // Clean up existing handlers first
  clearExistingHandlers();

  // Setup handlers for help menu (removed since it's now called earlier)
  // setupHelpMenuHandlers();

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
    cspListener = (
      details: OnHeadersReceivedListenerDetails,
      callback: (response: {
        responseHeaders?: Record<string, string[]>;
      }) => void
    ) => {
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

    app.whenReady().then(() => {
      session.defaultSession.webRequest.onHeadersReceived(cspListener);
    });
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
    } catch (err: unknown) {
      log.error("Failed to load development URL:", err);
    }
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Ekstra forsøk på å sette menyen etter at vinduet er lastet
  log.info("Window loaded, trying to set menu again...");
  try {
    createApplicationMenu();
  } catch (error: unknown) {
    log.error("Error setting menu after window load:", error);
  }

  // Prevent memory leaks by explicitly setting mainWindow to null when closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle external links opened via middle-click or ctrl+click in renderer
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Ensure only expected protocols are opened externally
    if (
      url.startsWith("http:") ||
      url.startsWith("https:") ||
      url.startsWith("mailto:")
    ) {
      shell.openExternal(url);
    }
    return { action: "deny" }; // Prevent Electron from creating a new window
  });

  // Optional: Intercept navigation to ensure it stays within the app or opens externally
  mainWindow.webContents.on("will-navigate", (_event, url) => {
    // Prevent navigation if it's not to the expected localhost URL during dev
    if (
      process.env.NODE_ENV === "development" &&
      !url.startsWith("http://localhost:5173")
    ) {
      // event.preventDefault(); // Original logic commented out
      shell.openExternal(url); // Open external links in default browser
    }
    // In production, you might want to restrict navigation further
    // or ensure all links are handled via setWindowOpenHandler
  });
}

app.whenReady().then(() => {
  log.info("App is ready, setting up environment...");

  // Set global security settings - only add them once
  if (!securityHeadersListener) {
    securityHeadersListener = (
      details: OnHeadersReceivedListenerDetails,
      callback: (response: {
        responseHeaders?: Record<string, string[]>;
      }) => void
    ) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "X-Content-Type-Options": ["nosniff"],
          "X-Frame-Options": ["SAMEORIGIN"],
          "X-XSS-Protection": ["1; mode=block"],
        },
      });
    };

    app.whenReady().then(() => {
      session.defaultSession.webRequest.onHeadersReceived(
        securityHeadersListener
      );
    });
  }

  // Sett opp IPC handlere før noe annet
  log.info("Setting up IPC handlers early...");
  setupHelpMenuHandlers();

  // Sett menyen først, før vinduet opprettes
  log.info("About to create application menu...");
  createApplicationMenu();

  // Initialiser auto-updater
  setupAutoUpdater();
  log.info("App version:", app.getVersion());

  createWindow();

  // Prøv å sette menyen igjen etter at vinduet er opprettet
  setTimeout(() => {
    log.info("Trying to set menu again after window creation...");
    createApplicationMenu();
  }, 500);

  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();
    }
    // Sett menyen også når appen aktiveres
    createApplicationMenu();
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
