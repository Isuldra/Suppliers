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
/** A row of "Sjekkliste Leverandører" ('' when it has no address). */
export type ChecklistRow = { name: string; email: string };

export const PLANNER = 'Innkjøper';

/**
 * The supplier register after importing a file with "Leverandør" (suppliers) and/or
 * "Sjekkliste Leverandører" (checklist). Every supplier in the file is in it, also without an
 * address. A Company ID is one supplier however its name is written; without one, names that
 * differ only in capitals or spacing are one supplier.
 *
 * With "Leverandør", the file replaces the register: its suppliers and reminder days, and an
 * address from the checklist where a supplier has none of its own. With only the checklist, the
 * stored suppliers on it keep their days, language, Company ID and (when the checklist has
 * none) address, and every other stored supplier is removed.
 */
export function importRegister(
  stored: Register,
  { checklist, suppliers }: { checklist: ChecklistRow[]; suppliers?: SupplierRow[] }
): Register {
  return suppliers ? fromSuppliers(suppliers, checklist) : fromChecklist(stored, checklist);
}

type Entry = { rows: SupplierRow[]; listed: ChecklistRow[] };

function fromSuppliers(suppliers: SupplierRow[], checklist: ChecklistRow[]): Register {
  const entries: Entry[] = [];
  const byId = new Map<string, Entry>();
  const byName = new Map<string, Entry[]>();
  const create = () => {
    const entry: Entry = { rows: [], listed: [] };
    entries.push(entry);
    return entry;
  };
  const index = (entry: Entry, name: string) => {
    const named = byName.get(supplierKey(name)) ?? [];
    if (!named.includes(entry)) byName.set(supplierKey(name), [...named, entry]);
  };
  // When several suppliers have a name, only one spelled exactly so is meant.
  const lookUp = (name: string) => {
    const named = byName.get(supplierKey(name)) ?? [];
    const exact = named.find((entry) =>
      [...entry.rows, ...entry.listed].some((row) => row.name === name)
    );
    return { named, entry: named.length === 1 ? named[0] : exact };
  };

  for (const row of suppliers.filter((row) => row.companyId)) {
    const entry = byId.get(row.companyId) ?? create();
    byId.set(row.companyId, entry);
    entry.rows.push(row);
    index(entry, row.name);
  }
  for (const row of suppliers.filter((row) => !row.companyId)) {
    const entry = lookUp(row.name).entry ?? create();
    entry.rows.push(row);
    index(entry, row.name);
  }
  // A checklist row gives its address to the supplier with its name, or is a supplier of its
  // own. Several suppliers with its name and none spelled exactly so: no address is guessed.
  for (const row of checklist) {
    const { named, entry } = lookUp(row.name);
    const target = entry ?? (named.length ? undefined : create());
    if (!target) continue;
    target.listed.push(row);
    index(target, row.name);
  }

  const sheetOrder = new Map(suppliers.map((row, index) => [row, index]));
  const last = (values: string[]) => values.filter(Boolean).pop() || null;
  const names = new Set<string>();
  const nameOf = new Map<SupplierRow, string>();
  const contacts = entries.map(({ rows, listed }): Contact => {
    rows.sort((a, b) => sheetOrder.get(a)! - sheetOrder.get(b)!);
    const companyId = last(rows.map((row) => row.companyId));
    let name = (rows[0] ?? listed[0]).name;
    // Two suppliers written exactly alike are told apart by their Company ID.
    if (names.has(name) && companyId) name = `${name} (${companyId})`;
    names.add(name);
    rows.forEach((row) => nameOf.set(row, name));
    return {
      name,
      email: last(rows.map((row) => row.email)) || last(listed.map((row) => row.email)) || '',
      language: last(rows.map((row) => row.language)),
      companyId,
    };
  });
  const days = suppliers
    .filter((row) => row.weekday)
    .map((row) => ({ name: nameOf.get(row)!, weekday: row.weekday, planner: PLANNER }));
  return { contacts, days: unique(days) };
}

function fromChecklist(stored: Register, checklist: ChecklistRow[]): Register {
  // Each supplier on the checklist: its first spelling and last address.
  const listed = new Map<string, ChecklistRow>();
  for (const row of checklist) {
    const entry = listed.get(supplierKey(row.name));
    listed.set(supplierKey(row.name), {
      name: entry?.name ?? row.name,
      email: row.email || entry?.email || '',
    });
  }

  const contacts: Contact[] = [];
  const merged = new Map<string, string>();
  for (const [key, row] of listed) {
    const records = stored.contacts.filter((contact) => supplierKey(contact.name) === key);
    if (new Set(records.map((record) => record.companyId).filter(Boolean)).size > 1) {
      // Different suppliers under one name stay as stored, with their days; only the one spelled
      // as the checklist gets its address.
      contacts.push(
        ...records.map((record) =>
          record.name === row.name && row.email ? { ...record, email: row.email } : record
        )
      );
      continue;
    }
    // Otherwise they are this supplier, under the checklist's spelling. The record already
    // spelled so comes first, and the checklist's address comes before any stored one.
    const contact: Contact = { name: row.name, email: row.email, language: null, companyId: null };
    for (const record of [...records].sort(
      (a, b) => Number(b.name === row.name) - Number(a.name === row.name)
    )) {
      contact.email ||= record.email;
      contact.language ||= record.language;
      contact.companyId ||= record.companyId;
    }
    contacts.push(contact);
    merged.set(key, row.name);
  }

  const days = stored.days
    .filter((day) => listed.has(supplierKey(day.name)))
    .map((day) => ({ ...day, name: merged.get(supplierKey(day.name)) ?? day.name }));
  return { contacts, days: unique(days) };
}

function unique(days: Day[]) {
  return [
    ...new Map(
      days.map((day) => [JSON.stringify([day.name, day.weekday, day.planner]), day])
    ).values(),
  ];
}
