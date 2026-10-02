/** A supplier name compared without regard to case or spacing. */
export function supplierKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Legal forms and countries the same company is written with or without.
const COMPANY_WORDS = new Set(
  'as asa a/s aps ab oy oyj gmbh bv nv ltd inc norge norway danmark denmark sverige sweden suomi finland'.split(
    ' '
  )
);
/**
 * A company's name without its legal form or country ("Abena Danmark A/S" → "abena"). Only to
 * tell whether two names are the same company; suppliers in different countries are separate
 * suppliers, so names are never matched on this alone.
 */
export function companyName(name: string): string {
  return supplierKey(name)
    .replace(/[.,]/g, '')
    .split(' ')
    .filter((word) => !COMPANY_WORDS.has(word))
    .join(' ');
}

/**
 * Finds a supplier by a name that differs only in capitals or spacing, else by its Jeeves
 * supplier number (ftgnr in the order sheet, Company ID in "Leverandør"). The name decides when
 * the two point to different suppliers: Company ID is typed by hand, and a wrong one must not
 * take another supplier's orders. A match by number alone to a name that is another company
 * (see companyName) is confirmed before sending.
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
      byName.get(supplierKey(name)) || (number?.trim() ? byNumber.get(number.trim()) : undefined),
  };
}
