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

import EventEmitter from "events";

class MockAutoUpdater extends EventEmitter {
  logger: any = null;
  autoDownload = true;
  autoInstallOnAppQuit = true;
  currentVersion = { version: "1.0.0" }; // Mock version
  updateConfigPath: string | null = null;

  constructor() {
    super();
    this.logger = {
      info: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.log,
    };
  }

  checkForUpdates() {
    this.logger.info("(Mock) Checking for updates...");
    // Simulate finding no update after a short delay
    setTimeout(() => {
      this.emit("update-not-available");
    }, 1000);
    return Promise.resolve({ versionInfo: { version: "1.0.0" } }); // Mock check result
  }

  checkForUpdatesAndNotify() {
    this.logger.info("(Mock) Checking for updates and notify...");
    // Simulate finding no update
    setTimeout(() => {
      this.emit("update-not-available");
    }, 1000);
    return Promise.resolve(null);
  }

  downloadUpdate() {
    this.logger.info("(Mock) Downloading update...");
    // Simulate download progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      this.emit("download-progress", { percent: progress });
      if (progress >= 100) {
        clearInterval(interval);
        this.emit("update-downloaded", { version: "1.1.0" }); // Simulate downloaded info
      }
    }, 500);
    return Promise.resolve(["mock/path/to/update.exe"]); // Mock download result
  }

  quitAndInstall(_isSilent?: boolean, _forceRunAfter?: boolean) {
    this.logger.info("(Mock) Quitting and installing update...");
    // In a real app, this would quit and run the installer
    process.exit(0); // Simulate app exit
  }

  // Add other methods/properties as needed, mocking their behavior
  // Example: Add event listeners
  on(event: string, _callback: (...args: any[]) => void): this {
    console.log(`[MOCK UPDATER] Registered event handler for: ${event}`);
    return super.on(event, _callback);
  }

  once(event: string, _callback: (...args: any[]) => void): this {
    console.log(
      `[MOCK UPDATER] Registered one-time event handler for: ${event}`
    );
    return super.once(event, _callback);
  }

  setFeedURL(_options: any): void {
    this.logger.info("(Mock) Set feed URL called with:", _options);
  }

  getFeedURL(): string | undefined {
    this.logger.info("(Mock) Get feed URL called");
    return "http://mock.update.server/feed";
  }
}

export const autoUpdater = new MockAutoUpdater();

module.exports = {
  autoUpdater,
  UpdateInfo,
  ProgressInfo,
};
