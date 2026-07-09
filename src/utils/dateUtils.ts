/**
 * Date utility functions for the application
 */

/**
 * Get the start of the week containing the given date
 * Uses Monday as the first day of the week
 *
 * @param date Date to get the start of the week for
 * @returns Date object representing the start of the week
 */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();

  // Adjust to previous Monday
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // If Sunday (0), go back 6 days, if Monday (1), go back 0 days, etc.
  const diff = day === 0 ? 6 : day - 1;

  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

/**
 * Get the end of the week containing the given date
 * Uses Sunday as the last day of the week
 *
 * @param date Date to get the end of the week for
 * @returns Date object representing the end of the week
 */
export function endOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();

  // Adjust to next Sunday
  // If Sunday (0), add 0 days, if Monday (1), add 6 days, etc.
  const diff = day === 0 ? 0 : 7 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(23, 59, 59, 999);

  return result;
}

/**
 * Format a date as 'YYYY-MM-DD'
 *
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format a date as a localized string based on user's locale
 *
 * @param date Date to format
 * @param options Intl.DateTimeFormatOptions to customize the format
 * @returns Localized date string
 */
export function formatLocalDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

/**
 * Check if a date is in the past
 *
 * @param date Date to check
 * @returns True if the date is in the past
 */
export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date < today;
}

/**
 * Add days to a date
 *
 * @param date Date to add days to
 * @param days Number of days to add
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the ISO-8601 week number (1-53) of a date.
 * ISO 8601: weeks start on Monday and week 1 is the week containing the first
 * Thursday of the year (equivalently, the week containing January 4th).
 *
 * @param date The date to get the week number for
 * @returns Week number (1-53)
 */
export function getISOWeek(date: Date): number {
  // Work in UTC to avoid DST/timezone drift.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  // Shift to the Thursday of the current ISO week.
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the ISO-8601 week-year of a date. This is the calendar year that owns the
 * date's ISO week, i.e. the year of the Thursday of that week. It can differ
 * from the calendar year around January 1st (e.g. 2024-12-30 -> 2025,
 * 2021-01-01 -> 2020).
 *
 * @param date The date to get the ISO week-year for
 * @returns The ISO week-year
 */
export function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Get the Monday (local time) that starts a given ISO-8601 week.
 * Pure: does not mutate its inputs.
 *
 * @param week The ISO week number (1-53)
 * @param weekYear The ISO week-year
 * @returns Date for the Monday that starts that ISO week
 */
export function getISOWeekMonday(week: number, weekYear: number): Date {
  // ISO week 1 is the week containing January 4th; its Monday is the anchor.
  const jan4 = new Date(weekYear, 0, 4);
  const jan4DayNum = jan4.getDay() || 7; // Mon=1 .. Sun=7
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - (jan4DayNum - 1));
  const target = new Date(week1Monday);
  target.setDate(week1Monday.getDate() + (week - 1) * 7);
  return target;
}

/**
 * Check if a date is before another date (ignoring time)
 * @param date The date to check
 * @param compareDate The date to compare against
 * @returns True if date is before compareDate
 */
export function isDateBefore(date: Date, compareDate: Date): boolean {
  const d1 = new Date(date);
  const d2 = new Date(compareDate);

  // Reset time parts for date-only comparison
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);

  return d1 < d2;
}
