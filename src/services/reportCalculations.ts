import type { Account, Category, Transaction } from '../types/transaction';
import type { PeriodInfo } from '../types/finance';
import type { MonthlyBudget, BudgetItem, PlannedIncomeItem } from '../types/budget';
import type { Goal, GoalContribution } from '../types/goal';
import type { RecurringSchedule, ScheduledBill, OccurrenceRecord } from '../types/recurring';
import type {
  CategoryBreakdownItem,
  NeedWantBreakdown,
  BudgetVsActualCategoryItem,
  AccountReportItem,
  TransferSummary,
  TransferSummaryItem,
  MonthlyGoalContributionItem,
  RecurringCommitmentReport,
  MonthlyComparisonReport,
  MonthlyTrendItem,
  CategoryTrendItem,
  MonthlyReportSummary,
} from '../types/report';
import {
  isDateInPeriod,
  getAdjacentPeriod,
  getDaysInMonth,
} from './periodService';
import {
  getAccountBalanceMinor,
  getMonthlyExpensesMinor,
  getMonthlyIncomeMinor,
  getNetSavingsMinor,
} from './financialCalculations';
import { calculateGoalProgress } from './goalCalculations';
import { generateScheduleOccurrences } from './recurrenceService';

/**
 * Calculates deterministic income category breakdown for a selected period.
 * Transfers are strictly excluded.
 */
export function getIncomeCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  period: PeriodInfo,
): CategoryBreakdownItem[] {
  const categoryMap = new Map<string, Category>();
  for (const c of categories) {
    categoryMap.set(c.id, c);
  }

  const incomeMap = new Map<string, { amount: number; count: number }>();
  let totalIncomeMinor = 0;

  for (const txn of transactions) {
    if (txn.type === 'income' && isDateInPeriod(txn.date, period)) {
      totalIncomeMinor += txn.amount;
      const catId = txn.categoryId || 'cat_other_income';
      const existing = incomeMap.get(catId) || { amount: 0, count: 0 };
      incomeMap.set(catId, {
        amount: existing.amount + txn.amount,
        count: existing.count + 1,
      });
    }
  }

  const result: CategoryBreakdownItem[] = [];
  incomeMap.forEach((data, catId) => {
    const category = categoryMap.get(catId);
    const categoryName = category ? category.name : 'Other Income';
    const categoryIcon = category ? category.icon : 'plus-circle';
    const categoryColor = category ? category.color || '#10b981' : '#10b981';

    result.push({
      categoryId: catId,
      categoryName,
      categoryIcon,
      categoryColor,
      actualAmountMinor: data.amount,
      sharePercentage: totalIncomeMinor > 0 ? (data.amount / totalIncomeMinor) * 100 : null,
      transactionCount: data.count,
    });
  });

  // 3-level deterministic sort: actualAmount DESC -> categoryName ASC -> categoryId ASC
  return result.sort((a, b) => {
    if (b.actualAmountMinor !== a.actualAmountMinor) {
      return b.actualAmountMinor - a.actualAmountMinor;
    }
    const nameDiff = a.categoryName.localeCompare(b.categoryName);
    if (nameDiff !== 0) return nameDiff;
    return a.categoryId.localeCompare(b.categoryId);
  });
}

/**
 * Calculates deterministic expense category breakdown for a selected period.
 * Transfers and unpaid scheduled items are strictly excluded.
 */
export function getExpenseCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  period: PeriodInfo,
): CategoryBreakdownItem[] {
  const categoryMap = new Map<string, Category>();
  for (const c of categories) {
    categoryMap.set(c.id, c);
  }

  const expenseMap = new Map<string, { amount: number; count: number }>();
  let totalExpensesMinor = 0;

  for (const txn of transactions) {
    if (txn.type === 'expense' && isDateInPeriod(txn.date, period)) {
      totalExpensesMinor += txn.amount;
      const catId = txn.categoryId || 'cat_other';
      const existing = expenseMap.get(catId) || { amount: 0, count: 0 };
      expenseMap.set(catId, {
        amount: existing.amount + txn.amount,
        count: existing.count + 1,
      });
    }
  }

  const result: CategoryBreakdownItem[] = [];
  expenseMap.forEach((data, catId) => {
    const category = categoryMap.get(catId);
    const categoryName = category ? category.name : 'Other';
    const categoryIcon = category ? category.icon : 'more-horizontal';
    const categoryColor = category ? category.color || '#64748b' : '#64748b';

    result.push({
      categoryId: catId,
      categoryName,
      categoryIcon,
      categoryColor,
      actualAmountMinor: data.amount,
      sharePercentage: totalExpensesMinor > 0 ? (data.amount / totalExpensesMinor) * 100 : null,
      transactionCount: data.count,
    });
  });

  // 3-level deterministic sort: actualAmount DESC -> categoryName ASC -> categoryId ASC
  return result.sort((a, b) => {
    if (b.actualAmountMinor !== a.actualAmountMinor) {
      return b.actualAmountMinor - a.actualAmountMinor;
    }
    const nameDiff = a.categoryName.localeCompare(b.categoryName);
    if (nameDiff !== 0) return nameDiff;
    return a.categoryId.localeCompare(b.categoryId);
  });
}

/**
 * Calculates Need vs Want vs Unclassified breakdown for actual expenses in period.
 */
export function getNeedWantBreakdown(
  transactions: Transaction[],
  period: PeriodInfo,
): NeedWantBreakdown {
  let needsMinor = 0;
  let wantsMinor = 0;
  let unclassifiedMinor = 0;
  let totalExpensesMinor = 0;

  for (const txn of transactions) {
    if (txn.type === 'expense' && isDateInPeriod(txn.date, period)) {
      totalExpensesMinor += txn.amount;
      if (txn.needOrWant === 'need') {
        needsMinor += txn.amount;
      } else if (txn.needOrWant === 'want') {
        wantsMinor += txn.amount;
      } else {
        unclassifiedMinor += txn.amount;
      }
    }
  }

  return {
    needsMinor,
    wantsMinor,
    unclassifiedMinor,
    totalExpensesMinor,
    needsPercentage: totalExpensesMinor > 0 ? (needsMinor / totalExpensesMinor) * 100 : null,
    wantsPercentage: totalExpensesMinor > 0 ? (wantsMinor / totalExpensesMinor) * 100 : null,
    unclassifiedPercentage: totalExpensesMinor > 0 ? (unclassifiedMinor / totalExpensesMinor) * 100 : null,
  };
}

/**
 * Computes Budget vs Actual comparison.
 * Strictly distinguishes hasBudget = false from planned = 0.
 */
export function getBudgetVsActualReport(
  categories: Category[],
  monthlyBudget: MonthlyBudget | null,
  budgetItems: BudgetItem[],
  transactions: Transaction[],
  period: PeriodInfo,
): {
  hasBudget: boolean;
  items: BudgetVsActualCategoryItem[];
  totalPlannedExpensesMinor: number;
  budgetUtilization: number | null;
} {
  if (!monthlyBudget && budgetItems.length === 0) {
    return {
      hasBudget: false,
      items: [],
      totalPlannedExpensesMinor: 0,
      budgetUtilization: null,
    };
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense' && c.isActive);
  const budgetMap = new Map<string, BudgetItem>();
  for (const bi of budgetItems) {
    budgetMap.set(bi.categoryId, bi);
  }

  // Calculate actual spending per category in period
  const spendingMap = new Map<string, number>();
  let totalActualExpensesMinor = 0;
  for (const txn of transactions) {
    if (txn.type === 'expense' && isDateInPeriod(txn.date, period)) {
      totalActualExpensesMinor += txn.amount;
      if (txn.categoryId) {
        spendingMap.set(txn.categoryId, (spendingMap.get(txn.categoryId) || 0) + txn.amount);
      }
    }
  }

  let totalPlannedExpensesMinor = 0;
  const items: BudgetVsActualCategoryItem[] = [];

  for (const category of expenseCategories) {
    const budgetItem = budgetMap.get(category.id);
    const plannedAmountMinor = budgetItem ? budgetItem.plannedAmountMinor : 0;
    const actualAmountMinor = spendingMap.get(category.id) || 0;
    const remainingAmountMinor = plannedAmountMinor - actualAmountMinor;
    const varianceMinor = plannedAmountMinor - actualAmountMinor; // positive = under budget, negative = overspent

    totalPlannedExpensesMinor += plannedAmountMinor;

    // Determine status
    let status: 'under_budget' | 'on_track' | 'overspent' | 'unbudgeted' = 'on_track';
    if (plannedAmountMinor === 0 && actualAmountMinor > 0) {
      status = 'unbudgeted';
    } else if (actualAmountMinor > plannedAmountMinor) {
      status = 'overspent';
    } else if (actualAmountMinor === plannedAmountMinor && plannedAmountMinor > 0) {
      status = 'on_track';
    } else if (actualAmountMinor < plannedAmountMinor) {
      status = 'under_budget';
    } else {
      status = 'on_track';
    }

    const utilizationPercentage = plannedAmountMinor > 0 ? (actualAmountMinor / plannedAmountMinor) * 100 : null;

    items.push({
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon || 'Tag',
      categoryColor: category.color || '#3b82f6',
      plannedAmountMinor,
      actualAmountMinor,
      remainingAmountMinor,
      varianceMinor,
      status,
      utilizationPercentage,
    });
  }

  // Deterministic sort: budgeted categories first by planned amount desc, then name asc, then id asc
  items.sort((a, b) => {
    if (a.plannedAmountMinor > 0 && b.plannedAmountMinor === 0) return -1;
    if (a.plannedAmountMinor === 0 && b.plannedAmountMinor > 0) return 1;
    if (b.plannedAmountMinor !== a.plannedAmountMinor) {
      return b.plannedAmountMinor - a.plannedAmountMinor;
    }
    const nameDiff = a.categoryName.localeCompare(b.categoryName);
    if (nameDiff !== 0) return nameDiff;
    return a.categoryId.localeCompare(b.categoryId);
  });

  const budgetUtilization =
    totalPlannedExpensesMinor > 0 ? (totalActualExpensesMinor / totalPlannedExpensesMinor) * 100 : null;

  return {
    hasBudget: true,
    items,
    totalPlannedExpensesMinor,
    budgetUtilization,
  };
}

/**
 * Computes descriptive account-level report for the period.
 * Net Flow = (Inflows + Transfers In) - (Outflows + Transfers Out).
 * Strictly distinguished from Net Savings.
 */
export function getAccountReport(
  accounts: Account[],
  transactions: Transaction[],
  period: PeriodInfo,
): AccountReportItem[] {
  const result: AccountReportItem[] = [];

  for (const account of accounts) {
    if (!account.isActive) continue;

    const currentBalanceMinor = getAccountBalanceMinor(account, transactions);
    let periodIncomeMinor = 0;
    let periodExpensesMinor = 0;
    let periodTransfersInMinor = 0;
    let periodTransfersOutMinor = 0;

    for (const txn of transactions) {
      if (!isDateInPeriod(txn.date, period)) continue;

      if (txn.type === 'income' && txn.accountId === account.id) {
        periodIncomeMinor += txn.amount;
      } else if (txn.type === 'expense' && txn.accountId === account.id) {
        periodExpensesMinor += txn.amount;
      } else if (txn.type === 'transfer') {
        if (txn.toAccountId === account.id) {
          periodTransfersInMinor += txn.amount;
        }
        if (txn.fromAccountId === account.id) {
          periodTransfersOutMinor += txn.amount;
        }
      }
    }

    const netFlowMinor =
      periodIncomeMinor + periodTransfersInMinor - (periodExpensesMinor + periodTransfersOutMinor);

    result.push({
      accountId: account.id,
      accountName: account.name,
      accountType: account.type,
      currentBalanceMinor,
      periodIncomeMinor,
      periodExpensesMinor,
      periodTransfersInMinor,
      periodTransfersOutMinor,
      netFlowMinor,
    });
  }

  return result.sort((a, b) => a.accountName.localeCompare(b.accountName));
}

/**
 * Isolates and summarizes all transfers strictly within the period.
 */
export function getTransferSummary(
  accounts: Account[],
  transactions: Transaction[],
  period: PeriodInfo,
): TransferSummary {
  const accountMap = new Map<string, string>();
  for (const a of accounts) {
    accountMap.set(a.id, a.name);
  }

  const transfers: TransferSummaryItem[] = [];
  let totalTransferAmountMinor = 0;

  for (const txn of transactions) {
    if (txn.type === 'transfer' && isDateInPeriod(txn.date, period)) {
      totalTransferAmountMinor += txn.amount;
      transfers.push({
        id: txn.id,
        fromAccountId: txn.fromAccountId || '',
        fromAccountName: accountMap.get(txn.fromAccountId || '') || 'Unknown Account',
        toAccountId: txn.toAccountId || '',
        toAccountName: accountMap.get(txn.toAccountId || '') || 'Unknown Account',
        amountMinor: txn.amount,
        date: txn.date,
      });
    }
  }

  // Sort transfers by date desc
  transfers.sort((a, b) => b.date.localeCompare(a.date));

  return {
    totalTransferAmountMinor,
    transferCount: transfers.length,
    transfers,
  };
}

/**
 * Summarizes monthly goal contributions and goal progress.
 * Goal contributions are explicitly NOT expenses or income.
 */
export function getGoalContributionSummary(
  goals: Goal[],
  goalContributions: GoalContribution[],
  period: PeriodInfo,
  currentDate: Date = new Date(),
): {
  totalMonthlyContributionsMinor: number;
  items: MonthlyGoalContributionItem[];
} {
  let totalMonthlyContributionsMinor = 0;
  const items: MonthlyGoalContributionItem[] = [];

  for (const goal of goals) {
    if (goal.status === 'archived') continue;

    const allGoalContributions = goalContributions.filter((gc) => gc.goalId === goal.id);
    const progressSummary = calculateGoalProgress(goal, allGoalContributions, currentDate);

    // Filter contributions made in the selected period
    let monthlyContributionMinor = 0;
    for (const gc of allGoalContributions) {
      if (isDateInPeriod(gc.date, period)) {
        monthlyContributionMinor += gc.amountMinor;
      }
    }

    totalMonthlyContributionsMinor += monthlyContributionMinor;

    items.push({
      goalId: goal.id,
      goalName: goal.name,
      category: goal.category || 'custom',
      colorToken: goal.colorToken || 'primary',
      monthlyContributionMinor,
      totalAccumulatedMinor: progressSummary.currentAmountMinor,
      targetAmountMinor: goal.targetAmountMinor,
      progressPercentage: progressSummary.progressPercentage,
      targetDate: goal.targetDate || null,
      requiredMonthlyContributionMinor: progressSummary.requiredMonthlyContributionMinor,
      isOverdue: progressSummary.isOverdue,
      isCompleted: progressSummary.isCompleted,
    });
  }

  // Sort by monthly contribution desc, then progress percentage desc
  items.sort((a, b) => {
    if (b.monthlyContributionMinor !== a.monthlyContributionMinor) {
      return b.monthlyContributionMinor - a.monthlyContributionMinor;
    }
    return b.progressPercentage - a.progressPercentage;
  });

  return {
    totalMonthlyContributionsMinor,
    items,
  };
}

/**
 * Reconciles recurring commitments with actual paid transactions.
 * Double-counting prevention:
 * - Expected recurring = sum of scheduled occurrences in period.
 * - Actual recurring paid = sum of actual linked transaction amounts (not blindly scheduled amount).
 * - Unpaid recurring = max(0, expected - actual paid).
 */
export function getRecurringCommitmentSummary(
  recurringSchedules: RecurringSchedule[],
  scheduledBills: ScheduledBill[],
  occurrenceRecords: OccurrenceRecord[],
  transactions: Transaction[],
  period: PeriodInfo,
  currentDate: Date = new Date(),
): RecurringCommitmentReport {
  const daysInMonth = getDaysInMonth(period.year, period.monthIndex);
  const startDateStr = `${period.periodKey}-01`;
  const endDateStr = `${period.periodKey}-${String(daysInMonth).padStart(2, '0')}`;

  const occurrences = generateScheduleOccurrences(
    recurringSchedules,
    scheduledBills,
    occurrenceRecords,
    startDateStr,
    endDateStr,
    currentDate,
  );

  const transactionMap = new Map<string, Transaction>();
  for (const txn of transactions) {
    transactionMap.set(txn.id, txn);
  }

  let expectedRecurringExpensesMinor = 0;
  let actualRecurringExpensesPaidMinor = 0;
  let expectedRecurringIncomeMinor = 0;
  let actualRecurringIncomeReceivedMinor = 0;
  let paidOccurrencesCount = 0;
  let unpaidOccurrencesCount = 0;

  for (const occ of occurrences) {
    if (occ.type === 'expense') {
      expectedRecurringExpensesMinor += occ.amountMinor;

      if (occ.status === 'paid') {
        paidOccurrencesCount += 1;
        // Use actual linked transaction amount if available
        let paidAmount = occ.amountMinor;
        if (occ.occurrenceRecord?.transactionId) {
          const linkedTxn = transactionMap.get(occ.occurrenceRecord.transactionId);
          if (linkedTxn) {
            paidAmount = linkedTxn.amount;
          } else if (occ.occurrenceRecord.actualAmountMinor !== undefined) {
            paidAmount = occ.occurrenceRecord.actualAmountMinor;
          }
        } else if (occ.occurrenceRecord?.actualAmountMinor !== undefined) {
          paidAmount = occ.occurrenceRecord.actualAmountMinor;
        }
        actualRecurringExpensesPaidMinor += paidAmount;
      } else if (occ.status !== 'skipped' && occ.status !== 'cancelled') {
        unpaidOccurrencesCount += 1;
      }
    } else if (occ.type === 'income') {
      expectedRecurringIncomeMinor += occ.amountMinor;

      if (occ.status === 'paid') {
        paidOccurrencesCount += 1;
        let receivedAmount = occ.amountMinor;
        if (occ.occurrenceRecord?.transactionId) {
          const linkedTxn = transactionMap.get(occ.occurrenceRecord.transactionId);
          if (linkedTxn) {
            receivedAmount = linkedTxn.amount;
          } else if (occ.occurrenceRecord.actualAmountMinor !== undefined) {
            receivedAmount = occ.occurrenceRecord.actualAmountMinor;
          }
        }
        actualRecurringIncomeReceivedMinor += receivedAmount;
      } else if (occ.status !== 'skipped' && occ.status !== 'cancelled') {
        unpaidOccurrencesCount += 1;
      }
    }
  }

  const unpaidRecurringExpensesMinor = Math.max(
    0,
    expectedRecurringExpensesMinor - actualRecurringExpensesPaidMinor,
  );
  const unpaidRecurringIncomeMinor = Math.max(
    0,
    expectedRecurringIncomeMinor - actualRecurringIncomeReceivedMinor,
  );

  return {
    expectedRecurringExpensesMinor,
    actualRecurringExpensesPaidMinor,
    unpaidRecurringExpensesMinor,
    expectedRecurringIncomeMinor,
    actualRecurringIncomeReceivedMinor,
    unpaidRecurringIncomeMinor,
    totalScheduledOccurrencesCount: occurrences.length,
    paidOccurrencesCount,
    unpaidOccurrencesCount,
  };
}

/**
 * Assembles a comprehensive MonthlyReportSummary for a period.
 * Pure read-only aggregation.
 */
export function getMonthlyReportSummary(
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  monthlyBudget: MonthlyBudget | null,
  budgetItems: BudgetItem[],
  plannedIncomeItems: PlannedIncomeItem[],
  goals: Goal[],
  goalContributions: GoalContribution[],
  recurringSchedules: RecurringSchedule[],
  scheduledBills: ScheduledBill[],
  occurrenceRecords: OccurrenceRecord[],
  period: PeriodInfo,
  currentDate: Date = new Date(),
): MonthlyReportSummary {
  // Actuals
  const actualIncomeMinor = getMonthlyIncomeMinor(transactions, period);
  const actualExpensesMinor = getMonthlyExpensesMinor(transactions, period);
  const netSavingsMinor = getNetSavingsMinor(transactions, period);

  // Savings rate: null if actual income is 0
  const savingsRate = actualIncomeMinor > 0 ? (netSavingsMinor / actualIncomeMinor) * 100 : null;

  // Plan Context
  const hasBudget = Boolean(monthlyBudget || budgetItems.length > 0 || plannedIncomeItems.length > 0);
  const totalPlannedIncomeMinor = plannedIncomeItems.reduce((acc, p) => acc + p.plannedAmountMinor, 0);
  const totalPlannedExpensesMinor = budgetItems.reduce((acc, b) => acc + b.plannedAmountMinor, 0);
  const plannedSavingsMinor = monthlyBudget ? monthlyBudget.plannedSavingsMinor : 0;
  const unallocatedMinor = hasBudget
    ? totalPlannedIncomeMinor - totalPlannedExpensesMinor - plannedSavingsMinor
    : null;

  // Breakdowns
  const incomeBreakdown = getIncomeCategoryBreakdown(transactions, categories, period);
  const expenseBreakdown = getExpenseCategoryBreakdown(transactions, categories, period);
  const topSpendingCategories = expenseBreakdown.slice(0, 5);
  const needWantBreakdown = getNeedWantBreakdown(transactions, period);
  const budgetVsActualResult = getBudgetVsActualReport(
    categories,
    monthlyBudget,
    budgetItems,
    transactions,
    period,
  );
  const accountReport = getAccountReport(accounts, transactions, period);
  const transferSummary = getTransferSummary(accounts, transactions, period);
  const goalSummary = getGoalContributionSummary(goals, goalContributions, period, currentDate);
  const recurringCommitments = getRecurringCommitmentSummary(
    recurringSchedules,
    scheduledBills,
    occurrenceRecords,
    transactions,
    period,
    currentDate,
  );

  return {
    period,
    actualIncomeMinor,
    actualExpensesMinor,
    netSavingsMinor,
    savingsRate,
    hasBudget: budgetVsActualResult.hasBudget,
    plannedIncomeMinor: totalPlannedIncomeMinor,
    plannedExpensesMinor: budgetVsActualResult.totalPlannedExpensesMinor,
    plannedSavingsMinor,
    unallocatedMinor,
    budgetUtilization: budgetVsActualResult.budgetUtilization,
    incomeBreakdown,
    expenseBreakdown,
    topSpendingCategories,
    needWantBreakdown,
    budgetVsActual: budgetVsActualResult.items,
    accountReport,
    transferSummary,
    goalContributions: goalSummary.items,
    totalGoalContributionsMinor: goalSummary.totalMonthlyContributionsMinor,
    recurringCommitments,
  };
}

/**
 * Compares two monthly report summaries and derives numerical deltas.
 */
export function comparePeriods(
  currentSummary: MonthlyReportSummary,
  comparisonSummary: MonthlyReportSummary,
): MonthlyComparisonReport {
  const incomeDifferenceMinor = currentSummary.actualIncomeMinor - comparisonSummary.actualIncomeMinor;
  const expensesDifferenceMinor = currentSummary.actualExpensesMinor - comparisonSummary.actualExpensesMinor;
  const netSavingsDifferenceMinor = currentSummary.netSavingsMinor - comparisonSummary.netSavingsMinor;

  let savingsRateDifference: number | null = null;
  if (currentSummary.savingsRate !== null && comparisonSummary.savingsRate !== null) {
    savingsRateDifference = currentSummary.savingsRate - comparisonSummary.savingsRate;
  }

  const goalContributionsDifferenceMinor =
    currentSummary.totalGoalContributionsMinor - comparisonSummary.totalGoalContributionsMinor;

  return {
    currentPeriod: currentSummary.period,
    comparisonPeriod: comparisonSummary.period,
    currentIncomeMinor: currentSummary.actualIncomeMinor,
    comparisonIncomeMinor: comparisonSummary.actualIncomeMinor,
    incomeDifferenceMinor,
    currentExpensesMinor: currentSummary.actualExpensesMinor,
    comparisonExpensesMinor: comparisonSummary.actualExpensesMinor,
    expensesDifferenceMinor,
    currentNetSavingsMinor: currentSummary.netSavingsMinor,
    comparisonNetSavingsMinor: comparisonSummary.netSavingsMinor,
    netSavingsDifferenceMinor,
    currentSavingsRate: currentSummary.savingsRate,
    comparisonSavingsRate: comparisonSummary.savingsRate,
    savingsRateDifference,
    currentGoalContributionsMinor: currentSummary.totalGoalContributionsMinor,
    comparisonGoalContributionsMinor: comparisonSummary.totalGoalContributionsMinor,
    goalContributionsDifferenceMinor,
  };
}

/**
 * Calculates historical monthly trend series for N consecutive months ending at endPeriod.
 */
export function getMonthlyTrend(
  transactions: Transaction[],
  endPeriod: PeriodInfo,
  monthCount: number = 6,
): MonthlyTrendItem[] {
  const result: MonthlyTrendItem[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const period = getAdjacentPeriod(endPeriod, -i);
    const incomeMinor = getMonthlyIncomeMinor(transactions, period);
    const expensesMinor = getMonthlyExpensesMinor(transactions, period);
    const netSavingsMinor = getNetSavingsMinor(transactions, period);
    const savingsRate = incomeMinor > 0 ? (netSavingsMinor / incomeMinor) * 100 : null;

    result.push({
      period,
      incomeMinor,
      expensesMinor,
      netSavingsMinor,
      savingsRate,
    });
  }

  return result;
}

/**
 * Calculates historical category trend series for N consecutive months ending at endPeriod.
 */
export function getCategoryTrend(
  categoryId: string,
  categories: Category[],
  transactions: Transaction[],
  endPeriod: PeriodInfo,
  monthCount: number = 6,
): CategoryTrendItem[] {
  const category = categories.find((c) => c.id === categoryId);
  const categoryName = category ? category.name : 'Unknown Category';
  const result: CategoryTrendItem[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const period = getAdjacentPeriod(endPeriod, -i);
    let amountMinor = 0;

    for (const txn of transactions) {
      if (txn.type === 'expense' && txn.categoryId === categoryId && isDateInPeriod(txn.date, period)) {
        amountMinor += txn.amount;
      }
    }

    result.push({
      period,
      categoryId,
      categoryName,
      amountMinor,
    });
  }

  return result;
}
