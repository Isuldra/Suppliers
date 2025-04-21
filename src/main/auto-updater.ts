import { dialog } from "electron";
import { autoUpdater, type AppUpdater as _AppUpdater } from "electron-updater";
import log from "electron-log";
import type { UpdateInfo, ProgressInfo } from "electron-updater";

// Create a logger instance specifically for the auto-updater
const updateLogger = log.scope("autoUpdater");
autoUpdater.logger = updateLogger;

// Disable auto download
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

export function setupAutoUpdater() {
  // Ikke kjør auto-oppdatering i utviklingsmodus
  if (process.env.NODE_ENV === "development") {
    updateLogger.info(
      "Kjører i utviklingsmodus - automatiske oppdateringer er deaktivert"
    );
    return;
  }

  updateLogger.info("Auto-updater initialisert");

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

  // Sjekk for oppdateringer umiddelbart, men med forsinkelse for å sikre at
  // applikasjonen har startet fullstendig først
  setTimeout(() => {
    autoUpdater
      .checkForUpdates()
      .catch((err: Error) =>
        updateLogger.error("Feil ved sjekk for oppdateringer:", err)
      );
  }, 10000);

  // Sjekk for oppdateringer hver time
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    autoUpdater
      .checkForUpdates()
      .catch((err: Error) =>
        updateLogger.error("Feil ved periodisk sjekk for oppdateringer:", err)
      );
  }, ONE_HOUR);
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
