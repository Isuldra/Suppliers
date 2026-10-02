/** A supplier name compared without regard to case or spacing. */
export function supplierKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

type Match<T> = { kind: 'matched'; supplier: T } | { kind: 'unmatched' | 'conflict' };

/** Only compatible, unambiguous names and supplier numbers may identify a recipient. */
export function supplierFinder<T extends { name: string; number?: string | null }>(suppliers: T[]) {
  const byNumber = new Map<string, T[]>();
  const byExactName = new Map<string, T[]>();
  const byName = new Map<string, T[]>();
  const namesOf = (supplier: T) => {
    const names = [supplier.name];
    const suffix = supplier.number?.trim() && ` (${supplier.number.trim()})`;
    // The register adds the Company ID to distinguish suppliers with identical names.
    if (suffix) {
      const index = supplier.name.lastIndexOf(suffix);
      if (index >= 0 && /^(?: \([1-9]\d*\))?$/.test(supplier.name.slice(index + suffix.length)))
        names.push(supplier.name.slice(0, index));
    }
    return names;
  };
  const index = (map: Map<string, T[]>, key: string, supplier: T) => {
    const found = map.get(key) ?? [];
    if (!found.includes(supplier)) map.set(key, [...found, supplier]);
  };
  const add = (supplier: T) => {
    const number = supplier.number?.trim();
    if (number) index(byNumber, number, supplier);
    for (const name of namesOf(supplier)) {
      index(byExactName, name, supplier);
      index(byName, supplierKey(name), supplier);
    }
  };
  suppliers.forEach(add);
  const match = (name: string, number?: string | null): Match<T> => {
    const key = supplierKey(name);
    const id = number?.trim();
    const numbered = id ? (byNumber.get(id) ?? []) : [];
    if (numbered.length > 1) return { kind: 'conflict' };
    if (numbered.length === 1) {
      const supplier = numbered[0];
      return namesOf(supplier).some((candidate) => supplierKey(candidate) === key)
        ? { kind: 'matched', supplier }
        : { kind: 'conflict' };
    }
    const exact = byExactName.get(name) ?? [];
    const named = byName.get(key) ?? [];
    const candidates = exact.length ? exact : named;
    if (!candidates.length) return { kind: 'unmatched' };
    if (candidates.length !== 1) return { kind: 'conflict' };
    const supplier = candidates[0];
    if (id && supplier.number?.trim() && id !== supplier.number.trim()) return { kind: 'conflict' };
    return { kind: 'matched', supplier };
  };
  return {
    /** Adds a supplier, or the number it has gained, to the lookup. */
    add,
    match,
    find: (name: string, number?: string | null): T | undefined => {
      const result = match(name, number);
      return result.kind === 'matched' ? result.supplier : undefined;
    },
  };
}
