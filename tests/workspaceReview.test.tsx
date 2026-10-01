import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Review from '../src/renderer/workspace/Review';
import type { Reminder } from '../src/renderer/workspace/reminder';

let root: Root;
let container: HTMLDivElement;
const transport = vi.fn();
const onSent = vi.fn();
const items: Reminder[] = ['First', 'Second'].map((supplier) => ({
  supplier,
  recipient: `${supplier}@example.com`,
  language: 'no',
  lines: [{ key: '1', supplier, poNumber: '500', orderQty: 20, receivedQty: 5 }],
}));
beforeEach(() => {
  vi.clearAllMocks();
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
        onBusy={vi.fn()}
      />
    )
  );
}
function sendButton() {
  return [...container.querySelectorAll('button')].find((button) =>
    /^Send \d+ purringer$/.test(button.textContent || '')
  )!;
}

describe('Review before Outlook sending', () => {
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
    expect(onSent).toHaveBeenCalledWith(items[0]);
    expect(container).toHaveTextContent('Outlook unavailable');
    transport.mockResolvedValueOnce({ success: true });
    await act(async () => sendButton().click());
    expect(transport).toHaveBeenCalledTimes(3);
    expect(transport.mock.calls[2][0].to).toBe('Second@example.com');
    expect(container).toHaveTextContent('2 av 2 purringer sendt');
  });
});
