// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  importRegister,
  type Contact,
  type Day,
  type Register,
  type SupplierRow,
} from '../src/main/supplierRegister';
import { supplierKey } from '../src/utils/supplierMatch';

const contact = (name: string, values: Partial<Contact> = {}): Contact => ({
  name,
  email: '',
  language: null,
  companyId: null,
  ...values,
});
const day = (name: string, weekday: string): Day => ({ name, weekday, planner: 'Innkjøper' });
const supplier = (name: string, values: Partial<SupplierRow> = {}): SupplierRow => ({
  name,
  companyId: '',
  language: '',
  weekday: '',
  email: '',
  ...values,
});
const sorted = ({ contacts, days }: Register) => ({
  contacts: [...contacts].sort((a, b) => a.name.localeCompare(b.name)),
  days: [...days].sort((a, b) => `${a.name}${a.weekday}`.localeCompare(`${b.name}${b.weekday}`)),
});

describe('supplierKey', () => {
  it('ignores capitals and spacing, but not other differences', () => {
    expect(supplierKey('ABENA  Norge AS ')).toBe(supplierKey('Abena Norge AS'));
    expect(supplierKey('Ørje Medisinske')).toBe(supplierKey('ørje medisinske'));
    expect(supplierKey('Abena Norge AS')).not.toBe(supplierKey('Abena Norge'));
  });
});

describe('the supplier register from "Leverandør"', () => {
  it('has every supplier in the sheet, also without an address or reminder day', () => {
    expect(
      importRegister([
        supplier('Grimas B.V.', { companyId: '4960999', weekday: 'Onsdag' }),
        supplier('No Address AS', { companyId: '4960998' }),
      ])
    ).toEqual({
      contacts: [
        contact('Grimas B.V.', { companyId: '4960999' }),
        contact('No Address AS', { companyId: '4960998' }),
      ],
      days: [day('Grimas B.V.', 'Onsdag')],
    });
  });

  it('merges repeated rows: the last value of each field wins and each day counts once', () => {
    const result = importRegister([
      supplier('Abena Norge AS', { language: 'Norsk', email: 'first@abena.no', weekday: 'Mandag' }),
      supplier('abena norge as', { companyId: '4960001', weekday: 'Mandag' }),
      supplier('Abena Norge AS', { language: 'Engelsk', weekday: 'Torsdag' }),
    ]);
    expect(sorted(result)).toEqual({
      contacts: [
        contact('Abena Norge AS', {
          email: 'first@abena.no',
          language: 'Engelsk',
          companyId: '4960001',
        }),
      ],
      days: [day('Abena Norge AS', 'Mandag'), day('Abena Norge AS', 'Torsdag')],
    });
  });

  it('keeps one Company ID as one supplier however its rows write the name', () => {
    expect(
      importRegister([
        supplier('Abena Danmark A/S', { companyId: '4960001', weekday: 'Mandag' }),
        supplier('Abena A/S', {
          companyId: '4960001',
          email: 'ordre@abena.dk',
          weekday: 'Torsdag',
        }),
      ])
    ).toEqual({
      contacts: [contact('Abena Danmark A/S', { companyId: '4960001', email: 'ordre@abena.dk' })],
      days: [day('Abena Danmark A/S', 'Mandag'), day('Abena Danmark A/S', 'Torsdag')],
    });
  });

  it('keeps suppliers with different Company IDs apart, also when only capitals differ', () => {
    expect(
      importRegister([
        supplier('Abena AS', { companyId: '4960001', email: 'a@abena.no' }),
        supplier('ABENA AS', { companyId: '4960002', email: 'b@abena.no', weekday: 'Mandag' }),
      ])
    ).toEqual({
      contacts: [
        contact('Abena AS', { companyId: '4960001', email: 'a@abena.no' }),
        contact('ABENA AS', { companyId: '4960002', email: 'b@abena.no' }),
      ],
      days: [day('ABENA AS', 'Mandag')],
    });
  });

  it('tells suppliers written exactly alike apart by their Company ID', () => {
    const result = importRegister([
      supplier('Abena AS', { companyId: '4960001' }),
      supplier('Abena AS', { companyId: '4960002' }),
    ]);
    expect(result.contacts.map((item) => item.name)).toEqual(['Abena AS', 'Abena AS (4960002)']);
  });

  it('joins a row without Company ID to the supplier with its name', () => {
    expect(
      importRegister([
        supplier('Abena AS', { companyId: '4960001' }),
        supplier('abena  as', { email: 'ordre@abena.no', weekday: 'Fredag' }),
      ])
    ).toEqual({
      contacts: [contact('Abena AS', { companyId: '4960001', email: 'ordre@abena.no' })],
      days: [day('Abena AS', 'Fredag')],
    });
  });

  it('joins a row without Company ID only to a supplier spelled exactly so when several share the name', () => {
    const result = importRegister([
      supplier('Abena AS', { companyId: '4960001' }),
      supplier('ABENA AS', { companyId: '4960002' }),
      supplier('ABENA AS', { email: 'exact@abena.no' }),
      supplier('abena  as', { email: 'unclear@abena.no' }),
    ]);
    expect(result.contacts).toEqual([
      contact('Abena AS', { companyId: '4960001' }),
      contact('ABENA AS', { companyId: '4960002', email: 'exact@abena.no' }),
      contact('abena  as', { email: 'unclear@abena.no' }),
    ]);
  });

  it.each([
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ])('keeps an ambiguous no-ID address separate in row order %i, %i, %i', (...order) => {
    const rows = [
      supplier('Abena AS', { companyId: '4960001', email: 'first@abena.no' }),
      supplier('Abena AS', { companyId: '4960002', email: 'second@abena.no' }),
      supplier('Abena AS', { email: 'unknown@abena.no', weekday: 'Fredag' }),
    ];
    const result = importRegister(order.map((index) => rows[index]));

    expect(result.contacts).toHaveLength(3);
    expect(result.contacts.find((item) => item.companyId === '4960001')?.email).toBe(
      'first@abena.no'
    );
    expect(result.contacts.find((item) => item.companyId === '4960002')?.email).toBe(
      'second@abena.no'
    );
    expect(result.contacts.find((item) => !item.companyId)).toEqual(
      contact('Abena AS (uten Company ID)', { email: 'unknown@abena.no' })
    );
    expect(new Set(result.contacts.map((item) => item.name)).size).toBe(3);
    expect(result.days).toEqual([day('Abena AS (uten Company ID)', 'Fredag')]);
  });

  it('keeps repeated ambiguous no-ID rows together without merging their days into either ID', () => {
    const result = importRegister([
      supplier('Abena AS', { companyId: '4960001' }),
      supplier('Abena AS', { email: 'old@abena.no', weekday: 'Mandag' }),
      supplier('Abena AS', { companyId: '4960002' }),
      supplier('Abena AS', { email: 'new@abena.no', weekday: 'Fredag' }),
    ]);

    expect(result.contacts).toEqual([
      contact('Abena AS', { companyId: '4960001' }),
      contact('Abena AS (4960002)', { companyId: '4960002' }),
      contact('Abena AS (uten Company ID)', { email: 'new@abena.no' }),
    ]);
    expect(result.days).toEqual([
      day('Abena AS (uten Company ID)', 'Mandag'),
      day('Abena AS (uten Company ID)', 'Fredag'),
    ]);
  });

  it('does not reuse a real supplier name when generating labels for ambiguous contacts', () => {
    const result = importRegister([
      supplier('Abena AS', { companyId: '4960001' }),
      supplier('Abena AS', { companyId: '4960002' }),
      supplier('Abena AS (4960002)', { companyId: '4960003' }),
      supplier('Abena AS (uten Company ID)', { companyId: '4960004' }),
      supplier('Abena AS', { email: 'unknown@abena.no', weekday: 'Mandag' }),
    ]);

    expect(result.contacts.map((item) => item.name)).toEqual([
      'Abena AS',
      'Abena AS (4960002) (2)',
      'Abena AS (4960002)',
      'Abena AS (uten Company ID)',
      'Abena AS (uten Company ID) (2)',
    ]);
    expect(result.days).toEqual([day('Abena AS (uten Company ID) (2)', 'Mandag')]);
  });

  it('uses checklist email only when the supplier sheet has no address', () => {
    const result = importRegister(
      [
        supplier('Abena AS', { companyId: '4960001' }),
        supplier('Primary AS', { companyId: '4960002', email: 'primary@example.no' }),
        supplier('Primary AS', { companyId: '4960002' }),
      ],
      [
        { name: 'abena  as', email: 'checklist@abena.no' },
        { name: 'Primary AS', email: 'outdated@example.no' },
        { name: 'Checklist Only AS', email: 'unknown@example.no' },
      ]
    );

    expect(result.contacts).toEqual([
      contact('Abena AS', { companyId: '4960001', email: 'checklist@abena.no' }),
      contact('Primary AS', { companyId: '4960002', email: 'primary@example.no' }),
    ]);
  });

  it('does not assign an ambiguous checklist address to the first same-name Company ID', () => {
    const result = importRegister(
      [
        supplier('Abena AS', { companyId: '4960001' }),
        supplier('Abena AS', { companyId: '4960002' }),
        supplier('Abena AS'),
      ],
      [{ name: 'Abena AS', email: 'unknown@abena.no' }]
    );

    expect(result.contacts).toHaveLength(3);
    expect(result.contacts.every((item) => !item.email)).toBe(true);
  });

  it('matches checklist aliases on the original rows before display names are chosen', () => {
    const result = importRegister(
      [
        supplier('Abena Danmark A/S', { companyId: '4960001' }),
        supplier('Abena A/S', { companyId: '4960001' }),
        supplier('ABENA A/S', { companyId: '4960002' }),
      ],
      [
        { name: 'Abena A/S', email: 'first@abena.dk' },
        { name: 'ABENA A/S', email: 'second@abena.dk' },
      ]
    );

    expect(result.contacts).toEqual([
      contact('Abena Danmark A/S', { companyId: '4960001', email: 'first@abena.dk' }),
      contact('ABENA A/S', { companyId: '4960002', email: 'second@abena.dk' }),
    ]);
  });
});
