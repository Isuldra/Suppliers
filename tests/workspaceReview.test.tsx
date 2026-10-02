import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Review from '../src/renderer/workspace/Review';
import { initNorwegian } from './i18nTestSetup';
import type { Reminder } from '../src/renderer/workspace/reminder';

let root: Root;
let container: HTMLDivElement;
const transport = vi.fn();
const onSent = vi.fn();
const onBusy = vi.fn();
const items: Reminder[] = ['First', 'Second'].map((supplier) => ({
  supplier,
  recipient: `${supplier}@example.com`,
  language: 'no',
  lines: [{ key: '1', supplier, poNumber: '500', orderQty: 20, receivedQty: 5 }],
}));
beforeAll(initNorwegian);
beforeEach(() => {
  vi.clearAllMocks();
  onSent.mockReset().mockReturnValue(true);
  transport.mockReset();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('electron', {
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
  vi.unstubAllGlobals();
});
async function render(initial = items) {
  await act(async () =>
    root.render(
      <Review
        initial={initial}
        quickConfirm={false}
        onBack={vi.fn()}
        onSent={onSent}
        onBusy={onBusy}
      />
    )
  );
}
function sendButton() {
  return [...container.querySelectorAll('button')].find((button) =>
    /^Send \d+ purring(er)?$/.test(button.textContent || '')
  )!;
}

describe('Review before Outlook sending', () => {
  it.each(['first@example.com; second@example.com', 'first@example.com, second@example.com'])(
    'sends a recipient list in one transport attempt: %s',
    async (recipient) => {
      transport.mockResolvedValue({ success: true });
      await render([{ ...items[0], recipient }]);
      await act(async () => sendButton().click());
      expect(transport).toHaveBeenCalledOnce();
      expect(transport.mock.calls[0][0].to).toBe('first@example.com;second@example.com');
      expect(onSent).toHaveBeenCalledOnce();
    }
  );
  it.each(['false', 'throw', 'reject'])(
    'stops on a history save failure (%s) and retries saving without resending',
    async (failure) => {
      transport.mockResolvedValue({ success: true });
      onSent.mockImplementationOnce(() => {
        if (failure === 'throw') throw new Error('Storage unavailable');
        if (failure === 'reject') return Promise.reject(new Error('Storage unavailable'));
        return false;
      });
      await render();
      await act(async () => sendButton().click());
      expect(transport).toHaveBeenCalledOnce();
      expect(sendButton()).toBeDisabled();
      expect(container).toHaveTextContent('historikken kunne ikke lagres');
      expect(container.querySelector('[aria-label="Mottaker"]')).toBeDisabled();
      expect(onBusy).toHaveBeenLastCalledWith(true);
      const retry = [...container.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Prøv å lagre historikken igjen')
      )!;
      onSent.mockReturnValueOnce(false);
      await act(async () => retry.click());
      expect(sendButton()).toBeDisabled();
      expect(transport).toHaveBeenCalledOnce();
      await act(async () => retry.click());
      expect(onSent).toHaveBeenLastCalledWith(items[0], onSent.mock.calls[0][1]);
      expect(transport).toHaveBeenCalledOnce();
      expect(onBusy).toHaveBeenLastCalledWith(false);
      expect(sendButton()).toBeEnabled();
      await act(async () => sendButton().click());
      expect(transport).toHaveBeenCalledTimes(2);
      expect(transport.mock.calls[1][0].to).toBe('Second@example.com');
      expect(container).toHaveTextContent('2 av 2 purringer sendt');
    }
  );
  it('waits for history persistence before sending the next reminder', async () => {
    let saved!: (success: boolean) => void;
    transport.mockResolvedValue({ success: true });
    onSent.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          saved = resolve;
        })
    );
    await render();
    await act(async () => sendButton().click());
    expect(transport).toHaveBeenCalledOnce();
    await act(async () => saved(true));
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('sends order lines naming another company only after the recipient is confirmed', async () => {
    transport.mockResolvedValue({ success: true });
    await render([
      // The same company with and without its country: no confirmation.
      {
        ...items[0],
        supplier: 'Abena Danmark A/S',
        lines: [{ ...items[0].lines[0], supplier: 'Abena A/S' }],
      },
      {
        ...items[1],
        lines: [
          { ...items[1].lines[0], supplier: 'Grimas B.V.', internalSupplierNumber: '4960009' },
        ],
      },
    ]);
    expect(sendButton()).toBeDisabled();
    expect(container).toHaveTextContent('Kontroller mottakeren');
    await act(async () =>
      container.querySelectorAll<HTMLButtonElement>('.pulse-review-supplier')[1].click()
    );
    expect(container).toHaveTextContent(
      'Ordrelinjer for Grimas B.V. er koblet til Second bare med Lev.nr 4960009.'
    );
    const confirm = [...container.querySelectorAll('label')]
      .find((label) => label.textContent?.includes('Mottakeren er riktig'))!
      .querySelector('input')!;
    await act(async () => confirm.click());
    expect(sendButton()).toBeEnabled();
    await act(async () => sendButton().click());
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('never sends without an explicit click and disables sending for missing recipients', async () => {
    await render([{ ...items[0], recipient: '' }]);
    expect(transport).not.toHaveBeenCalled();
    expect(sendButton()).toBeDisabled();
  });
  it('blocks concurrent clicks, records successes and does not retry a failed email automatically', async () => {
    let complete!: (result: { success: boolean }) => void;
    transport
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          })
      )
      .mockResolvedValueOnce({ success: false, error: 'Outlook unavailable' });
    await render();
    await act(async () => {
      sendButton().click();
      sendButton().click();
    });
    expect(transport).toHaveBeenCalledTimes(1);
    await act(async () => complete({ success: true }));
    expect(transport).toHaveBeenCalledTimes(2);
    expect(onSent).toHaveBeenCalledTimes(1);
    expect(onSent).toHaveBeenCalledWith(items[0], expect.any(String));
    expect(container).toHaveTextContent('Outlook unavailable');
    transport.mockResolvedValueOnce({ success: true });
    await act(async () => sendButton().click());
    expect(transport).toHaveBeenCalledTimes(3);
    expect(transport.mock.calls[2][0].to).toBe('Second@example.com');
    expect(container).toHaveTextContent('2 av 2 purringer sendt');
  });
});
