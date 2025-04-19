import ExcelJS from "exceljs";
import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { app } from "electron";
import log from "electron-log"; // Added for logging

type WeeklyStatus = {
  leverandør: string;
  dag: string; // Mandag, Tirsdag…
  uke: string; // Uke 15, Uke 16…
  status: string; // "Ingen Backorders" / "Purret" / "Avvent"
  email: string;
};

type PurchaseOrder = {
  nøkkel: string; // REF
  ordreNr: string; // Purchase order No.
  itemNo: string; // Item No.
  beskrivelse: string; // Item description
  dato: string; // ETA / dato varen skulle kommet
  ftgnavn: string; // Innkjøper (johax4…)
};

// Accept an open database connection as an argument
export async function importAlleArk(
  xlsxPath: string,
  db: Database.Database
): Promise<boolean> {
  // Return boolean for success/fail
  log.info(`Starting import from Excel file: ${xlsxPath}`);
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(xlsxPath);
    log.info(`Successfully read Excel file: ${xlsxPath}`);
  } catch (err) {
    log.error(`Failed to read Excel file ${xlsxPath}:`, err);
    return false; // Indicate failure
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

    // Skipping headers: vi antar at rad 1–3 er pynt, rad 4 har "Leverandør", "Mandag Uke 15", etc.
    // Let's find columns more dynamically based on expected headers
    const headerRow = sheet.getRow(4); // Assuming headers are on row 4
    let leverandorCol = -1;
    let emailCol = -1;
    const ukeCols: { index: number; uke: string; dag: string }[] = [];

    headerRow.eachCell((cell, colNumber) => {
      const cellValue = cell.text.trim().toLowerCase();
      if (cellValue === "leverandør") {
        leverandorCol = colNumber;
      } else if (cellValue === "mail") {
        emailCol = colNumber;
      } else if (cellValue.startsWith("uke")) {
        // Attempt to extract day from the cell above (row 3)
        const dayCell = sheet.getRow(3).getCell(colNumber);
        const dag = dayCell ? dayCell.text.trim() : "Ukjent Dag"; // Default if day isn't found
        ukeCols.push({ index: colNumber, uke: cell.text.trim(), dag: dag }); // Store original 'Uke XX' text
      }
    });

    if (leverandorCol === -1) {
      log.warn(
        `Could not find 'Leverandør' column in sheet: ${sheet.name}. Skipping sheet.`
      );
      continue;
    }
    if (emailCol === -1) {
      log.warn(
        `Could not find 'Mail' column in sheet: ${sheet.name}. Using empty email.`
      );
      // continue; // Or decide to proceed without email? Let's proceed for now.
    }

    log.info(
      `Sheet '${
        sheet.name
      }' - Leverandor Col: ${leverandorCol}, Email Col: ${emailCol}, Uke Cols: ${ukeCols
        .map((uc) => uc.index)
        .join(",")}`
    );

    // Les data fra rad 5 og nedover til en blank "Leverandør"
    for (let r = 5; r <= sheet.rowCount; r++) {
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
  const poListe: PurchaseOrder[] = [];
  if (hoved) {
    // Dynamic column finding for Hovedliste - Adjust column names as needed
    const hovedHeaderRow = hoved.getRow(4); // Assuming headers on row 4
    let nokkelCol = -1,
      ordreNrCol = -1,
      itemNoCol = -1,
      beskCol = -1,
      datoCol = -1,
      ftgnavnCol = -1;

    hovedHeaderRow.eachCell((cell, colNumber) => {
      const cellValue = cell.text.trim().toLowerCase();
      // Match expected headers (adjust strings if needed)
      if (cellValue.includes("nøkkel") || cellValue === "ref")
        nokkelCol = colNumber;
      else if (cellValue.includes("purchase order no")) ordreNrCol = colNumber;
      else if (cellValue.includes("item no")) itemNoCol = colNumber;
      else if (cellValue.includes("item description")) beskCol = colNumber;
      else if (cellValue.includes("dato varen skulle kommet inn"))
        datoCol = colNumber;
      else if (cellValue.includes("ftgnavn")) ftgnavnCol = colNumber;
    });

    log.info(
      `Hovedliste Columns - Nøkkel: ${nokkelCol}, OrdreNr: ${ordreNrCol}, ItemNo: ${itemNoCol}, Beskrivelse: ${beskCol}, Dato: ${datoCol}, Ftgnavn: ${ftgnavnCol}`
    );

    if (nokkelCol !== -1) {
      // Only process if key column found
      for (let r = 5; r <= hoved.rowCount; r++) {
        const row = hoved.getRow(r);
        const nøkkel = row.getCell(nokkelCol).text.trim();
        if (!nøkkel) {
          log.info(
            `Reached empty 'Nøkkel' cell at row ${r} in Hovedliste. Stopping read.`
          );
          break;
        }
        poListe.push({
          nøkkel,
          ordreNr: ordreNrCol !== -1 ? row.getCell(ordreNrCol).text.trim() : "",
          itemNo: itemNoCol !== -1 ? row.getCell(itemNoCol).text.trim() : "",
          beskrivelse: beskCol !== -1 ? row.getCell(beskCol).text.trim() : "",
          dato: datoCol !== -1 ? row.getCell(datoCol).text.trim() : "", // Consider date parsing if needed
          ftgnavn: ftgnavnCol !== -1 ? row.getCell(ftgnavnCol).text.trim() : "",
        });
      }
      log.info(`Extracted ${poListe.length} purchase orders from Hovedliste.`);
    } else {
      log.warn(
        "Could not find 'Nøkkel'/'Ref' column in Hovedliste. Skipping PO import."
      );
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

        CREATE TABLE IF NOT EXISTS purchase_order (
        nøkkel      TEXT PRIMARY KEY,
        ordreNr     TEXT,
        itemNo      TEXT,
        beskrivelse TEXT,
        dato        TEXT, -- Consider storing as ISO date string or timestamp
        ftgnavn     TEXT
        );
         CREATE INDEX IF NOT EXISTS idx_po_ordreNr ON purchase_order(ordreNr);
         CREATE INDEX IF NOT EXISTS idx_po_ftgnavn ON purchase_order(ftgnavn);

        -- Også tabell for BP hvis ønskelig…
        /*
        CREATE TABLE IF NOT EXISTS bp_data (
            -- Define columns for BP data
        );
        */
    `);
    log.info("Database tables ensured.");
  } catch (err) {
    log.error("Failed to create/verify database tables:", err);
    return false;
  }

  // --- Tøm gamle data og sett inn frisk import ---
  log.info("Deleting old data and inserting new data...");
  try {
    // It's safer to use DELETE than DROP TABLE IF EXISTS followed by CREATE
    db.exec(`DELETE FROM weekly_status; DELETE FROM purchase_order;`);
    log.info("Old data deleted.");

    const stIns = db.prepare(`
        INSERT INTO weekly_status (leverandor, dag, uke, status, email)
        VALUES (@leverandør, @dag, @uke, @status, @email)
    `);
    const poIns = db.prepare(`
        INSERT OR REPLACE INTO purchase_order
        (nøkkel, ordreNr, itemNo, beskrivelse, dato, ftgnavn)
        VALUES (@nøkkel, @ordreNr, @itemNo, @beskrivelse, @dato, @ftgnavn)
    `); // INSERT OR REPLACE handles primary key conflicts

    const stTxn = db.transaction((rows: WeeklyStatus[]) => {
      let count = 0;
      for (const r of rows) {
        stIns.run(r);
        count++;
      }
      log.info(`Inserted ${count} rows into weekly_status.`);
    });
    const poTxn = db.transaction((rows: PurchaseOrder[]) => {
      let count = 0;
      for (const p of rows) {
        poIns.run(p);
        count++;
      }
      log.info(`Inserted/Replaced ${count} rows into purchase_order.`);
    });

    stTxn(alleStatus);
    poTxn(poListe);
    // Add transaction for BP data if implemented

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
