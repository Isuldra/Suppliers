import { supplierKey } from '../utils/supplierMatch';

/** A supplier's contact details, as stored in supplier_emails. */
export type Contact = {
  name: string;
  email: string;
  language: string | null;
  companyId: string | null;
};
/** A reminder day, as stored in supplier_planning. */
export type Day = { name: string; weekday: string; planner: string };
export type Register = { contacts: Contact[]; days: Day[] };
/** A row of "Leverandør", with its weekday normalised ('' when it has none). */
export type SupplierRow = {
  name: string;
  companyId: string;
  language: string;
  weekday: string;
  email: string;
};

export const PLANNER = 'Innkjøper';

/**
 * The supplier register from the "Leverandør" sheet, which replaces the stored one. Every row
 * with a name is a supplier, also without an address or reminder day. A Company ID is one
 * supplier however its rows write the name. A row without one joins the supplier with its name
 * (capitals and spacing aside); when several have that name, exactly one must be spelled so.
 * Ambiguous rows without an ID remain separate. Checklist addresses only fill missing addresses
 * for an unambiguously identified supplier; checklist rows cannot extend this sheet's roster.
 */
export function importRegister(
  suppliers: SupplierRow[],
  checklist: { name: string; email: string }[] = []
): Register {
  const entries: SupplierRow[][] = [];
  const byId = new Map<string, SupplierRow[]>();
  const byName = new Map<string, SupplierRow[][]>();
  const add = (found: SupplierRow[] | undefined, row: SupplierRow) => {
    const entry = found ?? [];
    if (!found) entries.push(entry);
    entry.push(row);
    const named = byName.get(supplierKey(row.name)) ?? [];
    if (!named.includes(entry)) byName.set(supplierKey(row.name), [...named, entry]);
    return entry;
  };
  for (const row of suppliers.filter((row) => row.companyId))
    byId.set(row.companyId, add(byId.get(row.companyId), row));
  for (const row of suppliers.filter((row) => !row.companyId)) {
    const named = byName.get(supplierKey(row.name)) ?? [];
    const exact = named.filter((entry) => entry.some((other) => other.name === row.name));
    add(
      named.length === 1
        ? named[0]
        : exact.length === 1
          ? exact[0]
          : exact.find((entry) => entry.every((other) => !other.companyId)),
      row
    );
  }

  const checklistEmails = new Map<SupplierRow[], string>();
  for (const row of checklist) {
    if (!row.email) continue;
    const named = byName.get(supplierKey(row.name)) ?? [];
    const exact = named.filter((entry) => entry.some((other) => other.name === row.name));
    const entry = named.length === 1 ? named[0] : exact.length === 1 ? exact[0] : undefined;
    if (entry) checklistEmails.set(entry, row.email);
  }

  const sheetOrder = new Map(suppliers.map((row, index) => [row, index]));
  entries.forEach((rows) => rows.sort((a, b) => sheetOrder.get(a)! - sheetOrder.get(b)!));
  const last = (values: string[]) => values.filter(Boolean).pop() || null;
  const sourceNames = new Set(entries.map((rows) => rows[0].name));
  const names = new Set<string>();
  const nameOf = new Map<SupplierRow, string>();
  const contacts = entries.map((rows): Contact => {
    const companyId = last(rows.map((row) => row.companyId));
    let name = rows[0].name;
    // Names are storage keys, so an ambiguous row must not overwrite another contact.
    if (names.has(name)) {
      const base = `${name} (${companyId || 'uten Company ID'})`;
      name = base;
      for (let suffix = 2; names.has(name) || sourceNames.has(name); suffix++) {
        name = `${base} (${suffix})`;
      }
    }
    names.add(name);
    rows.forEach((row) => nameOf.set(row, name));
    return {
      name,
      email: last(rows.map((row) => row.email)) || checklistEmails.get(rows) || '',
      language: last(rows.map((row) => row.language)),
      companyId,
    };
  });
  const days = suppliers
    .filter((row) => row.weekday)
    .map((row) => ({ name: nameOf.get(row)!, weekday: row.weekday, planner: PLANNER }));
  return {
    contacts,
    days: [
      ...new Map(
        days.map((day) => [JSON.stringify([day.name, day.weekday, day.planner]), day])
      ).values(),
    ],
  };
}
