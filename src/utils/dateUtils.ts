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
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

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
    year: "numeric",
    month: "short",
    day: "numeric",
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
 * Get the ISO week number of a date
 * @param date The date to get the week number for
 * @returns Week number (1-53)
 */
export function getWeekNumber(date: Date): number {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstWeek = new Date(target.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((target.getTime() - firstWeek.getTime()) / 86400000 -
        3 +
        ((firstWeek.getDay() + 6) % 7)) /
        7
    )
  );
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

/**
 * Parse a date string with flexible format detection
 * @param dateStr Date string to parse
 * @returns Date object or null if parsing fails
 */
export function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try parsing ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try DD.MM.YYYY format (Norwegian)
  const norwegianFormat = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
  const norwegianMatch = dateStr.match(norwegianFormat);
  if (norwegianMatch) {
    const [_, day, month, year] = norwegianMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  // Try MM/DD/YYYY format (US)
  const usFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const usMatch = dateStr.match(usFormat);
  if (usMatch) {
    const [_, month, day, year] = usMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return null;
}
