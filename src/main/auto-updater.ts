import { dialog } from "electron";
import { autoUpdater } from "electron-updater";
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const log = require("electron-log/main");
import type { UpdateInfo, ProgressInfo } from "electron-updater";
import { app, shell } from "electron";
import path from "path";
import fs from "fs";

// Create a logger instance specifically for the auto-updater
const updateLogger = log.scope("autoUpdater");
autoUpdater.logger = updateLogger;

/**
 * Detect if the app is running as a portable version
 * Portable apps typically run from a temporary or user-defined location
 * and don't have the standard installation structure
 */
function isPortableVersion(): boolean {
  try {
    const appPath = app.getAppPath();
    const execPath = process.execPath;

    // Check if running from a portable executable
    // Portable versions often have "Portable" in the filename
    if (execPath.includes("Portable") || execPath.includes("portable")) {
      return true;
    }

    // Check if app is running from a non-standard location
    // Standard installations are usually in Program Files or AppData
    const normalizedPath = path.normalize(appPath).toLowerCase();
    const isInProgramFiles = normalizedPath.includes("program files");
    const isInAppData = normalizedPath.includes("appdata");
    const isInUserProfile =
      normalizedPath.includes("users") &&
      (isInAppData || normalizedPath.includes("local"));

    // If not in standard installation paths, likely portable
    if (!isInProgramFiles && !isInUserProfile) {
      return true;
    }

    // Additional check: portable versions often run from Downloads, Desktop, or removable drives
    const portableIndicators = [
      "downloads",
      "desktop",
      "documents",
      "temp",
      "tmp",
    ];

    if (
      portableIndicators.some((indicator) => normalizedPath.includes(indicator))
    ) {
      return true;
    }

    return false;
  } catch (error) {
    updateLogger.warn("Error detecting portable version:", error);
    return false;
  }
}

/**
 * Setup auto-updater for portable versions with manual download approach
 */
function setupPortableUpdater() {
  updateLogger.info("Konfigurerer portable auto-updater...");

  // Configure for portable - disable automatic installation
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  // Handle update check
  autoUpdater.on("checking-for-update", () => {
    updateLogger.info("Sjekker for oppdateringer (portable modus)...");
  });

  // No updates available
  autoUpdater.on("update-not-available", ((info: UpdateInfo) => {
    updateLogger.info("Ingen nye oppdateringer tilgjengelig (portable):", info);
  }) as (...args: unknown[]) => void);

  // Update available - show custom dialog for portable
  autoUpdater.on("update-available", ((info: UpdateInfo) => {
    updateLogger.info("Ny oppdatering tilgjengelig (portable):", info);

    dialog
      .showMessageBox({
        type: "info",
        title: "Oppdatering tilgjengelig",
        message: `En ny versjon (${info.version}) av OneMed SupplyChain er tilgjengelig`,
        detail:
          "Vil du laste ned oppdateringen nå? Du kan installere den manuelt når nedlastingen er ferdig.",
        buttons: ["Last ned nå", "Last ned senere", "Åpne nedlastingsside"],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          // Download update
          updateLogger.info("Starter nedlasting av oppdatering...");
          autoUpdater.downloadUpdate().catch((err: Error) => {
            updateLogger.error("Feil ved nedlasting:", err);
            showPortableUpdateError(err);
          });
        } else if (result.response === 2) {
          // Open download page
          const downloadUrl =
            "https://github.com/Isuldra/Suppliers/releases/latest";
          shell.openExternal(downloadUrl).catch((err) => {
            updateLogger.error("Kunne ikke åpne nedlastingsside:", err);
          });
        }
      });
  }) as (...args: unknown[]) => void);

  // Handle download progress
  autoUpdater.on("download-progress", ((progressObj: ProgressInfo) => {
    const message = `Laster ned oppdatering: ${Math.round(
      progressObj.percent
    )}%`;
    updateLogger.info(message);
    // Could show progress notification here if needed
  }) as (...args: unknown[]) => void);

  // Update downloaded - provide manual installation instructions
  autoUpdater.on("update-downloaded", ((info: UpdateInfo) => {
    updateLogger.info("Oppdatering lastet ned (portable):", info);

    // Get the download location
    const downloadPath = getPortableUpdatePath();

    dialog
      .showMessageBox({
        type: "info",
        title: "Oppdatering klar",
        message: `Versjon ${info.version} er lastet ned`,
        detail: `Oppdateringen er lagret i:\n${downloadPath}\n\nFor å installere:\n1. Lukk denne applikasjonen\n2. Erstatt den gamle .exe-filen med den nye\n3. Start applikasjonen på nytt\n\nVil du åpne mappen med den nye filen?`,
        buttons: ["Åpne mappe", "Lukk app og installer", "Senere"],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          // Open folder containing the update
          try {
            shell.showItemInFolder(downloadPath);
          } catch {
            // Fallback to opening the directory
            shell.openPath(path.dirname(downloadPath)).catch((openErr) => {
              updateLogger.error("Kunne ikke åpne mappe:", openErr);
            });
          }
        } else if (result.response === 1) {
          // Quit app for manual installation
          updateLogger.info("Avslutter app for manuell installasjon...");
          app.quit();
        }
      });
  }) as (...args: unknown[]) => void);

  // Handle errors
  autoUpdater.on("error", ((error: Error) => {
    updateLogger.error("Feil ved oppdatering (portable):", error);
    showPortableUpdateError(error);
  }) as (...args: unknown[]) => void);
}

/**
 * Get the expected path for portable update downloads
 */
function getPortableUpdatePath(): string {
  const userDataPath = app.getPath("userData");
  const updatesDir = path.join(userDataPath, "updates");

  // Ensure updates directory exists
  try {
    if (!fs.existsSync(updatesDir)) {
      fs.mkdirSync(updatesDir, { recursive: true });
    }
  } catch (error) {
    updateLogger.warn("Could not create updates directory:", error);
  }

  return path.join(updatesDir, "OneMed SupplyChain-Portable.exe");
}

/**
 * Show error dialog for portable update issues
 */
function showPortableUpdateError(error: Error) {
  const isNetworkError =
    error.message.includes("net::") || error.message.includes("ENOTFOUND");
  const isFileError =
    error.message.includes("ENOENT") ||
    error.message.includes("app-update.yml");

  let message = "Det oppstod en feil under oppdatering";
  let detail = `Detaljer: ${error.message}`;

  if (isNetworkError) {
    message = "Nettverksfeil ved oppdatering";
    detail = "Sjekk internettforbindelsen og prøv igjen senere.";
  } else if (isFileError) {
    message = "Oppdateringsfiler ikke tilgjengelige";
    detail = "Du kan laste ned den nyeste versjonen manuelt fra GitHub.";
  }

  dialog
    .showMessageBox({
      type: "error",
      title: "Oppdateringsfeil",
      message,
      detail,
      buttons: ["OK", "Åpne nedlastingsside"],
      defaultId: 0,
    })
    .then((result) => {
      if (result.response === 1) {
        const downloadUrl =
          "https://github.com/Isuldra/Suppliers/releases/latest";
        shell.openExternal(downloadUrl).catch((err) => {
          updateLogger.error("Kunne ikke åpne nedlastingsside:", err);
        });
      }
    });
}

export function setupAutoUpdater() {
  // Ikke kjør auto-oppdatering i utviklingsmodus
  if (process.env.NODE_ENV === "development") {
    updateLogger.info(
      "Kjører i utviklingsmodus - automatiske oppdateringer er deaktivert"
    );
    return;
  }

  // Check if running as portable version
  const isPortable = isPortableVersion();

  if (isPortable) {
    updateLogger.info(
      "Portable versjon oppdaget - bruker portable auto-updater"
    );
    setupPortableUpdater();
  } else {
    updateLogger.info(
      "Installert versjon oppdaget - bruker standard auto-updater"
    );
    setupStandardUpdater();
  }

  // Start checking for updates after a delay
  setTimeout(() => {
    autoUpdater
      .checkForUpdates()
      .catch((err: Error) =>
        updateLogger.error("Feil ved sjekk for oppdateringer:", err)
      );
  }, 10000);

  // Check for updates every hour
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    autoUpdater
      .checkForUpdates()
      .catch((err: Error) =>
        updateLogger.error("Feil ved periodisk sjekk for oppdateringer:", err)
      );
  }, ONE_HOUR);
}

/**
 * Setup standard auto-updater for installed versions
 */
function setupStandardUpdater() {
  // Standard configuration for installed versions
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Handle update-sjekk
  autoUpdater.on("checking-for-update", () => {
    updateLogger.info("Sjekker for oppdateringer...");
  });

  // Ingen oppdateringer er tilgjengelige
  autoUpdater.on("update-not-available", ((info: UpdateInfo) => {
    updateLogger.info("Ingen nye oppdateringer tilgjengelig:", info);
  }) as (...args: unknown[]) => void);

  // Oppdatering funnet
  autoUpdater.on("update-available", ((info: UpdateInfo) => {
    updateLogger.info("Ny oppdatering tilgjengelig:", info);

    // Varsle bruker om at nedlasting starter
    dialog.showMessageBox({
      type: "info",
      title: "Oppdatering tilgjengelig",
      message: `En ny versjon (${info.version}) av OneMed SupplyChain er tilgjengelig`,
      detail: "Oppdateringen lastes ned og installeres automatisk...",
      buttons: ["OK"],
    });
  }) as (...args: unknown[]) => void);

  // Håndtere nedlastningsfremdrift
  autoUpdater.on("download-progress", ((progressObj: ProgressInfo) => {
    const message = `Laster ned oppdatering: ${Math.round(
      progressObj.percent
    )}%`;
    updateLogger.info(message);
  }) as (...args: unknown[]) => void);

  // Oppdatering er lastet ned og klar for installasjon
  autoUpdater.on("update-downloaded", ((info: UpdateInfo) => {
    updateLogger.info("Oppdatering lastet ned:", info);

    dialog
      .showMessageBox({
        type: "info",
        title: "Installere oppdatering?",
        message: `En ny versjon (${info.version}) er klar til å installeres`,
        detail:
          "Vil du installere oppdateringen nå? Applikasjonen vil starte på nytt.",
        buttons: ["Installer og restart", "Installer senere"],
        defaultId: 0,
      })
      .then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  }) as (...args: unknown[]) => void);

  // Håndtere feil
  autoUpdater.on("error", ((error: Error) => {
    updateLogger.error("Feil ved oppdatering:", error);

    dialog.showMessageBox({
      type: "error",
      title: "Oppdateringsfeil",
      message: "Det oppstod en feil under oppdatering",
      detail: `Detaljer: ${error ? error.toString() : "Ukjent feil"}`,
      buttons: ["OK"],
    });
  }) as (...args: unknown[]) => void);
}

// Funksjon for å manuelt sjekke for oppdateringer
export function checkForUpdatesManually() {
  if (process.env.NODE_ENV === "development") {
    updateLogger.info(
      "Kjører i utviklingsmodus - manuelle oppdateringer er deaktivert"
    );
    return Promise.resolve({ updateAvailable: false });
  }

  updateLogger.info("Manuell sjekk for oppdateringer startet...");
  return autoUpdater.checkForUpdates();
}
