/**
 * Column mapping configuration for Excel import
 * This allows different column structures for different markets/countries
 * without hardcoding indices throughout the codebase.
 *
 * Note: ExcelJS uses 1-based indices, XLSX (SheetJS) uses 0-based indices.
 * This configuration stores 0-based indices for consistency.
 * Use getExcelJSIndex() to convert to 1-based for ExcelJS usage.
 */

export interface ColumnMapping {
  // Unique identifier for this mapping
  id: string;

  // Human-readable name
  name: string;

  // Sheet configuration
  sheetName: string;
  startRow: number; // 1-based row number where data starts

  // Column indices (0-based, as used by XLSX/SheetJS)
  poNumber: number; // Column C = 2
  internalSupplier: number; // Column D = 3
  warehouse: number; // Column E = 4
  oneMedArticle: number; // Column H = 7
  supplierArticle: number; // Column I = 8
  etaDate1: number; // Column J = 9
  etaDate2: number; // Column K = 10
  erpComment: number | null; // Column L = 11 (null if not used)
  orderedQty: number; // Column M = 12
  deliveredQty: number; // Column N = 13
  outstandingQty: number; // Column O = 14
  supplierName: number; // Column P = 15
  orderRowNumber: number; // Column Q = 16
}

/**
 * Convert 0-based index to 1-based index for ExcelJS
 */
export function getExcelJSIndex(zeroBasedIndex: number): number {
  return zeroBasedIndex + 1;
}

/**
 * Get column letter from 0-based index (e.g., 0 -> 'A', 2 -> 'C')
 */
export function getColumnLetter(zeroBasedIndex: number): string {
  let letter = '';
  let index = zeroBasedIndex;

  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }

  return letter;
}

/**
 * Norway (NO) BP sheet column mapping
 * Standard format used by Norway - has company code in A (40=NO)
 */
const STANDARD_BP_MAPPING: ColumnMapping = {
  id: 'standard',
  name: 'Norway BP Format',
  sheetName: 'BP',
  startRow: 6,

  // Column indices (0-based) for Norwegian file structure
  poNumber: 2, // C - bestnr (PO number)
  internalSupplier: 3, // D - ftgnr
  warehouse: 4, // E - lagstalle
  oneMedArticle: 7, // H - artnr
  supplierArticle: 8, // I - artnrlev
  etaDate1: 9, // J - bestberlevdat
  etaDate2: 10, // K - bestlovlevdat
  erpComment: 11, // L - orpradtext
  orderedQty: 12, // M - bestant
  deliveredQty: 13, // N - bestlevant
  outstandingQty: 14, // O - bestrestant
  supplierName: 15, // P - ftgnamn
  orderRowNumber: 16, // Q - bestradnr
};

/**
 * Denmark (DK) BP sheet column mapping
 * DK file structure is shifted LEFT by 1 column compared to NO
 * Company code in A (80=DK), PO in B, etc.
 */
const DK_BP_MAPPING: ColumnMapping = {
  id: 'DK',
  name: 'Denmark BP Format',
  sheetName: 'BP',
  startRow: 6, // Header row is 5, data starts at row 6

  // Column indices (0-based) based on actual DK file structure
  poNumber: 1, // B - bestnr (PO number)
  internalSupplier: 2, // C - ftgnr (internal supplier number)
  warehouse: 3, // D - lagstalle (80 or 87 for DK)
  oneMedArticle: 6, // G - artnr (OneMed article number)
  supplierArticle: 7, // H - artnrlev (supplier article number)
  etaDate1: 8, // I - bestberlevdat (order date)
  etaDate2: 9, // J - bestlovlevdat (expected delivery date)
  erpComment: 10, // K - orpradtext (purchaser comment)
  orderedQty: 11, // L - bestant (ordered quantity)
  deliveredQty: 12, // M - bestlevant (delivered quantity)
  outstandingQty: 13, // N - bestrestant (outstanding quantity)
  supplierName: 14, // O - ftgnamn (supplier name)
  orderRowNumber: 15, // P - bestradnr (order row number)
};

/**
 * Column mappings indexed by country code
 * NO uses standard layout, DK has columns shifted left by 1 from column L.
 */
export const COLUMN_MAPPINGS: Record<string, ColumnMapping> = {
  NO: {
    ...STANDARD_BP_MAPPING,
    id: 'NO',
    name: 'Norway BP Format',
  },
  DK: DK_BP_MAPPING,
  SE: {
    ...STANDARD_BP_MAPPING,
    id: 'SE',
    name: 'Sweden BP Format',
  },
  FI: {
    ...STANDARD_BP_MAPPING,
    id: 'FI',
    name: 'Finland BP Format',
  },
};

/**
 * Default mapping to use when country cannot be detected
 */
export const DEFAULT_MAPPING = COLUMN_MAPPINGS.NO;

/**
 * Warehouse codes used to detect country from data
 * More robust than filename detection since it's based on actual data
 */
export const WAREHOUSE_COUNTRY_MAPPING: Record<string, string> = {
  '40': 'NO', // Norway main warehouse
  '80': 'DK', // Denmark main warehouse
  // Note: Warehouse 87 is DK but should be filtered out (separate reminder routine)
};

/**
 * Warehouses that should be excluded from import
 * These have separate reminder routines and should not appear in Pulse
 */
export const EXCLUDED_WAREHOUSES: Record<string, string[]> = {
  DK: ['87'], // DK warehouse 87 has a separate reminder routine
};

/**
 * Detect country code from warehouse value
 * More robust than filename detection - uses actual data from the Excel file
 * @param warehouse - The warehouse code from the Excel data
 * @returns Country code (NO, DK, SE, FI) or null if not detected
 */
export function detectCountryFromWarehouse(warehouse: string | undefined): string | null {
  if (!warehouse) return null;

  const trimmedWarehouse = warehouse.trim();

  // Check main warehouses
  if (WAREHOUSE_COUNTRY_MAPPING[trimmedWarehouse]) {
    return WAREHOUSE_COUNTRY_MAPPING[trimmedWarehouse];
  }

  // Warehouse 87 is also DK (but will be filtered out during import)
  if (trimmedWarehouse === '87') {
    return 'DK';
  }

  return null;
}

/**
 * Check if a warehouse should be excluded from import
 * @param country - The detected country code
 * @param warehouse - The warehouse code
 * @returns true if the warehouse should be skipped
 */
export function shouldExcludeWarehouse(country: string, warehouse: string): boolean {
  const excludedWarehouses = EXCLUDED_WAREHOUSES[country];
  if (!excludedWarehouses) return false;

  return excludedWarehouses.includes(warehouse.trim());
}

/**
 * Detect country code from filename
 * Uses word boundary matching to avoid false positives from common English substrings
 * E.g., "purchase" should NOT match "se", "file" should NOT match "fi"
 *
 * @param fileName - The name of the file being imported
 * @returns Country code (NO, DK, SE, FI) or null if not detected
 */
export function detectCountryFromFilename(fileName: string | undefined): string | null {
  if (!fileName) return null;

  const lowerName = fileName.toLowerCase();

  // Use word boundary patterns: code must be preceded/followed by:
  // - underscore, dash, space, dot, or start/end of string
  // This prevents matching "purchase" for "se" or "file" for "fi"

  // Check for full country names first (these are unambiguous)
  if (lowerName.includes('danmark') || lowerName.includes('denmark')) {
    return 'DK';
  }
  if (lowerName.includes('sverige') || lowerName.includes('sweden')) {
    return 'SE';
  }
  if (lowerName.includes('finland') || lowerName.includes('suomi')) {
    return 'FI';
  }
  if (lowerName.includes('norge') || lowerName.includes('norway')) {
    return 'NO';
  }

  // For 2-letter codes, require word boundaries to avoid false positives
  // Pattern: (start or separator) + code + (separator or end)
  const boundaryPattern = (code: string) =>
    new RegExp(`(^|[_\\-\\s\\.])${code}([_\\-\\s\\.]|$)`, 'i');

  if (boundaryPattern('dk').test(lowerName)) {
    return 'DK';
  }
  if (boundaryPattern('se').test(lowerName)) {
    return 'SE';
  }
  if (boundaryPattern('fi').test(lowerName)) {
    return 'FI';
  }
  if (boundaryPattern('no').test(lowerName)) {
    return 'NO';
  }

  return null;
}

/**
 * Get column mapping for a file
 * @param fileName - The name of the file being imported
 * @returns The appropriate column mapping
 */
export function getColumnMapping(fileName?: string): ColumnMapping {
  const country = detectCountryFromFilename(fileName);

  if (country && COLUMN_MAPPINGS[country]) {
    return COLUMN_MAPPINGS[country];
  }

  return DEFAULT_MAPPING;
}

/**
 * Pre-scan first data row to detect country before main import loop.
 * This prevents the first-row corruption bug where fields are read with wrong mapping
 * before country detection kicks in.
 *
 * @param getCellValue - Function to get cell value at a given 1-based column index
 * @returns Detected country code or null
 */
export function preScanForCountry(
  getCellValue: (columnIndex: number) => string | undefined
): string | null {
  // Try to read warehouse from both possible column positions
  // NO uses column E (index 4, 1-based: 5)
  // DK uses column D (index 3, 1-based: 4)

  const warehouseAtNOPosition = getCellValue(getExcelJSIndex(STANDARD_BP_MAPPING.warehouse)); // Column 5 (E)
  const warehouseAtDKPosition = getCellValue(getExcelJSIndex(DK_BP_MAPPING.warehouse)); // Column 4 (D)

  // Check if value at DK position is a valid DK warehouse code
  const countryFromDKPosition = detectCountryFromWarehouse(warehouseAtDKPosition);
  if (countryFromDKPosition === 'DK') {
    return 'DK';
  }

  // Check if value at NO position is a valid warehouse code
  const countryFromNOPosition = detectCountryFromWarehouse(warehouseAtNOPosition);
  if (countryFromNOPosition) {
    return countryFromNOPosition;
  }

  // If warehouse at DK position looks like a number that could be a warehouse code
  // (80, 87, etc.), assume DK even if not explicitly mapped
  if (warehouseAtDKPosition && /^8[0-9]$/.test(warehouseAtDKPosition.trim())) {
    return 'DK';
  }

  return null;
}

/**
 * Log column mapping info for debugging
 */
export function logColumnMapping(mapping: ColumnMapping): Record<string, string> {
  return {
    id: mapping.id,
    name: mapping.name,
    sheetName: mapping.sheetName,
    startRow: String(mapping.startRow),
    columns: [
      `PO: ${getColumnLetter(mapping.poNumber)} (${mapping.poNumber})`,
      `Supplier: ${getColumnLetter(mapping.supplierName)} (${mapping.supplierName})`,
      `Ordered: ${getColumnLetter(mapping.orderedQty)} (${mapping.orderedQty})`,
      `Delivered: ${getColumnLetter(mapping.deliveredQty)} (${mapping.deliveredQty})`,
      `Outstanding: ${getColumnLetter(mapping.outstandingQty)} (${mapping.outstandingQty})`,
    ].join(', '),
  };
}
