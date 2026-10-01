// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  expose: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: mocks.expose },
  ipcRenderer: { invoke: mocks.invoke, on: mocks.on, removeListener: mocks.removeListener },
}));

import '../src/preload/index';

describe('renderer update API', () => {
  it('routes the update button to the registered handler and forwards its result', async () => {
    const api = mocks.expose.mock.calls.find(([name]) => name === 'electron')?.[1];
    const result = { success: true, updateAvailable: false, version: '1.5.3' };
    mocks.invoke.mockResolvedValue(result);
    expect(await api.checkForUpdatesWithResult()).toEqual(result);
    expect(mocks.invoke).toHaveBeenCalledWith('update:check');
  });
});
