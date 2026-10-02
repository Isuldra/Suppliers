/** A supplier name compared without regard to case or spacing. */
export function supplierKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Finds a supplier by its Jeeves supplier number (ftgnr in the order sheet, Company ID in
 * "Leverandør"), which holds however the name is written, else by a name that differs only in
 * capitals or spacing.
 *
 * The number decides also when the name points to another supplier: ftgnr comes from Jeeves over
 * ODBC and Company ID is the same Jeeves key, so it is the supplier's identity, while names in the
 * lists are written by hand.
 */
export function supplierFinder<T extends { name: string; number?: string | null }>(suppliers: T[]) {
  const byNumber = new Map<string, T>();
  const byName = new Map<string, T>();
  const add = (supplier: T) => {
    const number = supplier.number?.trim();
    if (number && !byNumber.has(number)) byNumber.set(number, supplier);
    if (!byName.has(supplierKey(supplier.name))) byName.set(supplierKey(supplier.name), supplier);
  };
  suppliers.forEach(add);
  return {
    /** Adds a supplier, or the number it has gained, to the lookup. */
    add,
    find: (name: string, number?: string | null): T | undefined =>
      (number?.trim() && byNumber.get(number.trim())) || byName.get(supplierKey(name)),
  };
}
