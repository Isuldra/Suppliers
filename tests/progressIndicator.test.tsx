import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { ProgressIndicator } from '../src/renderer/components/ProgressIndicator';

const container = document.createElement('div');
function render(element: React.ReactElement) {
  container.innerHTML = renderToStaticMarkup(element);
  return { rerender: render };
}
const screen = {
  getByText: (text: string) => {
    const element = [...container.querySelectorAll('span')].find(
      (element) => element.textContent === text
    );
    if (!element) throw new Error('Missing progress label: ' + text);
    return element;
  },
};

const state: React.ComponentProps<typeof ProgressIndicator>['appState'] = {
  excelData: { bp: [], hovedliste: [] },
  selectedWeekday: 'Mandag',
  selectedSupplier: 'Example Supplier',
  showDataReview: true,
  showEmailButton: false,
  isBulkMode: false,
  selectedSuppliers: [],
};

describe('workflow progress', () => {
  it('keeps review complete when moving to email and marks the email step as current', () => {
    const { rerender } = render(<ProgressIndicator appState={state} />);
    expect(screen.getByText('progress.reviewData').closest('li')).toHaveAttribute(
      'aria-current',
      'step'
    );
    rerender(
      <ProgressIndicator appState={{ ...state, showDataReview: false, showEmailButton: true }} />
    );
    expect(screen.getByText('progress.reviewData').closest('li')).toHaveAttribute(
      'data-step-state',
      'complete'
    );
    expect(screen.getByText('progress.sendEmail').closest('li')).toHaveAttribute(
      'aria-current',
      'step'
    );
  });

  it('recognizes supplier selection in bulk mode', () => {
    render(
      <ProgressIndicator
        appState={{
          ...state,
          isBulkMode: true,
          showDataReview: false,
          selectedSupplier: '',
          selectedSuppliers: ['Example Supplier'],
        }}
      />
    );
    expect(screen.getByText('progress.selectSupplier').closest('li')).toHaveAttribute(
      'data-step-state',
      'complete'
    );
    expect(screen.getByText('progress.reviewData').closest('li')).toHaveAttribute(
      'aria-current',
      'step'
    );
  });

  it('marks bulk review complete when showing the email preview', () => {
    render(
      <ProgressIndicator
        appState={{
          ...state,
          isBulkMode: true,
          selectedSupplier: '',
          selectedSuppliers: ['Example Supplier'],
          showDataReview: true,
        }}
      />
    );
    expect(screen.getByText('progress.reviewData').closest('li')).toHaveAttribute(
      'data-step-state',
      'complete'
    );
    expect(screen.getByText('progress.sendEmail').closest('li')).toHaveAttribute(
      'aria-current',
      'step'
    );
  });
});
