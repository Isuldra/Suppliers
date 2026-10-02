// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// importer.ts statically imports native modules that these pure helpers do not use.
vi.mock('better-sqlite3', () => ({ default: class {} }));
vi.mock('exceljs', () => ({ default: {}, Worksheet: class {} }));
vi.mock('date-fns', () => ({ isValid: () => false, parse: () => new Date(NaN) }));

import { normalizeWeekday, readSupplierSheetRow, supplierKey } from '../src/main/importer';

function row(values: unknown[]) {
  return {
    getCell: (column: number) => {
      const value = values[column - 1];
      return {
        value,
        text:
          value && typeof value === 'object' && 'text' in value
            ? (value as { text: string }).text
            : '',
      };
    },
  } as never;
}

describe('the Leverandør sheet', () => {
  it('reads every column, including a numeric Company ID and a mailto hyperlink', () => {
    expect(
      readSupplierSheetRow(
        row([
          ' Abena Norge AS ',
          4960178,
          'Norsk',
          'Mandag',
          { text: 'ordre@abena.no', hyperlink: 'mailto:ordre@abena.no' },
        ])
      )
    ).toEqual({
      name: 'Abena Norge AS',
      companyId: '4960178',
      language: 'Norsk',
      weekday: 'Mandag',
      email: 'ordre@abena.no',
    });
  });

  it('keeps a supplier without a reminder day or a valid address', () => {
    expect(
      readSupplierSheetRow(row(['Grimas B.V.', 4960999, 'Engelsk', '', 'ikke oppgitt']))
    ).toEqual({
      name: 'Grimas B.V.',
      companyId: '4960999',
      language: 'Engelsk',
      weekday: '',
      email: '',
    });
  });

  it('normalises Norwegian and English day names and rejects anything else', () => {
    expect(normalizeWeekday(' mandag ')).toBe('Mandag');
    expect(normalizeWeekday('Thursday')).toBe('Torsdag');
    expect(normalizeWeekday('FREDAG')).toBe('Fredag');
    expect(normalizeWeekday('Mandag/Torsdag')).toBe('');
    expect(normalizeWeekday('Lørdag')).toBe('');
  });
});

describe('the Sjekkliste sheet', () => {
  it('recognises a stored supplier spelled with other capitals or spacing', () => {
    expect(supplierKey('ABENA  Norge AS ')).toBe(supplierKey('Abena Norge AS'));
    expect(supplierKey('Ørje Medisinske')).toBe(supplierKey('ørje medisinske'));
    expect(supplierKey('Abena Norge AS')).not.toBe(supplierKey('Abena Norge'));
  });
});
