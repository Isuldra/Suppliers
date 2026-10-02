import type { ExcelRow } from '../types/ExcelData';
import type { SupplierContact } from '../../types/SupplierContact';
import { getISOWeek, getISOWeekYear } from '../../utils/dateUtils';
import { parseEmailRecipients } from '../../utils/emailRecipients';
import { supplierFinder, supplierKey } from '../../utils/supplierMatch';

export const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
export const LANGUAGES = { no: 'Norsk', da: 'Dansk', se: 'Svenska', fi: 'Suomi', en: 'English' };
export type Language = keyof typeof LANGUAGES;
export type ContactEdit = { email: string; language: Language; days: string[] };
export type Supplier = ContactEdit & {
  name: string;
  number: string;
  lines: ExcelRow[];
  /** Other names its order lines carry. */
  aliases: string[];
};
export type Exclusion = { fingerprint: string; reason: string };
export type HistoryEntry = {
  supplier: string;
  at: string;
  status: 'sent' | 'deferred';
  count: number;
};
export type WorkspaceMemory = {
  contacts: Record<string, ContactEdit>;
  excluded: Record<string, Exclusion>;
  history: HistoryEntry[];
  fileName: string;
  importedAt: string;
};
export const emptyMemory = (): WorkspaceMemory => ({
  contacts: {},
  excluded: {},
  history: [],
  fileName: '',
  importedAt: '',
});
const STORAGE_KEY = 'pulse-workspace-v1';
export function readMemory(): WorkspaceMemory {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (
      value &&
      typeof value.contacts === 'object' &&
      value.contacts &&
      typeof value.excluded === 'object' &&
      value.excluded &&
      Array.isArray(value.history)
    ) {
      return { ...emptyMemory(), ...value };
    }
  } catch {
    /* A damaged saved workspace must not prevent importing a file. */
  }
  return emptyMemory();
}
export function saveMemory(memory: WorkspaceMemory) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}
export function languageOf(value: string): Language {
  const languages: Record<string, Language> = {
    no: 'no',
    norsk: 'no',
    nb: 'no',
    en: 'en',
    eng: 'en',
    engelsk: 'en',
    english: 'en',
    dk: 'da',
    da: 'da',
    dansk: 'da',
    se: 'se',
    sv: 'se',
    svensk: 'se',
    svenska: 'se',
    fi: 'fi',
    finsk: 'fi',
    suomi: 'fi',
  };
  return languages[value.trim().toLowerCase()] || 'no';
}
export function lineId(line: ExcelRow) {
  return JSON.stringify([
    line.supplier,
    line.key,
    line.poNumber,
    line.orderRowNumber,
    line.itemNo,
    line.warehouse,
  ]);
}
export function fingerprint(line: ExcelRow) {
  return JSON.stringify([
    line.orderQty,
    line.receivedQty,
    line.outstandingQty,
    line.supplierETA,
    line.dueDate,
    line.inventoryBalance,
    line.specification,
    line.note,
    line.status,
    line.description,
    line.productSpecification,
    line.supplierArticleNo,
  ]);
}
export function excludedReason(line: ExcelRow, excluded: WorkspaceMemory['excluded']) {
  const entry = excluded[lineId(line)];
  return entry?.fingerprint === fingerprint(line) ? entry.reason : '';
}
export function outstanding(line: ExcelRow) {
  return Number(line.outstandingQty ?? line.orderQty - line.receivedQty);
}
export function waiting(line: ExcelRow) {
  return line.inventoryBalance != null && Number(line.inventoryBalance) < 0;
}
export function filterLines(
  lines: ExcelRow[],
  filter: string,
  excluded: WorkspaceMemory['excluded']
) {
  return lines.filter((line) =>
    filter === 'waiting'
      ? waiting(line)
      : filter === 'excluded'
        ? Boolean(excludedReason(line, excluded))
        : true
  );
}
export function eta(line: ExcelRow): Date | undefined {
  const value = line.supplierETA || line.dueDate;
  if (!value) return undefined;
  const date = new Date(value as string | Date);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
export function formatDate(date?: Date, locale = 'nb-NO') {
  return date ? date.toLocaleDateString(locale) : '—';
}
export function lateDays(line: ExcelRow, today = new Date()) {
  const date = eta(line);
  if (!date) return 0;
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((midnight.getTime() - date.getTime()) / 86400000));
}
export function weekKey(date = new Date()) {
  return `${getISOWeekYear(date)}-${getISOWeek(date)}`;
}
export function currentStatus(name: string, history: HistoryEntry[]) {
  return history.find(
    (entry) => entry.supplier === name && weekKey(new Date(entry.at)) === weekKey()
  )?.status;
}
export function validRecipients(value: string) {
  return parseEmailRecipients(value) !== null;
}
/** Order lines join the stored supplier with their supplier number, else with their name. */
export function buildSuppliers(
  rows: ExcelRow[],
  contacts: SupplierContact[],
  edits: WorkspaceMemory['contacts']
): Supplier[] {
  const suppliers: Supplier[] = contacts.map((contact) => ({
    ...contact,
    number: contact.number || '',
    language: languageOf(contact.language),
    lines: [],
    aliases: [],
  }));
  const finder = supplierFinder(suppliers);
  for (const row of rows) {
    if (!row.supplier || outstanding(row) <= 0) continue;
    const number = row.internalSupplierNumber?.trim() || '';
    let supplier = finder.find(row.supplier, number);
    if (!supplier) {
      supplier = {
        name: row.supplier,
        number,
        email: '',
        language: 'no',
        days: [],
        lines: [],
        aliases: [],
      };
      suppliers.push(supplier);
    }
    supplier.number ||= number;
    finder.add(supplier);
    if (row.supplier !== supplier.name && !supplier.aliases.includes(row.supplier))
      supplier.aliases.push(row.supplier);
    supplier.lines.push(row);
  }
  // Edits and history under a line's name move to its supplier only when the name is surely
  // theirs: not another supplier's name (also written differently, unless it is this supplier's
  // too), and not carried by lines of several suppliers.
  const names = new Set(suppliers.map((supplier) => supplier.name));
  const keys = new Set(suppliers.map((supplier) => supplierKey(supplier.name)));
  const carriers = new Map<string, number>();
  for (const alias of suppliers.flatMap((supplier) => supplier.aliases))
    carriers.set(alias, (carriers.get(alias) ?? 0) + 1);
  for (const supplier of suppliers)
    supplier.aliases = supplier.aliases.filter(
      (alias) =>
        !names.has(alias) &&
        carriers.get(alias) === 1 &&
        (supplierKey(alias) === supplierKey(supplier.name) || !keys.has(supplierKey(alias)))
    );
  return suppliers
    .map((supplier) => ({
      ...supplier,
      // Edits saved while the lines were a supplier of their own are under the lines' name.
      ...[supplier.name, ...supplier.aliases].map((name) => edits[name]).find(Boolean),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
}
/** History saved under a name a supplier's order lines carry, moved to the supplier's name. */
export function historyOf(history: HistoryEntry[], suppliers: Supplier[]): HistoryEntry[] {
  const names = new Map(
    suppliers.flatMap((supplier) =>
      supplier.aliases.map((alias): [string, string] => [alias, supplier.name])
    )
  );
  return history.map((entry) =>
    names.has(entry.supplier) ? { ...entry, supplier: names.get(entry.supplier)! } : entry
  );
}
export function onDay(supplier: Supplier, day: string) {
  return (
    day === 'Alle' ||
    (day === 'Ingen'
      ? !supplier.days.some((value) => DAYS.includes(value))
      : supplier.days.includes(day))
  );
}
