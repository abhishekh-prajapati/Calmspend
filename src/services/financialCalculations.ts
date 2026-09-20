import type { Account, Category, Transaction } from '../types/transaction';
import type { DashboardSummary, FinancialSystemState, PeriodInfo } from '../types/finance';
import type { MonthlyBudget, BudgetItem, PlannedIncomeItem, MonthlyPlanSummary, CategoryBudgetProgress, PlanStatus } from '../types/budget';
import { isDateInPeriod, isCurrentPeriod, getRemainingDaysInMonth } from './periodService';

/**
 * Calculates net minor units effect of a single transaction on a given account.
 * Supports:
 * - 'income': +amount to txn.accountId
 * - 'expense': -amount from txn.accountId
 * - 'transfer': -amount from txn.fromAccountId, +amount to txn.toAccountId
 */
export function getTransactionAccountEffectMinor(txn: Transaction, accountId: string): number {
  if (txn.accountId === accountId) {
    if (txn.type === 'income') {
      return txn.amount;
    }
    if (txn.type === 'expense' || txn.type === 'saving' || txn.type === 'goal') {
      return -txn.amount;
    }
  }
  if (txn.type === 'transfer') {
    if (txn.fromAccountId === accountId) {
      return -txn.amount;
    }
    if (txn.toAccountId === accountId) {
      return txn.amount;
    }
  }
  return 0;
}

/**
 * Calculates the balance for a single account based on opening balance and all historical transactions.
 * Returns value in Integer Minor Units (paise).
 */
export function getAccountBalanceMinor(account: Account, transactions: Transaction[]): number {
  let balanceMinor = account.openingBalance;

  for (const txn of transactions) {
    balanceMinor += getTransactionAccountEffectMinor(txn, account.id);
  }

  return balanceMinor;
}

/**
 * Backward-compatible alias returning minor units.
 */
export const getAccountBalance = getAccountBalanceMinor;

/**
 * Single-pass O(T + A) calculation of all account balances.
 * Mathematically proven equivalent to running getAccountBalanceMinor per account.
 */
export function getAllAccountBalancesMap(accounts: Account[], transactions: Transaction[]): Map<string, number> {
  const balanceMap = new Map<string, number>();
  for (const acc of accounts) {
    balanceMap.set(acc.id, acc.openingBalance);
  }

  for (const txn of transactions) {
    if (txn.type === 'income' && txn.accountId) {
      const cur = balanceMap.get(txn.accountId);
      if (cur !== undefined) balanceMap.set(txn.accountId, cur + txn.amount);
    } else if ((txn.type === 'expense' || txn.type === 'saving' || txn.type === 'goal') && txn.accountId) {
      const cur = balanceMap.get(txn.accountId);
      if (cur !== undefined) balanceMap.set(txn.accountId, cur - txn.amount);
    } else if (txn.type === 'transfer') {
      if (txn.fromAccountId) {
        const fromCur = balanceMap.get(txn.fromAccountId);
        if (fromCur !== undefined) balanceMap.set(txn.fromAccountId, fromCur - txn.amount);
      }
      if (txn.toAccountId) {
        const toCur = balanceMap.get(txn.toAccountId);
        if (toCur !== undefined) balanceMap.set(txn.toAccountId, toCur + txn.amount);
      }
    }
  }

  return balanceMap;
}

/**
 * Calculates current total balance across all ACTIVE accounts.
 * Inactive accounts are excluded from the total balance calculation.
 * Preserves negative total balance accurately without clamping.
 * Returns value in Integer Minor Units (paise).
 */
export function getCurrentBalanceMinor(accounts: Account[], transactions: Transaction[]): number {
  if (accounts.length === 0) {
    return 0;
  }

  let totalBalanceMinor = 0;
  for (const account of accounts) {
    if (!account.isActive) continue;
    totalBalanceMinor += getAccountBalanceMinor(account, transactions);
  }

  return totalBalanceMinor;
}

/**
 * Calculates sum of expenses strictly within the active period (YYYY-MM).
 * Returns value in Integer Minor Units (paise).
 */
export function getMonthlyExpensesMinor(transactions: Transaction[], period: PeriodInfo): number {
  let totalExpensesMinor = 0;

  for (const txn of transactions) {
    if (txn.type === 'expense' && isDateInPeriod(txn.date, period)) {
      totalExpensesMinor += txn.amount;
    }
  }

  return totalExpensesMinor;
}

/**
 * Calculates sum of income strictly within the active period (YYYY-MM).
 * Returns value in Integer Minor Units (paise).
 */
export function getMonthlyIncomeMinor(transactions: Transaction[], period: PeriodInfo): number {
  let totalIncomeMinor = 0;

  for (const txn of transactions) {
    if (txn.type === 'income' && isDateInPeriod(txn.date, period)) {
      totalIncomeMinor += txn.amount;
    }
  }

  return totalIncomeMinor;
}

/**
 * Net Savings = Monthly Actual Income - Monthly Actual Expenses.
 * Represents actual derived cash surplus for the selected period.
 * Returns value in Integer Minor Units (paise).
 */
export function getNetSavingsMinor(transactions: Transaction[], period: PeriodInfo): number {
  return getMonthlyIncomeMinor(transactions, period) - getMonthlyExpensesMinor(transactions, period);
}

/**
 * Backward-compatible alias for monthly savings.
 */
export const getMonthlySavingsMinor = (transactions: Transaction[], period?: PeriodInfo): number | null => {
  if (!period) return null;
  return getNetSavingsMinor(transactions, period);
};

/**
 * Deterministically derives the plan status from persisted planning inputs.
 */
export function derivePlanStatus(
  totalPlannedIncome: number,
  totalPlannedExpenses: number,
  plannedSavings: number,
  incomeItemCount: number,
  budgetItemCount: number,
): PlanStatus {
  const hasItems = incomeItemCount > 0 || budgetItemCount > 0;
  const hasAllocations = totalPlannedIncome > 0 || totalPlannedExpenses > 0 || plannedSavings > 0;

  if (!hasItems && !hasAllocations) {
    return 'not_started';
  }

  if (totalPlannedExpenses + plannedSavings > totalPlannedIncome) {
    return 'over_allocated';
  }

  if (
    totalPlannedIncome > 0 &&
    (budgetItemCount > 0 || plannedSavings > 0) &&
    totalPlannedExpenses + plannedSavings <= totalPlannedIncome
  ) {
    return 'fully_planned';
  }

  return 'partially_planned';
}

/**
 * Available to Spend (CURRENT MONTH ONLY):
 * Formula:
 *   availableToSpendMinor = max(0, totalPlannedExpensesMinor - actualMonthlyExpensesMinor)
 *
 * Represents the remaining unspent budget for the current month.
 * For non-current months or when no budget is planned, returns null (Not Applicable).
 */
export function getAvailableToSpendMinor(
  _accounts: Account[],
  transactions: Transaction[],
  totalPlannedExpensesMinor: number,
  _plannedSavingsMinor: number,
  isCurrentMonth: boolean,
  period: PeriodInfo,
  hasPlan: boolean,
): number | null {
  if (!isCurrentMonth || !hasPlan || totalPlannedExpensesMinor <= 0) {
    return null;
  }

  const actualMonthlyExpenses = getMonthlyExpensesMinor(transactions, period);
  return Math.max(0, totalPlannedExpensesMinor - actualMonthlyExpenses);
}

/**
 * Daily Spending Allowance (CURRENT MONTH ONLY):
 * Formula:
 *   dailyAllowanceMinor = availableToSpendMinor / remainingDaysInCurrentMonth
 *
 * Divides the remaining unspent planned budget by remaining days in the active month.
 * For non-current months or when availableToSpendMinor is null, returns null.
 */
export function getDailyAllowanceMinor(
  availableToSpendMinor: number | null,
  isCurrentMonth: boolean,
  currentDate: Date = new Date(),
): number | null {
  if (!isCurrentMonth || availableToSpendMinor === null) {
    return null;
  }

  const remainingDays = getRemainingDaysInMonth(currentDate);
  return Math.round(Math.max(0, availableToSpendMinor) / remainingDays);
}

/**
 * Computes the remaining flexible daily pool and daily spending allowance based on:
 * Total Monthly Plan - Planned Savings - Planned Category Expenses - Unplanned Spending
 */
export function calculateFlexibleAndDailyAllowance(
  totalPlannedIncomeMinor: number,
  totalPlannedExpensesMinor: number,
  plannedSavingsMinor: number,
  categoryProgress: CategoryBudgetProgress[],
  transactions: Transaction[],
  period: PeriodInfo,
  isCurrentMonth: boolean,
  currentDate: Date = new Date(),
  customDailyAllowanceMinor?: number | null,
): {
  availableToSpendMinor: number | null;
  dailyAllowanceMinor: number | null;
  autoDailyAllowanceMinor: number | null;
  customDailyAllowanceMinor: number | null;
  flexiblePoolMinor: number | null;
} {
  const hasPlan = Boolean(totalPlannedIncomeMinor > 0 || totalPlannedExpensesMinor > 0);
  if (!isCurrentMonth || !hasPlan) {
    return {
      availableToSpendMinor: null,
      dailyAllowanceMinor: null,
      autoDailyAllowanceMinor: null,
      customDailyAllowanceMinor: null,
      flexiblePoolMinor: null,
    };
  }

  const actualMonthlyExpenses = getMonthlyExpensesMinor(transactions, period);

  // Calculate spending that went towards planned category envelopes
  let plannedSpendingCovered = 0;
  for (const cp of categoryProgress) {
    if (cp.plannedAmountMinor > 0) {
      plannedSpendingCovered += Math.min(cp.actualAmountMinor, cp.plannedAmountMinor);
    }
  }

  // Spending on unbudgeted categories or overages beyond planned envelopes
  const unplannedSpending = Math.max(0, actualMonthlyExpenses - plannedSpendingCovered);

  const totalBudgetPool = totalPlannedIncomeMinor > 0
    ? totalPlannedIncomeMinor
    : (totalPlannedExpensesMinor + plannedSavingsMinor);

  const initialFlexiblePool = Math.max(0, totalBudgetPool - plannedSavingsMinor - totalPlannedExpensesMinor);

  let activeAvailableMinor: number;
  if (initialFlexiblePool > 0) {
    // User intentionally kept a flexible/unplanned pool
    activeAvailableMinor = Math.max(0, initialFlexiblePool - unplannedSpending);
  } else {
    // User allocated full budget into category envelopes
    activeAvailableMinor = Math.max(0, totalPlannedExpensesMinor - actualMonthlyExpenses);
  }

  const remainingDays = getRemainingDaysInMonth(currentDate);
  const autoDailyAllowanceMinor = Math.round(activeAvailableMinor / remainingDays);
  const effectiveDailyMinor =
    customDailyAllowanceMinor !== null && customDailyAllowanceMinor !== undefined && customDailyAllowanceMinor > 0
      ? customDailyAllowanceMinor
      : autoDailyAllowanceMinor;

  return {
    availableToSpendMinor: activeAvailableMinor,
    dailyAllowanceMinor: effectiveDailyMinor,
    autoDailyAllowanceMinor,
    customDailyAllowanceMinor: customDailyAllowanceMinor ?? null,
    flexiblePoolMinor: initialFlexiblePool,
  };
}

/**
 * Computes category-level Budget vs Actual progress for all expense categories.
 */
export function getCategoryBudgetProgressList(
  categories: Category[],
  budgetItems: BudgetItem[],
  transactions: Transaction[],
  period: PeriodInfo,
): CategoryBudgetProgress[] {
  const expenseCategories = categories.filter((c) => c.type === 'expense' && c.isActive);
  const budgetMap = new Map<string, BudgetItem>();
  for (const bi of budgetItems) {
    budgetMap.set(bi.categoryId, bi);
  }

  // Calculate actual spending per category strictly within the period
  const spendingMap = new Map<string, number>();
  for (const txn of transactions) {
    if (txn.type === 'expense' && txn.categoryId && isDateInPeriod(txn.date, period)) {
      spendingMap.set(txn.categoryId, (spendingMap.get(txn.categoryId) || 0) + txn.amount);
    }
  }

  const result: CategoryBudgetProgress[] = [];

  for (const category of expenseCategories) {
    const budgetItem = budgetMap.get(category.id);
    const plannedAmountMinor = budgetItem ? budgetItem.plannedAmountMinor : 0;
    const actualAmountMinor = spendingMap.get(category.id) || 0;
    const remainingAmountMinor = plannedAmountMinor - actualAmountMinor;
    const isOverspent = actualAmountMinor > plannedAmountMinor && plannedAmountMinor > 0;
    const spentPercentage = plannedAmountMinor > 0 ? (actualAmountMinor / plannedAmountMinor) * 100 : 0;

    result.push({
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon || 'Tag',
      categoryColor: category.color || '#3b82f6',
      plannedAmountMinor,
      actualAmountMinor,
      remainingAmountMinor,
      isOverspent,
      spentPercentage,
    });
  }

  // Deterministically sort: budgeted categories first by planned amount desc, then name
  return result.sort((a, b) => {
    if (a.plannedAmountMinor > 0 && b.plannedAmountMinor === 0) return -1;
    if (a.plannedAmountMinor === 0 && b.plannedAmountMinor > 0) return 1;
    if (b.plannedAmountMinor !== a.plannedAmountMinor) {
      return b.plannedAmountMinor - a.plannedAmountMinor;
    }
    return a.categoryName.localeCompare(b.categoryName);
  });
}

/**
 * Assembles a comprehensive MonthlyPlanSummary for a given period.
 */
export function getMonthlyPlanSummary(
  period: PeriodInfo,
  budget: MonthlyBudget | null,
  budgetItems: BudgetItem[],
  plannedIncomeItems: PlannedIncomeItem[],
  categories: Category[],
  transactions: Transaction[],
  _accounts: Account[],
  currentDate: Date = new Date(),
): MonthlyPlanSummary {
  const isCurrentMonth = isCurrentPeriod(period, currentDate);

  const totalPlannedIncomeMinor = plannedIncomeItems.reduce((acc, item) => acc + item.plannedAmountMinor, 0);
  const totalPlannedExpensesMinor = budgetItems.reduce((acc, item) => acc + item.plannedAmountMinor, 0);
  const plannedSavingsMinor = budget ? budget.plannedSavingsMinor : 0;
  const unallocatedMinor = totalPlannedIncomeMinor - totalPlannedExpensesMinor - plannedSavingsMinor;

  const status = derivePlanStatus(
    totalPlannedIncomeMinor,
    totalPlannedExpensesMinor,
    plannedSavingsMinor,
    plannedIncomeItems.length,
    budgetItems.length,
  );

  const categoryProgress = getCategoryBudgetProgressList(categories, budgetItems, transactions, period);
  const netSavingsMinor = getNetSavingsMinor(transactions, period);

  const { availableToSpendMinor, dailyAllowanceMinor, autoDailyAllowanceMinor } = calculateFlexibleAndDailyAllowance(
    totalPlannedIncomeMinor,
    totalPlannedExpensesMinor,
    plannedSavingsMinor,
    categoryProgress,
    transactions,
    period,
    isCurrentMonth,
    currentDate,
    budget?.customDailyAllowanceMinor,
  );

  return {
    period,
    isCurrentMonth,
    budget,
    plannedIncomeItems,
    budgetItems,
    totalPlannedIncomeMinor,
    totalPlannedExpensesMinor,
    plannedSavingsMinor,
    unallocatedMinor,
    status,
    categoryProgress,
    netSavingsMinor,
    availableToSpendMinor,
    dailyAllowanceMinor,
    autoDailyAllowanceMinor,
    customDailyAllowanceMinor: budget?.customDailyAllowanceMinor || null,
  };
}

/**
 * Computes the system state based on stored records.
 */
export function getSystemState(
  accounts: Account[],
  transactions: Transaction[],
  monthlyBudgets: MonthlyBudget[] = [],
  goals: { id: string }[] = [],
  recurringSchedules: { id: string; isActive?: boolean }[] = [],
  scheduledBills: { id: string; status?: string }[] = [],
): FinancialSystemState {
  const hasAccounts = accounts.length > 0;
  const hasTransactions = transactions.length > 0;
  const hasBudgets = monthlyBudgets.length > 0;
  const hasGoals = goals.length > 0;
  const hasRecurringSchedules = recurringSchedules.filter((s) => s.isActive !== false).length > 0;
  const hasScheduledBills = scheduledBills.filter((b) => b.status !== 'cancelled').length > 0;
  const hasUpcomingPayments = hasRecurringSchedules || hasScheduledBills;
  const isEmpty = !hasAccounts && !hasTransactions && !hasBudgets && !hasGoals && !hasUpcomingPayments;

  return {
    isEmpty,
    hasAccounts,
    hasTransactions,
    hasBudgets,
    hasGoals,
    hasRecurringSchedules,
    hasScheduledBills,
    hasUpcomingPayments,
  };
}


/**
 * Assembles the full dashboard summary from authoritative records in pure minor units.
 * Anchored to the CURRENT MONTH.
 */
export function getDashboardSummary(
  accounts: Account[],
  transactions: Transaction[],
  currentPeriod: PeriodInfo,
  currentBudget: MonthlyBudget | null,
  currentBudgetItems: BudgetItem[],
  currentPlannedIncomeItems: PlannedIncomeItem[] = [],
  categories: Category[] = [],
  currentDate: Date = new Date(),
): DashboardSummary {
  const isCurrentMonth = true;
  const totalPlannedIncomeMinor = currentPlannedIncomeItems.reduce((acc, item) => acc + item.plannedAmountMinor, 0);
  const totalPlannedExpensesMinor = currentBudgetItems.reduce((acc, item) => acc + item.plannedAmountMinor, 0);
  const plannedSavingsMinor = currentBudget ? currentBudget.plannedSavingsMinor : 0;

  const categoryProgress = getCategoryBudgetProgressList(categories, currentBudgetItems, transactions, currentPeriod);

  const { availableToSpendMinor, dailyAllowanceMinor, autoDailyAllowanceMinor } = calculateFlexibleAndDailyAllowance(
    totalPlannedIncomeMinor,
    totalPlannedExpensesMinor,
    plannedSavingsMinor,
    categoryProgress,
    transactions,
    currentPeriod,
    isCurrentMonth,
    currentDate,
    currentBudget?.customDailyAllowanceMinor,
  );

  const systemState = getSystemState(accounts, transactions, currentBudget ? [currentBudget] : []);

  return {
    currentBalanceMinor: getCurrentBalanceMinor(accounts, transactions),
    monthlyIncomeMinor: getMonthlyIncomeMinor(transactions, currentPeriod),
    monthlyExpensesMinor: getMonthlyExpensesMinor(transactions, currentPeriod),
    monthlySavingsMinor: getNetSavingsMinor(transactions, currentPeriod),
    availableToSpendMinor,
    dailyAllowanceMinor,
    autoDailyAllowanceMinor,
    customDailyAllowanceMinor: currentBudget?.customDailyAllowanceMinor || null,
    isSystemEmpty: systemState.isEmpty,
  };
}


