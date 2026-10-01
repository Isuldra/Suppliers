import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import Workspace from '../src/renderer/workspace/Workspace';
import { initNorwegian } from './i18nTestSetup';
import { DAYS, fingerprint, lineId, readMemory, saveMemory } from '../src/renderer/workspace/model';
import type { ExcelRow } from '../src/renderer/types/ExcelData';

vi.mock('../src/renderer/components/FileUpload', () => ({ default: () => null }));
vi.mock('../src/renderer/components/SettingsModal', () => ({ default: () => null }));
vi.mock('../src/renderer/workspace/OrderTable', () => ({ default: () => null }));
vi.mock('../src/renderer/workspace/SupplierRegister', () => ({ default: () => null }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../src/renderer/context/ICTOrderContext', () => ({
  useICTOrder: () => ({ includeICTOrders: false, setIncludeICTOrders: vi.fn() }),
}));
vi.mock('../src/renderer/context/WarehouseFilterContext', () => ({
  useWarehouseFilter: () => ({
    warehouseFilter: 'all',
    showWarehouseFilter: false,
    setWarehouseFilter: vi.fn(),
    refreshCountryDetection: vi.fn(),
  }),
}));
let root: Root;
let container: HTMLDivElement;
const transport = vi.fn();
beforeAll(initNorwegian);
beforeEach(() => {
  localStorage.clear();
  transport.mockReset().mockResolvedValue({ success: true });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('electron', {
    getAllOrders: async () =>
      ['First', 'Second'].map((supplier) => ({
        key: '1',
        supplier,
        poNumber: '500',
        orderQty: 20,
        receivedQty: 5,
      })),
    getSupplierContacts: async () =>
      ['First', 'Second'].map((name) => ({
        name,
        email: `${name}@example.com`,
        language: 'no',
        days: DAYS,
      })),
    onUpdateError: () => vi.fn(),
    onUpdateDownloaded: () => vi.fn(),
    getSupplierCountry: async () => ({ success: true, data: 'NO' }),
    sendEmailViaEmlAndCOM: transport,
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
  vi.unstubAllGlobals();
});

it('retains the confirmed send time when saving is retried across an ISO week and year boundary', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const sentAt = new Date(2027, 0, 3, 23, 59, 0);
  vi.setSystemTime(sentAt);
  await act(async () => root.render(<Workspace />));
  await allDays();
  await act(async () =>
    container.querySelector<HTMLInputElement>('[aria-label="Velg First"]')!.click()
  );
  await act(async () => button('Se gjennom først').click());
  const save = vi.spyOn(Storage.prototype, 'setItem');
  save.mockImplementationOnce(() => {
    throw new Error('Quota exceeded');
  });
  await act(async () => button('Send 1 purring').click());
  const attemptedHistory = JSON.parse(save.mock.calls[0][1]).history;
  expect(attemptedHistory[0].at).toBe(sentAt.toISOString());

  vi.setSystemTime(new Date(2027, 0, 4, 0, 1, 0));
  save.mockImplementationOnce(() => {
    throw new Error('Still full');
  });
  await act(async () => button('Prøv å lagre historikken igjen').click());
  await act(async () => button('Prøv å lagre historikken igjen').click());
  expect(transport).toHaveBeenCalledOnce();
  expect(readMemory().history).toEqual(attemptedHistory);
  expect(readMemory().history).toHaveLength(1);

  await act(async () => button('Tilbake til purring').click());
  expect(container.querySelector('[aria-label="Velg First"]')).toBeEnabled();
  await act(async () => root.render(null));
  await act(async () => root.render(<Workspace />));
  await allDays();
  expect(container.querySelector('[aria-label="Velg First"]')).toBeEnabled();
});
function button(text: string) {
  return [...container.querySelectorAll('button')].find(
    (element) => element.textContent?.trim() === text
  )!;
}
async function allDays() {
  await act(async () =>
    [...container.querySelectorAll<HTMLButtonElement>('.pulse-days button')]
      .find((element) => element.querySelector('span')?.textContent === 'Alle')!
      .click()
  );
}
it('takes out every visible line without overwriting chosen reasons, and brings them all back', async () => {
  const rows = ['1', '2'].map(
    (key) => ({ key, supplier: 'First', poNumber: '500', orderQty: 20, receivedQty: 5 }) as ExcelRow
  );
  window.electron.getAllOrders = async () => rows;
  saveMemory({
    ...readMemory(),
    excluded: {
      [lineId(rows[0])]: { fingerprint: fingerprint(rows[0]), reason: 'Leverandør har svart' },
    },
  });
  await act(async () => root.render(<Workspace />));
  await allDays();
  await act(async () => button('Fjern alle').click());
  expect(
    Object.values(readMemory().excluded)
      .map((entry) => entry.reason)
      .sort()
  ).toEqual(['Avklart skriftlig', 'Leverandør har svart']);
  expect(button('Fjern alle')).toBeDisabled();
  await act(async () => button('Velg alle').click());
  expect(readMemory().excluded).toEqual({});
  expect(button('Velg alle')).toBeDisabled();
});
it('switches the workspace language from the header and remembers the choice', async () => {
  await act(async () => root.render(<Workspace />));
  const select = container.querySelector<HTMLSelectElement>('[aria-label="Språk i Pulse"]')!;
  try {
    await act(async () => {
      select.value = 'en';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(button('Review first')).toBeDefined();
    expect(container.querySelector('[aria-label="Pulse language"]')).toHaveValue('en');
    expect(localStorage.getItem('userSelectedLanguage')).toBe('true');
  } finally {
    await act(async () => void (await initNorwegian()));
  }
});
it('recovers from local-storage failure without resending or duplicating history, including after remount', async () => {
  await act(async () => root.render(<Workspace />));
  // Include all suppliers regardless of the current reminder day.
  await allDays();
  for (const name of ['First', 'Second']) {
    await act(async () =>
      container.querySelector<HTMLInputElement>(`[aria-label="Velg ${name}"]`)!.click()
    );
  }
  await act(async () => button('Se gjennom først').click());
  const save = vi.spyOn(Storage.prototype, 'setItem');
  save.mockImplementationOnce(() => {
    throw new Error('Quota exceeded');
  });
  await act(async () => button('Send 2 purringer').click());
  expect(transport).toHaveBeenCalledOnce();
  expect(button('Send 1 purring')).toBeDisabled();
  expect(container.querySelector('[aria-label="Innstillinger"]')).toBeDisabled();
  expect(readMemory().history).toEqual([]);
  const attemptedHistory = JSON.parse(save.mock.calls[0][1]).history;
  await act(async () => button('Prøv å lagre historikken igjen').click());
  expect(transport).toHaveBeenCalledOnce();
  expect(readMemory().history).toEqual(attemptedHistory);
  expect(readMemory().history).toHaveLength(1);
  expect(container.querySelector('[aria-label="Innstillinger"]')).toBeEnabled();
  await act(async () => button('Send 1 purring').click());
  expect(transport).toHaveBeenCalledTimes(2);
  expect(transport.mock.calls[1][0].to).toBe('Second@example.com');
  expect(readMemory().history).toHaveLength(2);
  await act(async () => root.render(null));
  await act(async () => root.render(<Workspace />));
  await allDays();
  expect(container.querySelector('[aria-label="Velg First"]')).toBeDisabled();
  expect(container.querySelector('[aria-label="Velg Second"]')).toBeDisabled();
  expect(transport).toHaveBeenCalledTimes(2);
});
