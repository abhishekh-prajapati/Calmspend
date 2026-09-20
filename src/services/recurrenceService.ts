import type {
  RecurringSchedule,
  ScheduledBill,
  OccurrenceRecord,
  ScheduledOccurrence,
  RecurrenceFrequency,
  OccurrenceStatus,
} from '../types/recurring';

/**
 * Returns total days in a given month (0-indexed monthIndex).
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Formats a Date object as YYYY-MM-DD string in local time.
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Clamps preferred day of month to the last valid day of a target month/year.
 * Prevents invalid dates while keeping original preferred day (e.g. 31st) intact for future months.
 */
export function clampDateToMonthEnd(year: number, monthIndex: number, preferredDay: number): string {
  const maxDays = getDaysInMonth(year, monthIndex);
  const clampedDay = Math.min(preferredDay, maxDays);
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(clampedDay).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Advances a date by frequency and interval.
 * Uses preferredDayOfMonth to avoid creeping date degradation in short months.
 */
export function advanceDateByRecurrence(
  currentDate: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  preferredDayOfMonth?: number | null,
): Date {
  const safeInterval = Math.max(1, interval);

  if (frequency === 'daily') {
    const next = new Date(currentDate.getTime());
    next.setDate(next.getDate() + safeInterval);
    return next;
  }

  if (frequency === 'weekly') {
    const next = new Date(currentDate.getTime());
    next.setDate(next.getDate() + safeInterval * 7);
    return next;
  }

  if (frequency === 'monthly') {
    const originalDay = preferredDayOfMonth ?? currentDate.getDate();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const targetTotalMonths = currentMonth + safeInterval;
    const targetYear = currentYear + Math.floor(targetTotalMonths / 12);
    const targetMonth = targetTotalMonths % 12;

    const maxDays = getDaysInMonth(targetYear, targetMonth);
    const targetDay = Math.min(originalDay, maxDays);

    return new Date(targetYear, targetMonth, targetDay);
  }

  if (frequency === 'yearly') {
    const originalDay = preferredDayOfMonth ?? currentDate.getDate();
    const originalMonth = currentDate.getMonth();
    const targetYear = currentDate.getFullYear() + safeInterval;

    const maxDays = getDaysInMonth(targetYear, originalMonth);
    const targetDay = Math.min(originalDay, maxDays);

    return new Date(targetYear, originalMonth, targetDay);
  }

  const next = new Date(currentDate.getTime());
  next.setDate(next.getDate() + 1);
  return next;
}

/**
 * Calculates day difference between two YYYY-MM-DD date strings.
 * Positive if target is in future, 0 if today, negative if target is in past.
 */
export function getDaysDifference(targetDateStr: string, currentDate: Date = new Date()): number {
  const [tY, tM, tD] = targetDateStr.split('-').map(Number);
  const targetMidnight = new Date(tY, tM - 1, tD).getTime();

  const todayMidnight = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  ).getTime();

  const diffMs = targetMidnight - todayMidnight;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Generates all scheduled occurrences dynamically within a target date window [windowStartStr, windowEndStr].
 * Enforces single source of truth:
 * - Recurring schedules generate occurrences matching their frequency.
 * - One-time bills are included when due within window.
 * - Persisted OccurrenceRecords assign 'paid' or 'skipped' status.
 */
export function generateScheduleOccurrences(
  schedules: RecurringSchedule[],
  bills: ScheduledBill[],
  records: OccurrenceRecord[],
  windowStartStr: string,
  windowEndStr: string,
  currentDate: Date = new Date(),
): ScheduledOccurrence[] {
  const occurrences: ScheduledOccurrence[] = [];
  const recordsByKey = new Map<string, OccurrenceRecord>();

  for (const r of records) {
    recordsByKey.set(r.occurrenceKey, r);
  }

  const todayStr = formatDateKey(currentDate);

  // 1. Process Recurring Schedules
  for (const schedule of schedules) {
    if (!schedule.startDate) continue;

    const [sY, sM, sD] = schedule.startDate.split('-').map(Number);
    let iterDate = new Date(sY, sM - 1, sD);

    const preferredDay = schedule.preferredDayOfMonth ?? sD;
    const endDateStr = schedule.endDate || null;

    // Fast-forward safety cap
    let safetyCounter = 0;
    const maxIterations = 500;

    while (safetyCounter++ < maxIterations) {
      const dateStr = formatDateKey(iterDate);

      // Stop if iteration exceeds schedule endDate or query windowEndStr
      if (endDateStr && dateStr > endDateStr) break;
      if (dateStr > windowEndStr) break;

      // Include if within the window
      if (dateStr >= windowStartStr) {
        const occurrenceKey = `${schedule.id}_${dateStr}`;
        const record = recordsByKey.get(occurrenceKey) || null;
        const daysUntilDue = getDaysDifference(dateStr, currentDate);

        let status: OccurrenceStatus = 'upcoming';
        let isOverdue = false;
        let isDueToday = false;

        if (record) {
          status = record.status;
        } else if (!schedule.isActive) {
          status = 'cancelled';
        } else if (dateStr < todayStr) {
          status = 'overdue';
          isOverdue = true;
        } else if (dateStr === todayStr) {
          status = 'due';
          isDueToday = true;
        } else {
          status = 'upcoming';
        }

        occurrences.push({
          occurrenceKey,
          scheduleId: schedule.id,
          billId: null,
          name: schedule.name,
          type: schedule.type,
          classification: schedule.classification,
          amountMinor: schedule.amountMinor,
          dueDate: dateStr,
          categoryId: schedule.categoryId || null,
          accountId: schedule.accountId || null,
          status,
          isOverdue,
          isDueToday,
          daysUntilDue,
          occurrenceRecord: record,
        });
      }

      // Advance to next occurrence
      iterDate = advanceDateByRecurrence(iterDate, schedule.frequency, schedule.interval, preferredDay);
    }
  }

  // 2. Process One-Time Scheduled Bills
  for (const bill of bills) {
    if (!bill.dueDate) continue;
    if (bill.dueDate >= windowStartStr && bill.dueDate <= windowEndStr) {
      const occurrenceKey = `bill_${bill.id}`;
      const record = recordsByKey.get(occurrenceKey) || null;
      const daysUntilDue = getDaysDifference(bill.dueDate, currentDate);

      let status: OccurrenceStatus = bill.status || 'upcoming';
      let isOverdue = false;
      let isDueToday = false;

      if (record) {
        status = record.status;
      } else if (bill.status === 'cancelled') {
        status = 'cancelled';
      } else if (bill.dueDate < todayStr) {
        status = 'overdue';
        isOverdue = true;
      } else if (bill.dueDate === todayStr) {
        status = 'due';
        isDueToday = true;
      } else {
        status = 'upcoming';
      }

      occurrences.push({
        occurrenceKey,
        scheduleId: null,
        billId: bill.id,
        name: bill.name,
        type: 'expense', // One-time bills are expense obligations
        classification: bill.classification,
        amountMinor: bill.amountMinor,
        dueDate: bill.dueDate,
        categoryId: bill.categoryId || null,
        accountId: bill.accountId || null,
        status,
        isOverdue,
        isDueToday,
        daysUntilDue,
        occurrenceRecord: record,
      });
    }
  }

  // Sort chronologically by dueDate ascending
  occurrences.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return occurrences;
}
