// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserWindow } from 'electron';

const mocks = vi.hoisted(() => ({
  requestSingleInstanceLock: vi.fn(),
  quit: vi.fn(),
  whenReady: vi.fn(),
  on: vi.fn(),
}));

vi.mock('electron', () => ({ app: mocks }));

import { startSingleInstance } from '../src/main/singleInstance';

describe('single Pulse instance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestSingleInstanceLock.mockReturnValue(true);
    mocks.whenReady.mockResolvedValue(undefined);
  });

  it('exits the second process without starting the database or updater', async () => {
    mocks.requestSingleInstanceLock.mockReturnValue(false);
    const initialize = vi.fn();
    startSingleInstance(() => null, initialize);
    await Promise.resolve();
    expect(mocks.quit).toHaveBeenCalledOnce();
    expect(mocks.whenReady).not.toHaveBeenCalled();
    expect(initialize).not.toHaveBeenCalled();
  });

  it('initializes only the owner after Electron is ready', async () => {
    let ready!: () => void;
    mocks.whenReady.mockReturnValue(new Promise<void>((resolve) => (ready = resolve)));
    const initialize = vi.fn();
    startSingleInstance(() => null, initialize);
    expect(initialize).not.toHaveBeenCalled();
    ready();
    await Promise.resolve();
    expect(initialize).toHaveBeenCalledOnce();
    expect(mocks.quit).not.toHaveBeenCalled();
  });

  it('restores and focuses the existing window when Pulse is opened again', () => {
    const window = {
      isDestroyed: () => false,
      isMinimized: () => true,
      restore: vi.fn(),
      show: vi.fn(),
      focus: vi.fn(),
    };
    startSingleInstance(() => window as unknown as BrowserWindow, vi.fn());
    mocks.on.mock.calls.find(([event]) => event === 'second-instance')![1]();
    expect(window.restore).toHaveBeenCalledOnce();
    expect(window.show).toHaveBeenCalledOnce();
    expect(window.focus).toHaveBeenCalledOnce();
  });

  it('tolerates another launch before the first window is created', () => {
    startSingleInstance(() => null, vi.fn());
    expect(() => mocks.on.mock.calls[0][1]()).not.toThrow();
  });
});
