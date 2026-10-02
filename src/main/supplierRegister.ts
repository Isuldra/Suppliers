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

/** A supplier name compared without regard to case or spacing. */
export function supplierKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * The supplier register after importing a file with "Leverandør" (suppliers) and/or
 * "Sjekkliste Leverandører" (checklist). Names that differ only in capitals or spacing are one
 * supplier, under its spelling in "Leverandør", else in the checklist.
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
  const spellings = new Map<string, string>();
  for (const { name } of [...(suppliers ?? []), ...checklist]) {
    if (!spellings.has(supplierKey(name))) spellings.set(supplierKey(name), name);
  }
  const spelling = (name: string) => spellings.get(supplierKey(name));

  // Each field takes the first value found, so sources run from most to least authoritative:
  // the file's last address for a supplier wins, and a stored record under the file's own
  // spelling comes before one under another.
  const sources: Contact[] = [
    ...(suppliers ?? [])
      .map((row) => ({ ...row, language: row.language || null, companyId: row.companyId || null }))
      .reverse(),
    ...checklist
      .filter((row) => row.email)
      .map((row) => ({ ...row, language: null, companyId: null }))
      .reverse(),
    ...(suppliers
      ? []
      : [...stored.contacts].sort(
          (a, b) => Number(spelling(b.name) === b.name) - Number(spelling(a.name) === a.name)
        )),
  ];
  const contacts = new Map<string, Contact>();
  for (const source of sources) {
    const name = spelling(source.name);
    if (!name) continue;
    const contact = contacts.get(name) ?? { name, email: '', language: null, companyId: null };
    contact.email ||= source.email;
    contact.language ||= source.language;
    contact.companyId ||= source.companyId;
    contacts.set(name, contact);
  }

  const days = new Map<string, Day>();
  for (const day of suppliers
    ? suppliers
        .filter((row) => row.weekday)
        .map((row) => ({ name: row.name, weekday: row.weekday, planner: PLANNER }))
    : stored.days) {
    const name = spelling(day.name);
    if (name) days.set(JSON.stringify([name, day.weekday, day.planner]), { ...day, name });
  }
  return { contacts: [...contacts.values()], days: [...days.values()] };
}
