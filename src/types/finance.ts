export * from './budget';
export * from './goal';
export * from './recurring';
export * from './netWorth';

export interface FinancialSystemState {
  isEmpty: boolean;
  hasAccounts: boolean;
  hasTransactions: boolean;
  hasBudgets: boolean;
  hasGoals: boolean;
  hasRecurringSchedules: boolean;
  hasScheduledBills: boolean;
  hasUpcomingPayments: boolean;
}

/**
 * Dashboard Financial Summary
 * Authoritative shape representing high-level financial metrics.
 */
export interface DashboardSummary {
  currentBalanceMinor: number;          // Integer minor units (paise)
  monthlyIncomeMinor: number;           // Integer minor units (paise)
  monthlyExpensesMinor: number;         // Integer minor units (paise)
  monthlySavingsMinor: number | null;   // Net savings (Actual Income - Actual Expenses)
  availableToSpendMinor: number | null; // null = Planning Required / Budget Not Set (Current month only)
  dailyAllowanceMinor: number | null;   // Effective daily allowance (custom if set, otherwise auto)
  customDailyAllowanceMinor?: number | null; // User's custom daily limit if set
  autoDailyAllowanceMinor?: number | null;   // Auto-calculated rate
  isSystemEmpty: boolean;
}

export interface PeriodInfo {
  monthName: string;
  year: number;
  monthIndex: number; // 0-11
  formattedPeriod: string; // e.g. "September 2026"
  periodKey: string;       // e.g. "2026-09"
}

export interface BudgetItemOverview {
  id: string;
  categoryName: string;
  allocatedAmount: number;
  spentAmount: number;
}

export interface GoalItemOverview {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface TransactionItemOverview {
  id: string;
  type: 'expense' | 'income' | 'transfer' | 'saving' | 'goal';
  amount: number;
  category: string;
  date: string;
  description: string;
}

export interface UpcomingPaymentOverview {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  type: 'bill' | 'subscription' | 'recurring';
}

