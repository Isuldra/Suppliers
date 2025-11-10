// Type definitions for electron-updater
declare module 'electron-updater' {
  import { EventEmitter } from 'events';

  // Define a basic Logger interface
  interface BasicLogger {
    info(message?: unknown, ...optionalParams: unknown[]): void;
    warn(message?: unknown, ...optionalParams: unknown[]): void;
    error(message?: unknown, ...optionalParams: unknown[]): void;
    debug?(message?: unknown, ...optionalParams: unknown[]): void; // Optional debug method
  }

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

  // Define the interface for the AppUpdater class (simplified)
  export interface AppUpdater {
    // Properties
    logger: BasicLogger; // Use the defined logger type
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;

    // Methods
    setFeedURL(options: FeedURLOptions | string): void;
    checkForUpdates(): Promise<{
      updateInfo: UpdateInfo;
      downloadPromise: Promise<string[] | Error>; // More specific type
      versionInfo: Record<string, unknown>; // Use Record<string, unknown>
      updateAvailable: boolean;
    }>;
    downloadUpdate(): Promise<string[]>;
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
    on(event: string, _callback: (...args: unknown[]) => void): this;
    once(event: string, _callback: (...args: unknown[]) => void): this;
    setFeedURL(_options: unknown): void;
    getFeedURL(): string | undefined;
  }

  export class NsisUpdater extends AppUpdater {}
  export class MacUpdater extends AppUpdater {}
  export class AppImageUpdater extends AppUpdater {}

  export const autoUpdater: AppUpdater;
}
