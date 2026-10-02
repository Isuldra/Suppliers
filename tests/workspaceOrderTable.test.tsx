import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import OrderTable from '../src/renderer/workspace/OrderTable';
import { initNorwegian } from './i18nTestSetup';

describe('the order table', () => {
  it('formats dates and quantities for the workspace language', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const i18n = await initNorwegian();
    await i18n.changeLanguage('en');
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <OrderTable
          lines={[
            {
              key: '1',
              supplier: 'Example Medical',
              poNumber: '500',
              orderQty: 1500,
              receivedQty: 0,
              outstandingQty: 1500,
              inventoryBalance: 2500,
              dueDate: new Date(2026, 8, 1),
            },
          ]}
          excluded={{}}
          filter="all"
          onToggle={vi.fn()}
          onReason={vi.fn()}
        />
      )
    );
    expect(container).toHaveTextContent('01/09/2026');
    expect(container).toHaveTextContent('1,500');
    expect(container).toHaveTextContent('2,500');
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  });
});
