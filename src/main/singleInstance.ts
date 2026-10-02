import { app, type BrowserWindow } from 'electron';

/** Only one process may open the database and write to the shared updater cache. */
export function startSingleInstance(
  getWindow: () => BrowserWindow | null,
  initialize: () => Promise<void>
): void {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    const window = getWindow();
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });

  void app.whenReady().then(initialize);
}
