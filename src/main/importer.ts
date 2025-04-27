import ExcelJS from "exceljs";
import Database from "better-sqlite3";
import log from "electron-log"; // Added for logging
import { formatISO, parse as parseDateFns } from "date-fns"; // Import date-fns functions
import type { Worksheet, Cell } from "exceljs"; // Import Worksheet and Cell types

type WeeklyStatus = {
  leverandør: string;
  dag: string; // Mandag, Tirsdag…
  uke: string; // Uke 15, Uke 16…
  status: string; // "Ingen Backorders" / "Purret" / "Avvent"
  email: string;
};

// Define structure for data going into the 'orders' table
type OrderImportData = {
  reference: string;
  orderNumber: string;
  description: string;
  dueDate: string | null; // Stored as YYYY-MM-DD string
  supplier: string;
};

// Define structure for BP data (adjust fields as needed)
type BpData = {
  order_number: string;
  item_number: string;
  supplier_item_number: string | null;
  promised_delivery_date: string | null; // Stored as YYYY-MM-DD string
}

// Helper function to find the header row index
function findHeaderRow(
  ws: Worksheet,
  mustInclude: string[],
  maxScanRows = 15 // Scan fewer rows for header by default
): number {
  log.debug(`Searching for header in sheet '${ws.name}' with keywords: ${mustInclude.join(', ')}`);
  for (let r = 1; r <= Math.min(maxScanRows, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const textRow: string[] = [];
    // Use .text to get the displayed string, handling richText/formulas
    // Capture empty cells as well to compare against mustInclude array length
    row.eachCell({ includeEmpty: true }, (cell: Cell) => {
      const txt = cell && cell.text ? cell.text.toString().trim().toLowerCase() : "";
      textRow.push(txt);
    });

    // Check if all required keywords are present in this row's cells
    const foundAll = mustInclude.every(kw =>
        textRow.some(cellText => cellText.includes(kw.toLowerCase()))
    );

    if (foundAll) {
      log.info(`Found header row ${r} in sheet '${ws.name}'. Content: ${JSON.stringify(textRow)}`);
      return r;
    }
  }
  const errMsg = `Couldn't find header row in sheet '${ws.name}' containing all keywords: ${mustInclude.join(", ")} within the first ${maxScanRows} rows.`;
  log.error(errMsg);
  throw new Error(errMsg);
}

// Function to parse dates robustly, trying multiple formats and handling Excel numbers
function parseExcelDate(dateValue: unknown): string | null {
  if (!dateValue || (typeof dateValue === 'string' && dateValue.trim() === '')) {
    return null;
  }
  // Check if it's already a valid Date object
  if (dateValue instanceof Date) {
    if (!isNaN(dateValue.getTime())) {
      // Use UTC methods to avoid timezone issues when creating the ISO string
      return formatISO(dateValue, { representation: 'date' });
    }
  }
  // Check if it's an Excel date number (common origin: 1900-01-01, but Excel treats 1900 as a leap year)
  if (typeof dateValue === 'number') {
    try {
      // Excel for Windows stores dates as days since 1900-01-00 (which is Dec 31, 1899)
      // Excel for Mac stores dates as days since 1904-01-01
      // We assume Windows format (most common). Add check for workbook.properties.date1904 if needed.
      const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899 to account for Excel's leap year bug
      const jsDate = new Date(excelEpoch.getTime() + dateValue * 86400000); // 86400000 ms in a day
       if (!isNaN(jsDate.getTime())) {
          return formatISO(jsDate, { representation: 'date' });
       }
    } catch (e) {
      log.warn(`Error parsing Excel numeric date ${dateValue}: ${e}`);
    }
  }
  // Check if it's a string
  if (typeof dateValue === 'string') {
    const trimmedDate = dateValue.trim();
    if (trimmedDate) {
      // Try specific formats common in Excel
      const formats = [
        'dd.MM.yyyy',
        'dd/MM/yyyy',
        'MM/dd/yyyy',
        'yyyy-MM-dd',
        'yyyyMMdd',
        'dd-MMM-yy',
        'd. MMMM yyyy'
      ];
      for (const fmt of formats) {
        try {
          const parsed = parseDateFns(trimmedDate, fmt, new Date());
          if (!isNaN(parsed.getTime())) {
            return formatISO(parsed, { representation: 'date' });
          }
        } catch (e) { /* ignore format mismatch, try next */ }
      }
      // Fallback for standard ISO or JS Date parsable strings
      try {
        // Handle potential ISO strings with time/timezone
        const parsed = new Date(trimmedDate.split('T')[0]); // Take only date part
        if (!isNaN(parsed.getTime())) {
          return formatISO(parsed, { representation: 'date' });
        }
      } catch(e) { /* ignore */ }
    }
  }

  log.warn(`Could not parse date value: ${JSON.stringify(dateValue)}. Returning as string.`);
  // Return the original string representation if all parsing fails
  return String(dateValue);
}


// --- Import Functions for Each Sheet Type ---

async function importSjekkliste(
  wb: ExcelJS.Workbook,
): Promise<{ success: boolean; data: WeeklyStatus[] }> {
  log.info("Starting import of 'Sjekkliste Leverandører' sheets...");
  const statusArk = wb.worksheets.filter((ws: Worksheet) =>
    ws.name.toLowerCase().startsWith("sjekkliste leverandører")
  );

  if (statusArk.length === 0) {
    log.warn("No 'Sjekkliste Leverandører' sheets found. Skipping status import.");
    return { success: true, data: [] }; // Not an error, just no sheets
  }

  log.info(`Found ${statusArk.length} 'Sjekkliste Leverandører' sheets.`);

  const alleStatus: WeeklyStatus[] = [];
  const success = true; // Use const as it's not reassigned here

  for (const sheet of statusArk) {
    log.info(`Processing sheet: ${sheet.name}`);
    let sjekkHeaderIdx = -1;
    try {
      sjekkHeaderIdx = findHeaderRow(sheet, ["leverandør", "uke"], 10);
    } catch (e: unknown) { // Type the error
      const message = e instanceof Error ? e.message : String(e);
      log.warn(
        `Could not find required header row in sheet ${sheet.name}. Skipping sheet. Error: ${message}`
      );
      continue; // Skip this sheet
    }

    const headerRow = sheet.getRow(sjekkHeaderIdx);
    let leverandorCol = -1;
    let emailCol = -1; // Optional
    const ukeCols: { index: number; uke: string; dag: string }[] = [];

    headerRow.eachCell({ includeEmpty: true }, (cell: Cell, colNumber: number) => {
      const cellValue = cell.text ? cell.text.trim().toLowerCase() : "";
      if (cellValue === "leverandør" || cellValue === "supplier") {
        leverandorCol = colNumber;
      } else if (cellValue === "mail" || cellValue === "email") {
        emailCol = colNumber;
      } else if (cellValue.startsWith("uke")) {
        let dag = "Ukjent Dag";
        if (sjekkHeaderIdx > 1) {
          const dayCell = sheet.getCell(sjekkHeaderIdx - 1, colNumber);
          if (dayCell && dayCell.text) {
            dag = dayCell.text.trim();
          }
        }
        ukeCols.push({ index: colNumber, uke: cell.text.trim(), dag });
      }
    });

    if (leverandorCol === -1) {
      log.warn(
        `Could not find 'Leverandør' column in header row ${sjekkHeaderIdx} for sheet: ${sheet.name}. Skipping sheet.`
      );
      continue;
    }
    if (emailCol === -1) {
      log.warn(
        `Could not find 'Mail'/'Email' column in sheet: ${sheet.name} (header row ${sjekkHeaderIdx}). Email will be empty.`
      );
    }

    log.info(
      `Sheet '${sheet.name}' - Header Row: ${sjekkHeaderIdx}, Leverandør Col: ${leverandorCol}, Email Col: ${emailCol}, Uke Cols: ${ukeCols.map(uc => `${uc.index}(${uc.uke}/${uc.dag})`).join(", ")}`
    );

    let rowsExtractedFromSheet = 0;
    for (let r = sjekkHeaderIdx + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const lever = row.getCell(leverandorCol).text.trim();
      if (!lever) {
        // log.debug(
        //   `Stopping read for sheet ${sheet.name} at row ${r} due to empty 'Leverandør' cell.`
        // );
        break; // Stop if leverandør is empty for this sheet
      }

      const email = emailCol !== -1 ? row.getCell(emailCol).text.trim() : "";

      for (const ukeCol of ukeCols) {
        const status = row.getCell(ukeCol.index).text.trim();
        if (status) {
          alleStatus.push({
            leverandør: lever,
            dag: ukeCol.dag,
            uke: ukeCol.uke,
            status,
            email,
          });
          rowsExtractedFromSheet++;
        }
      }
    }
    log.info(`Extracted ${rowsExtractedFromSheet} status entries from ${sheet.name}.`);
  }
  log.info(
    `Finished processing status sheets. Total entries: ${alleStatus.length}`
  );
  return { success, data: alleStatus }; // Return collected data
}

async function buildEstMap(wb: ExcelJS.Workbook): Promise<Map<string, Date>> {
  const estMap = new Map<string, Date>();
  const restSheet = wb.getWorksheet("Restliste til Leverandør");
  if (!restSheet) {
    log.warn("'Restliste til Leverandør' sheet not found. Cannot build estimated receipt dates map.");
    return estMap;
  }

  try {
    log.info("Processing 'Restliste til Leverandør' sheet to build EST map...");
    const headerIdx = findHeaderRow(restSheet, ["ref", "est receipt date"], 10);
    const headerRow = restSheet.getRow(headerIdx);
    let keyCol = -1, estCol = -1;

    headerRow.eachCell({ includeEmpty: true }, (c: Cell, idx: number) => {
      const t = c.text ? c.text.trim().toLowerCase() : "";
      if (t.includes("ref")) keyCol = idx;
      if (t.includes("est receipt date")) estCol = idx;
    });

    if (keyCol === -1 || estCol === -1) {
      log.error(
        "Could not find required columns 'ref' or 'est receipt date' in Restliste header row. Cannot build EST map."
      );
      return estMap; // Return empty map
    }
    log.info(`Restliste cols for EST map: ref=${keyCol}, est receipt date=${estCol}`);

    for (let r = headerIdx + 1; r <= restSheet.rowCount; r++) {
      const row = restSheet.getRow(r);
      const keyCell = row.getCell(keyCol);
      const dateCell = row.getCell(estCol);

      const key = keyCell ? keyCell.text.trim() : null;
      const rawDate = dateCell ? dateCell.value : null;

      if (!key || !rawDate) {
        // log.debug(`Skipping Restliste row ${r}: missing key or date`);
        continue;
      }

      const parsedDateStr = parseExcelDate(rawDate); // Get YYYY-MM-DD or original string
      if (key && parsedDateStr) {
        try {
          // Attempt to create a Date object from the parsed YYYY-MM-DD string
          const dateObj = new Date(parsedDateStr + 'T00:00:00Z'); // Add time part for UTC consistency
          if (!isNaN(dateObj.getTime())) {
            estMap.set(key, dateObj);
          } else {
            log.warn(`Could not create valid Date object from parsed string '${parsedDateStr}' for key '${key}' in Restliste`);
          }
        } catch (parseErr) {
          log.warn(`Error creating Date object from '${parsedDateStr}' for key '${key}' in Restliste: ${parseErr}`);
        }
      }
    }
    log.info(`Built estMap with ${estMap.size} entries from Restliste.`);
  } catch (error: unknown) { // Type the error
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Error processing 'Restliste til Leverandør' sheet: ${message}`);
    // Continue without EST data if Restliste processing fails
  }
  return estMap;
}


async function importHovedliste(
  wb: ExcelJS.Workbook,
  _estMap: Map<string, Date> // Pass the map here (prefixed as unused in this scope)
): Promise<{ success: boolean; data: OrderImportData[] }> {
  log.info("Processing 'Hovedliste' sheet...");
  const hovedSheet = wb.getWorksheet("Hovedliste");
  if (!hovedSheet) {
    log.warn("'Hovedliste' sheet not found. Skipping Hovedliste import.");
    return { success: true, data: [] }; // Not an error if sheet doesn't exist
  }

  const orderImportList: OrderImportData[] = [];
  try {
    const HOVEDLISTE_HEADER_MAP: Record<keyof OrderImportData, string[]> = {
      reference: ['nøkkel', 'ref'],
      orderNumber: ['pono', 'pono.', 'purchase order no.', 'ordrenr', 'bestnr', 'po', 'ponr'],
      description: ['item description', 'beskrivelse', 'prod. navn'], // Added 'prod. navn'
      dueDate: ['dato varen skulle kommet inn', 'dato', 'eta fra leverandør', 'bestlovlevdat'],
      supplier: ['leverandør', 'ftgnavn', 'ftgnamn']
    };

    const mustInclude = [...HOVEDLISTE_HEADER_MAP.reference]; // Reference (nøkkel) is the primary key
    const headerIdx = findHeaderRow(hovedSheet, mustInclude, 10);
    const headerRow = hovedSheet.getRow(headerIdx);

    const colMap: Partial<Record<keyof OrderImportData, number>> = {};
    headerRow.eachCell({ includeEmpty: true }, (cell: Cell, idx: number) => {
      const txt = cell.text ? cell.text.trim().toLowerCase() : "";
      if (!txt) return;
      for (const [field, syns] of Object.entries(HOVEDLISTE_HEADER_MAP)) {
        if (syns.some(s => txt.includes(s))) {
          if (!colMap[field as keyof OrderImportData]) { // Take the first match
            colMap[field as keyof OrderImportData] = idx;
          }
        }
      }
    });
    log.info(`Hovedliste columns mapped: ${JSON.stringify(colMap)}`);

    const requiredCols: (keyof OrderImportData)[] = ['reference']; // At least reference is needed
    const missingCols = requiredCols.filter(col => !(col in colMap));
    if (missingCols.length > 0) {
      const missingSynonyms = missingCols.map(col => `${col} (e.g., ${HOVEDLISTE_HEADER_MAP[col].join('/')})`).join(', ');
      log.error(`Required columns not found in Hovedliste header (row ${headerIdx}): ${missingSynonyms}. Cannot process Hovedliste.`);
      return { success: false, data: [] };
    }

    for (let r = headerIdx + 1; r <= hovedSheet.rowCount; r++) {
      const row = hovedSheet.getRow(r);
      const ref = colMap.reference ? row.getCell(colMap.reference).text.trim() : '';
      if (!ref) {
        // log.debug(`Skipping Hovedliste row ${r}: empty reference cell.`);
        continue;
      }

      const ord = colMap.orderNumber ? row.getCell(colMap.orderNumber).text.trim() : '';
      const desc = colMap.description ? row.getCell(colMap.description).text.trim() : '';
      const dueRaw = colMap.dueDate ? row.getCell(colMap.dueDate).value : null;
      const dueDate = parseExcelDate(dueRaw);
      const supp = colMap.supplier ? row.getCell(colMap.supplier).text.trim() : '';

      orderImportList.push({
        reference: ref,
        orderNumber: ord,
        description: desc,
        dueDate: dueDate, // Use parsed date string
        supplier: supp
      });
    }
    log.info(`Extracted ${orderImportList.length} orders from Hovedliste.`);
    return { success: true, data: orderImportList };

  } catch (err: unknown) { // Type the error
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Error processing Hovedliste sheet: ${message}`);
    return { success: false, data: [] };
  }
}

// TODO: Implement BP data import and define BpData type
async function importBpData(wb: ExcelJS.Workbook): Promise<{ success: boolean; data: BpData[] }> {
  log.info("Processing 'BP' sheet...");
  const bpSheet = wb.getWorksheet("BP");
  if (!bpSheet) {
    log.warn("'BP' sheet not found. Skipping BP data import.");
    return { success: true, data: [] }; // Not an error if sheet doesn't exist
  }

  const bpDataList: BpData[] = [];
  try {
    const BP_HEADER_MAP = {
      orderNumber: ['ordrenr', 'po', 'po number'], // Example synonyms
      itemNumber: ['item no', 'artnr', 'item number'],
      supplierItemNumber: ['supplier item no', 'lev artnr'],
      promisedDeliveryDate: ['promised delivery date', 'lovad lev dat']
    };
    const mustInclude = [
      ...BP_HEADER_MAP.orderNumber,
      ...BP_HEADER_MAP.itemNumber
    ];

    const headerIdx = findHeaderRow(bpSheet, mustInclude, 10);
    const headerRow = bpSheet.getRow(headerIdx);

    const colMap: Partial<Record<keyof typeof BP_HEADER_MAP, number>> = {};
    headerRow.eachCell({ includeEmpty: true }, (cell: Cell, idx: number) => {
      const txt = cell.text ? cell.text.trim().toLowerCase() : "";
      if (!txt) return;
      for (const [field, syns] of Object.entries(BP_HEADER_MAP)) {
        if (syns.some(s => txt.includes(s))) {
          if (!colMap[field as keyof typeof BP_HEADER_MAP]) {
            colMap[field as keyof typeof BP_HEADER_MAP] = idx;
          }
        }
      }
    });
    log.info(`BP sheet columns mapped: ${JSON.stringify(colMap)}`);

    const requiredBpCols = Object.keys(BP_HEADER_MAP) as (keyof typeof BP_HEADER_MAP)[];
    const missingBpCols = requiredBpCols.filter(col => !(col in colMap));
    if (missingBpCols.length > 0) {
      const missingSynonyms = missingBpCols.map(col => `${col} (e.g., ${BP_HEADER_MAP[col].join('/')})`).join(', ');
      log.error(`Required columns not found in BP header (row ${headerIdx}): ${missingSynonyms}. Cannot process BP data.`);
      return { success: false, data: [] };
    }

    for (let r = headerIdx + 1; r <= bpSheet.rowCount; r++) {
      const row = bpSheet.getRow(r);
      const orderNum = colMap.orderNumber ? row.getCell(colMap.orderNumber).text.trim() : '';
      const itemNum = colMap.itemNumber ? row.getCell(colMap.itemNumber).text.trim() : '';

      if (!orderNum || !itemNum) {
        // log.debug(`Skipping BP row ${r}: missing order number or item number.`);
        continue;
      }

      const suppItemNum = colMap.supplierItemNumber ? row.getCell(colMap.supplierItemNumber).text.trim() : null;
      const promisedDateRaw = colMap.promisedDeliveryDate ? row.getCell(colMap.promisedDeliveryDate).value : null;
      const promisedDate = parseExcelDate(promisedDateRaw);

      bpDataList.push({
        order_number: orderNum,
        item_number: itemNum,
        supplier_item_number: suppItemNum,
        promised_delivery_date: promisedDate,
      });
    }
    log.info(`Extracted ${bpDataList.length} rows from BP sheet.`);
    return { success: true, data: bpDataList };

  } catch (err: unknown) { // Type the error
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Error processing BP sheet: ${message}`);
    return { success: false, data: [] };
  }
}

/**
 * Main function to import data from an Excel file into the SQLite database.
 * Orchestrates the reading of different sheets and database operations.
 */
export async function importExcelData(
  source: string | ArrayBuffer,
  db: Database.Database
): Promise<boolean> {
  log.info(
    `Starting import from ${typeof source === "string" ? "Excel file: " + source : "Excel buffer"}`
  );
  const wb = new ExcelJS.Workbook();
  try {
    if (typeof source === "string") {
      await wb.xlsx.readFile(source);
      log.info(`Successfully read Excel file: ${source}`);
    } else {
      await wb.xlsx.load(source);
      log.info(`Successfully loaded Excel from buffer (${source.byteLength} bytes).`);
    }
  } catch (err: unknown) { // Type the error
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Failed to read/load Excel data: ${message}`);
    return false;
  }

  // --- Ensure Database Schema --- //
  log.info("Ensuring database tables exist...");
  try {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS weekly_status (
        leverandor TEXT,
        dag         TEXT,
        uke         TEXT,
        status      TEXT,
        email       TEXT,
        import_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(leverandor, dag, uke) ON CONFLICT REPLACE
      );
      CREATE INDEX IF NOT EXISTS idx_weekly_status_leverandor ON weekly_status(leverandor);
      CREATE INDEX IF NOT EXISTS idx_weekly_status_uke ON weekly_status(uke);

      CREATE TABLE IF NOT EXISTS orders (
        reference       TEXT PRIMARY KEY, -- Nøkkel from Hovedliste
        orderNumber     TEXT,             -- PO Number from Hovedliste
        description     TEXT,
        dueDate         TEXT,             -- Original due date from Hovedliste (YYYY-MM-DD)
        supplier        TEXT,             -- Leverandør from Hovedliste
        estimatedReceiptDate TEXT,       -- From Restliste (YYYY-MM-DD)
        note TEXT DEFAULT '',             -- User editable note
        status TEXT DEFAULT 'Pending',      -- Initial status, user editable
        import_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier);
      CREATE INDEX IF NOT EXISTS idx_orders_orderNumber ON orders(orderNumber);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

      -- Trigger to update last_updated timestamp on order changes
      CREATE TRIGGER IF NOT EXISTS update_orders_last_updated
      AFTER UPDATE ON orders
      FOR EACH ROW
      BEGIN
          UPDATE orders SET last_updated = CURRENT_TIMESTAMP WHERE reference = OLD.reference;
      END;

      CREATE TABLE IF NOT EXISTS bp_data (
        order_number TEXT,
        item_number TEXT,
        supplier_item_number TEXT,
        promised_delivery_date TEXT, -- YYYY-MM-DD
        import_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (order_number, item_number) ON CONFLICT REPLACE
      );
      CREATE INDEX IF NOT EXISTS idx_bp_data_order_number ON bp_data(order_number);
      CREATE INDEX IF NOT EXISTS idx_bp_data_item_number ON bp_data(item_number);

      CREATE TABLE IF NOT EXISTS suppliers (
        name TEXT PRIMARY KEY,
        email TEXT,
        contact_person TEXT,
        phone TEXT,
        notes TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      );

       -- Trigger to update last_updated timestamp on supplier changes
      CREATE TRIGGER IF NOT EXISTS update_suppliers_last_updated
      AFTER UPDATE ON suppliers
      FOR EACH ROW
      BEGIN
          UPDATE suppliers SET last_updated = CURRENT_TIMESTAMP WHERE name = OLD.name;
      END;

      CREATE TABLE IF NOT EXISTS email_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        supplier_name TEXT,
        email_address TEXT,
        subject TEXT,
        body TEXT,
        status TEXT, -- e.g., 'Sent', 'Failed'
        error TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_email_log_supplier ON email_log(supplier_name);
      CREATE INDEX IF NOT EXISTS idx_email_log_timestamp ON email_log(timestamp);
    `);
    log.info("Database tables ensured/updated.");
  } catch (err: unknown) { // Type the error
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Failed to create/verify database tables: ${message}`);
    return false;
  }

  // --- Process Sheets & Insert Data --- //
  let overallSuccess = true;
  let statusCount = 0;
  let orderCount = 0;
  let bpDataList: BpData[] = []; // Declare bpDataList here

  // Start a database transaction for efficiency
  const importTransaction = db.transaction(async () => {
    // Delete existing data first
    log.info("Clearing existing data...");
    db.exec(`DELETE FROM weekly_status;`);
    db.exec(`DELETE FROM orders;`);
    db.exec(`DELETE FROM bp_data;`);
    log.info("Old data deleted from weekly_status, orders, and bp_data tables.");

    // 1) Build EST map from Restliste
    const estMap = await buildEstMap(wb);

    // 2) Process Sjekkliste sheets
    const sjekklisteResult = await importSjekkliste(wb);
    if (!sjekklisteResult.success) {
      log.error("Import failed during Sjekkliste processing.");
      overallSuccess = false;
      throw new Error("Sjekkliste processing failed"); // Abort transaction
    }
    const alleStatus = sjekklisteResult.data;

    // Insert Sjekkliste data
    if (alleStatus.length > 0) {
        const stIns = db.prepare(`
            INSERT INTO weekly_status (leverandor, dag, uke, status, email)
            VALUES (@leverandør, @dag, @uke, @status, @email)
            ON CONFLICT(leverandor, dag, uke) DO UPDATE SET status=excluded.status, email=excluded.email
        `);
        for (const r of alleStatus) {
            stIns.run(r);
        }
        statusCount = alleStatus.length;
        log.info(`Inserted/Updated ${statusCount} rows into weekly_status.`);
    }

    // 3) Process Hovedliste sheet
    const hovedlisteResult = await importHovedliste(wb, estMap);
    if (!hovedlisteResult.success) {
      log.error("Import failed during Hovedliste processing.");
      overallSuccess = false;
      throw new Error("Hovedliste processing failed"); // Abort transaction
    }
    const orderImportList = hovedlisteResult.data;

    // Insert/Update Orders data
    if (orderImportList.length > 0) {
        const orderIns = db.prepare(`
            INSERT INTO orders
            (reference, orderNumber, description, dueDate, supplier, estimatedReceiptDate, note, status)
            VALUES (@reference, @orderNumber, @description, @dueDate, @supplier, @estimatedReceiptDate, '', 'Pending')
            ON CONFLICT(reference) DO UPDATE SET
              orderNumber = excluded.orderNumber,
              description = excluded.description,
              dueDate = excluded.dueDate,
              supplier = excluded.supplier,
              estimatedReceiptDate = excluded.estimatedReceiptDate,
              import_timestamp = CURRENT_TIMESTAMP,
              last_updated = CURRENT_TIMESTAMP
              -- Keep existing note and status on update unless explicitly overwritten
        `);
        for (const p of orderImportList) {
          const estimatedReceiptDate = estMap.get(p.reference);
          orderIns.run({
            ...p,
            estimatedReceiptDate: estimatedReceiptDate ? formatISO(estimatedReceiptDate, { representation: 'date' }) : null
          });
        }
        orderCount = orderImportList.length;
        log.info(`Inserted/Updated ${orderCount} rows into orders.`);
    }

    // 4) Process BP sheet
    const bpResult = await importBpData(wb);
    if (!bpResult.success) {
      log.error("Import failed during BP data processing.");
      overallSuccess = false;
      throw new Error("BP data processing failed"); // Abort transaction
    }
    bpDataList = bpResult.data; // Assign to the outer scope variable

    // Insert/Update BP data
    if (bpDataList.length > 0) {
        const bpIns = db.prepare(`
            INSERT INTO bp_data (order_number, item_number, supplier_item_number, promised_delivery_date)
            VALUES (@order_number, @item_number, @supplier_item_number, @promised_delivery_date)
            ON CONFLICT(order_number, item_number) DO UPDATE SET
                supplier_item_number = excluded.supplier_item_number,
                promised_delivery_date = excluded.promised_delivery_date,
                import_timestamp = CURRENT_TIMESTAMP
        `);

        const bpTxn = db.transaction((rows: BpData[]) => {
            let count = 0;
            for (const record of rows) {
                bpIns.run(record);
                count++;
            }
            log.info(`Inserted/Updated ${count} rows into bp_data.`);
        });
        bpTxn(bpDataList);
    }

  }); // End of transaction

  try {
    await importTransaction(); // Execute the transaction using await since it's async
    if (overallSuccess) {
        log.info(`Import process finished successfully. Status: ${statusCount}, Orders: ${orderCount}, BP: ${bpDataList.length}`);
    } else {
        log.warn("Import process finished with errors.");
    }
    return overallSuccess;
  } catch (err: unknown) { // Type the error
      const message = err instanceof Error ? err.message : String(err);
      log.error(`Transaction failed: ${message}`);
      return false; // Transaction rolled back
  }
}
