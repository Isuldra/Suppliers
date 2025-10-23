import { dialog } from "electron";
import { app, shell } from "electron";
import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const log = require("electron-log/main");

const updateLogger = log.scope("simpleUpdater");

interface UpdateInfo {
  version: string;
  files: Array<{
    url: string;
    sha512: string;
    size: number;
  }>;
  path: string;
  sha512: string;
  releaseDate: string;
}

/**
 * Simple HTTP-based updater that doesn't rely on GitHub API
 * Uses direct file downloads from a simple web server
 */
export class SimpleUpdater {
  private updateUrl: string;
  private currentVersion: string;

  constructor(updateUrl: string, currentVersion: string) {
    this.updateUrl = updateUrl;
    this.currentVersion = currentVersion;
  }

  /**
   * Check for updates by downloading latest.json
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      updateLogger.info(`Checking for updates from: ${this.updateUrl}`);

      const latestJsonUrl = `${this.updateUrl}/latest.json`;
      const updateInfo = await this.downloadJson(latestJsonUrl);

      if (this.isNewerVersion(updateInfo.version, this.currentVersion)) {
        updateLogger.info(`New version available: ${updateInfo.version}`);
        return updateInfo;
      } else {
        updateLogger.info("No updates available");
        return null;
      }
    } catch (error) {
      updateLogger.error("Failed to check for updates:", error);
      return null;
    }
  }

  /**
   * Download and install update
   */
  async downloadAndInstall(updateInfo: UpdateInfo): Promise<void> {
    try {
      const downloadUrl = `${this.updateUrl}/${updateInfo.path}`;
      updateLogger.info(`Downloading update from: ${downloadUrl}`);

      // Show download dialog
      const result = await dialog.showMessageBox({
        type: "info",
        title: "Oppdatering tilgjengelig",
        message: `Versjon ${updateInfo.version} er tilgjengelig`,
        detail: "Vil du laste ned og installere oppdateringen nå?",
        buttons: ["Last ned", "Avbryt"],
        defaultId: 0,
        cancelId: 1,
      });

      if (result.response === 0) {
        // Open download URL in browser
        await shell.openExternal(downloadUrl);

        // Show instructions
        await dialog.showMessageBox({
          type: "info",
          title: "Instruksjoner",
          message: "Oppdateringen er åpnet i nettleseren",
          detail:
            "Last ned og kjør den nye versjonen for å oppdatere applikasjonen.",
          buttons: ["OK"],
        });
      }
    } catch (error) {
      updateLogger.error("Failed to download update:", error);
      throw error;
    }
  }

  /**
   * Download JSON from URL
   */
  private downloadJson(url: string): Promise<UpdateInfo> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith("https:") ? https : http;

      client
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                `HTTP ${response.statusCode}: ${response.statusMessage}`
              )
            );
            return;
          }

          let data = "";
          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (error) {
              reject(new Error("Invalid JSON response"));
            }
          });
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  /**
   * Compare version strings
   */
  private isNewerVersion(
    remoteVersion: string,
    currentVersion: string
  ): boolean {
    const remote = this.parseVersion(remoteVersion);
    const current = this.parseVersion(currentVersion);

    for (let i = 0; i < 3; i++) {
      if (remote[i] > current[i]) return true;
      if (remote[i] < current[i]) return false;
    }
    return false;
  }

  /**
   * Parse version string to array of numbers
   */
  private parseVersion(version: string): number[] {
    return version.split(".").map((num) => parseInt(num, 10) || 0);
  }
}

/**
 * Setup simple updater with fallback options
 */
export function setupSimpleUpdater() {
  // Don't run in development
  if (process.env.NODE_ENV === "development") {
    updateLogger.info("Development mode - auto-updates disabled");
    return;
  }

  const currentVersion = app.getVersion();

  // Try multiple update sources in order of preference
  const updateSources = [
    "https://suppliers-anx.pages.dev", // Cloudflare Pages
    "https://isuldra.github.io/Suppliers", // GitHub Pages fallback
    "https://updates.onemed.no", // Company server (if available)
    "https://raw.githubusercontent.com/Isuldra/Suppliers/main/docs/updates", // GitHub raw files
  ];

  let updater: SimpleUpdater | null = null;
  let currentSourceIndex = 0;

  const tryNextSource = async () => {
    if (currentSourceIndex >= updateSources.length) {
      updateLogger.error("All update sources failed");
      return;
    }

    const updateUrl = updateSources[currentSourceIndex];
    updateLogger.info(`Trying update source: ${updateUrl}`);

    updater = new SimpleUpdater(updateUrl, currentVersion);

    try {
      const updateInfo = await updater.checkForUpdates();
      if (updateInfo) {
        await updater.downloadAndInstall(updateInfo);
      }
    } catch (error) {
      updateLogger.warn(`Update source ${updateUrl} failed:`, error);
      currentSourceIndex++;
      setTimeout(tryNextSource, 5000); // Try next source after 5 seconds
    }
  };

  // Start checking for updates after 10 seconds
  setTimeout(tryNextSource, 10000);

  // Check for updates every hour
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(tryNextSource, ONE_HOUR);
}
