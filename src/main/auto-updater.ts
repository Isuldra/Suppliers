import { dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log/main';
import type { UpdateInfo, ProgressInfo } from 'electron-updater';
import { app, shell, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

// Create a logger instance specifically for the auto-updater
const updateLogger = log.scope('autoUpdater');
autoUpdater.logger = updateLogger;

// Configure auto-updater to use Cloudflare Pages for metadata
// The latest.yml file contains full GitHub Releases URLs
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://suppliers-anx.pages.dev/',
});

// Configure auto-download based on version type (will be set in setup functions)
// Don't set autoDownload globally - let each setup function configure it

// Track shown update notifications to prevent duplicates
let downloadedUpdateReady = false;

export function installDownloadedUpdate() {
  if (!downloadedUpdateReady)
    throw new Error('Ingen nedlastet oppdatering er klar for installasjon.');
  autoUpdater.quitAndInstall(false, true);
}

let lastShownUpdateVersion: string | null = null;
let lastUpdateNotificationTime: number = 0;
const UPDATE_NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

/**
 * A marker records a past download, not an installer ready in this process.
 * Recheck at startup so electron-updater validates its cache or downloads again
 * before emitting 'update-downloaded' and offering installation.
 */
interface PendingUpdateMarker {
  version: string;
  downloadedAt: string;
}

function pendingUpdateMarkerPath(): string {
  return path.join(app.getPath('userData'), 'pending-update.json');
}

function writePendingUpdateMarker(version: string): void {
  try {
    const marker: PendingUpdateMarker = {
      version,
      downloadedAt: new Date().toISOString(),
    };
    fs.writeFileSync(pendingUpdateMarkerPath(), JSON.stringify(marker), 'utf8');
    updateLogger.info(`Recorded pending update marker for ${version}`);
  } catch (error) {
    updateLogger.error('Failed to write pending update marker:', error);
  }
}

function readPendingUpdateMarker(): PendingUpdateMarker | null {
  try {
    const markerPath = pendingUpdateMarkerPath();
    if (!fs.existsSync(markerPath)) {
      return null;
    }
    const parsed = JSON.parse(fs.readFileSync(markerPath, 'utf8')) as Partial<PendingUpdateMarker>;
    if (typeof parsed.version !== 'string' || parsed.version.length === 0) {
      updateLogger.warn('Pending update marker is malformed; discarding');
      clearPendingUpdateMarker();
      return null;
    }
    return { version: parsed.version, downloadedAt: parsed.downloadedAt ?? '' };
  } catch (error) {
    updateLogger.error('Failed to read pending update marker:', error);
    return null;
  }
}

function clearPendingUpdateMarker(): void {
  try {
    const markerPath = pendingUpdateMarkerPath();
    if (fs.existsSync(markerPath)) {
      fs.unlinkSync(markerPath);
    }
  } catch (error) {
    updateLogger.error('Failed to clear pending update marker:', error);
  }
}

/**
 * Detect if the app is running as a portable version
 * Portable apps typically run from a temporary or user-defined location
 * and don't have the standard installation structure
 */
function isPortableVersion(): boolean {
  // electron-builder sets these variables even when the portable EXE is renamed.
  return Boolean(process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR);
}

/**
 * Setup auto-updater for portable versions with manual download approach
 */
function setupPortableUpdater() {
  updateLogger.info('Konfigurerer portable auto-updater...');

  // Portable releases are downloaded manually from GitHub.
  // The Windows updater otherwise downloads the NSIS installer from latest.yml.
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  // Disable differential downloads to avoid 404 errors with missing old versions
  autoUpdater.disableDifferentialDownload = true;

  // Handle update check
  autoUpdater.on('checking-for-update', () => {
    updateLogger.info('Sjekker for oppdateringer (portable modus)...');
  });

  // No updates available
  autoUpdater.on('update-not-available', ((info: UpdateInfo) => {
    updateLogger.info('Ingen nye oppdateringer tilgjengelig (portable):', info);
  }) as (...args: unknown[]) => void);

  // Update available - direct portable users to the download page.
  autoUpdater.on('update-available', ((info: UpdateInfo) => {
    updateLogger.info('Ny oppdatering tilgjengelig (portable):', info);
    updateLogger.info(
      `Current app version: ${app.getVersion()}, Available version: ${info.version}`
    );

    // Check if we've already shown this update notification recently
    const now = Date.now();
    if (
      lastShownUpdateVersion === info.version &&
      now - lastUpdateNotificationTime < UPDATE_NOTIFICATION_COOLDOWN
    ) {
      updateLogger.info(`Skipping duplicate update notification for version ${info.version}`);
      return;
    }

    // Update tracking variables
    lastShownUpdateVersion = info.version;
    lastUpdateNotificationTime = now;

    // Explain how to replace the portable executable.
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Oppdatering tilgjengelig',
        message: `En ny versjon (${info.version}) av Pulse er tilgjengelig`,
        detail:
          'Åpne nedlastingssiden, last ned Pulse-Portable.exe og erstatt den gamle filen etter at appen er lukket.',
        buttons: ['OK', 'Åpne nedlastingsside'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 1) {
          // Open download page
          const downloadUrl = 'https://github.com/Isuldra/Suppliers/releases/latest';
          shell.openExternal(downloadUrl).catch((err) => {
            updateLogger.error('Kunne ikke åpne nedlastingsside:', err);
          });
        }
      });

    // Send update available to UI
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('update:available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
      });
    }
  }) as (...args: unknown[]) => void);

  // Handle errors
  autoUpdater.on('error', ((error: Error) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    mainWindow?.webContents.send('update:error', { message: error.message });
    updateLogger.error('Feil ved oppdatering (portable):', error);
    updateLogger.error('Error stack:', error.stack);

    // Log detailed error information for 404 errors
    const errorMessage = error.message || error.toString();
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      updateLogger.error('⚠️  404 ERROR DETECTED (Portable) - Release file not found on GitHub');
      updateLogger.error(`   Current version: ${app.getVersion()}`);
      updateLogger.error(`   Feed URL: ${autoUpdater.getFeedURL()}`);
    }

    showPortableUpdateError(error);
  }) as (...args: unknown[]) => void);
}

/**
 * Show error dialog for portable update issues
 */
function showPortableUpdateError(error: Error) {
  const errorMessage = error.message || error.toString();
  const is404Error = errorMessage.includes('404') || errorMessage.includes('Not Found');
  const isNetworkError = errorMessage.includes('net::') || errorMessage.includes('ENOTFOUND');
  const isFileError = errorMessage.includes('ENOENT') || errorMessage.includes('app-update.yml');

  let message = 'Det oppstod en feil under oppdatering';
  let detail = `Detaljer: ${errorMessage}`;

  if (is404Error) {
    message = 'Oppdateringsfil ikke funnet (404) - Portable';
    detail = `Den forespurte oppdateringsfilen finnes ikke på serveren.\n\nDette kan bety at:\n- Release v${app.getVersion()} er ikke publisert ennå\n- Filnavnet i latest.json er feil\n- GitHub Release mangler den portable filen\n\nLast ned den nyeste portable versjonen manuelt fra GitHub.\n\nTeknisk info: ${errorMessage}`;
  } else if (isNetworkError) {
    message = 'Nettverksfeil ved oppdatering';
    detail = 'Sjekk internettforbindelsen og prøv igjen senere.';
  } else if (isFileError) {
    message = 'Oppdateringsfiler ikke tilgjengelige';
    detail = 'Du kan laste ned den nyeste versjonen manuelt fra GitHub.';
  }

  dialog
    .showMessageBox({
      type: 'error',
      title: 'Oppdateringsfeil (Portable)',
      message,
      detail,
      buttons: ['OK', 'Åpne nedlastingsside'],
      defaultId: 0,
    })
    .then((result) => {
      if (result.response === 1) {
        const downloadUrl = 'https://github.com/Isuldra/Suppliers/releases/latest';
        shell.openExternal(downloadUrl).catch((err) => {
          updateLogger.error('Kunne ikke åpne nedlastingsside:', err);
        });
      }
    });
}

export function setupAutoUpdater() {
  downloadedUpdateReady = false;
  // Ikke kjør auto-oppdatering i utviklingsmodus
  if (process.env.NODE_ENV === 'development') {
    updateLogger.info('Kjører i utviklingsmodus - automatiske oppdateringer er deaktivert');
    return;
  }

  updateLogger.info('Auto-updater configured to use GitHub Releases');
  updateLogger.info(`Current app version: ${app.getVersion()}`);

  // Check if running as portable version
  const isPortable = isPortableVersion();

  if (isPortable) {
    updateLogger.info('Portable versjon oppdaget - bruker portable auto-updater');
    setupPortableUpdater();
  } else {
    updateLogger.info('Installert versjon oppdaget - bruker standard auto-updater');
    setupStandardUpdater();
  }

  // A pending marker warrants an earlier check, never an immediate install.
  const startupDelay = !isPortable && readPendingUpdateMarker() ? 3000 : 10000;
  setTimeout(() => {
    const check = isPortable ? autoUpdater.checkForUpdates() : checkForPendingUpdate();
    check.catch((err: Error) => updateLogger.error('Feil ved sjekk for oppdateringer:', err));
  }, startupDelay);

  // Check for updates every 6 hours to reduce spam
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    autoUpdater
      .checkForUpdates()
      .catch((err: Error) =>
        updateLogger.error('Feil ved periodisk sjekk for oppdateringer:', err)
      );
  }, SIX_HOURS);
}

/**
 * Check for pending updates that were downloaded but not installed
 * This is useful when the app was force-quit before installation completed
 */
async function checkForPendingUpdate() {
  updateLogger.info('Checking for pending updates at startup...');

  const pending = readPendingUpdateMarker();
  if (!pending) {
    updateLogger.info('No pending updates found at startup');
  } else if (pending.version === app.getVersion()) {
    updateLogger.info(`Pending update ${pending.version} is already installed; clearing marker`);
    clearPendingUpdateMarker();
  } else {
    updateLogger.info(`Revalidating pending update ${pending.version} before installation`);
  }

  // Only the standard update-downloaded handler may offer installation.
  // checkForUpdates revalidates cached installers before that event is emitted.
  return autoUpdater.checkForUpdates();
}

/**
 * Setup standard auto-updater for installed versions
 */
function setupStandardUpdater() {
  // Standard configuration for installed versions
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // Disable differential downloads to avoid 404 errors with missing old versions
  autoUpdater.disableDifferentialDownload = true;

  // Handle update-sjekk
  autoUpdater.on('checking-for-update', () => {
    updateLogger.info('Sjekker for oppdateringer...');
  });

  // Ingen oppdateringer er tilgjengelige
  autoUpdater.on('update-not-available', ((info: UpdateInfo) => {
    updateLogger.info('Ingen nye oppdateringer tilgjengelig:', info);
    clearPendingUpdateMarker();
  }) as (...args: unknown[]) => void);

  // Oppdatering funnet
  autoUpdater.on('update-available', ((info: UpdateInfo) => {
    updateLogger.info('Ny oppdatering tilgjengelig:', info);
    updateLogger.info(
      `Current app version: ${app.getVersion()}, Available version: ${info.version}`
    );

    // Check if we've already shown this update notification recently
    const now = Date.now();
    if (
      lastShownUpdateVersion === info.version &&
      now - lastUpdateNotificationTime < UPDATE_NOTIFICATION_COOLDOWN
    ) {
      updateLogger.info(`Skipping duplicate update notification for version ${info.version}`);
      return;
    }

    // Update tracking variables
    lastShownUpdateVersion = info.version;
    lastUpdateNotificationTime = now;

    // Varsle bruker om at nedlasting starter
    dialog.showMessageBox({
      type: 'info',
      title: 'Oppdatering tilgjengelig',
      message: `En ny versjon (${info.version}) av Pulse er tilgjengelig`,
      detail: 'Oppdateringen lastes ned og installeres automatisk...',
      buttons: ['OK'],
    });

    // Send update available to UI
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('update:available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
      });
    }
  }) as (...args: unknown[]) => void);

  // Håndtere nedlastningsfremdrift
  autoUpdater.on('download-progress', ((progressObj: ProgressInfo) => {
    const message = `Laster ned oppdatering: ${Math.round(progressObj.percent)}%`;
    updateLogger.info(message);

    // Send progress to UI
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('update-download-progress', {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        total: progressObj.total,
        transferred: progressObj.transferred,
      });
    }
  }) as (...args: unknown[]) => void);

  // Oppdatering er lastet ned og klar for installasjon
  autoUpdater.on('update-downloaded', ((info: UpdateInfo) => {
    updateLogger.info('Oppdatering lastet ned:', info);
    downloadedUpdateReady = true;
    writePendingUpdateMarker(info.version);

    // Send update downloaded to UI
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('update:downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
      });
    }

    // Show notification that update is ready and will install on next restart
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Oppdatering klar',
        message: `Versjon ${info.version} er lastet ned og klar`,
        detail:
          'Oppdateringen vil installeres automatisk når du lukker applikasjonen. Du kan også installere nå.',
        buttons: ['Installer nå', 'Installer ved neste lukking'],
        defaultId: 0,
      })
      .then((returnValue) => {
        if (returnValue.response === 0) {
          // Install immediately
          updateLogger.info('Installerer oppdatering nå...');
          installDownloadedUpdate();
        } else {
          // Will install on app quit (autoInstallOnAppQuit is already true)
          updateLogger.info('Oppdatering vil installeres ved neste lukking av applikasjonen');
        }
      });
  }) as (...args: unknown[]) => void);

  // Håndtere feil
  autoUpdater.on('error', ((error: Error) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    mainWindow?.webContents.send('update:error', { message: error.message });
    updateLogger.error('Feil ved oppdatering:', error);
    updateLogger.error('Error stack:', error.stack);

    // Detect specific error types
    const errorMessage = error.message || error.toString();
    const is404Error = errorMessage.includes('404') || errorMessage.includes('Not Found');
    const isNetworkError =
      errorMessage.includes('net::') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ETIMEDOUT');
    const isFileError = errorMessage.includes('ENOENT') || errorMessage.includes('Cannot find');

    let userMessage = 'Det oppstod en feil under oppdatering';
    let userDetail = `Detaljer: ${errorMessage}`;

    if (is404Error) {
      userMessage = 'Oppdateringsfil ikke funnet (404)';
      userDetail = `Den forespurte oppdateringsfilen finnes ikke på serveren.\n\nDette kan bety at:\n- Release v${app.getVersion()} er ikke publisert ennå\n- Filnavnet i latest.yml er feil\n- GitHub Release mangler filen\n\nKontakt administrator eller prøv igjen senere.\n\nTeknisk info: ${errorMessage}`;
      updateLogger.error('⚠️  404 ERROR DETECTED - Release file not found on GitHub');
      updateLogger.error(`   Current version: ${app.getVersion()}`);
      updateLogger.error(`   Feed URL: ${autoUpdater.getFeedURL()}`);
    } else if (isNetworkError) {
      userMessage = 'Nettverksfeil ved oppdatering';
      userDetail =
        'Kunne ikke koble til oppdateringsserveren.\n\nSjekk internettforbindelsen og prøv igjen senere.';
    } else if (isFileError) {
      userMessage = 'Oppdateringsfiler ikke tilgjengelige';
      userDetail = 'Nødvendige oppdateringsfiler ble ikke funnet.\n\nPrøv igjen senere.';
    }

    dialog
      .showMessageBox({
        type: 'error',
        title: 'Oppdateringsfeil',
        message: userMessage,
        detail: userDetail,
        buttons: ['OK', 'Vis GitHub Releases'],
      })
      .then((result) => {
        if (result.response === 1) {
          shell
            .openExternal('https://github.com/Isuldra/Suppliers/releases/latest')
            .catch((err) => {
              updateLogger.error('Could not open releases page:', err);
            });
        }
      });
  }) as (...args: unknown[]) => void);
}

// Funksjon for å manuelt sjekke for oppdateringer
export function checkForUpdatesManually() {
  if (process.env.NODE_ENV === 'development') {
    updateLogger.info('Kjører i utviklingsmodus - manuelle oppdateringer er deaktivert');
    return Promise.resolve({ success: true, updateAvailable: false, version: undefined });
  }

  updateLogger.info('Manuell sjekk for oppdateringer startet...');
  updateLogger.info(`Current app version: ${app.getVersion()}`);

  return autoUpdater
    .checkForUpdates()
    .then((result) => {
      updateLogger.info('Manual update check result:', result);
      return {
        success: true,
        manualDownload: isPortableVersion(),
        updateAvailable: result?.isUpdateAvailable === true,
        version: result?.updateInfo?.version,
      };
    })
    .catch((error) => {
      updateLogger.error('Manual update check failed:', error);
      throw error;
    });
}
