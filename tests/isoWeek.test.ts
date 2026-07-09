// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getISOWeek, getISOWeekYear, getISOWeekMonday } from '../src/utils/dateUtils';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('ISO-8601 week helpers', () => {
  describe('getISOWeek / getISOWeekYear', () => {
    it('2024-12-30 is ISO week 1 of week-year 2025', () => {
      const d = new Date(2024, 11, 30);
      expect(getISOWeek(d)).toBe(1);
      expect(getISOWeekYear(d)).toBe(2025);
    });

    it('2021-01-01 is ISO week 53 of week-year 2020', () => {
      const d = new Date(2021, 0, 1);
      expect(getISOWeek(d)).toBe(53);
      expect(getISOWeekYear(d)).toBe(2020);
    });

    it('2024-01-01 is ISO week 1 of week-year 2024', () => {
      const d = new Date(2024, 0, 1);
      expect(getISOWeek(d)).toBe(1);
      expect(getISOWeekYear(d)).toBe(2024);
    });

    it('2023-01-01 (Sunday) is ISO week 52 of week-year 2022', () => {
      const d = new Date(2023, 0, 1);
      expect(getISOWeek(d)).toBe(52);
      expect(getISOWeekYear(d)).toBe(2022);
    });
  });

  describe('getISOWeekMonday returns the Monday that starts the ISO week', () => {
    it('week 1 of 2025 starts Monday 2024-12-30', () => {
      expect(ymd(getISOWeekMonday(1, 2025))).toBe('2024-12-30');
    });

    it('week 53 of 2020 starts Monday 2020-12-28', () => {
      expect(ymd(getISOWeekMonday(53, 2020))).toBe('2020-12-28');
    });

    it('week 1 of 2024 starts Monday 2024-01-01', () => {
      expect(ymd(getISOWeekMonday(1, 2024))).toBe('2024-01-01');
    });

    it('week 1 of 2023 starts Monday 2023-01-02 (Jan 1 is a Sunday)', () => {
      // The previous naive implementation returned 2023-01-09 here.
      expect(ymd(getISOWeekMonday(1, 2023))).toBe('2023-01-02');
    });

    it('round-trips: the ISO week/week-year of the returned Monday match the input', () => {
      for (const [week, year] of [
        [1, 2025],
        [53, 2020],
        [10, 2023],
        [52, 2022],
      ] as const) {
        const monday = getISOWeekMonday(week, year);
        expect(monday.getDay()).toBe(1); // Monday
        expect(getISOWeek(monday)).toBe(week);
        expect(getISOWeekYear(monday)).toBe(year);
      }
    });
  });
});
