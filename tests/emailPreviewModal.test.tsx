import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EmailPreviewModal from '../src/renderer/components/EmailPreviewModal';

const onCancel = vi.fn();
let opener: HTMLButtonElement;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  opener.remove();
  vi.unstubAllGlobals();
});
async function open() {
  await act(async () =>
    root.render(
      <EmailPreviewModal
        emailData={{
          supplier: 'Example',
          recipientEmail: 'buyer@example.com',
          language: 'no',
        }}
        previewHtml="<p>Preview</p>"
        onSend={vi.fn()}
        onCancel={onCancel}
        onChangeLanguage={vi.fn()}
        onChangeRecipient={vi.fn()}
      />
    )
  );
}
function button(name: string | RegExp) {
  return [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
    (element) => {
      const label = element.getAttribute('aria-label') || element.textContent?.trim() || '';
      return typeof name === 'string' ? label === name : name.test(label);
    }
  )!;
}
function tab(target: HTMLElement, shiftKey = false) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })
  );
}
describe('email preview keyboard focus', () => {
  it('keeps the current recipient when an earlier supplier lookup fails late', async () => {
    let rejectLookup!: (error: Error) => void;
    const lookup = vi.fn(
      () =>
        new Promise<never>((_, reject) => {
          rejectLookup = reject;
        })
    );
    vi.stubGlobal('electron', { getSupplierEmail: lookup });
    const renderPreview = (supplier: string, recipientEmail?: string) =>
      root.render(
        <EmailPreviewModal
          emailData={{ supplier, recipientEmail, language: 'no' }}
          previewHtml="<p>Preview</p>"
          onSend={vi.fn()}
          onCancel={onCancel}
          onChangeLanguage={vi.fn()}
          onChangeRecipient={vi.fn()}
        />
      );
    await act(async () => renderPreview('Earlier'));
    expect(lookup).toHaveBeenCalledWith('Earlier');
    await act(async () => renderPreview('Current', 'current@example.com'));
    await act(async () => rejectLookup(new Error('Late lookup failure')));
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent('current@example.com');
    expect(button('Send e-post')).toBeEnabled();
  });
  it('focuses the close button on open and restores the opener on close', async () => {
    await open();
    expect(button('Lukk vindu')).toHaveFocus();
    await act(async () => root.render(null));
    expect(opener).toHaveFocus();
  });
  it('wraps Tab and Shift+Tab at the dialog boundaries and contains outside focus', async () => {
    await open();
    const first = button('Norsk');
    const last = button('Send e-post');
    last.focus();
    tab(last);
    expect(first).toHaveFocus();
    tab(first, true);
    expect(last).toHaveFocus();
    opener.focus();
    expect(button('Lukk vindu')).toHaveFocus();
  });
  it('uses the currently enabled controls after entering recipient editing', async () => {
    await open();
    await act(async () => button(/Rediger/).click());
    const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!;
    expect(input).toHaveFocus();
    const save = button(/Lagre/);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(save).toBeDisabled();
    const first = button('Norsk');
    first.focus();
    tab(first, true);
    expect(button('Send e-post')).toHaveFocus();
    // Disabled controls are skipped when they become the last element.
    button('Send e-post').disabled = true;
    const last = button('Avbryt');
    last.focus();
    tab(last);
    expect(first).toHaveFocus();
  });
  it('closes with Escape and releases focus containment on unmount', async () => {
    await open();
    await act(async () =>
      button('Lukk vindu').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      )
    );
    expect(onCancel).toHaveBeenCalledOnce();
    await act(async () => root.render(null));
    opener.focus();
    expect(opener).toHaveFocus();
  });
});
