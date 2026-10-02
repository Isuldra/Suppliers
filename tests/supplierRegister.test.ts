// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  importRegister,
  supplierKey,
  type Contact,
  type Day,
  type Register,
  type SupplierRow,
} from '../src/main/supplierRegister';

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

const stored: Register = {
  contacts: [
    contact('ABENA  NORGE AS', {
      email: 'old@abena.no',
      language: 'Svenska',
      companyId: '4960001',
    }),
    contact('Old DK', { email: 'old@dk.dk', language: 'Dansk', companyId: '4960003' }),
  ],
  days: [day('ABENA  NORGE AS', 'Mandag'), day('Old DK', 'Tirsdag')],
};

describe('supplierKey', () => {
  it('ignores capitals and spacing, but not other differences', () => {
    expect(supplierKey('ABENA  Norge AS ')).toBe(supplierKey('Abena Norge AS'));
    expect(supplierKey('Ørje Medisinske')).toBe(supplierKey('ørje medisinske'));
    expect(supplierKey('Abena Norge AS')).not.toBe(supplierKey('Abena Norge'));
  });
});

describe('a file with "Leverandør"', () => {
  it('replaces the stored suppliers and days with the file', () => {
    const result = importRegister(stored, {
      checklist: [],
      suppliers: [supplier('Grimas B.V.', { companyId: '4960999', weekday: 'Onsdag' })],
    });
    expect(result).toEqual({
      contacts: [contact('Grimas B.V.', { companyId: '4960999' })],
      days: [day('Grimas B.V.', 'Onsdag')],
    });
  });

  it('takes a missing address from the checklist, also when it spells the supplier differently', () => {
    const result = importRegister(stored, {
      checklist: [{ name: 'ABENA NORGE  AS', email: 'ordre@abena.no' }],
      suppliers: [supplier('Abena Norge AS', { language: 'Norsk', weekday: 'Mandag' })],
    });
    expect(result).toEqual({
      contacts: [contact('Abena Norge AS', { email: 'ordre@abena.no', language: 'Norsk' })],
      days: [day('Abena Norge AS', 'Mandag')],
    });
  });

  it("prefers the supplier's own address and keeps addressed checklist-only suppliers", () => {
    const result = importRegister(stored, {
      checklist: [
        { name: 'Abena Norge AS', email: 'checklist@abena.no' },
        { name: 'Only Listed AS', email: 'post@listed.no' },
        { name: 'No Address AS', email: '' },
      ],
      suppliers: [supplier('Abena Norge AS', { email: 'own@abena.no' })],
    });
    expect(sorted(result).contacts).toEqual([
      contact('Abena Norge AS', { email: 'own@abena.no' }),
      contact('Only Listed AS', { email: 'post@listed.no' }),
    ]);
  });

  it('merges repeated rows: the last value of each field wins and each day counts once', () => {
    const result = importRegister(stored, {
      checklist: [],
      suppliers: [
        supplier('Abena Norge AS', {
          language: 'Norsk',
          email: 'first@abena.no',
          weekday: 'Mandag',
        }),
        supplier('abena norge as', { companyId: '4960001', weekday: 'Mandag' }),
        supplier('Abena Norge AS', { language: 'Engelsk', weekday: 'Torsdag' }),
      ],
    });
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
});

describe('a file with only "Sjekkliste Leverandører"', () => {
  it('removes stored suppliers that are not on the checklist, with their days', () => {
    const result = importRegister(stored, { checklist: [{ name: 'Abena Norge AS', email: '' }] });
    expect(result.contacts.map((item) => item.name)).toEqual(['Abena Norge AS']);
    expect(result.days).toEqual([day('Abena Norge AS', 'Mandag')]);
  });

  it("moves a supplier spelled differently to the checklist's spelling, with its details", () => {
    const result = importRegister(stored, {
      checklist: [{ name: 'Abena Norge AS', email: 'new@abena.no' }],
    });
    expect(result).toEqual({
      contacts: [
        contact('Abena Norge AS', {
          email: 'new@abena.no',
          language: 'Svenska',
          companyId: '4960001',
        }),
      ],
      days: [day('Abena Norge AS', 'Mandag')],
    });
  });

  it('keeps a stored address when the checklist spelling has none', () => {
    const result = importRegister(
      {
        contacts: [
          contact('Abena Norge AS', { language: 'Norsk' }),
          contact('ABENA NORGE AS', { email: 'old@abena.no', language: 'Svenska' }),
        ],
        days: [day('Abena Norge AS', 'Mandag'), day('ABENA NORGE AS', 'Mandag')],
      },
      { checklist: [{ name: 'Abena Norge AS', email: '' }] }
    );
    expect(result).toEqual({
      contacts: [contact('Abena Norge AS', { email: 'old@abena.no', language: 'Norsk' })],
      days: [day('Abena Norge AS', 'Mandag')],
    });
  });

  it('keeps the days of a checklisted supplier without a stored contact', () => {
    const result = importRegister(
      { contacts: [], days: [day('DAYS ONLY', 'Fredag')] },
      { checklist: [{ name: 'Days only', email: '' }] }
    );
    expect(result).toEqual({ contacts: [], days: [day('Days only', 'Fredag')] });
  });
});
