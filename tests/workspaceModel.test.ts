import { describe, expect, it } from 'vitest';
import {
  buildSuppliers,
  excludedReason,
  fingerprint,
  lineId,
  onDay,
  validRecipients,
  currentStatus,
  weekKey,
} from '../src/renderer/workspace/model';
import { reminderHtml } from '../src/renderer/workspace/reminder';
import type { ExcelRow } from '../src/renderer/types/ExcelData';

const line: ExcelRow = {
  key: '1',
  supplier: 'Example Medical',
  poNumber: '500',
  orderRowNumber: '1',
  itemNo: '100',
  orderQty: 20,
  receivedQty: 5,
  outstandingQty: 15,
  dueDate: new Date('2026-09-01'),
};
describe('Pulse workspace selections', () => {
  it('keeps unchanged exclusions, but includes a changed line after import', () => {
    const excluded = {
      [lineId(line)]: { fingerprint: fingerprint(line), reason: 'Leverandør har svart' },
    };
    expect(excludedReason({ ...line }, excluded)).toBe('Leverandør har svart');
    expect(excludedReason({ ...line, outstandingQty: 10 }, excluded)).toBe('');
    expect(excludedReason({ ...line, supplierETA: new Date('2026-10-02') }, excluded)).toBe('');
  });
  it('does not collide when two suppliers reuse order keys', () => {
    expect(lineId(line)).not.toBe(lineId({ ...line, supplier: 'Another Medical' }));
  });
  it('retains contacts without orders and removes completed order lines', () => {
    const suppliers = buildSuppliers(
      [line, { ...line, key: '2', outstandingQty: 0 }],
      [{ name: 'No orders', email: '', language: 'Engelsk', days: ['Mandag'] }],
      {}
    );
    expect(suppliers.find((supplier) => supplier.name === line.supplier)?.lines).toHaveLength(1);
    expect(suppliers.find((supplier) => supplier.name === 'No orders')?.language).toBe('en');
  });
  it('applies saved contacts to reminders and distinguishes missing reminder days', () => {
    const [supplier] = buildSuppliers([line], [], {
      [line.supplier]: { email: 'buyer@example.com', language: 'da', days: ['Torsdag'] },
    });
    expect(supplier.email).toBe('buyer@example.com');
    expect(onDay(supplier, 'Torsdag')).toBe(true);
    expect(onDay(supplier, 'Ingen')).toBe(false);
    expect(onDay({ ...supplier, days: [] }, 'Ingen')).toBe(true);
  });
  it('validates every recipient, including separated address lists', () => {
    expect(validRecipients('buyer@example.com; second@example.com')).toBe(true);
    expect(validRecipients('buyer@example.com;not-an-email')).toBe(false);
    expect(validRecipients('')).toBe(false);
    expect(validRecipients('buyer@example.com;')).toBe(false);
  });
  it('uses ISO week years and does not carry old send status into a new year', () => {
    expect(weekKey(new Date('2027-01-01T12:00:00'))).toBe('2026-53');
    expect(
      currentStatus(line.supplier, [
        { supplier: line.supplier, status: 'sent', at: '2020-01-01', count: 1 },
      ])
    ).toBeUndefined();
  });
  it('escapes imported text and includes only selected lines in the actual email HTML', () => {
    const html = reminderHtml({
      supplier: line.supplier,
      recipient: 'buyer@example.com',
      language: 'en',
      lines: [{ ...line, description: '<script>alert(1)</script>', specification: 'A & B' }],
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('Please confirm a new delivery date');
    expect(html).toContain('New ETA');
    expect(html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0].match(/<tr>/g)).toHaveLength(1);
  });
});
