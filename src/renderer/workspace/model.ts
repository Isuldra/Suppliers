import type { ExcelRow } from '../types/ExcelData';
import type { SupplierContact } from '../../types/SupplierContact';
import { getISOWeek, getISOWeekYear } from '../../utils/dateUtils';

export const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
export const LANGUAGES = { no: 'Norsk', da: 'Dansk', se: 'Svenska', fi: 'Suomi', en: 'English' };
export type Language = keyof typeof LANGUAGES;
export type ContactEdit = { email: string; language: Language; days: string[] };
export type Supplier = ContactEdit & { name: string; number: string; lines: ExcelRow[] };
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
export function eta(line: ExcelRow): Date | undefined {
  const value = line.supplierETA || line.dueDate;
  if (!value) return undefined;
  const date = new Date(value as string | Date);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
export function formatDate(date?: Date) {
  return date ? date.toLocaleDateString('nb-NO') : '—';
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
  const addresses = value.split(/[;,]/).map((address) => address.trim());
  return (
    addresses.length > 0 &&
    addresses.every((address) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address))
  );
}
export function buildSuppliers(
  rows: ExcelRow[],
  contacts: SupplierContact[],
  edits: WorkspaceMemory['contacts']
): Supplier[] {
  const result = new Map<string, Supplier>();
  for (const contact of contacts)
    result.set(contact.name, {
      ...contact,
      number: '',
      language: languageOf(contact.language),
      lines: [],
    });
  for (const row of rows) {
    if (!row.supplier || outstanding(row) <= 0) continue;
    const supplier = result.get(row.supplier) || {
      name: row.supplier,
      number: '',
      email: '',
      language: 'no' as const,
      days: [],
      lines: [],
    };
    supplier.lines.push(row);
    supplier.number ||= row.internalSupplierNumber || '';
    result.set(row.supplier, supplier);
  }
  return [...result.values()]
    .map((supplier) => ({ ...supplier, ...edits[supplier.name] }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
}
export function onDay(supplier: Supplier, day: string) {
  return (
    day === 'Alle' ||
    (day === 'Ingen'
      ? !supplier.days.some((value) => DAYS.includes(value))
      : supplier.days.includes(day))
  );
}
