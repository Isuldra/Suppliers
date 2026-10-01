import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FileUpload from '../src/renderer/components/FileUpload';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-dropzone', () => ({
  useDropzone: () => ({ getRootProps: () => ({}), getInputProps: () => ({}), isDragActive: false }),
}));
vi.mock('xlsx', () => ({}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

let root: Root;
let container: HTMLDivElement;
let emitError: (error: Error) => void;
let emitProgress: (progress: {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}) => void;
const unsubscribeError = vi.fn();

beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('electron', {
    onUpdateDownloadProgress: (callback: typeof emitProgress) => {
      emitProgress = callback;
      return vi.fn();
    },
    onUpdateDownloaded: () => vi.fn(),
    onUpdateError: (callback: typeof emitError) => {
      emitError = callback;
      return unsubscribeError;
    },
    checkForUpdatesWithResult: vi
      .fn()
      .mockResolvedValue({ success: true, updateAvailable: true, version: '1.6.0' }),
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(<FileUpload onDataParsed={vi.fn()} onValidationErrors={vi.fn()} />)
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  expect(unsubscribeError).toHaveBeenCalledOnce();
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function checkForUpdates() {
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="fileUpload.help"]')!.click()
  );
  const check = [...container.querySelectorAll('button')].find(
    (button) => button.textContent === 'fileUpload.checkUpdates'
  )!;
  await act(async () => check.click());
  expect(container).toHaveTextContent('Oppdateringen lastes ned automatisk.');
}

describe('update download errors', () => {
  it('replaces the download status and removes a partially completed progress bar', async () => {
    await checkForUpdates();
    await act(async () =>
      emitProgress({ percent: 42, bytesPerSecond: 10, total: 100, transferred: 42 })
    );
    expect(container).toHaveTextContent('42%');
    await act(async () => emitError(new Error('Nedlastingen ble avbrutt')));
    expect(container).toHaveTextContent('Nedlastingen ble avbrutt');
    expect(container).not.toHaveTextContent('Oppdateringen lastes ned automatisk.');
    expect(container).not.toHaveTextContent('42%');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the startup timeout when downloading fails before any progress event', async () => {
    await checkForUpdates();
    expect(vi.getTimerCount()).toBe(1);
    await act(async () => emitError(new Error('')));
    expect(container).toHaveTextContent('Nedlasting av oppdateringen mislyktes. Prøv igjen.');
    expect(vi.getTimerCount()).toBe(0);
  });
});
