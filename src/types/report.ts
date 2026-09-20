import type { PeriodInfo } from './finance';

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  actualAmountMinor: number;
  sharePercentage: number | null; // null if total is 0
  transactionCount: number;
}

export interface NeedWantBreakdown {
  needsMinor: number;
  wantsMinor: number;
  unclassifiedMinor: number;
  totalExpensesMinor: number;
  needsPercentage: number | null; // null if totalExpenses === 0
  wantsPercentage: number | null;
  unclassifiedPercentage: number | null;
}

export interface BudgetVsActualCategoryItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  plannedAmountMinor: number;
  actualAmountMinor: number;
  remainingAmountMinor: number;
  varianceMinor: number; // plannedAmountMinor - actualAmountMinor
  status: 'under_budget' | 'on_track' | 'overspent' | 'unbudgeted';
  utilizationPercentage: number | null; // null if planned === 0
}

export interface AccountReportItem {
  accountId: string;
  accountName: string;
  accountType: string;
  currentBalanceMinor: number;
  periodIncomeMinor: number;
  periodExpensesMinor: number;
  periodTransfersInMinor: number;
  periodTransfersOutMinor: number;
  netFlowMinor: number; // (periodIncome + periodTransfersIn) - (periodExpenses + periodTransfersOut)
}

export interface TransferSummaryItem {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amountMinor: number;
  date: string;
}

export interface TransferSummary {
  totalTransferAmountMinor: number;
  transferCount: number;
  transfers: TransferSummaryItem[];
}

export interface MonthlyGoalContributionItem {
  goalId: string;
  goalName: string;
  category: string;
  colorToken: string;
  monthlyContributionMinor: number;
  totalAccumulatedMinor: number;
  targetAmountMinor: number;
  progressPercentage: number;
  targetDate: string | null;
  requiredMonthlyContributionMinor: number | null;
  isOverdue: boolean;
  isCompleted: boolean;
}

export interface RecurringCommitmentReport {
  expectedRecurringExpensesMinor: number;
  actualRecurringExpensesPaidMinor: number;
  unpaidRecurringExpensesMinor: number;
  expectedRecurringIncomeMinor: number;
  actualRecurringIncomeReceivedMinor: number;
  unpaidRecurringIncomeMinor: number;
  totalScheduledOccurrencesCount: number;
  paidOccurrencesCount: number;
  unpaidOccurrencesCount: number;
}

export interface MonthlyComparisonReport {
  currentPeriod: PeriodInfo;
  comparisonPeriod: PeriodInfo;
  currentIncomeMinor: number;
  comparisonIncomeMinor: number;
  incomeDifferenceMinor: number;
  currentExpensesMinor: number;
  comparisonExpensesMinor: number;
  expensesDifferenceMinor: number;
  currentNetSavingsMinor: number;
  comparisonNetSavingsMinor: number;
  netSavingsDifferenceMinor: number;
  currentSavingsRate: number | null;
  comparisonSavingsRate: number | null;
  savingsRateDifference: number | null;
  currentGoalContributionsMinor: number;
  comparisonGoalContributionsMinor: number;
  goalContributionsDifferenceMinor: number;
}

export interface MonthlyTrendItem {
  period: PeriodInfo;
  incomeMinor: number;
  expensesMinor: number;
  netSavingsMinor: number;
  savingsRate: number | null;
}

export interface CategoryTrendItem {
  period: PeriodInfo;
  categoryId: string;
  categoryName: string;
  amountMinor: number;
}

export interface MonthlyReportSummary {
  period: PeriodInfo;
  // Actuals
  actualIncomeMinor: number;
  actualExpensesMinor: number;
  netSavingsMinor: number;
  savingsRate: number | null; // null if actualIncome === 0
  // Budget / Plan Context
  hasBudget: boolean;
  plannedIncomeMinor: number;
  plannedExpensesMinor: number;
  plannedSavingsMinor: number;
  unallocatedMinor: number | null; // null if !hasBudget
  budgetUtilization: number | null; // null if !hasBudget or plannedExpenses === 0
  // Detailed Section Breakdowns
  incomeBreakdown: CategoryBreakdownItem[];
  expenseBreakdown: CategoryBreakdownItem[];
  topSpendingCategories: CategoryBreakdownItem[];
  needWantBreakdown: NeedWantBreakdown;
  budgetVsActual: BudgetVsActualCategoryItem[];
  accountReport: AccountReportItem[];
  transferSummary: TransferSummary;
  goalContributions: MonthlyGoalContributionItem[];
  totalGoalContributionsMinor: number;
  recurringCommitments: RecurringCommitmentReport;
}
