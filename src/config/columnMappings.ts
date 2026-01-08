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
  companyCode: number; // Column A = 0 (foretaksnummer)
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
  besttyp: number; // Column F = 5 (NO) or E = 4 (DK) - order type (0=normal, 70=ICT Sweden Order)
}

/**
 * Convert 0-based index to 1-based index for ExcelJS
 */
export function getExcelJSIndex(zeroBasedIndex: number): number {
  return zeroBasedIndex + 1;
}

/**
 * Get column letter from 0-based index (e.g., 0 -> 'A', 25 -> 'Z', 26 -> 'AA')
 * Uses standard bijective base-26 pattern (A=1, Z=26, AA=27)
 */
export function getColumnLetter(zeroBasedIndex: number): string {
  let letter = '';
  let n = zeroBasedIndex + 1; // Convert to 1-based column number

  while (n > 0) {
    n--;
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26);
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
  companyCode: 0, // A - foretaksnummer (company code: 40=NO, 87=other)
  poNumber: 2, // C - bestnr (PO number)
  internalSupplier: 3, // D - ftgnr
  warehouse: 4, // E - lagstalle
  besttyp: 5, // F - besttyp (order type: 0=normal, 70=ICT Sweden Order)
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
  companyCode: 0, // A - foretaksnummer (company code: 80=DK, 87=other)
  poNumber: 1, // B - bestnr (PO number)
  internalSupplier: 2, // C - ftgnr (internal supplier number)
  warehouse: 3, // D - lagstalle (80 or 87 for DK)
  besttyp: 4, // E - besttyp (order type: 0=normal, 70=ICT Sweden Order) - shifted left by 1 compared to NO
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
  '87': 'DK', // Denmark secondary warehouse (included in import, filtered via UI toggle)
};

/**
 * Warehouses configuration
 * NOTE: Previously L87 was excluded from import, but now both L80 and L87 are imported.
 * Filtering is done in the UI via a warehouse toggle instead.
 * Keeping this config for reference but not actively used for exclusion.
 */
export const DK_WAREHOUSES = ['80', '87'] as const;
export type DKWarehouse = (typeof DK_WAREHOUSES)[number];

// Legacy: No longer excluding warehouses at import time
export const EXCLUDED_WAREHOUSES: Record<string, string[]> = {
  // DK: ['87'], // Commented out - now handled by UI toggle
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

  // Check all known warehouses (includes 80 and 87 for DK, 40 for NO)
  if (WAREHOUSE_COUNTRY_MAPPING[trimmedWarehouse]) {
    return WAREHOUSE_COUNTRY_MAPPING[trimmedWarehouse];
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

  // Check NO position FIRST - if it has "40", this is definitely a NO file
  // This prevents false DK detection when a NO file has supplier number "80" in column D
  const countryFromNOPosition = detectCountryFromWarehouse(warehouseAtNOPosition);
  if (countryFromNOPosition === 'NO') {
    return 'NO';
  }

  // Then check DK position
  const countryFromDKPosition = detectCountryFromWarehouse(warehouseAtDKPosition);
  if (countryFromDKPosition === 'DK') {
    return 'DK';
  }

  // Fallback to any valid country from NO position (SE, FI, etc.)
  if (countryFromNOPosition) {
    return countryFromNOPosition;
  }

  // Final fallback for DK-like warehouse patterns
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
