import { describe, expect, it } from 'vitest';
import type { ExcelRow } from '../src/renderer/types/ExcelData';
import { buildSuppliers, onDay } from '../src/renderer/workspace/model';

const active: ExcelRow = {
  key: 'active',
  supplier: 'Example Medical',
  internalSupplierNumber: '100',
  poNumber: '500',
  orderQty: 20,
  receivedQty: 5,
  outstandingQty: 15,
};

describe.each([false, true])(
  'completed supplier orders (completed first: %s)',
  (completedFirst) => {
    it('keeps an alternate name matched by Company ID when only a completed order has another ID', () => {
      const completed = {
        ...active,
        key: 'completed',
        internalSupplierNumber: '200',
        outstandingQty: 0,
      };
      const suppliers = buildSuppliers(
        completedFirst ? [completed, active] : [active, completed],
        [
          {
            name: 'Example Medical AS',
            number: '100',
            email: 'orders@example.com',
            language: 'Norsk',
            days: ['Mandag'],
          },
        ],
        {}
      );
      expect(suppliers).toHaveLength(1);
      expect(suppliers[0]).toMatchObject({
        name: 'Example Medical AS',
        email: 'orders@example.com',
        days: ['Mandag'],
        lines: [active],
      });
    });
    it.each([
      ['zero outstanding', { outstandingQty: 0 }],
      ['negative outstanding', { outstandingQty: -1 }],
      ['fully received quantity', { outstandingQty: undefined, receivedQty: 20 }],
      ['overreceived quantity', { outstandingQty: undefined, receivedQty: 21 }],
    ] as const)('ignores %s when matching the only open supplier number', (_, quantities) => {
      const completed = {
        ...active,
        ...quantities,
        key: 'completed',
        internalSupplierNumber: '200',
      };
      const suppliers = buildSuppliers(
        completedFirst ? [completed, active] : [active, completed],
        [
          {
            name: active.supplier,
            email: 'orders@example.com',
            language: 'Norsk',
            days: ['Mandag'],
          },
        ],
        {}
      );

      expect(suppliers).toHaveLength(1);
      expect(suppliers[0]).toMatchObject({
        name: active.supplier,
        number: '100',
        email: 'orders@example.com',
        days: ['Mandag'],
        lines: [active],
      });
      expect(onDay(suppliers[0], 'Mandag')).toBe(true);
      expect(onDay(suppliers[0], 'Ingen')).toBe(false);
    });
  }
);
