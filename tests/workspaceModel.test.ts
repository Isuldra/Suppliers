import { describe, expect, it } from 'vitest';
import {
  buildSuppliers,
  historyOf,
  numberMatches,
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
  it('shows the Company ID for a supplier without orders and prefers it over the order number', () => {
    const contact = { email: 'a@example.com', language: 'Norsk', days: ['Mandag'] };
    const suppliers = buildSuppliers(
      [{ ...line, internalSupplierNumber: '111' }],
      [
        { ...contact, name: 'No Orders AS', number: '4960178' },
        { ...contact, name: 'Example Medical', number: '4960080' },
      ],
      {}
    );
    expect(suppliers.find((item) => item.name === 'No Orders AS')?.number).toBe('4960178');
    expect(suppliers.find((item) => item.name === 'Example Medical')?.number).toBe('4960080');
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
  it('joins order lines to their supplier by name, else by supplier number', () => {
    const suppliers = buildSuppliers(
      [
        { ...line, supplier: 'Abena A/S', internalSupplierNumber: '4960001' },
        { ...line, key: '2', supplier: 'EXAMPLE  medical' },
        { ...line, key: '3', supplier: 'Other AS', internalSupplierNumber: '4960009' },
        // Name and number point to different suppliers: the name decides.
        { ...line, key: '4', supplier: 'Example Medical', internalSupplierNumber: '4960001' },
      ],
      [
        {
          name: 'Abena Danmark A/S',
          email: 'ordre@abena.dk',
          language: 'Dansk',
          days: ['Mandag'],
          number: '4960001',
        },
        { name: 'Example Medical', email: 'a@example.com', language: 'Norsk', days: [] },
      ],
      {}
    );
    expect(
      suppliers.map(({ name, number, email, lines, aliases }) => ({
        name,
        number,
        email,
        lines: lines.length,
        aliases,
      }))
    ).toEqual([
      {
        name: 'Abena Danmark A/S',
        number: '4960001',
        email: 'ordre@abena.dk',
        lines: 1,
        aliases: ['Abena A/S'],
      },
      {
        name: 'Example Medical',
        number: '4960001',
        email: 'a@example.com',
        lines: 2,
        aliases: ['EXAMPLE  medical'],
      },
      { name: 'Other AS', number: '4960009', email: '', lines: 1, aliases: [] },
    ]);
  });
  it('asks to confirm only lines whose name is another company than the supplier', () => {
    const lines = ['Abena A/S', 'ABENA  danmark a/s', 'Grimas B.V.'].map((supplier) => ({
      ...line,
      supplier,
    }));
    expect(numberMatches('Abena Danmark A/S', lines).map((item) => item.supplier)).toEqual([
      'Grimas B.V.',
    ]);
  });
  it("keeps edits and history saved under the order lines' own name", () => {
    const suppliers = buildSuppliers(
      [{ ...line, supplier: 'Abena A/S', internalSupplierNumber: '4960001' }],
      [{ name: 'Abena Danmark A/S', email: '', language: 'Dansk', days: [], number: '4960001' }],
      { 'Abena A/S': { email: 'saved@abena.dk', language: 'da', days: ['Torsdag'] } }
    );
    expect(suppliers[0]).toMatchObject({
      name: 'Abena Danmark A/S',
      email: 'saved@abena.dk',
      days: ['Torsdag'],
    });
    const history = historyOf(
      [{ supplier: 'Abena A/S', status: 'sent', at: new Date().toISOString(), count: 1 }],
      suppliers
    );
    expect(currentStatus('Abena Danmark A/S', history)).toBe('sent');
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
  it('tags and formats the email for the recipient language', () => {
    const reminder = {
      supplier: line.supplier,
      recipient: 'buyer@example.com',
      lines: [{ ...line, outstandingQty: 1500, dueDate: new Date(2026, 8, 1) }],
    };
    const english = reminderHtml({ ...reminder, language: 'en' });
    expect(english).toContain('<html lang="en-GB">');
    expect(english).toContain('>1,500</td>');
    expect(english).toContain('>01/09/2026');
    expect(reminderHtml({ ...reminder, language: 'se' })).toContain('<html lang="sv-SE">');
  });
});
