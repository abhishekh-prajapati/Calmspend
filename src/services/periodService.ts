import type { PeriodInfo } from '../types/finance';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Returns the period information for a given date (defaults to current date).
 */
export function getPeriodInfo(date: Date = new Date()): PeriodInfo {
  const monthIndex = date.getMonth();
  const year = date.getFullYear();
  const monthName = MONTH_NAMES[monthIndex];
  const monthNum = String(monthIndex + 1).padStart(2, '0');
  const periodKey = `${year}-${monthNum}`;

  return {
    monthIndex,
    year,
    monthName,
    formattedPeriod: `${monthName} ${year}`,
    periodKey,
  };
}

/**
 * Creates PeriodInfo from a year and monthIndex (0-11).
 */
export function getPeriodFromYearMonth(year: number, monthIndex: number): PeriodInfo {
  // Use day 1 to avoid date overflow issues
  const date = new Date(year, monthIndex, 1);
  return getPeriodInfo(date);
}

/**
 * Parses a YYYY-MM periodKey into PeriodInfo.
 */
export function getPeriodFromKey(periodKey: string): PeriodInfo {
  const [yearStr, monthStr] = periodKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  return getPeriodFromYearMonth(year, monthIndex);
}

/**
 * Helper to get adjacent period with monthly offset (-1 for prev, +1 for next).
 */
export function getAdjacentPeriod(period: PeriodInfo, offsetMonths: number): PeriodInfo {
  const targetDate = new Date(period.year, period.monthIndex + offsetMonths, 1);
  return getPeriodInfo(targetDate);
}

/**
 * Helper to check if a period is the current active month.
 */
export function isCurrentPeriod(period: PeriodInfo, currentDate: Date = new Date()): boolean {
  const current = getPeriodInfo(currentDate);
  return period.periodKey === current.periodKey;
}

/**
 * Computes exact number of days in a given month (supports dynamic leap years).
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  // Passing day 0 of monthIndex + 1 gives the last day of monthIndex
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Computes remaining days in the active month including today (minimum 1).
 */
export function getRemainingDaysInMonth(currentDate: Date = new Date()): number {
  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();
  const totalDays = getDaysInMonth(year, monthIndex);
  const currentDay = currentDate.getDate();
  const remaining = totalDays - currentDay + 1;
  return Math.max(1, remaining);
}

/**
 * Helper to check if a transaction date string (YYYY-MM-DD) falls within a given period.
 */
export function isDateInPeriod(dateStr: string, period: PeriodInfo): boolean {
  return dateStr.startsWith(period.periodKey);
}

/**
 * Computes remaining calendar contribution months between current date and target date.
 * Both the current calendar month and the target month count as contribution periods.
 * Example: September 2026 to March 2027: (2027 - 2026)*12 + (2 - 8) + 1 = 6 + (-6) + 1... = 12 - 6 + 1 = 7 months.
 * September 2026 to February 2027: (2027-2026)*12 + (1 - 8) + 1 = 12 - 7 + 1 = 6 months.
 */
export function getRemainingContributionMonths(
  targetDateStr: string,
  currentDate: Date = new Date(),
): { remainingMonths: number; isPast: boolean } {
  // Parse target date YYYY-MM-DD
  const [tYearStr, tMonthStr, tDayStr] = targetDateStr.split('-');
  const targetYear = parseInt(tYearStr, 10);
  const targetMonthIndex = parseInt(tMonthStr, 10) - 1;
  const targetDay = parseInt(tDayStr, 10) || 1;

  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  // Create date objects for comparison
  const targetDate = new Date(targetYear, targetMonthIndex, targetDay);
  const today = new Date(currentYear, currentMonthIndex, currentDay);

  const isPast = targetDate.getTime() < today.getTime();

  const diffMonths = (targetYear - currentYear) * 12 + (targetMonthIndex - currentMonthIndex) + 1;
  const remainingMonths = Math.max(1, diffMonths);

  return {
    remainingMonths,
    isPast,
  };
}


