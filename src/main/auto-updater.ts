import { app, dialog } from "electron";
import pkg from "electron-updater";
const { autoUpdater } = pkg;
import type { UpdateInfo, ProgressInfo } from "electron-updater";
import log from "electron-log";

// Konfigurer logger
log.transports.file.level = "info";
autoUpdater.logger = log;

// Konfigurasjon av default-innstillinger for auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

export function setupAutoUpdater() {
  // Ikke kjør auto-oppdatering i utviklingsmodus
  if (process.env.NODE_ENV === "development") {
    log.info(
      "Kjører i utviklingsmodus - automatiske oppdateringer er deaktivert"
    );
    return;
  }

  log.info("Auto-updater initialisert");

  // Handle update-sjekk
  autoUpdater.on("checking-for-update", () => {
    log.info("Sjekker for oppdateringer...");
  });

  // Ingen oppdateringer er tilgjengelige
  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    log.info("Ingen nye oppdateringer tilgjengelig:", info);
  });

  // Oppdatering funnet
  autoUpdater.on("update-available", (info: UpdateInfo) => {
    log.info("Ny oppdatering tilgjengelig:", info);

    // Varsle bruker om at nedlasting starter
    dialog.showMessageBox({
      type: "info",
      title: "Oppdatering tilgjengelig",
      message: `En ny versjon (${info.version}) av OneMed SupplyChain er tilgjengelig`,
      detail: "Oppdateringen lastes ned og installeres automatisk...",
      buttons: ["OK"],
    });
  });

  // Håndtere nedlastningsfremdrift
  autoUpdater.on("download-progress", (progressObj: ProgressInfo) => {
    let message = `Laster ned oppdatering: ${Math.round(progressObj.percent)}%`;
    log.info(message);
  });

  // Oppdatering er lastet ned og klar for installasjon
  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    log.info("Oppdatering lastet ned:", info);

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
  });

  // Håndtere feil
  autoUpdater.on("error", (error: Error) => {
    log.error("Feil ved oppdatering:", error);

    dialog.showMessageBox({
      type: "error",
      title: "Oppdateringsfeil",
      message: "Det oppstod en feil under oppdatering",
      detail: `Detaljer: ${error ? error.toString() : "Ukjent feil"}`,
      buttons: ["OK"],
    });
  });

  // Sjekk for oppdateringer umiddelbart, men med forsinkelse for å sikre at
  // applikasjonen har startet fullstendig først
  setTimeout(() => {
    autoUpdater
      .checkForUpdates()
      .catch((err: Error) =>
        log.error("Feil ved sjekk for oppdateringer:", err)
      );
  }, 10000);

  // Sjekk for oppdateringer hver time
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    autoUpdater
      .checkForUpdates()
      .catch((err: Error) =>
        log.error("Feil ved periodisk sjekk for oppdateringer:", err)
      );
  }, ONE_HOUR);
}

// Funksjon for å manuelt sjekke for oppdateringer
export function checkForUpdatesManually() {
  if (process.env.NODE_ENV === "development") {
    log.info("Kjører i utviklingsmodus - manuelle oppdateringer er deaktivert");
    return Promise.resolve({ updateAvailable: false });
  }

  log.info("Manuell sjekk for oppdateringer startet...");
  return autoUpdater.checkForUpdates();
}
