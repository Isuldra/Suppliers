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

/** A workbook with a BP order per supplier (name, or name and ftgnr) and the given sheets. */
async function workbook(sheets: {
  orders: (string | [name: string, number: string])[];
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
  sheets.orders.forEach((order, index) => {
    const [name, number = ''] = typeof order === 'string' ? [order] : order;
    const values = Array<string | number>(17).fill('');
    Object.assign(values, { 0: '40', 2: `PO${index}`, 3: number, 4: '10', 5: 0, 7: `A${index}` });
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
  it('replaces the register with "Leverandør" and fills its missing addresses from the checklist', async () => {
    const { sqlite, db } = database();
    seed(sqlite, [['Old DK', 'old@dk.dk', 'Dansk']], [['Old DK', 'Tirsdag']], ['Old DK']);
    const file = await workbook({
      orders: ['Abena Norge AS'],
      checklist: [
        ['Abena Norge AS', 'checklist@abena.no'],
        ['Only Listed AS', 'post@listed.no'],
      ],
      suppliers: [['Abena Norge AS', '4960001', 'Svenska', 'Mandag', '']],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite)).toEqual({
      contacts: [
        {
          name: 'Abena Norge AS',
          email: 'checklist@abena.no',
          language: 'Svenska',
          companyId: '4960001',
        },
      ],
      days: [{ name: 'Abena Norge AS', weekday: 'Mandag' }],
      orders: ['Abena Norge AS'],
    });
  });

  it('imports every checklist supplier, including one without an email, day or open order', async () => {
    const { sqlite, db } = database();
    seed(sqlite, [['Old DK', 'old@dk.dk', 'Dansk']], [['Old DK', 'Tirsdag']]);
    const file = await workbook({
      orders: ['New AS'],
      checklist: [
        ['New AS', 'post@new.no'],
        ['No Address AS', ''],
      ],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite)).toEqual({
      contacts: [
        { name: 'New AS', email: 'post@new.no', language: null, companyId: null },
        { name: 'No Address AS', email: '', language: null, companyId: null },
      ],
      days: [],
      orders: ['New AS'],
    });
  });

  it('keeps settings for unambiguous suppliers in a checklist-only import', async () => {
    const { sqlite, db } = database();
    seed(
      sqlite,
      [
        ['Existing AS', 'saved@existing.no', 'Engelsk', '123'],
        ['Updated AS', 'old@updated.no', 'Norsk', '456'],
      ],
      [
        ['Existing AS', 'Torsdag'],
        ['Updated AS', 'Fredag'],
      ]
    );
    const file = await workbook({
      orders: [],
      checklist: [
        ['existing  as', ''],
        ['Updated AS', 'new@updated.no'],
      ],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite)).toEqual({
      contacts: [
        { name: 'Updated AS', email: 'new@updated.no', language: 'Norsk', companyId: '456' },
        { name: 'existing  as', email: 'saved@existing.no', language: 'Engelsk', companyId: '123' },
      ],
      days: [
        { name: 'Updated AS', weekday: 'Fredag' },
        { name: 'existing  as', weekday: 'Torsdag' },
      ],
      orders: [],
    });
  });

  it('keeps a Leverandør address ahead of the checklist and replaces an unusable address', async () => {
    const { sqlite, db } = database();
    const file = await workbook({
      orders: [],
      checklist: [
        ['Existing AS', 'checklist@existing.no'],
        ['no address as', 'first@example.no; second@example.no'],
      ],
      suppliers: [
        ['Existing AS', '123', '', '', 'preferred@existing.no'],
        ['No Address AS', '456', '', '', 'invalid@'],
      ],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite).contacts).toEqual([
      { name: 'Existing AS', email: 'preferred@existing.no', language: null, companyId: '123' },
      {
        name: 'No Address AS',
        email: 'first@example.no; second@example.no',
        language: null,
        companyId: '456',
      },
    ]);
  });

  it('restores checklist identities before merging differently spelled names', async () => {
    const { sqlite, db } = database();
    seed(
      sqlite,
      [
        ['Acme AS', 'first@example.no', 'Norsk', '123'],
        ['ACME AS', 'second@example.no', 'Engelsk', '456'],
      ],
      [
        ['Acme AS', 'Mandag'],
        ['ACME AS', 'Torsdag'],
      ]
    );
    const file = await workbook({
      orders: [],
      checklist: [
        ['Acme AS', 'updated-first@example.no'],
        ['ACME AS', 'updated-second@example.no'],
      ],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite)).toEqual({
      contacts: [
        {
          name: 'ACME AS',
          email: 'updated-second@example.no',
          language: 'Engelsk',
          companyId: '456',
        },
        { name: 'Acme AS', email: 'updated-first@example.no', language: 'Norsk', companyId: '123' },
      ],
      days: [
        { name: 'ACME AS', weekday: 'Torsdag' },
        { name: 'Acme AS', weekday: 'Mandag' },
      ],
      orders: [],
    });
  });

  it('keeps planning-only suppliers and does not overwrite a new email with a stored fallback', async () => {
    const { sqlite, db } = database();
    seed(
      sqlite,
      [['Updated AS', 'old@example.no', 'Engelsk', '123']],
      [['Planning Only AS', 'Torsdag']]
    );
    const file = await workbook({
      orders: [],
      checklist: [
        ['Planning Only AS', ''],
        ['Updated AS', 'new@example.no'],
        ['Updated AS', ''],
      ],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite)).toEqual({
      contacts: [
        { name: 'Planning Only AS', email: '', language: null, companyId: null },
        { name: 'Updated AS', email: 'new@example.no', language: 'Engelsk', companyId: '123' },
      ],
      days: [{ name: 'Planning Only AS', weekday: 'Torsdag' }],
      orders: [],
    });
  });

  it('does not assign an ambiguous checklist address to either Company ID', async () => {
    const { sqlite, db } = database();
    const file = await workbook({
      orders: [],
      checklist: [['Same AS', 'ambiguous@example.no']],
      suppliers: [
        ['Same AS', '123', '', '', ''],
        ['Same AS', '456', '', '', ''],
      ],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite).contacts).toEqual([
      { name: 'Same AS', email: '', language: null, companyId: '123' },
      { name: 'Same AS (456)', email: '', language: null, companyId: '456' },
    ]);
  });

  it('does not inherit a previous Company ID or email for an ambiguous checklist-only name', async () => {
    const { sqlite, db } = database();
    seed(
      sqlite,
      [
        ['Same AS', 'first@example.no', 'Norsk', '123'],
        ['Same AS (456)', 'second@example.no', 'Norsk', '456'],
      ],
      [['Same AS', 'Mandag']]
    );
    const file = await workbook({ orders: [], checklist: [['Same AS', '']] });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite)).toEqual({
      contacts: [{ name: 'Same AS', email: '', language: null, companyId: null }],
      days: [],
      orders: [],
    });
  });

  it('attaches Danish planning to the registered supplier when its order name differs but its ID agrees', async () => {
    const { sqlite, db } = database();
    const file = await workbook({
      orders: [['Abena A/S', '4960001']],
      suppliers: [['Abena Danmark A/S', '4960001', 'Dansk', '', 'ordre@abena.dk']],
    });

    expect(await importAlleArk(file, db, 'innkjop_DK.xlsx')).toBe(true);
    expect(register(sqlite).days).toEqual(
      ['Fredag', 'Mandag', 'Onsdag', 'Tirsdag', 'Torsdag'].map((weekday) => ({
        name: 'Abena Danmark A/S',
        weekday,
      }))
    );
  });

  it('stores every supplier in the file, also without an address or with a shared name', async () => {
    const { sqlite, db } = database();
    const file = await workbook({
      orders: [['Abena AS', '4960002']],
      suppliers: [
        ['Abena AS', '4960001', 'Norsk', 'Mandag', 'a@abena.no'],
        ['Abena AS', '4960002', 'Norsk', 'Tirsdag', 'b@abena.no'],
        ['No Address AS', '4960003', '', '', ''],
      ],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    expect(register(sqlite)).toEqual({
      contacts: [
        { name: 'Abena AS', email: 'a@abena.no', language: 'Norsk', companyId: '4960001' },
        {
          name: 'Abena AS (4960002)',
          email: 'b@abena.no',
          language: 'Norsk',
          companyId: '4960002',
        },
        { name: 'No Address AS', email: '', language: null, companyId: '4960003' },
      ],
      days: [
        { name: 'Abena AS', weekday: 'Mandag' },
        { name: 'Abena AS (4960002)', weekday: 'Tirsdag' },
      ],
      orders: ['Abena AS'],
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

  it('persists an ambiguous no-ID row separately without replacing either supplier contact', async () => {
    const { sqlite, db } = database();
    const file = await workbook({
      orders: [['Same AS', '123']],
      suppliers: [
        ['Same AS', '123', 'Norsk', 'Mandag', 'first@example.no'],
        ['Same AS', '456', 'Engelsk', 'Tirsdag', 'second@example.no'],
        ['Same AS', '', '', 'Fredag', 'unknown@example.no'],
      ],
    });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(true);
    const saved = register(sqlite);
    expect(saved.contacts).toEqual([
      { name: 'Same AS', email: 'first@example.no', language: 'Norsk', companyId: '123' },
      { name: 'Same AS (456)', email: 'second@example.no', language: 'Engelsk', companyId: '456' },
      {
        name: 'Same AS (uten Company ID)',
        email: 'unknown@example.no',
        language: null,
        companyId: null,
      },
    ]);
    expect(saved.days).toEqual([
      { name: 'Same AS', weekday: 'Mandag' },
      { name: 'Same AS (456)', weekday: 'Tirsdag' },
      { name: 'Same AS (uten Company ID)', weekday: 'Fredag' },
    ]);
  });

  it('rolls back orders and the register when a checklist-only contact cannot be saved', async () => {
    const { sqlite, db } = database();
    seed(sqlite, [['Old DK', 'old@dk.dk', 'Dansk']], [['Old DK', 'Tirsdag']], ['Old DK']);
    const before = register(sqlite);
    sqlite.exec(`CREATE TRIGGER fail BEFORE INSERT ON supplier_emails
      BEGIN SELECT RAISE(ABORT, 'disk full'); END`);
    const file = await workbook({ orders: ['New AS'], checklist: [['No Address AS', '']] });

    expect(await importAlleArk(file, db, 'test.xlsx')).toBe(false);
    expect(register(sqlite)).toEqual(before);
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
