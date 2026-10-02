// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { supplierFinder } from '../src/utils/supplierMatch';

describe('supplier identity matching', () => {
  const a = { name: 'Supplier A', number: '1' };
  const b = { name: 'Supplier B', number: '2' };

  it('matches a compatible name and number, ignoring case and whitespace', () => {
    const finder = supplierFinder([a, b]);
    expect(finder.find(' SUPPLIER  a ', ' 1 ')).toBe(a);
    expect(finder.find('supplier b')).toBe(b);
  });

  it('rejects a number whose name belongs to another registered supplier', () => {
    const finder = supplierFinder([a, b]);
    expect(finder.match('Supplier B', '1')).toEqual({ kind: 'conflict' });
    expect(finder.find('Supplier B', '1')).toBeUndefined();
    expect(finder.find(' SUPPLIER  b ', '1')).toBeUndefined();
  });

  it('matches an alternate name by its unique Company ID when the name identifies no other supplier', () => {
    const supplier = { name: 'Abena Danmark A/S', number: '4960001' };
    const finder = supplierFinder([supplier, b]);
    expect(finder.find('Abena A/S', ' 4960001 ')).toBe(supplier);
    expect(finder.find('Abena A/S')).toBeUndefined();
  });

  it('does not let an alternate name bypass an ambiguous Company ID', () => {
    const finder = supplierFinder([a, { ...b, number: '1' }]);
    expect(finder.match('Alternate name', '1')).toEqual({ kind: 'conflict' });
  });

  it('rejects a known name with a different unregistered number', () => {
    expect(supplierFinder([a]).match(a.name, '3')).toEqual({ kind: 'conflict' });
  });

  it('distinguishes a new supplier from a conflict and allows a missing registered number', () => {
    const unnumbered = { name: 'Supplier C' };
    const finder = supplierFinder([a, unnumbered]);
    expect(finder.match('Unknown supplier', '3')).toEqual({ kind: 'unmatched' });
    expect(finder.find('supplier c', '3')).toBe(unnumbered);
  });

  it('does not pick the first duplicate number or exact name', () => {
    expect(supplierFinder([a, { ...b, number: '1' }]).find(a.name, '1')).toBeUndefined();
    expect(supplierFinder([a, { ...b, name: a.name }]).find(a.name)).toBeUndefined();
  });

  it('uses an exact name only when it identifies one supplier', () => {
    const second = { name: 'SUPPLIER A', number: '2' };
    const finder = supplierFinder([a, second]);
    expect(finder.find(a.name)).toBe(a);
    expect(finder.find(second.name)).toBe(second);
    expect(finder.find('supplier  a')).toBeUndefined();
    expect(finder.find('supplier  a', '2')).toBe(second);
  });

  it('recognizes the register number suffix without hiding shared-name ambiguity', () => {
    const second = { name: 'Supplier A (2)', number: '2' };
    const finder = supplierFinder([a, second]);
    expect(finder.find('Supplier A', '2')).toBe(second);
    expect(finder.find('Supplier A (2)', '2')).toBe(second);
    expect(finder.find('Supplier A')).toBeUndefined();
    expect(finder.find('supplier a')).toBeUndefined();
  });

  it('indexes a gained number without creating duplicate candidates', () => {
    const supplier = { name: 'Supplier A', number: '' };
    const finder = supplierFinder([supplier]);
    supplier.number = '1';
    finder.add(supplier);
    finder.add(supplier);
    expect(finder.find('Supplier A', '1')).toBe(supplier);
    expect(finder.find('Supplier A')).toBe(supplier);
  });

  it('recognizes a generated number suffix when a literal supplier name required a counter', () => {
    const second = { name: 'Supplier A (2) (3)', number: '2' };
    const finder = supplierFinder([a, second]);
    expect(finder.find('Supplier A', '2')).toBe(second);
    expect(finder.find('Supplier A')).toBeUndefined();
  });
});
