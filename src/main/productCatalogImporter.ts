/**
 * Product Catalog Importer
 * Parses Produktkatalog.xlsx and uploads to Supabase
 */

import * as ExcelJS from 'exceljs';
import { ProductCatalogItem } from '../services/supabaseClient';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const log = require('electron-log/main');

export interface ImportResult {
  success: boolean;
  count: number;
  error?: string;
  duplicates?: number;
}

/**
 * Parse product catalog Excel file
 * Expects columns:
 * - A: Item No. (artikelnummer)
 * - C: Item description (varenavn)
 */
export async function parseProductCatalog(buffer: ArrayBuffer): Promise<ImportResult> {
  try {
    log.info('Parsing product catalog Excel file...');

    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(Buffer.from(new Uint8Array(buffer)) as any);

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { success: false, count: 0, error: 'No worksheet found in file' };
    }

    log.info(`Found worksheet: ${worksheet.name}`);

    const products: ProductCatalogItem[] = [];
    const seen = new Set<string>();
    let duplicates = 0;
    let rowsProcessed = 0;

    // Iterate through rows (skip header row 1)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      try {
        // Column A: Item No.
        const itemNoCell = row.getCell(1);
        const itemNo = itemNoCell.value ? String(itemNoCell.value).trim() : '';

        // Column C: Item description
        const itemNameCell = row.getCell(3);
        const itemName = itemNameCell.value ? String(itemNameCell.value).trim() : '';

        // Skip if missing critical data
        if (!itemNo || !itemName) {
          return;
        }

        // Check for duplicates
        if (seen.has(itemNo)) {
          duplicates++;
          log.warn(`Duplicate item number found: ${itemNo} at row ${rowNumber}`);
          return;
        }

        seen.add(itemNo);
        products.push({
          item_no: itemNo,
          item_name: itemName,
        });

        rowsProcessed++;
      } catch (error) {
        log.error(`Error processing row ${rowNumber}:`, error);
      }
    });

    log.info(
      `Parsed ${products.length} products (${duplicates} duplicates skipped, ${rowsProcessed} rows processed)`
    );

    return {
      success: true,
      count: products.length,
      duplicates,
    };
  } catch (error) {
    log.error('Error parsing product catalog:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse and return product data for upload
 */
export async function parseProductCatalogForUpload(buffer: ArrayBuffer): Promise<{
  success: boolean;
  products?: ProductCatalogItem[];
  error?: string;
}> {
  try {
    log.info('Parsing product catalog for upload...');

    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(Buffer.from(new Uint8Array(buffer)) as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { success: false, error: 'No worksheet found in file' };
    }

    const products: ProductCatalogItem[] = [];
    const seen = new Set<string>();

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const itemNoCell = row.getCell(1);
      const itemNo = itemNoCell.value ? String(itemNoCell.value).trim() : '';

      const itemNameCell = row.getCell(3);
      const itemName = itemNameCell.value ? String(itemNameCell.value).trim() : '';

      if (!itemNo || !itemName || seen.has(itemNo)) {
        return;
      }

      seen.add(itemNo);
      products.push({
        item_no: itemNo,
        item_name: itemName,
      });
    });

    log.info(`Parsed ${products.length} products for upload`);

    return {
      success: true,
      products,
    };
  } catch (error) {
    log.error('Error parsing product catalog for upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
