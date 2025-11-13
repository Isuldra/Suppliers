import ExcelJS, { Worksheet } from 'exceljs';
import Database from 'better-sqlite3';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const log = require('electron-log'); // Added for logging
import { parse as parseDateFns, isValid } from 'date-fns'; // Import date-fns functions
import * as XLSX from 'xlsx';
import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { app, Notification } from 'electron';

// Supported date formats for parsing
const DATE_FORMATS = ['M/d/yyyy', 'd/M/yyyy', 'dd.MM.yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy'];

/**
 * Safely parse various Excel date inputs into ISO YYYY-MM-DD strings
 */
function safeParseDate(value: unknown): string | null {
  if (value instanceof Date && isValid(value)) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'string' && value.trim()) {
    for (const fmt of DATE_FORMATS) {
      const parsed = parseDateFns(value.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed.toISOString().split('T')[0];
    }
    const fallback = new Date(value);
    if (isValid(fallback)) return fallback.toISOString().split('T')[0];
  }
  if (typeof value === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed && parsed.y) {
        return new Date(parsed.y, parsed.m - 1, parsed.d).toISOString().split('T')[0];
      }
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

/**
 * Safely retrieve the string value of a cell.
 */
function getCellStringValue(cell: ExcelJS.Cell | undefined | null): string {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }
  // For dates, cell.text should provide the formatted string.
  // If cell.value is a Date object, cell.text is preferred.
  if (cell.value instanceof Date) {
    return String(cell.text || '').trim();
  }
  // For rich text or other specific object types, cell.text is generally the best source for a string.
  // If cell.value is an object but not a Date, rely on cell.text.
  if (typeof cell.value === 'object') {
    return String(cell.text || '').trim();
  }
  // For primitive types (string, number, boolean), convert cell.value to string.
  return String(cell.value).trim();
}

/**
 * Get a worksheet by exact name match
 */
function getSafeWorksheet(wb: ExcelJS.Workbook, name: string): Worksheet {
  const ws = wb.getWorksheet(name);
  if (!ws) {
    throw new Error(`Worksheet '${name}' not found`);
  }
  return ws;
}

/**
 * Clean up any old temporary files from previous operations
 */
function cleanupOldTempFiles(): void {
  try {
    const tempDir = app.getPath('temp');
    const files = readdirSync(tempDir);

    // Clean up old OneMed temp files
    const oneMedTempFiles = files.filter(
      (file) =>
        file.startsWith('onemed-') &&
        (file.includes('outlook-') || file.includes('subject-') || file.includes('reminder-'))
    );

    let cleanedCount = 0;
    for (const file of oneMedTempFiles) {
      try {
        const filePath = join(tempDir, file);
        const stats = statSync(filePath);
        // Delete files older than 1 hour
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (stats.mtime.getTime() < oneHourAgo) {
          unlinkSync(filePath);
          cleanedCount++;
        }
      } catch {
        // Ignore individual file errors (file might be in use)
      }
    }

    if (cleanedCount > 0) {
      log.info(`Cleaned up ${cleanedCount} old temporary files from previous operations`);
    }
  } catch (error) {
    log.warn('Failed to cleanup old temp files:', error);
  }
}

export async function importAlleArk(
  source: string | ArrayBuffer,
  db: Database.Database
): Promise<boolean> {
  // Clean up old temp files before starting new import
  cleanupOldTempFiles();

  // Let DatabaseService own the schema; importer just writes into existing tables
  log.info(`Starting Excel import...`);

  const wb = new ExcelJS.Workbook();

  try {
    if (typeof source === 'string') await wb.xlsx.readFile(source);
    else await wb.xlsx.load(source);
  } catch (err) {
    log.error('Excel read/load failed', err);
    return false;
  }

  const purchaseInsert = db.prepare(
    `INSERT OR REPLACE INTO purchase_order (
      nøkkel, ordreNr, itemNo, beskrivelse, dato, ftgnavn,
      status, producer_item, specification, note, inventory_balance, order_qty, received_qty, purchaser,
      incoming_date, eta_supplier, supplier_name, warehouse, outstanding_qty, order_row_number
    ) VALUES (
      @nøkkel, @ordreNr, @itemNo, @beskrivelse, @dato, @ftgnavn,
      @status, @producer_item, @specification, @note, @inventory_balance, @order_qty, @received_qty, @purchaser,
      @incoming_date, @eta_supplier, @supplier_name, @warehouse, @outstanding_qty, @order_row_number
    )`
  );

  // Add supplier email insert statement
  const supplierEmailInsert = db.prepare(
    `INSERT OR REPLACE INTO supplier_emails (
      supplier_name, email_address, updated_at
    ) VALUES (
      @supplier_name, @email_address, @updated_at
    )`
  );

  // Declare counters outside transaction scope for later use
  let processedCount = 0;
  let duplicateCount = 0;

  const tx = db.transaction(() => {
    // Clear existing purchase order data before importing new data
    // This ensures that removed/changed POs from the Excel file don't persist in the database
    log.info('Clearing existing purchase order data before import...');
    const deleteResult = db.prepare('DELETE FROM purchase_order').run();
    log.info(`Cleared ${deleteResult.changes} existing purchase order records`);

    // BP sheet import (new structure) - data starts from row 6
    const bpSheet = getSafeWorksheet(wb, 'BP');
    const startRow = 6; // Data starts from row 6 (1-based)
    const seenKeys = new Set<string>(); // Track keys we've seen to count duplicates

    log.info(`Processing BP sheet starting from row ${startRow}`);

    for (let r = startRow; r <= bpSheet.rowCount; r++) {
      const row = bpSheet.getRow(r);

      // Column mapping based on user specification:
      // A (1) = ignore, B (2) = ignore
      const poNumber = getCellStringValue(row.getCell(3)); // Column C = PO
      const internalSupplierNumber = getCellStringValue(row.getCell(4)); // Column D = Internal supplier number
      const warehouse = getCellStringValue(row.getCell(5)); // Column E = Warehouse
      // F (6) = ignore, G (7) = ignore
      const oneMedArticleNo = getCellStringValue(row.getCell(8)); // Column H = OneMed article number
      const supplierArticleNo = getCellStringValue(row.getCell(9)); // Column I = Supplier article number
      const etaDate1 = row.getCell(10).value; // Column J = Expected ETA 1
      const etaDate2 = row.getCell(11).value; // Column K = Expected ETA 2

      // Column L = orpradtext (ERP comment) - DEBUG LOGGING
      const columnLCell = row.getCell(12);
      const erpComment = getCellStringValue(columnLCell);

      // Log column L data for first 10 rows to debug orpradtext import
      if (processedCount < 10) {
        log.info(`🔍 Row ${r} Column L Debug:`, {
          rawValue: columnLCell.value,
          cellText: columnLCell.text,
          valueType: typeof columnLCell.value,
          isObject: typeof columnLCell.value === 'object',
          extractedValue: erpComment,
          hasData: erpComment.length > 0,
        });
      }

      const orderedQty = parseFloat(getCellStringValue(row.getCell(13))) || 0; // Column M = Ordered quantity
      const deliveredQty = parseFloat(getCellStringValue(row.getCell(14))) || 0; // Column N = Delivered quantity
      const outstandingQty = parseFloat(getCellStringValue(row.getCell(15))) || 0; // Column O = Outstanding quantity
      const supplierName = getCellStringValue(row.getCell(16)).trim(); // Column P = Supplier name (trimmed)
      const orderRowNumber = getCellStringValue(row.getCell(17)); // Column Q = Order Row Number (bestradnr)

      // Skip rows with no meaningful data
      if (!poNumber || !supplierName || poNumber.trim() === '' || supplierName.trim() === '') {
        continue;
      }

      // Parse ETA dates (prefer J over K, both should be past dates)
      let etaSupplier = '';

      // Try to parse ETA date from column J first
      if (etaDate1) {
        const parsedDate1 = safeParseDate(etaDate1);
        if (parsedDate1) {
          etaSupplier = parsedDate1;
        }
      }

      // If no valid date from J, try column K
      if (!etaSupplier && etaDate2) {
        const parsedDate2 = safeParseDate(etaDate2);
        if (parsedDate2) {
          etaSupplier = parsedDate2;
        }
      }

      // Log first item for debugging
      if (processedCount === 0) {
        log.info(
          `FIRST BP item: Supplier='${supplierName}', PO='${poNumber}', Item='${oneMedArticleNo}', Outstanding=${outstandingQty}`
        );
      }

      const uniqueKey = `${poNumber}-${oneMedArticleNo}`;

      // Check for duplicates and log them
      if (seenKeys.has(uniqueKey)) {
        duplicateCount++;
        log.warn(
          `⚠️ Duplicate key detected: '${uniqueKey}' (row ${r}) - will replace previous entry`
        );
      } else {
        seenKeys.add(uniqueKey);
      }

      // Log potential duplicates for debugging
      if (processedCount < 10) {
        log.info(
          `Processing row ${r}: Key='${uniqueKey}', Supplier='${supplierName}', Outstanding=${outstandingQty}`
        );
      }

      // Insert into database using the exact column names from schema
      purchaseInsert.run({
        nøkkel: uniqueKey,
        ordreNr: poNumber,
        itemNo: oneMedArticleNo,
        beskrivelse: supplierArticleNo, // Using supplier article number as description
        dato: etaSupplier || null,
        ftgnavn: supplierName, // Primary supplier name field
        status: 'Active',
        producer_item: supplierArticleNo,
        specification: erpComment, // Column L (orpradtext/ERP Comment) stored in specification field for email templates
        note: erpComment,
        inventory_balance: 0,
        order_qty: orderedQty,
        received_qty: deliveredQty,
        purchaser: internalSupplierNumber,
        incoming_date: etaSupplier || null,
        eta_supplier: etaSupplier || null,
        supplier_name: supplierName, // Also store in new supplier_name field for queries
        warehouse: warehouse,
        outstanding_qty: outstandingQty,
        order_row_number: orderRowNumber,
      });

      // Log what was written to specification field for first 10 rows
      if (processedCount < 10) {
        log.info(
          `💾 Row ${r} Specification field written to DB: "${erpComment}" (length: ${erpComment.length})`
        );
      }

      processedCount++;

      // Log sample data for debugging (first 3 items)
      if (process.env.NODE_ENV === 'development' && processedCount <= 3) {
        log.info(`Inserted purchase_order row #${processedCount}:`, {
          supplier_name: supplierName,
          po_number: poNumber,
          item_no: oneMedArticleNo,
          order_qty: orderedQty,
          outstanding_qty: outstandingQty,
          eta_supplier: etaSupplier,
        });
      }
    }

    log.info(`Processed ${processedCount} rows from BP sheet`);
    if (duplicateCount > 0) {
      log.warn(`Found and replaced ${duplicateCount} duplicate entries during import`);
    }
  });

  try {
    tx();
    log.info('Excel import successful.');
    log.info(
      `Import summary: ${processedCount} total records processed${
        duplicateCount > 0 ? `, ${duplicateCount} duplicates replaced` : ''
      }`
    );

    // Import supplier emails from "Sjekkliste Leverandører" sheet if it exists
    try {
      const sjekkliste = wb.getWorksheet('Sjekkliste Leverandører');
      if (sjekkliste) {
        log.info('Processing Sjekkliste Leverandører sheet for email addresses');
        log.info(`Sheet has ${sjekkliste.rowCount} rows and ${sjekkliste.columnCount} columns`);

        const emailTx = db.transaction(() => {
          let emailCount = 0;

          // Log first few rows to understand structure
          for (let r = 1; r <= Math.min(10, sjekkliste.rowCount); r++) {
            const row = sjekkliste.getRow(r);
            const rowData: string[] = [];
            for (let c = 1; c <= Math.min(15, sjekkliste.columnCount); c++) {
              const cell = row.getCell(c);
              rowData.push(`[${c}]="${getCellStringValue(cell)}"`);
            }
            log.info(`Row ${r}: ${rowData.join(', ')}`);
          }

          // Based on logs: Row 5: [Abena Norge AS, Purret, Avvent, Avvent, Purret, , , , , ordre@abena.no]
          // Supplier is in column A (index 1), Email is in column J (index 10)
          for (let r = 5; r <= sjekkliste.rowCount; r++) {
            // Start from row 5 based on logs
            const row = sjekkliste.getRow(r);

            const supplierName = getCellStringValue(row.getCell(1)).trim(); // Column A

            // Search for email in multiple columns (J is column 10, but let's check nearby columns too)
            let emailAddress = '';
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            // Check columns 8-15 for email addresses
            for (let col = 8; col <= 15; col++) {
              const cellValue = getCellStringValue(row.getCell(col)).trim();
              if (emailPattern.test(cellValue)) {
                emailAddress = cellValue;
                if (r <= 10) {
                  log.info(`Found email in column ${col}: ${emailAddress}`);
                }
                break;
              }
            }

            // Log each row we're processing
            if (r <= 10) {
              // Log first few rows for debugging
              log.info(`Processing row ${r}: Supplier="${supplierName}", Email="${emailAddress}"`);
            }

            if (supplierName && emailAddress) {
              try {
                supplierEmailInsert.run({
                  supplier_name: supplierName,
                  email_address: emailAddress,
                  updated_at: new Date().toISOString(),
                });
                emailCount++;

                log.info(`✅ Imported email: ${supplierName} -> ${emailAddress}`);
              } catch (insertError) {
                log.error(`❌ Error inserting email for ${supplierName}:`, insertError);
              }
            } else {
              if (r <= 10) {
                // Log why we're skipping first few rows
                log.info(
                  `⏭️ Skipping row ${r}: Supplier="${supplierName}" (valid: ${!!supplierName}), Email="${emailAddress}" (valid: ${!!emailAddress})`
                );
              }
            }
          }

          log.info(`Imported ${emailCount} supplier email addresses`);
        });

        emailTx();
      } else {
        log.info('Sjekkliste Leverandører sheet not found');
      }
    } catch (emailError) {
      log.error('Error processing supplier emails:', emailError);
    }

    // Import supplier planning from "Leverandør" sheet (ark 6) if it exists
    try {
      const leverandorSheet = wb.getWorksheet('Leverandør');
      if (leverandorSheet) {
        log.info('Processing Leverandør sheet for supplier planning');
        log.info(
          `Sheet has ${leverandorSheet.rowCount} rows and ${leverandorSheet.columnCount} columns`
        );

        const planningTx = db.transaction(() => {
          let planningCount = 0;

          // Log first few rows to understand structure
          for (let r = 1; r <= Math.min(10, leverandorSheet.rowCount); r++) {
            const row = leverandorSheet.getRow(r);
            const rowData: string[] = [];
            for (let c = 1; c <= Math.min(10, leverandorSheet.columnCount); c++) {
              const cell = row.getCell(c);
              rowData.push(`[${c}]="${getCellStringValue(cell)}"`);
            }
            log.info(`Leverandør Row ${r}: ${rowData.join(', ')}`);
          }

          // Clear existing supplier planning data
          const clearStmt = db.prepare('DELETE FROM supplier_planning');
          const clearResult = clearStmt.run();
          log.info(`Cleared ${clearResult.changes} existing supplier planning records`);

          // Insert statement for supplier planning
          const planningInsert = db.prepare(`
            INSERT OR REPLACE INTO supplier_planning 
            (supplier_name, weekday, planner_name, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `);

          // Process rows starting from row 2 (row 1 is headers)
          // Structure: Column A = Supplier name, Column B = Company ID, Column C = Language, Column D = Weekday, Column F = Email
          for (let r = 2; r <= leverandorSheet.rowCount; r++) {
            const row = leverandorSheet.getRow(r);

            const supplierName = getCellStringValue(row.getCell(1)).trim(); // Column A
            const language = getCellStringValue(row.getCell(3)).trim(); // Column C
            const weekday = getCellStringValue(row.getCell(4)).trim(); // Column D
            const email = getCellStringValue(row.getCell(6)).trim(); // Column F

            // Skip rows with no meaningful data
            if (!supplierName || !weekday || supplierName === '' || weekday === '') {
              continue;
            }

            // Normalize weekday names to match the expected format
            const normalizedWeekday = weekday
              .toLowerCase()
              .replace(/[^a-zæøå]/g, '')
              .replace(/mandag|monday/, 'Mandag')
              .replace(/tirsdag|tuesday/, 'Tirsdag')
              .replace(/onsdag|wednesday/, 'Onsdag')
              .replace(/torsdag|thursday/, 'Torsdag')
              .replace(/fredag|friday/, 'Fredag');

            // Only process if we have a valid weekday
            if (['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'].includes(normalizedWeekday)) {
              try {
                // Insert supplier planning
                planningInsert.run(supplierName, normalizedWeekday, 'Innkjøper');
                planningCount++;

                // Also insert/update supplier email if available
                if (email && email.includes('@')) {
                  try {
                    supplierEmailInsert.run({
                      supplier_name: supplierName,
                      email_address: email,
                      updated_at: new Date().toISOString(),
                    });
                  } catch (emailError) {
                    log.warn(`Failed to insert email for ${supplierName}:`, emailError);
                  }
                }

                if (planningCount <= 10) {
                  log.info(
                    `✅ Imported planning: ${supplierName} -> ${normalizedWeekday} (${language}, ${email})`
                  );
                }
              } catch (insertError) {
                log.error(`❌ Error inserting planning for ${supplierName}:`, insertError);
              }
            } else {
              if (r <= 10) {
                log.info(
                  `⏭️ Skipping row ${r}: Invalid weekday "${weekday}" for supplier "${supplierName}"`
                );
              }
            }
          }

          log.info(`Imported ${planningCount} supplier planning records`);
        });

        planningTx();
      } else {
        log.info('Leverandør sheet not found - using existing supplyPlanners.json data');
      }
    } catch (planningError) {
      log.error('Error processing supplier planning:', planningError);
    }

    // Ensure indexes for faster queries
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier);
        CREATE INDEX IF NOT EXISTS idx_orders_dueDate ON orders(dueDate);
        CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier ON purchase_order(ftgnavn);
        CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier_name ON purchase_order(supplier_name);
        CREATE INDEX IF NOT EXISTS idx_purchase_order_po ON purchase_order(ordreNr);
      `);
      log.info('Database indexes ensured.');
    } catch (err) {
      log.error('Failed to create indexes:', err);
    }

    // Backup database after import (keep last 5)
    try {
      const backupDir = join(app.getPath('userData'), 'backups');
      if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
      const backupFile = join(
        backupDir,
        `supplier-reminder-backup-${new Date().toISOString().replace(/[.:]/g, '-')}.db`
      );
      // better-sqlite3 backup API
      db.backup(backupFile);
      log.info(`Database backed up to: ${backupFile}`);

      // Show notification
      if (Notification.isSupported()) {
        new Notification({
          title: 'Database Backup',
          body: 'Backup completed successfully ✅',
        }).show();
      }

      // Clean old backups (keep 5 newest)
      const files = readdirSync(backupDir)
        .filter((f) => f.endsWith('.db'))
        .map((f) => ({
          file: f,
          time: statSync(join(backupDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);
      for (const old of files.slice(5)) {
        const p = join(backupDir, old.file);
        unlinkSync(p);
        log.info(`Deleted old backup: ${old.file}`);
      }
    } catch (err) {
      log.error('Failed to backup database:', err);
    }

    return true;
  } catch (err) {
    log.error('Transaction failed:', err);
    return false;
  }
}
