export type ScheduleType = 'expense' | 'income';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Controlled single source of truth for schedule classification.
 * Prevents contradictory states (e.g. isSubscription=true and classification='rent').
 */
export type ScheduleClassification =
  | 'subscription'
  | 'bill'
  | 'rent'
  | 'loan_emi'
  | 'insurance'
  | 'salary'
  | 'investment'
  | 'other';

export type OccurrenceStatus =
  | 'upcoming'   // Due in the future (dueDate > today, unrecorded)
  | 'due'        // Due today (dueDate === today, unrecorded)
  | 'overdue'    // Due date passed (dueDate < today, unrecorded)
  | 'paid'       // Explicitly recorded as paid (OccurrenceRecord exists with status='paid')
  | 'skipped'    // Explicitly skipped for this cycle (OccurrenceRecord exists with status='skipped')
  | 'cancelled'; // Schedule or bill itself was cancelled

/**
 * RECURRING SCHEDULE MODEL
 * Represents recurring obligations and recurring income streams.
 */
export interface RecurringSchedule {
  id: string;
  type: ScheduleType;
  name: string;
  amountMinor: number; // Integer minor units (paise)
  categoryId?: string | null;
  accountId?: string | null; // Optional default account (must be resolved to active account on payment)
  classification: ScheduleClassification;
  frequency: RecurrenceFrequency;
  interval: number; // e.g. 1 (every month), 2 (every 2 weeks), 3 (quarterly)
  preferredDayOfMonth?: number | null; // 1-31: original anchor day (e.g. 31st) preserved across short months
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  description?: string;
  tags?: string[];
  isActive: boolean; // false when cancelled/paused
  createdAt: string;
  updatedAt: string;
}

/**
 * ONE-TIME SCHEDULED BILL MODEL
 * Represents standalone ONE-TIME upcoming obligations ONLY.
 * Recurring schedules must NEVER be stored as ScheduledBill entities.
 */
export interface ScheduledBill {
  id: string;
  name: string;
  amountMinor: number; // Integer minor units (paise)
  dueDate: string; // YYYY-MM-DD
  categoryId?: string | null;
  accountId?: string | null; // Optional default account
  classification: ScheduleClassification;
  status: OccurrenceStatus; // upcoming | due | overdue | paid | skipped | cancelled
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * PERSISTED OCCURRENCE RECORD
 * Persisted ONLY when an occurrence is explicitly Paid or Skipped.
 * Enforces uniqueness on occurrenceKey.
 */
export interface OccurrenceRecord {
  id: string;
  occurrenceKey: string; // Deterministic: `${scheduleId}_${occurrenceDate}` or `bill_${billId}`
  scheduleId?: string | null;
  billId?: string | null;
  dueDate: string; // YYYY-MM-DD
  status: 'paid' | 'skipped';
  transactionId?: string | null; // Link to authoritative Transaction when paid
  actualAmountMinor?: number; // Actual amount recorded in paise
  actualDate?: string; // YYYY-MM-DD of transaction execution
  createdAt: string;
  updatedAt: string;
}

/**
 * DYNAMIC DERIVED OCCURRENCE (In-Memory for UI)
 * Computed deterministically for the display window.
 */
export interface ScheduledOccurrence {
  occurrenceKey: string;
  scheduleId?: string | null;
  billId?: string | null;
  name: string;
  type: ScheduleType;
  classification: ScheduleClassification;
  amountMinor: number; // Scheduled expected amount in paise
  dueDate: string; // YYYY-MM-DD
  categoryId?: string | null;
  accountId?: string | null; // Default suggested account
  status: OccurrenceStatus;
  isOverdue: boolean;
  isDueToday: boolean;
  daysUntilDue: number; // Negative if overdue, 0 if due today
  occurrenceRecord?: OccurrenceRecord | null;
}
