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
});
