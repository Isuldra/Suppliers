import { dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const log = require('electron-log/main');
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
let lastShownUpdateVersion: string | null = null;
let lastUpdateNotificationTime: number = 0;
const UPDATE_NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Detect if the app is running as a portable version
 * Portable apps typically run from a temporary or user-defined location
 * and don't have the standard installation structure
 */
function isPortableVersion(): boolean {
  try {
    const appPath = app.getAppPath();
    const execPath = process.execPath;

    updateLogger.info(`App path: ${appPath}`);
    updateLogger.info(`Exec path: ${execPath}`);

    // Check if running from a portable executable
    // Portable versions often have "Portable" in the filename
    if (execPath.includes('Portable') || execPath.includes('portable')) {
      updateLogger.info('Detected portable version by filename');
      return true;
    }

    // Check if app is running from a non-standard location
    // Standard installations are usually in Program Files or AppData
    const normalizedPath = path.normalize(appPath).toLowerCase();
    const isInProgramFiles = normalizedPath.includes('program files');
    const isInAppData = normalizedPath.includes('appdata');
    const isInUserProfile =
      normalizedPath.includes('users') && (isInAppData || normalizedPath.includes('local'));

    updateLogger.info(`Normalized path: ${normalizedPath}`);
    updateLogger.info(`Is in Program Files: ${isInProgramFiles}`);
    updateLogger.info(`Is in AppData: ${isInAppData}`);
    updateLogger.info(`Is in User Profile: ${isInUserProfile}`);

    // More specific check: if it's in AppData but not in a proper installation structure
    // NSIS installations typically create proper folder structures
    if (isInAppData) {
      // Check if it has a proper installation structure (resources, locales, etc.)
      const hasResources = fs.existsSync(path.join(appPath, 'resources'));
      const hasLocales = fs.existsSync(path.join(appPath, 'locales'));
      const hasUninstaller = fs.existsSync(path.join(path.dirname(appPath), 'uninstall.exe'));

      updateLogger.info(`Has resources folder: ${hasResources}`);
      updateLogger.info(`Has locales folder: ${hasLocales}`);
      updateLogger.info(`Has uninstaller: ${hasUninstaller}`);

      // If it has proper installation structure, it's not portable
      if (hasResources || hasLocales || hasUninstaller) {
        updateLogger.info('Detected as installed version (has proper structure)');
        return false;
      }
    }

    // If not in standard installation paths, likely portable
    if (!isInProgramFiles && !isInUserProfile) {
      updateLogger.info('Detected portable version (not in standard paths)');
      return true;
    }

    // Additional check: portable versions often run from Downloads, Desktop, or removable drives
    // But only if they don't have proper installation structure
    const portableIndicators = ['downloads', 'desktop', 'documents', 'temp', 'tmp'];

    if (portableIndicators.some((indicator) => normalizedPath.includes(indicator))) {
      // Double-check: if it has installation structure, it might be a portable installation
      const hasResources = fs.existsSync(path.join(appPath, 'resources'));
      if (!hasResources) {
        updateLogger.info('Detected portable version (in portable location without resources)');
        return true;
      }
    }

    updateLogger.info('Detected as installed version (default)');
    return false;
  } catch (error) {
    updateLogger.warn('Error detecting portable version:', error);
    return false;
  }
}

/**
 * Setup auto-updater for portable versions with manual download approach
 */
function setupPortableUpdater() {
  updateLogger.info('Konfigurerer portable auto-updater...');

  // Configure for portable - enable automatic download but manual installation
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  // Disable differential downloads to avoid 404 errors with missing old versions
  (autoUpdater as typeof autoUpdater & { differentialDownload?: boolean }).differentialDownload =
    false;

  // Handle update check
  autoUpdater.on('checking-for-update', () => {
    updateLogger.info('Sjekker for oppdateringer (portable modus)...');
  });

  // No updates available
  autoUpdater.on('update-not-available', ((info: UpdateInfo) => {
    updateLogger.info('Ingen nye oppdateringer tilgjengelig (portable):', info);
  }) as (...args: unknown[]) => void);

  // Update available - automatically download for portable
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

    // Show notification that download is starting
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Oppdatering tilgjengelig',
        message: `En ny versjon (${info.version}) av Pulse er tilgjengelig`,
        detail:
          'Oppdateringen lastes ned automatisk. Du kan installere den manuelt når nedlastingen er ferdig.',
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

    // Automatically start download
    updateLogger.info('Starter automatisk nedlasting av oppdatering...');

    // Send update available to UI
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
      });
    }
  }) as (...args: unknown[]) => void);

  // Handle download progress
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

  // Update downloaded - provide manual installation instructions
  autoUpdater.on('update-downloaded', ((info: UpdateInfo) => {
    updateLogger.info('Oppdatering lastet ned (portable):', info);

    // Send update downloaded to UI
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
      });
    }

    // Get the download location
    const downloadPath = getPortableUpdatePath();

    dialog
      .showMessageBox({
        type: 'info',
        title: 'Oppdatering klar',
        message: `Versjon ${info.version} er lastet ned`,
        detail: `Oppdateringen er lagret i:\n${downloadPath}\n\nFor å installere:\n1. Lukk denne applikasjonen\n2. Erstatt den gamle .exe-filen med den nye\n3. Start applikasjonen på nytt\n\nVil du åpne mappen med den nye filen?`,
        buttons: ['Åpne mappe', 'Lukk app og installer', 'Senere'],
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
              updateLogger.error('Kunne ikke åpne mappe:', openErr);
            });
          }
        } else if (result.response === 1) {
          // Quit app for manual installation
          updateLogger.info('Avslutter app for manuell installasjon...');
          app.quit();
        }
      });
  }) as (...args: unknown[]) => void);

  // Handle errors
  autoUpdater.on('error', ((error: Error) => {
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
 * Get the expected path for portable update downloads
 */
function getPortableUpdatePath(): string {
  const userDataPath = app.getPath('userData');
  const updatesDir = path.join(userDataPath, 'updates');

  // Ensure updates directory exists
  try {
    if (!fs.existsSync(updatesDir)) {
      fs.mkdirSync(updatesDir, { recursive: true });
    }
  } catch (error) {
    updateLogger.warn('Could not create updates directory:', error);
  }

  return path.join(updatesDir, 'Pulse-Portable.exe');
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

  // Check for pending updates at startup (for installed versions only)
  // This handles cases where user forced quit the app before installation completed
  if (!isPortable) {
    setTimeout(() => {
      checkForPendingUpdate();
    }, 3000);
  }

  // Start checking for updates after a delay
  setTimeout(() => {
    autoUpdater
      .checkForUpdates()
      .catch((err: Error) => updateLogger.error('Feil ved sjekk for oppdateringer:', err));
  }, 10000);

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
  try {
    updateLogger.info('Checking for pending updates at startup...');
    
    // Listen for update-downloaded event which indicates a pending update
    let hasPendingUpdate = false;
    
    const pendingUpdateHandler = () => {
      hasPendingUpdate = true;
    };
    
    autoUpdater.once('update-downloaded', pendingUpdateHandler);
    
    // Try to check for updates - if an update is already downloaded,
    // it will trigger the update-downloaded event immediately
    await autoUpdater.checkForUpdates();
    
    // Small delay to allow event to fire
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    if (hasPendingUpdate) {
      updateLogger.info('Found pending update, prompting user for installation...');
      
      const result = await dialog.showMessageBox({
        type: 'question',
        title: 'Uinstallert oppdatering funnet',
        message: 'Det finnes en oppdatering som ble lastet ned men ikke installert.',
        detail: 'Vil du installere oppdateringen nå? Applikasjonen vil starte på nytt.',
        buttons: ['Installer nå', 'Senere'],
        defaultId: 0,
      });
      
      if (result.response === 0) {
        updateLogger.info('User chose to install pending update...');
        autoUpdater.quitAndInstall(false, true);
      }
    } else {
      updateLogger.info('No pending updates found at startup');
    }
  } catch (error) {
    // This is expected if no pending update exists
    updateLogger.info('No pending update or error checking:', error);
  }
}

/**
 * Setup standard auto-updater for installed versions
 */
function setupStandardUpdater() {
  // Standard configuration for installed versions
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // Disable differential downloads to avoid 404 errors with missing old versions
  (autoUpdater as typeof autoUpdater & { differentialDownload?: boolean }).differentialDownload =
    false;

  // Handle update-sjekk
  autoUpdater.on('checking-for-update', () => {
    updateLogger.info('Sjekker for oppdateringer...');
  });

  // Ingen oppdateringer er tilgjengelige
  autoUpdater.on('update-not-available', ((info: UpdateInfo) => {
    updateLogger.info('Ingen nye oppdateringer tilgjengelig:', info);
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

    // Automatically start download
    updateLogger.info('Starter automatisk nedlasting av oppdatering...');

    // Send update available to UI
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
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

    // Send update downloaded to UI
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
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
          autoUpdater.quitAndInstall(false, true);
        } else {
          // Will install on app quit (autoInstallOnAppQuit is already true)
          updateLogger.info('Oppdatering vil installeres ved neste lukking av applikasjonen');
        }
      });
  }) as (...args: unknown[]) => void);

  // Håndtere feil
  autoUpdater.on('error', ((error: Error) => {
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
    return Promise.resolve({ updateAvailable: false, version: undefined });
  }

  updateLogger.info('Manuell sjekk for oppdateringer startet...');
  updateLogger.info(`Current app version: ${app.getVersion()}`);

  return autoUpdater
    .checkForUpdates()
    .then((result) => {
      updateLogger.info('Manual update check result:', result);
      return {
        updateAvailable: result?.updateInfo ? true : false,
        version: result?.updateInfo?.version,
      };
    })
    .catch((error) => {
      updateLogger.error('Manual update check failed:', error);
      throw error;
    });
}
