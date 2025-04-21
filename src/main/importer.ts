import ExcelJS from "exceljs";
import Database from "better-sqlite3";
// import { join } from "path"; // Unused
// import { existsSync, mkdirSync } from "fs"; // Unused
// import { app } from "electron"; // Unused
import log from "electron-log"; // Added for logging
import { formatISO, parse as parseDateFns } from "date-fns"; // Import date-fns functions
import type { Worksheet } from "exceljs"; // Import Worksheet type
import * as XLSX from "xlsx"; // Import xlsx library for SSF

type WeeklyStatus = {
  leverandør: string;
  dag: string; // Mandag, Tirsdag…
  uke: string; // Uke 15, Uke 16…
  status: string; // "Ingen Backorders" / "Purret" / "Avvent"
  email: string;
};

// Define structure for data going into the 'orders' table
type OrderImportData = {
  reference: string; // Mapped from 'nøkkel'
  orderNumber: string; // Mapped from 'ordreNr'
  // itemNo is not directly in orders table, maybe part of description?
  description: string; // Mapped from 'beskrivelse'
  dueDate: string | null; // Keep as ISO string YYYY-MM-DD for DB
  supplier: string; // Mapped from 'ftgnavn'
  // Other 'orders' columns like 'orderDate', 'category', 'value', 'currency', 'confirmed' are not directly available from Hovedliste here
};

// Helper function to find the header row index
function findHeaderRow(
  ws: Worksheet,
  mustInclude: string[],
  maxScanRows = 50 // Increased scan range slightly
): number {
  for (let r = 1; r <= Math.min(maxScanRows, ws.rowCount); r++) {
    const row = ws.getRow(r);
    // const textRow_old = (row.values as ExcelJS.CellValue[]) // Old method using row.values
    //   .map((v) => (v == null ? "" : v.toString().toLowerCase().trim()))
    //   .filter((v) => v !== "");

    // New method using cell.text for better reliability
    const textRow: string[] = [];
    // Use .text to get the displayed string, handling richText/formulas
    row.eachCell((cell) => {
      const txt = cell.text ? cell.text.toString().trim().toLowerCase() : "";
      if (txt) textRow.push(txt);
    });

    // Check if all keywords are present in this row's non-empty cells
    if (
      textRow.length > 0 &&
      mustInclude.every((kw) =>
        textRow.some((c) => c.includes(kw.toLowerCase()))
      )
    ) {
      log.info(
        `Found header row ${r} in sheet '${
          ws.name
        }' containing keywords: ${mustInclude.join(", ")}`
      );
      return r;
    }
  }
  // Throw error if header not found
  const errMsg = `Couldn't find header row in sheet '${
    ws.name
  }' containing all keywords: ${mustInclude.join(
    ", "
  )} within the first ${maxScanRows} rows.`;
  log.error(errMsg);
  throw new Error(errMsg);
}

// Accept an open database connection as an argument
export async function importAlleArk(
  source: string | ArrayBuffer,
  db: Database.Database
): Promise<boolean> {
  // Return boolean for success/fail
  log.info(
    `Starting import from ${
      typeof source === "string" ? "Excel file: " + source : "Excel buffer"
    }`
  );
  const wb = new ExcelJS.Workbook();
  try {
    if (typeof source === "string") {
      await wb.xlsx.readFile(source); // Read from path
      log.info(`Successfully read Excel file: ${source}`);
    } else {
      await wb.xlsx.load(source); // Load from buffer
      log.info(
        `Successfully loaded Excel from buffer (${source.byteLength} bytes).`
      );
    }
  } catch (err) {
    log.error(`Failed to read/load Excel data:`, err);
    return false; // Indicate failure
  }

  // ─── Build a lookup from Restliste til Leverandør ─────────────────────────────
  const restSheet = wb.getWorksheet("Restliste til Leverandør");
  const estMap = new Map<string, Date>();
  if (restSheet) {
    try {
      const restHeaderIdx = findHeaderRow(restSheet, [
        "ref",
        "est receipt date",
      ]);
      const restHeaderRow = restSheet.getRow(restHeaderIdx);
      let keyCol = -1,
        estCol = -1;
      restHeaderRow.eachCell((c, idx) => {
        const t = c.text.trim().toLowerCase();
        if (t.includes("ref")) keyCol = idx;
        if (t.includes("est receipt date")) estCol = idx;
      });

      if (keyCol === -1 || estCol === -1) {
        log.error(
          "Could not find 'ref' or 'est receipt date' columns in Restliste header row."
        );
        log.warn(
          "Required columns missing in Restliste header. Date map will be empty."
        );
      } else {
        log.info(
          `Reading Restliste data starting from row ${restHeaderIdx + 1}`
        );
        for (let r = restHeaderIdx + 1; r <= restSheet.rowCount; r++) {
          const row = restSheet.getRow(r);
          const keyCell = row.getCell(keyCol);
          const dateCell = row.getCell(estCol);

          const key = keyCell ? keyCell.text.trim() : null;
          const rawDate = dateCell ? dateCell.value : null;

          if (!key || !rawDate) {
            continue;
          }

          let parsedDate: Date | null = null;
          if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
            parsedDate = rawDate;
          } else if (typeof rawDate === "string" && rawDate.trim()) {
            const dateStr = rawDate.trim();
            try {
              parsedDate = parseDateFns(dateStr, "M/d/yyyy", new Date());
              if (isNaN(parsedDate.getTime())) parsedDate = new Date(dateStr);
            } catch (_e) {
              /* ignore */
            }
          } else if (typeof rawDate === "number") {
            try {
              // Use XLSX.SSF for numeric dates
              const d = XLSX.SSF.parse_date_code(rawDate);
              if (d && d.y != null) {
                // Month is 1-based in parse_date_code, 0-based in Date constructor
                parsedDate = new Date(d.y, d.m - 1, d.d);
              }
            } catch (_e) {
              /* ignore */
            }
          }

          if (key && parsedDate && !isNaN(parsedDate.getTime())) {
            parsedDate.setUTCHours(0, 0, 0, 0); // Normalize
            estMap.set(key, parsedDate);
          }
        }
        log.info(`Built estMap with ${estMap.size} entries from Restliste.`);
      }
    } catch (error) {
      log.error(`Error processing 'Restliste til Leverandør' sheet:`, error);
    }
  } else {
    log.warn(
      "'Restliste til Leverandør' sheet not found. Cannot get estimated receipt dates."
    );
  }

  // 1) Hent alle "Sjekkliste Leverandører *"‑arkene
  const statusArk = wb.worksheets.filter((ws) =>
    ws.name.toLowerCase().startsWith("sjekkliste leverandører")
  );
  log.info(`Found ${statusArk.length} 'Sjekkliste Leverandører' sheets.`);

  const alleStatus: WeeklyStatus[] = [];
  for (const sheet of statusArk) {
    log.info(`Processing sheet: ${sheet.name}`);
    // Ekstraher navnet på kjøper (f.eks. "Tony" eller "Joa") - Assuming last word is buyer
    // const deler = sheet.name.split(" ");
    // const buyer = deler[deler.length - 1]; // Buyer info not used in DB schema

    // Dynamically find the header row instead of assuming row 4
    let sjekkHeaderIdx = -1;
    try {
      sjekkHeaderIdx = findHeaderRow(sheet, ["leverandør", "uke", "mail"], 10); // Scan first 10 rows
    } catch (_e) {
      log.warn(
        `Could not find required header row in sheet ${sheet.name}. Skipping sheet.`
      );
      continue;
    }

    const headerRow = sheet.getRow(sjekkHeaderIdx); // Use dynamically found header row
    let leverandorCol = -1;
    let emailCol = -1;
    const ukeCols: { index: number; uke: string; dag: string }[] = [];

    headerRow.eachCell((cell, colNumber) => {
      const cellValue = cell.text.trim().toLowerCase();
      if (cellValue.startsWith("leverand")) {
        // Keep loose match
        leverandorCol = colNumber;
      } else if (cellValue === "mail") {
        emailCol = colNumber;
      } else if (cellValue.startsWith("uke")) {
        // Attempt to extract day from the cell above the dynamically found header
        const dayCell = sheet.getRow(sjekkHeaderIdx - 1).getCell(colNumber);
        const dag = dayCell ? dayCell.text.trim() : "Ukjent Dag"; // Default if day isn't found
        ukeCols.push({ index: colNumber, uke: cell.text.trim(), dag: dag }); // Store original 'Uke XX' text
      }
    });

    if (leverandorCol === -1) {
      // This check might be redundant if findHeaderRow succeeded, but keep for safety
      log.warn(
        `Could not find 'Leverandør' column in dynamically found header row ${sjekkHeaderIdx} for sheet: ${sheet.name}. Skipping sheet.`
      );
      continue;
    }
    if (emailCol === -1) {
      log.warn(
        `Could not find 'Mail' column in sheet: ${sheet.name} (header row ${sjekkHeaderIdx}). Using empty email.`
      );
    }

    log.info(
      `Sheet '${
        sheet.name
      }' - Found Header Row: ${sjekkHeaderIdx}, Leverandor Col: ${leverandorCol}, Email Col: ${emailCol}, Uke Cols: ${ukeCols
        .map((uc) => uc.index)
        .join(",")}`
    );

    // Les data starting from the row AFTER the dynamically found header
    for (let r = sjekkHeaderIdx + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const lever = row.getCell(leverandorCol).text.trim();
      if (!lever) {
        log.info(
          `Reached empty 'Leverandør' cell at row ${r} in sheet ${sheet.name}. Stopping read for this sheet.`
        );
        break; // Stop if leverandør is empty
      }

      const email = emailCol !== -1 ? row.getCell(emailCol).text.trim() : "";

      for (const ukeCol of ukeCols) {
        const status = row.getCell(ukeCol.index).text.trim();
        if (status) {
          // Only add if there is a status
          alleStatus.push({
            leverandør: lever,
            dag: ukeCol.dag,
            uke: ukeCol.uke,
            status,
            email,
          });
        }
      }
    }
    log.info(`Extracted ${alleStatus.length} status entries so far.`);
  }
  log.info(
    `Finished processing status sheets. Total entries: ${alleStatus.length}`
  );

  // 2) Hovedliste
  log.info("Processing 'Hovedliste' sheet...");
  const hoved = wb.getWorksheet("Hovedliste");
  const orderImportList: OrderImportData[] = [];
  if (hoved) {
    try {
      // Find header row dynamically using corrected keywords
      // Debug: dump first 10 rows to the log using cell.text
      for (let r = 1; r <= Math.min(10, hoved.rowCount); r++) {
        const row = hoved.getRow(r);
        // const vals_old = (row.values as ExcelJS.CellValue[]) // Old debug log
        //  .map(v => (v == null ? '' : v.toString().trim()));
        // log.debug(`Hovedliste row ${r} values: ${JSON.stringify(vals_old)}`);

        // New debug log using cell.text
        const vals: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          // includeEmpty might be useful
          vals.push(cell.text ? cell.text.trim() : "");
        });
        log.debug(`Hovedliste row ${r} texts: ${JSON.stringify(vals)}`);
      }

      const hovedHeaderIdx = findHeaderRow(hoved, [
        "nøkkel",
        "pono.", // Corrected keyword (added dot)
        "dato varen skulle kommet inn",
        "leverandør",
      ]);
      const hovedHeaderRow = hoved.getRow(hovedHeaderIdx);

      // Reset column indices before searching the correct row
      let nokkelCol = -1,
        ordreNrCol = -1,
        itemNoCol = -1,
        beskCol = -1,
        datoCol = -1,
        ftgnavnCol = -1;
      hovedHeaderRow.eachCell((cell, colNumber) => {
        const cellValue = cell.text.trim().toLowerCase();
        if (cellValue.includes("nøkkel") || cellValue === "ref")
          nokkelCol = colNumber;
        else if (cellValue.includes("pono")) ordreNrCol = colNumber; // Use pono
        else if (cellValue.includes("item no")) itemNoCol = colNumber;
        else if (cellValue.includes("item description")) beskCol = colNumber;
        else if (cellValue.includes("dato varen skulle kommet inn"))
          datoCol = colNumber;
        else if (cellValue.includes("leverandør")) ftgnavnCol = colNumber; // Map to leverandør
      });

      log.info(
        `Hovedliste Columns - Nøkkel: ${nokkelCol}, OrdreNr: ${ordreNrCol}, ItemNo: ${itemNoCol}, Beskrivelse: ${beskCol}, Dato: ${datoCol}, Ftgnavn(Supplier?): ${ftgnavnCol}` // Updated log
      );

      const startDataRow = hovedHeaderIdx + 1;
      const dateFormat = "M/d/yyyy"; // Correct format

      if (nokkelCol > 0 && ordreNrCol > 0 && ftgnavnCol > 0) {
        // Check indices > 0
        for (let r = startDataRow; r <= hoved.rowCount; r++) {
          const row = hoved.getRow(r);
          const nøkkel =
            nokkelCol > 0 ? row.getCell(nokkelCol).text.trim() : null;
          const ordreNr =
            ordreNrCol > 0 ? row.getCell(ordreNrCol).text.trim() : null;
          const supplier =
            ftgnavnCol > 0 ? row.getCell(ftgnavnCol).text.trim() : null;

          if (!nøkkel || !supplier || !ordreNr) {
            log.warn(
              `Skipping Hovedliste row ${r} due to missing nøkkel ('${nøkkel}'), supplier ('${supplier}'), or order number ('${ordreNr}').`
            );
            continue;
          }

          // --- Date Parsing Logic --- (Consolidated and Corrected)
          let finalDate: Date | null = null;
          const dateFromMap = nøkkel ? estMap.get(nøkkel) : undefined;

          if (dateFromMap) {
            finalDate = dateFromMap; // Already a normalized Date object
          } else if (datoCol > 0) {
            // Try parsing fallback date from Hovedliste
            const fallbackDateCell = row.getCell(datoCol);
            const fallbackRawDate = fallbackDateCell
              ? fallbackDateCell.value
              : null;

            let parsedFallback: Date | null = null;
            if (
              fallbackRawDate instanceof Date &&
              !isNaN(fallbackRawDate.getTime())
            ) {
              parsedFallback = fallbackRawDate;
            } else if (
              typeof fallbackRawDate === "string" &&
              fallbackRawDate.trim()
            ) {
              try {
                parsedFallback = parseDateFns(
                  fallbackRawDate.trim(),
                  dateFormat,
                  new Date()
                );
                if (isNaN(parsedFallback.getTime()))
                  parsedFallback = new Date(fallbackRawDate.trim());
              } catch (_e) {
                /* ignore */
              }
            } else if (typeof fallbackRawDate === "number") {
              try {
                // Use XLSX.SSF for numeric dates - This seems wrong, parse_date_code doesn't return Date
                const d = XLSX.SSF.parse_date_code(fallbackRawDate);
                if (d && d.y != null) {
                  parsedFallback = new Date(d.y, d.m - 1, d.d);
                }
                // parsedFallback = XLSX.SSF.parse_date_code(fallbackRawDate); // Old line, likely incorrect
              } catch (_e) {
                /* ignore */
              }
            }

            if (parsedFallback && !isNaN(parsedFallback.getTime())) {
              parsedFallback.setUTCHours(0, 0, 0, 0); // Normalize
              finalDate = parsedFallback;
            }
          }
          // --- End Date Parsing Logic ---

          // Find other column values using correct indices
          const beskText = beskCol > 0 ? row.getCell(beskCol).text.trim() : "";
          // const itemNoText = // Unused variable
          //  itemNoCol > 0 ? row.getCell(itemNoCol).text.trim() : "";

          // Ensure no stray isoDueDate variable is used
          orderImportList.push({
            reference: nøkkel, // Already checked non-null
            orderNumber: ordreNr, // Already checked non-null
            description: beskText,
            // Format the final Date object (or null) to ISO string for DB
            dueDate: finalDate
              ? formatISO(finalDate, { representation: "date" })
              : null,
            supplier: supplier, // Already checked non-null
          });
        }
        log.info(`Extracted ${orderImportList.length} orders from Hovedliste.`);
        console.table(orderImportList.slice(0, 10)); // Keep console.table
        log.info(
          "Logged first 10 extracted orders (check console).dueDate should have ISO date strings or NULL."
        );
      } else {
        log.warn(
          "Could not find required columns ('Nøkkel', 'PONo.', 'Leverandør') in Hovedliste. Skipping order import."
        );
      }
    } catch (error) {
      log.error(`Error processing 'Hovedliste' sheet:`, error);
      return false; // Stop import if Hovedliste processing fails
    }
  } else {
    log.warn("'Hovedliste' sheet not found. Skipping PO import.");
  }

  // 3) BP‑arket (ODBC‑dump) - Placeholder
  log.info("Processing 'BP' sheet (placeholder)...");
  const bp = wb.getWorksheet("BP");
  if (bp) {
    // Add logic to parse BP sheet similar to Hovedliste if needed
    log.info("'BP' sheet found, but parsing logic is not implemented yet.");
  } else {
    log.warn("'BP' sheet not found.");
  }

  // --- Lag tabeller om de ikke finnes (using the passed-in db) ---
  log.info("Ensuring database tables exist...");
  try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS weekly_status (
        leverandor TEXT,
        dag         TEXT,
        uke         TEXT,
        status      TEXT,
        email       TEXT,
        UNIQUE(leverandor, dag, uke) ON CONFLICT REPLACE -- Added uniqueness constraint
        );
        CREATE INDEX IF NOT EXISTS idx_weekly_status_leverandor ON weekly_status(leverandor);
        CREATE INDEX IF NOT EXISTS idx_weekly_status_uke ON weekly_status(uke);

        -- Remove purchase_order table creation
        -- CREATE TABLE IF NOT EXISTS purchase_order ( ... );
        -- CREATE INDEX IF NOT EXISTS idx_po_ordreNr ON purchase_order(ordreNr);
        -- CREATE INDEX IF NOT EXISTS idx_po_ftgnavn ON purchase_order(ftgnavn);

        -- Ensure 'orders' table exists (assuming schema from databaseService.ts)
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reference TEXT,
          supplier TEXT NOT NULL,
          orderNumber TEXT,
          orderDate TEXT,       -- Store as ISO string 'YYYY-MM-DD' or keep TEXT if already?
          dueDate TEXT,         -- Store as ISO string 'YYYY-MM-DD'
          category TEXT,
          description TEXT,
          value REAL,
          currency TEXT,
          confirmed INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          email_sent_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_supplier ON orders(supplier);
        CREATE INDEX IF NOT EXISTS idx_dueDate ON orders(dueDate);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_ordernum ON orders(supplier, orderNumber); -- Ensures uniqueness

        -- Add audit log table if not already present
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id INTEGER,
          old_value TEXT,
          new_value TEXT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT
        );
    `);
    log.info("Database tables ensured.");
  } catch (err) {
    log.error("Failed to create/verify database tables:", err);
    return false;
  }

  // --- Tøm gamle data og sett inn frisk import ---
  log.info("Deleting old data and inserting new data...");
  try {
    // Delete from weekly_status, but DO NOT delete from 'orders' by default.
    // We will use INSERT OR UPDATE logic for orders.
    db.exec(`DELETE FROM weekly_status;`);
    log.info("Old weekly_status data deleted.");

    const stIns = db.prepare(`
        INSERT INTO weekly_status (leverandor, dag, uke, status, email)
        VALUES (@leverandør, @dag, @uke, @status, @email)
    `);
    // Prepare statement for orders table using INSERT...ON CONFLICT
    const orderIns = db.prepare(`
        INSERT INTO orders (reference, supplier, orderNumber, description, dueDate)
        VALUES (@reference, @supplier, @orderNumber, @description, @dueDate)
        ON CONFLICT(supplier, orderNumber) DO UPDATE SET
          reference = excluded.reference,
          description = excluded.description,
          dueDate = excluded.dueDate,
          updatedAt = CURRENT_TIMESTAMP -- Update timestamp on conflict
    `);

    // Transaction for weekly_status
    const stTxn = db.transaction((rows: WeeklyStatus[]) => {
      let count = 0;
      for (const r of rows) {
        stIns.run(r);
        count++;
      }
      log.info(`Inserted ${count} rows into weekly_status.`);
    });

    // Transaction for orders
    const orderTxn = db.transaction((rows: OrderImportData[]) => {
      let count = 0;
      for (const order of rows) {
        try {
          // Basic validation before insertion
          if (!order.supplier || !order.orderNumber) {
            log.warn(
              `Skipping order insert due to missing supplier or orderNumber:`,
              order
            );
            continue;
          }
          orderIns.run(order); // Execute INSERT/UPDATE
          count++;
        } catch (runError) {
          log.error(
            `Failed to insert/update order: ${order.supplier} / ${order.orderNumber}`,
            runError,
            order
          );
        }
      }
      log.info(`Inserted/Updated ${count} rows into orders.`);
    });

    // Execute transactions
    stTxn(alleStatus);
    orderTxn(orderImportList);

    log.info("Data insertion complete.");
  } catch (err) {
    log.error("Failed during data deletion or insertion:", err);
    return false;
  }

  log.info(
    "Import process finished successfully (using provided DB connection)."
  );
  return true; // Indicate success
}
