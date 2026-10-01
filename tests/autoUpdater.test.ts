// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => void>(),
  checkForUpdates: vi.fn(),
  quitAndInstall: vi.fn(),
  showMessageBox: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    getAppPath: () => 'C:/Program Files/Pulse',
    getPath: () => 'C:/Users/test/AppData/Pulse',
    getVersion: () => '1.5.3',
  },
  BrowserWindow: { getAllWindows: () => [] },
  dialog: { showMessageBox: mocks.showMessageBox },
  shell: {},
}));

vi.mock('electron-log/main', () => ({
  default: { scope: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

vi.mock('electron-updater', () => ({
  autoUpdater: {
    setFeedURL: vi.fn(),
    on: (event: string, handler: (...args: unknown[]) => void) =>
      mocks.handlers.set(event, handler),
    checkForUpdates: mocks.checkForUpdates,
    quitAndInstall: mocks.quitAndInstall,
  },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: () => true,
    readFileSync: mocks.readFileSync,
    unlinkSync: mocks.unlinkSync,
    writeFileSync: mocks.writeFileSync,
  },
}));

import { setupAutoUpdater } from '../src/main/auto-updater';

describe('installed app update recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.handlers.clear();
    mocks.readFileSync.mockReturnValue(JSON.stringify({ version: '1.6.0' }));
    mocks.checkForUpdates.mockResolvedValue(null);
    mocks.showMessageBox.mockResolvedValue({ response: 0 });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('rechecks a past download without offering installation or scheduling a second startup check', async () => {
    setupAutoUpdater();
    await vi.advanceTimersByTimeAsync(3000);
    expect(mocks.checkForUpdates).toHaveBeenCalledOnce();
    expect(mocks.showMessageBox).not.toHaveBeenCalled();
    expect(mocks.quitAndInstall).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(7000);
    expect(mocks.checkForUpdates).toHaveBeenCalledOnce();
  });

  it('only offers installation after the current session confirms a downloaded update', async () => {
    setupAutoUpdater();
    await vi.advanceTimersByTimeAsync(3000);
    mocks.handlers.get('update-downloaded')?.({ version: '1.6.1' });
    await Promise.resolve();
    expect(mocks.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('1.6.1'),
      'utf8'
    );
    expect(mocks.showMessageBox).toHaveBeenCalledOnce();
    expect(mocks.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('does not install when the user defers a validated update', async () => {
    mocks.showMessageBox.mockResolvedValue({ response: 1 });
    setupAutoUpdater();
    mocks.handlers.get('update-downloaded')?.({ version: '1.6.0' });
    await Promise.resolve();
    expect(mocks.quitAndInstall).not.toHaveBeenCalled();
  });

  it('clears a stale marker when the server reports no available update', async () => {
    setupAutoUpdater();
    await vi.advanceTimersByTimeAsync(3000);
    mocks.handlers.get('update-not-available')?.({ version: '1.5.3' });
    expect(mocks.unlinkSync).toHaveBeenCalledOnce();
    expect(mocks.quitAndInstall).not.toHaveBeenCalled();
  });

  it('clears an already installed marker and still checks for newer updates', async () => {
    mocks.readFileSync.mockReturnValue(JSON.stringify({ version: '1.5.3' }));
    setupAutoUpdater();
    await vi.advanceTimersByTimeAsync(3000);
    expect(mocks.unlinkSync).toHaveBeenCalledOnce();
    expect(mocks.checkForUpdates).toHaveBeenCalledOnce();
    expect(mocks.quitAndInstall).not.toHaveBeenCalled();
  });

  it('keeps the marker for retry after a network failure without offering installation', async () => {
    mocks.checkForUpdates.mockRejectedValue(new Error('ENOTFOUND'));
    setupAutoUpdater();
    await vi.advanceTimersByTimeAsync(3000);
    expect(mocks.unlinkSync).not.toHaveBeenCalled();
    expect(mocks.showMessageBox).not.toHaveBeenCalled();
    expect(mocks.quitAndInstall).not.toHaveBeenCalled();
  });

  it('discards a malformed marker and performs the normal delayed update check', async () => {
    mocks.readFileSync.mockReturnValue(JSON.stringify({ version: null }));
    setupAutoUpdater();
    await vi.advanceTimersByTimeAsync(3000);
    expect(mocks.unlinkSync).toHaveBeenCalledOnce();
    expect(mocks.checkForUpdates).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(7000);
    expect(mocks.checkForUpdates).toHaveBeenCalledOnce();
    expect(mocks.quitAndInstall).not.toHaveBeenCalled();
  });
});
