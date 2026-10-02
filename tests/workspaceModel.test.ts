import { describe, expect, it } from 'vitest';
import {
  buildSuppliers,
  historyOf,
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
  it('retains Company IDs and separates a conflicting order number from its contact', () => {
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
    expect(suppliers.find((item) => item.name === 'Example Medical')?.lines).toEqual([]);
    expect(suppliers.find((item) => item.lines.length)?.email).toBe('');
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
  it('joins compatible identities and separates a conflicting supplier name and number', () => {
    const suppliers = buildSuppliers(
      [
        { ...line, supplier: 'ABENA  Danmark A/S', internalSupplierNumber: '4960001' },
        { ...line, key: '2', supplier: 'EXAMPLE  medical' },
        { ...line, key: '3', supplier: 'Other AS', internalSupplierNumber: '4960009' },
        // Neither supplier receives an order whose name and number disagree.
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
        aliases: ['ABENA  Danmark A/S'],
      },
      {
        name: 'Example Medical',
        number: '',
        email: 'a@example.com',
        lines: 1,
        aliases: ['EXAMPLE  medical'],
      },
      {
        name: 'Example Medical (uavklart leverandør 4960001)',
        number: '4960001',
        email: '',
        lines: 1,
        aliases: [],
      },
      { name: 'Other AS', number: '4960009', email: '', lines: 1, aliases: [] },
    ]);
  });
  it('tells suppliers whose names differ only in capitals apart by number, then exact name', () => {
    const contact = { email: '', language: 'Norsk', days: [] };
    const suppliers = buildSuppliers(
      [
        { ...line, supplier: 'abena as', internalSupplierNumber: '4960001' },
        { ...line, key: '2', supplier: 'ABENA AS' },
        // Neither number nor exact name: which supplier is meant is not guessed.
        { ...line, key: '3', supplier: 'abena  as' },
      ],
      [
        { ...contact, name: 'Abena AS', number: '4960001' },
        { ...contact, name: 'ABENA AS', number: '4960002' },
      ],
      {}
    );
    expect(
      suppliers.map(({ name, lines, aliases }) => ({ name, lines: lines.length, aliases }))
    ).toEqual([
      { name: 'abena  as (uavklart leverandør)', lines: 1, aliases: [] },
      { name: 'Abena AS', lines: 1, aliases: ['abena as'] },
      { name: 'ABENA AS', lines: 1, aliases: [] },
    ]);
  });
  it('moves no edits or history under a line name that several suppliers carry', () => {
    const suppliers = buildSuppliers(
      [
        { ...line, supplier: 'Abena', internalSupplierNumber: '4960001' },
        { ...line, key: '2', supplier: 'Abena', internalSupplierNumber: '4960002' },
      ],
      [
        { name: 'Abena Norge AS', email: '', language: 'Norsk', days: [], number: '4960001' },
        { name: 'Abena Danmark A/S', email: '', language: 'Dansk', days: [], number: '4960002' },
      ],
      { Abena: { email: 'shared@abena.no', language: 'no', days: [] } }
    );
    expect(
      suppliers
        .filter((supplier) => supplier.lines.length)
        .map(({ email, aliases }) => ({ email, aliases }))
    ).toEqual([
      { email: '', aliases: [] },
      { email: '', aliases: [] },
    ]);
  });
  it("keeps edits and history saved under a compatible spelling of the supplier's name", () => {
    const suppliers = buildSuppliers(
      [{ ...line, supplier: 'ABENA  Danmark A/S', internalSupplierNumber: '4960001' }],
      [{ name: 'Abena Danmark A/S', email: '', language: 'Dansk', days: [], number: '4960001' }],
      { 'ABENA  Danmark A/S': { email: 'saved@abena.dk', language: 'da', days: ['Torsdag'] } }
    );
    expect(suppliers[0]).toMatchObject({
      name: 'Abena Danmark A/S',
      email: 'saved@abena.dk',
      days: ['Torsdag'],
    });
    const history = historyOf(
      [{ supplier: 'ABENA  Danmark A/S', status: 'sent', at: new Date().toISOString(), count: 1 }],
      suppliers
    );
    expect(currentStatus('Abena Danmark A/S', history)).toBe('sent');
  });
  it('isolates repeated conflicts without inheriting saved contacts or affecting later valid orders', () => {
    const suppliers = buildSuppliers(
      [
        { ...line, supplier: 'Supplier B', internalSupplierNumber: '1' },
        { ...line, key: '2', supplier: 'Supplier B', internalSupplierNumber: '1' },
        { ...line, key: '3', supplier: 'Supplier A', internalSupplierNumber: '1' },
        { ...line, key: '4', supplier: 'Supplier B', internalSupplierNumber: '2' },
      ],
      [
        { name: 'Supplier A', number: '1', email: 'a@example.com', language: 'Norsk', days: [] },
        { name: 'Supplier B', number: '2', email: 'b@example.com', language: 'Norsk', days: [] },
      ],
      { 'Supplier B': { email: 'saved@example.com', language: 'en', days: ['Mandag'] } }
    );
    const conflict = suppliers.find((supplier) => supplier.lines.length === 2)!;
    expect(conflict).toMatchObject({ email: '', days: [], aliases: [] });
    expect(conflict.name).not.toBe('Supplier B');
    expect(suppliers.find((supplier) => supplier.name === 'Supplier A')).toMatchObject({
      email: 'a@example.com',
      lines: [expect.objectContaining({ key: '3' })],
    });
    expect(suppliers.find((supplier) => supplier.name === 'Supplier B')).toMatchObject({
      email: 'saved@example.com',
      lines: [expect.objectContaining({ key: '4' })],
    });
    const history = historyOf(
      [{ supplier: 'Supplier B', status: 'sent', at: new Date().toISOString(), count: 1 }],
      suppliers
    );
    expect(currentStatus(conflict.name, history)).toBeUndefined();
  });
  it('requires a separately reviewed recipient even when the conflicting name has no registered contact', () => {
    const rows = [{ ...line, supplier: 'Supplier B', internalSupplierNumber: '1' }];
    const contacts = [
      { name: 'Supplier A', number: '1', email: 'a@example.com', language: 'Norsk', days: [] },
    ];
    const saved = { email: 'saved@example.com', language: 'no' as const, days: ['Mandag'] };
    const suppliers = buildSuppliers(rows, contacts, { 'Supplier B': saved });
    const conflict = suppliers.find((supplier) => supplier.lines.length)!;
    expect(conflict.email).toBe('');
    expect(conflict.aliases).toEqual([]);
    const resolved = buildSuppliers(rows, contacts, { [conflict.name]: saved });
    expect(resolved.find((supplier) => supplier.lines.length)?.email).toBe(saved.email);
  });
  it('never gives a numberless order the first address when register names share a base name', () => {
    const suppliers = buildSuppliers(
      [
        { ...line, supplier: 'Supplier A' },
        { ...line, key: '2', supplier: 'Supplier A', internalSupplierNumber: '2' },
      ],
      [
        { name: 'Supplier A', number: '1', email: 'a@example.com', language: 'Norsk', days: [] },
        {
          name: 'Supplier A (2)',
          number: '2',
          email: 'b@example.com',
          language: 'Norsk',
          days: [],
        },
      ],
      {}
    );
    expect(suppliers.find((supplier) => supplier.lines.some((row) => row.key === '1'))?.email).toBe(
      ''
    );
    expect(suppliers.find((supplier) => supplier.lines.some((row) => row.key === '2'))?.email).toBe(
      'b@example.com'
    );
  });
  it.each([
    ['1', '2', ''],
    ['2', '1', ''],
    ['', '1', '2'],
    ['', '2', '1'],
  ])(
    'never assigns a numberless contact to competing companies in order %s, %s, %s',
    (...numbers) => {
      const rows = numbers.map((number, index) => ({
        ...line,
        key: `${index}`,
        supplier: index === 1 ? 'SHARED  AS' : 'Shared AS',
        internalSupplierNumber: number,
      }));
      const contact = {
        name: 'Shared AS',
        email: 'unknown-owner@example.com',
        language: 'Norsk',
        days: [],
      };
      const edit = { email: 'saved-owner@example.com', language: 'no' as const, days: ['Mandag'] };
      for (const contacts of [[contact], []]) {
        const suppliers = buildSuppliers(rows, contacts, { 'Shared AS': edit });
        const withOrders = suppliers.filter((supplier) => supplier.lines.length);
        expect(withOrders).toHaveLength(3);
        expect(withOrders.every((supplier) => !supplier.email && !supplier.aliases.length)).toBe(
          true
        );
        expect(withOrders.flatMap((supplier) => supplier.lines)).toHaveLength(3);
        if (contacts.length) {
          expect(suppliers.find((supplier) => supplier.name === 'Shared AS')).toMatchObject({
            number: '',
            email: edit.email,
            lines: [],
          });
        }
      }
    }
  );
  it('lets a numberless contact gain the only compatible number in the import', () => {
    const suppliers = buildSuppliers(
      [
        { ...line, supplier: 'Shared AS' },
        { ...line, key: '2', supplier: 'SHARED  AS', internalSupplierNumber: '1' },
      ],
      [{ name: 'Shared AS', email: 'owner@example.com', language: 'Norsk', days: [] }],
      {}
    );
    expect(suppliers).toHaveLength(1);
    expect(suppliers[0]).toMatchObject({ number: '1', email: 'owner@example.com' });
    expect(suppliers[0].lines).toHaveLength(2);
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
