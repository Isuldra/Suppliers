// @vitest-environment node
// The whole import, from a real workbook into a real SQLite database. better-sqlite3 is built for
// Electron, so the importer runs on Node's built-in SQLite through the few calls it uses.
import { DatabaseSync } from 'node:sqlite';
import ExcelJS from 'exceljs';
import type Database from 'better-sqlite3';
import { describe, expect, it, vi } from 'vitest';

vi.mock('better-sqlite3', () => ({ default: class {} }));
vi.mock('electron', () => ({
  app: {
    getPath: () => {
      throw new Error('No Electron app in tests');
    },
  },
  Notification: { isSupported: () => false },
}));

import { importAlleArk } from '../src/main/importer';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE purchase_order (
      nøkkel TEXT PRIMARY KEY, ordreNr TEXT, itemNo TEXT, beskrivelse TEXT, dato TEXT, ftgnavn TEXT,
      status TEXT, producer_item TEXT, specification TEXT, note TEXT, inventory_balance REAL,
      order_qty INTEGER, received_qty INTEGER, purchaser TEXT, incoming_date TEXT, eta_supplier TEXT,
      supplier_name TEXT, warehouse TEXT, outstanding_qty INTEGER, order_row_number TEXT,
      company_code TEXT, besttyp INTEGER, product_description TEXT, product_specification TEXT
    );
    CREATE TABLE supplier_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_name TEXT NOT NULL UNIQUE,
      email_address TEXT NOT NULL, updated_at TEXT, language TEXT, company_id TEXT
    );
    CREATE TABLE supplier_planning (
      id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_name TEXT NOT NULL, weekday TEXT NOT NULL,
      planner_name TEXT NOT NULL, created_at TEXT, updated_at TEXT,
      UNIQUE(supplier_name, weekday, planner_name) ON CONFLICT REPLACE
    );
  `);
  let depth = 0;
  const db = {
    prepare: (sql: string) => sqlite.prepare(sql),
    exec: (sql: string) => sqlite.exec(sql),
    // better-sqlite3 nests transactions as savepoints.
    transaction: (fn: () => void) => () => {
      const savepoint = `s${depth++}`;
      sqlite.exec(`SAVEPOINT ${savepoint}`);
      try {
        fn();
        sqlite.exec(`RELEASE ${savepoint}`);
      } catch (error) {
        sqlite.exec(`ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
        throw error;
      } finally {
        depth--;
      }
    },
    backup: async () => {},
  };
  return { sqlite, db: db as unknown as Database.Database };
}

function seed(sqlite: DatabaseSync, contacts: string[][], days: string[][], orders: string[] = []) {
  for (const [name, email, language, companyId] of contacts) {
    sqlite
      .prepare(
        'INSERT INTO supplier_emails (supplier_name, email_address, language, company_id) VALUES (?, ?, ?, ?)'
      )
      .run(name, email, language ?? null, companyId ?? null);
  }
  for (const [name, weekday] of days) {
    sqlite
      .prepare(
        "INSERT INTO supplier_planning (supplier_name, weekday, planner_name) VALUES (?, ?, 'Innkjøper')"
      )
      .run(name, weekday);
  }
  for (const key of orders) {
    sqlite
      .prepare('INSERT INTO purchase_order (nøkkel, supplier_name) VALUES (?, ?)')
      .run(key, key);
  }
}

function register(sqlite: DatabaseSync) {
  return {
    contacts: sqlite
      .prepare(
        'SELECT supplier_name AS name, email_address AS email, language, company_id AS companyId FROM supplier_emails ORDER BY 1'
      )
      .all()
      .map((row) => ({ ...row })),
    days: sqlite
      .prepare('SELECT supplier_name AS name, weekday FROM supplier_planning ORDER BY 1, 2')
      .all()
      .map((row) => ({ ...row })),
    orders: sqlite
      .prepare('SELECT supplier_name FROM purchase_order ORDER BY 1')
      .all()
      .map((row) => row.supplier_name),
  };
}

/** A workbook with a BP order per supplier and the given supplier sheets. */
async function workbook(sheets: {
  orders: string[];
  checklist?: [name: string, email: string][];
  suppliers?: [name: string, companyId: string, language: string, day: string, email: string][];
}) {
  const wb = new ExcelJS.Workbook();
  const bp = wb.addWorksheet('BP');
  bp.getRow(5).values = [
    'foretagkod',
    '',
    'bestnr',
    'ftgnr',
    'lagstalle',
    'besttyp',
    '',
    'artnr',
    'artnrlev',
    'bestberlevdat',
    'bestlovlevdat',
    'orpradtext',
    'bestant',
    'bestlevant',
    'bestrestant',
    'ftgnamn',
    'bestradnr',
  ];
  sheets.orders.forEach((name, index) => {
    const values = Array<string | number>(17).fill('');
    Object.assign(values, { 0: '40', 2: `PO${index}`, 4: '10', 5: 0, 7: `A${index}` });
    Object.assign(values, { 12: 5, 13: 0, 14: 5, 15: name, 16: '1' });
    bp.getRow(6 + index).values = values;
  });
  if (sheets.checklist) {
    const sheet = wb.addWorksheet('Sjekkliste Leverandører');
    sheet.getRow(4).values = ['Leverandør', 'Mandag', 'Tirsdag'];
    sheets.checklist.forEach(([name, email], index) => {
      const values = Array<string>(10).fill('');
      Object.assign(values, { 0: name, 1: 'Purret', 9: email });
      sheet.getRow(5 + index).values = values;
    });
  }
  if (sheets.suppliers) {
    const sheet = wb.addWorksheet('Leverandør');
    sheet.getRow(1).values = ['Leverandør', 'Company ID', 'Språk', 'Dag', 'E-post'];
    sheets.suppliers.forEach((row, index) => (sheet.getRow(2 + index).values = row));
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

describe('importing the supplier sheets', () => {
  it('replaces the register with "Leverandør", taking a missing address from the checklist', async () => {
    const { sqlite, db } = database();
    seed(sqlite, [['Old DK', 'old@dk.dk', 'Dansk']], [['Old DK', 'Tirsdag']], ['Old DK']);
    const file = await workbook({
      orders: ['Abena Norge AS'],
      checklist: [['ABENA NORGE  AS', 'ordre@abena.no']],
      suppliers: [['Abena Norge AS', '4960001', 'Svenska', 'Mandag', '']],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite)).toEqual({
      contacts: [
        {
          name: 'Abena Norge AS',
          email: 'ordre@abena.no',
          language: 'Svenska',
          companyId: '4960001',
        },
      ],
      days: [{ name: 'Abena Norge AS', weekday: 'Mandag' }],
      orders: ['Abena Norge AS'],
    });
  });

  it('keeps only checklisted suppliers, under its spelling and with their stored address', async () => {
    const { sqlite, db } = database();
    seed(
      sqlite,
      [
        ['Abena Norge AS', '', 'Norsk', '4960001'],
        ['ABENA NORGE AS', 'old@abena.no', 'Svenska'],
        ['Old DK', 'old@dk.dk', 'Dansk'],
      ],
      [
        ['ABENA NORGE AS', 'Mandag'],
        ['Old DK', 'Tirsdag'],
      ]
    );
    const file = await workbook({
      orders: ['Abena Norge AS'],
      checklist: [['Abena Norge AS', '']],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite)).toEqual({
      contacts: [
        { name: 'Abena Norge AS', email: 'old@abena.no', language: 'Norsk', companyId: '4960001' },
      ],
      days: [{ name: 'Abena Norge AS', weekday: 'Mandag' }],
      orders: ['Abena Norge AS'],
    });
  });

  it('keeps the register when the file has no supplier sheets', async () => {
    const { sqlite, db } = database();
    seed(sqlite, [['Old DK', 'old@dk.dk', 'Dansk']], [['Old DK', 'Tirsdag']]);

    expect(await importAlleArk(await workbook({ orders: ['New AS'] }), db, 'test.xlsx')).toBe(true);
    expect(register(sqlite)).toEqual({
      contacts: [{ name: 'Old DK', email: 'old@dk.dk', language: 'Dansk', companyId: null }],
      days: [{ name: 'Old DK', weekday: 'Tirsdag' }],
      orders: ['New AS'],
    });
  });

  it('fails and keeps the previous orders, contacts and days when a supplier sheet fails', async () => {
    const { sqlite, db } = database();
    seed(sqlite, [['Old DK', 'old@dk.dk', 'Dansk']], [['Old DK', 'Tirsdag']], ['Old DK']);
    const before = register(sqlite);
    sqlite.exec(`CREATE TRIGGER fail BEFORE INSERT ON supplier_planning
      BEGIN SELECT RAISE(ABORT, 'disk full'); END`);
    const file = await workbook({
      orders: ['Abena Norge AS'],
      suppliers: [['Abena Norge AS', '4960001', 'Norsk', 'Mandag', 'ordre@abena.no']],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(false);
    expect(register(sqlite)).toEqual(before);
  });
});
