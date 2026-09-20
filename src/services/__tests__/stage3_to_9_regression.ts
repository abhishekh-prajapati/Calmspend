/**
 * COMPREHENSIVE STAGE 3–9 REGRESSION SUITE
 * Explicitly tests and validates:
 * 1. Stage 3: Expense Transactions & Account Balances
 * 2. Stage 4: Income Transactions & Net Savings Cash Flow
 * 3. Stage 5: Inter-Account Transfers (Balance & Cash Flow Isolation)
 * 4. Stage 6: Monthly Budget Planning, Progress & Available-to-Spend
 * 5. Stage 7: Financial Goals & Goal Contributions
 * 6. Stage 8: Recurring Schedules, Occurrences & Payment Deduplication
 * 7. Stage 9: Monthly Reports, Analytics, Breakdowns & Comparisons
 */

import type { Account, Category, Transaction } from '../../types/transaction';
import type { MonthlyBudget, BudgetItem } from '../../types/budget';
import type { Goal, GoalContribution } from '../../types/goal';
import type { RecurringSchedule } from '../../types/recurring';
import type { PeriodInfo } from '../../types/finance';
import {
  getAccountBalanceMinor,
  getCurrentBalanceMinor,
  getMonthlyExpensesMinor,
  getMonthlyIncomeMinor,
  getNetSavingsMinor,
  getAvailableToSpendMinor,
  getDailyAllowanceMinor,
  getCategoryBudgetProgressList,
} from '../financialCalculations';
import { calculateGoalProgress } from '../goalCalculations';
import { generateScheduleOccurrences } from '../recurrenceService';
import { OccurrenceRecordRepository } from '../repositories/occurrenceRecordRepository';
import { getPeriodFromYearMonth } from '../periodService';
import {
  getExpenseCategoryBreakdown,
  getNeedWantBreakdown,
  getBudgetVsActualReport,
  getMonthlyReportSummary,
  comparePeriods,
} from '../reportCalculations';
import type { IStorageAdapter } from '../storage/storageAdapter';
import type { PersistedData } from '../storage/schema';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('======================================================');
console.log('   RUNNING COMPLETE STAGE 3–9 REGRESSION SUITE        ');
console.log('======================================================\n');

const testPeriod: PeriodInfo = {
  year: 2026,
  monthIndex: 8, // September
  monthName: 'September',
  formattedPeriod: 'September 2026',
  periodKey: '2026-09',
};

// ==========================================
// 1. STAGE 3: EXPENSE TRANSACTIONS
// ==========================================
console.log('--- 1. Testing Stage 3: Expenses ---');
const checkingAcc: Account = {
  id: 'acc_chk',
  name: 'Checking Bank',
  type: 'bank',
  openingBalance: 10000000, // ₹1,00,000
  currency: 'INR',
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const foodCategory: Category = {
  id: 'cat_food',
  name: 'Food & Groceries',
  icon: 'Utensils',
  type: 'expense',
  isSystem: true,
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const expense1: Transaction = {
  id: 'txn_exp_1',
  type: 'expense',
  amount: 250000, // ₹2,500
  accountId: 'acc_chk',
  categoryId: 'cat_food',
  date: '2026-09-05',
  createdAt: '2026-09-05T00:00:00Z',
  updatedAt: '2026-09-05T00:00:00Z',
};

const balanceAfterExp1 = getAccountBalanceMinor(checkingAcc, [expense1]);
assert(balanceAfterExp1 === 9750000, 'Stage 3: Account balance reduced from ₹100,000 to ₹97,500');

const monthlyExpenses1 = getMonthlyExpensesMinor([expense1], testPeriod);
assert(monthlyExpenses1 === 250000, 'Stage 3: Monthly expenses aggregated to ₹2,500');

// ==========================================
// 2. STAGE 4: INCOME & CASH FLOW
// ==========================================
console.log('\n--- 2. Testing Stage 4: Income & Cash Flow ---');
const salaryCategory: Category = {
  id: 'cat_salary',
  name: 'Salary',
  icon: 'Briefcase',
  type: 'income',
  isSystem: true,
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const income1: Transaction = {
  id: 'txn_inc_1',
  type: 'income',
  amount: 8000000, // ₹80,000
  accountId: 'acc_chk',
  categoryId: 'cat_salary',
  date: '2026-09-01',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const balanceAfterInc1 = getAccountBalanceMinor(checkingAcc, [expense1, income1]);
assert(balanceAfterInc1 === 17750000, 'Stage 4: Balance correctly reflects Opening + Income - Expense (₹1,77,500)');

const monthlyIncome1 = getMonthlyIncomeMinor([expense1, income1], testPeriod);
assert(monthlyIncome1 === 8000000, 'Stage 4: Monthly income aggregated to ₹80,000');

const netSavings1 = getNetSavingsMinor([expense1, income1], testPeriod);
assert(netSavings1 === 7750000, 'Stage 4: Net savings is ₹77,500 (₹80k - ₹2.5k)');

// ==========================================
// 3. STAGE 5: TRANSFERS
// ==========================================
console.log('\n--- 3. Testing Stage 5: Inter-Account Transfers ---');
const savingsAcc: Account = {
  id: 'acc_sav',
  name: 'Emergency Savings',
  type: 'savings',
  openingBalance: 5000000, // ₹50,000
  currency: 'INR',
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const transferTxn: Transaction = {
  id: 'txn_trf_1',
  type: 'transfer',
  amount: 2000000, // ₹20,000
  fromAccountId: 'acc_chk',
  toAccountId: 'acc_sav',
  date: '2026-09-10',
  createdAt: '2026-09-10T00:00:00Z',
  updatedAt: '2026-09-10T00:00:00Z',
};

const chkBalAfterTransfer = getAccountBalanceMinor(checkingAcc, [expense1, income1, transferTxn]);
const savBalAfterTransfer = getAccountBalanceMinor(savingsAcc, [expense1, income1, transferTxn]);
assert(chkBalAfterTransfer === 15750000, 'Stage 5: Source account balance decreased by ₹20,000');
assert(savBalAfterTransfer === 7000000, 'Stage 5: Destination account balance increased by ₹20,000');

const totalBalAcrossAccounts = getCurrentBalanceMinor([checkingAcc, savingsAcc], [expense1, income1, transferTxn]);
assert(totalBalAcrossAccounts === 22750000, 'Stage 5: Total liquid assets across accounts is ₹2,27,500');

const expensesAfterTrf = getMonthlyExpensesMinor([expense1, income1, transferTxn], testPeriod);
const incomeAfterTrf = getMonthlyIncomeMinor([expense1, income1, transferTxn], testPeriod);
const netSavingsAfterTrf = getNetSavingsMinor([expense1, income1, transferTxn], testPeriod);
assert(expensesAfterTrf === 250000, 'Stage 5: Transfer does NOT inflate monthly expenses (remains ₹2,500)');
assert(incomeAfterTrf === 8000000, 'Stage 5: Transfer does NOT inflate monthly income (remains ₹80,000)');
assert(netSavingsAfterTrf === 7750000, 'Stage 5: Net savings unaffected by internal transfer (remains ₹77,500)');

// ==========================================
// 4. STAGE 6: MONTHLY BUDGET PLANNING
// ==========================================
console.log('\n--- 4. Testing Stage 6: Budget Planning & Available to Spend ---');
const foodBudgetItem: BudgetItem = {
  id: 'bi_food',
  monthlyBudgetId: 'mb_2026_09',
  categoryId: 'cat_food',
  plannedAmountMinor: 1000000, // ₹10,000
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const budgetProgress = getCategoryBudgetProgressList(
  [foodCategory],
  [foodBudgetItem],
  [expense1],
  testPeriod,
);
assert(budgetProgress.length === 1, 'Stage 6: Category budget progress calculated');
assert(budgetProgress[0].plannedAmountMinor === 1000000, 'Stage 6: Planned food is ₹10,000');
assert(budgetProgress[0].actualAmountMinor === 250000, 'Stage 6: Actual food is ₹2,500');
assert(budgetProgress[0].remainingAmountMinor === 750000, 'Stage 6: Remaining food budget is ₹7,500');
assert(budgetProgress[0].isOverspent === false, 'Stage 6: Not overspent');

const availableToSpend = getAvailableToSpendMinor(
  [checkingAcc, savingsAcc],
  [expense1, income1, transferTxn],
  1000000, // Total planned expenses ₹10,000
  3000000, // Planned savings ₹30,000
  true,    // Current month
  testPeriod,
  true,    // Has plan
);
// Remaining planned expenses = max(0, 10k - 2.5k) = ₹7,500 (750000 paise)
// Available to Spend represents remaining planned budget for the month = ₹7,500
assert(availableToSpend === 750000, `Stage 6: Available to Spend is remaining planned budget ₹7,500 (750000 paise, got ${availableToSpend})`);

const fixedDate = new Date('2026-09-15T00:00:00Z');
const dailyAllowance = getDailyAllowanceMinor(availableToSpend, true, fixedDate);
// 750000 paise / 16 remaining days = 46875 paise (₹468.75 / day)
assert(dailyAllowance === 46875, `Stage 6: Daily allowance calculated for remaining 16 days (7,500 / 16 = ₹468.75 / day, got ${dailyAllowance})`);

// ==========================================
// 5. STAGE 7: FINANCIAL GOALS
// ==========================================
console.log('\n--- 5. Testing Stage 7: Goals & Goal Contributions ---');
const emergencyGoal: Goal = {
  id: 'goal_emergency',
  name: 'Emergency Fund',
  targetAmountMinor: 10000000, // ₹1,00,000
  targetDate: '2027-01-31',
  status: 'active',
  colorToken: 'success',
  icon: 'Shield',
  priority: 'high',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const goalContrib1: GoalContribution = {
  id: 'gc_1',
  goalId: 'goal_emergency',
  amountMinor: 4000000, // ₹40,000
  date: '2026-09-05',
  createdAt: '2026-09-05T00:00:00Z',
  updatedAt: '2026-09-05T00:00:00Z',
};

const goalProgress = calculateGoalProgress(emergencyGoal, [goalContrib1], fixedDate);
assert(goalProgress.currentAmountMinor === 4000000, 'Stage 7: Goal allocated amount is ₹40,000');
assert(goalProgress.remainingAmountMinor === 6000000, 'Stage 7: Remaining goal amount is ₹60,000');
assert(goalProgress.progressPercentage === 40, 'Stage 7: Goal progress is 40%');
assert(goalProgress.isCompleted === false, 'Stage 7: Goal not yet completed');

// ==========================================
// 6. STAGE 8: BILLS & RECURRING TRANSACTIONS
// ==========================================
console.log('\n--- 6. Testing Stage 8: Recurring Schedules & Occurrence Flow ---');
const rentSchedule: RecurringSchedule = {
  id: 'rec_rent',
  type: 'expense',
  name: 'Apartment Rent',
  amountMinor: 2500000, // ₹25,000
  classification: 'rent',
  frequency: 'monthly',
  interval: 1,
  startDate: '2026-09-05',
  preferredDayOfMonth: 5,
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const generatedOccs = generateScheduleOccurrences(
  [rentSchedule],
  [],
  [],
  '2026-09-01',
  '2026-09-30',
);
assert(generatedOccs.length === 1, 'Stage 8: Generated exactly 1 occurrence for September');
assert(generatedOccs[0].dueDate === '2026-09-05', 'Stage 8: Occurrence due date is 2026-09-05');
assert(generatedOccs[0].amountMinor === 2500000, 'Stage 8: Expected amount is ₹25,000');

// Test Duplicate Payment Prevention in OccurrenceRecordRepository
class MockStorage implements IStorageAdapter {
  private data: PersistedData;
  constructor() {
    this.data = {
      version: 2,
      accounts: [],
      categories: DEFAULT_SYSTEM_CATEGORIES,
      transactions: [],
      monthlyBudgets: [],
      budgetItems: [],
      plannedIncomeItems: [],
      goals: [],
      goalContributions: [],
      recurringSchedules: [],
      scheduledBills: [],
      occurrenceRecords: [],
      manualAssets: [],
      manualLiabilities: [],
      financialSnapshots: [],
    };
  }
  loadData(): PersistedData { return JSON.parse(JSON.stringify(this.data)); }
  saveData(d: PersistedData): boolean {
    this.data = JSON.parse(JSON.stringify(d));
    return true;
  }
  clearData(): void {
    this.data = {
      version: 2,
      accounts: [],
      categories: DEFAULT_SYSTEM_CATEGORIES,
      transactions: [],
      monthlyBudgets: [],
      budgetItems: [],
      plannedIncomeItems: [],
      goals: [],
      goalContributions: [],
      recurringSchedules: [],
      scheduledBills: [],
      occurrenceRecords: [],
      manualAssets: [],
      manualLiabilities: [],
      financialSnapshots: [],
    };
  }
}

const mockAdapter = new MockStorage();
const occRepo = new OccurrenceRecordRepository(mockAdapter);

(async () => {
  const paidRecord = await occRepo.recordPaid({
    occurrenceKey: generatedOccs[0].occurrenceKey,
    scheduleId: rentSchedule.id,
    dueDate: '2026-09-05',
    transactionId: 'txn_rent_paid',
    actualAmountMinor: 2500000,
    actualDate: '2026-09-05',
  });
  assert(paidRecord.status === 'paid', 'Stage 8: Occurrence recorded as paid');

  let duplicateBlocked = false;
  try {
    await occRepo.recordPaid({
      occurrenceKey: generatedOccs[0].occurrenceKey,
      scheduleId: rentSchedule.id,
      dueDate: '2026-09-05',
      transactionId: 'txn_rent_paid_2',
      actualAmountMinor: 2500000,
      actualDate: '2026-09-05',
    });
  } catch {
    duplicateBlocked = true;
  }
  assert(duplicateBlocked, 'Stage 8: Duplicate payment on same occurrenceKey successfully blocked with error');

  // ==========================================
  // 7. STAGE 9: REPORTS & ANALYTICS
  // ==========================================
  console.log('\n--- 7. Testing Stage 9: Reports & Analytics ---');
  const reportCategories: Category[] = [
    salaryCategory,
    foodCategory,
    { id: 'cat_transport', name: 'Transport', icon: 'Car', type: 'expense', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
    { id: 'cat_bills', name: 'Bills', icon: 'Receipt', type: 'expense', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
  ];

  const septTxns: Transaction[] = [
    { id: 't_inc', type: 'income', amount: 5000000, accountId: 'acc_chk', categoryId: 'cat_salary', date: '2026-09-01', createdAt: '', updatedAt: '' },
    { id: 't_food', type: 'expense', amount: 2000000, accountId: 'acc_chk', categoryId: 'cat_food', needOrWant: 'need', date: '2026-09-05', createdAt: '', updatedAt: '' },
    { id: 't_trans', type: 'expense', amount: 1000000, accountId: 'acc_chk', categoryId: 'cat_transport', needOrWant: 'want', date: '2026-09-08', createdAt: '', updatedAt: '' },
    { id: 't_trf', type: 'transfer', amount: 1500000, fromAccountId: 'acc_chk', toAccountId: 'acc_sav', date: '2026-09-10', createdAt: '', updatedAt: '' },
  ];

  const septBudget: MonthlyBudget = { id: 'b_sept', periodKey: '2026-09', plannedSavingsMinor: 1000000, createdAt: '', updatedAt: '' };
  const septBudgetItems: BudgetItem[] = [
    { id: 'bi_f', monthlyBudgetId: 'b_sept', categoryId: 'cat_food', plannedAmountMinor: 2500000, createdAt: '', updatedAt: '' },
    { id: 'bi_t', monthlyBudgetId: 'b_sept', categoryId: 'cat_transport', plannedAmountMinor: 800000, createdAt: '', updatedAt: '' },
  ];

  const reportSummary = getMonthlyReportSummary(
    [checkingAcc, savingsAcc],
    reportCategories,
    septTxns,
    septBudget,
    septBudgetItems,
    [],
    [emergencyGoal],
    [goalContrib1],
    [rentSchedule],
    [],
    [paidRecord],
    testPeriod,
    fixedDate,
  );

  assert(reportSummary.actualIncomeMinor === 5000000, 'Stage 9: Actual Income is ₹50,000');
  assert(reportSummary.actualExpensesMinor === 3000000, 'Stage 9: Actual Expenses is ₹30,000 (excluding transfer)');
  assert(reportSummary.netSavingsMinor === 2000000, 'Stage 9: Net Savings is ₹20,000 (₹50k - ₹30k)');
  assert(reportSummary.savingsRate === 40, 'Stage 9: Savings Rate is 40.0%');
  assert(reportSummary.transferSummary.totalTransferAmountMinor === 1500000, 'Stage 9: Transfer Summary captured ₹15,000');
  assert(reportSummary.transferSummary.transferCount === 1, 'Stage 9: 1 Transfer captured');
  assert(reportSummary.totalGoalContributionsMinor === 4000000, 'Stage 9: Goal contributions captured ₹40,000');

  const catBreakdown = getExpenseCategoryBreakdown(septTxns, reportCategories, testPeriod);
  assert(catBreakdown.length === 2, 'Stage 9: 2 active spending categories');
  const foodShare = Math.round(catBreakdown[0].sharePercentage! * 10) / 10;
  const transShare = Math.round(catBreakdown[1].sharePercentage! * 10) / 10;
  assert(catBreakdown[0].categoryId === 'cat_food' && foodShare === 66.7, 'Stage 9: Food is 66.7% share');
  assert(catBreakdown[1].categoryId === 'cat_transport' && transShare === 33.3, 'Stage 9: Transport is 33.3% share');

  const needWant = getNeedWantBreakdown(septTxns, testPeriod);
  assert(needWant.needsMinor === 2000000, 'Stage 9: Needs is ₹20,000');
  assert(needWant.wantsMinor === 1000000, 'Stage 9: Wants is ₹10,000');
  const needsPct = Math.round(needWant.needsPercentage! * 10) / 10;
  const wantsPct = Math.round(needWant.wantsPercentage! * 10) / 10;
  assert(needsPct === 66.7, 'Stage 9: Needs share is 66.7%');
  assert(wantsPct === 33.3, 'Stage 9: Wants share is 33.3%');

  const bvaReport = getBudgetVsActualReport(reportCategories, septBudget, septBudgetItems, septTxns, testPeriod);
  const transportBva = bvaReport.items.find((i) => i.categoryId === 'cat_transport');
  assert(transportBva?.status === 'overspent', 'Stage 9: Transport status is overspent (Planned ₹8k vs Actual ₹10k)');
  assert(transportBva?.varianceMinor === -200000, 'Stage 9: Transport variance is -₹2,000');

  const augPeriod = getPeriodFromYearMonth(2026, 7); // August 2026
  const augTxns: Transaction[] = [
    { id: 't_aug_inc', type: 'income', amount: 4500000, accountId: 'acc_chk', categoryId: 'cat_salary', date: '2026-08-01', createdAt: '', updatedAt: '' },
    { id: 't_aug_exp', type: 'expense', amount: 2500000, accountId: 'acc_chk', categoryId: 'cat_food', date: '2026-08-05', createdAt: '', updatedAt: '' },
  ];
  const augReport = getMonthlyReportSummary([checkingAcc], reportCategories, augTxns, null, [], [], [], [], [], [], [], augPeriod);
  const comparison = comparePeriods(reportSummary, augReport);
  assert(comparison.incomeDifferenceMinor === 500000, 'Stage 9: Income increased by +₹5,000 (+11.1%)');
  assert(comparison.expensesDifferenceMinor === 500000, 'Stage 9: Expenses increased by +₹5,000 (+20.0%)');
  assert(comparison.netSavingsDifferenceMinor === 0, 'Stage 9: Net savings delta is ₹0');

  console.log('\n======================================================');
  console.log('   ALL STAGE 3–9 REGRESSION TESTS PASSED 100%!       ');
  console.log('======================================================\n');
})();
