// Mock electron-updater for development
const UpdateInfo = class {
  constructor() {
    this.version = "1.0.0-dev";
    this.releaseDate = new Date().toISOString();
    this.releaseName = "Development Version";
    this.releaseNotes = "This is a development build";
  }
};

const ProgressInfo = class {
  constructor() {
    this.percent = 0;
    this.bytesPerSecond = 0;
    this.total = 0;
    this.transferred = 0;
  }
};

const autoUpdater = {
  logger: console,
  autoDownload: true,
  autoInstallOnAppQuit: true,
  on: (event, callback) => {
    console.log(`[MOCK UPDATER] Registered event handler for: ${event}`);
    return autoUpdater;
  },
  once: (event, callback) => {
    console.log(
      `[MOCK UPDATER] Registered one-time event handler for: ${event}`
    );
    return autoUpdater;
  },
  checkForUpdates: () => {
    console.log("[MOCK UPDATER] Checking for updates (mocked)");
    return Promise.resolve({
      updateAvailable: false,
      updateInfo: new UpdateInfo(),
    });
  },
  downloadUpdate: () => {
    console.log("[MOCK UPDATER] Downloading update (mocked)");
    return Promise.resolve();
  },
  quitAndInstall: (isSilent, isForceRunAfter) => {
    console.log(
      `[MOCK UPDATER] Quit and install called with silent=${isSilent}, forceRun=${isForceRunAfter}`
    );
  },
};

module.exports = {
  autoUpdater,
  UpdateInfo,
  ProgressInfo,
};
