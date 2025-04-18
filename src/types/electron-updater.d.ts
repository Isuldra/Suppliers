// Type definitions for electron-updater
declare module "electron-updater" {
  import { EventEmitter } from "events";

  export interface UpdateInfo {
    version: string;
    files: Array<{
      url: string;
      sha512: string;
      size: number;
      blockMapSize?: number;
    }>;
    path: string;
    sha512: string;
    releaseDate: string;
    releaseName?: string;
    releaseNotes?: string;
  }

  export interface ProgressInfo {
    percent: number;
    bytesPerSecond: number;
    total: number;
    transferred: number;
  }

  export interface FeedURLOptions {
    provider: string;
    url?: string;
    channel?: string;
    serverType?: string;
  }

  export class AppUpdater extends EventEmitter {
    logger: any;
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;

    setFeedURL(options: FeedURLOptions | string): void;
    checkForUpdates(): Promise<{
      updateInfo: UpdateInfo;
      downloadPromise: Promise<any>;
      versionInfo: any;
      updateAvailable: boolean;
    }>;
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  }

  export class NsisUpdater extends AppUpdater {}
  export class MacUpdater extends AppUpdater {}
  export class AppImageUpdater extends AppUpdater {}

  export const autoUpdater: AppUpdater;
}
