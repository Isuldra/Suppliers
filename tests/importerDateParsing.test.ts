// @vitest-environment node
// Run in a UTC+ timezone (Norway) so the Excel serial-date off-by-one bug would
// surface if present. Must be set before the module under test runs any Date math.
process.env.TZ = 'Europe/Oslo';

import { describe, it, expect, vi } from 'vitest';

// importer.ts statically imports native/heavy modules we do not exercise here.
// better-sqlite3 (native, Electron ABI) and exceljs are unused by safeParseDate.
// date-fns is a declared dependency but is not materialized in this environment;
// safeParseDate's numeric (Excel serial) branch - the BUG 1 regression under
// test - does not use it, and we provide a faithful `isValid` for the others.
vi.mock('better-sqlite3', () => ({ default: class {} }));
vi.mock('exceljs', () => ({ default: {}, Worksheet: class {} }));
vi.mock('date-fns', () => ({
  isValid: (d: unknown) => d instanceof Date && !Number.isNaN(d.getTime()),
  parse: () => new Date(NaN),
}));

import { safeParseDate } from '../src/main/importer';

describe('safeParseDate', () => {
  it('converts an Excel serial number to the correct YYYY-MM-DD in Europe/Oslo (UTC+)', () => {
    // Serial 45306 decodes to 2024-01-15. The old `.toISOString()` round-trip
    // produced 2024-01-14 in UTC+ timezones (regression guard for BUG 1).
    expect(safeParseDate(45306)).toBe('2024-01-15');
  });

  it('handles the Unix epoch serial (25569 -> 1970-01-01)', () => {
    expect(safeParseDate(25569)).toBe('1970-01-01');
  });

  it('parses a Date object (local midnight) without a timezone shift', () => {
    expect(safeParseDate(new Date(2024, 0, 15))).toBe('2024-01-15');
  });

  it('parses an ISO date string (fallback branch) without a timezone shift', () => {
    expect(safeParseDate('2024-01-15')).toBe('2024-01-15');
  });

  it('returns null for unparseable input', () => {
    expect(safeParseDate('not a date')).toBeNull();
    expect(safeParseDate(null)).toBeNull();
    expect(safeParseDate(undefined)).toBeNull();
  });
});
