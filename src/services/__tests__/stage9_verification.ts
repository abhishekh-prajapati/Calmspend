/**
 * STAGE 9 AUTOMATED VERIFICATION SUITE
 * Tests:
 * 1. Income, Expense & Net Savings Calculation
 * 2. Savings Rate Calculation
 * 3. Division by Zero Protection for Savings Rate (Income = 0 -> null)
 * 4. Budget vs Actual Variance (Planned - Actual, Overspent status)
 * 5. Category Spending Share Percentage
 * 6. Need vs Want vs Unclassified Expense Breakdown
 * 7. Transfer Isolation (Transfers never affect Income, Expenses, or Net Savings)
 * 8. Goal Contribution Isolation (Contributions never affect Expenses or Net Savings)
 * 9. Unpaid Recurring Commitment Isolation (Unpaid items never affect Actual Expenses)
 * 10. Paid Recurring Item Linked Transaction Reconciliation
 * 11. Month-Over-Month Comparison
 * 12. Future Month Planning vs Actual Separation
 * 13. Historical Month Budget Isolation
 * 14. Zero Financial Activity Period
 * TEST A: Recurring Payment Double-Count Protection (Scheduled ₹1,000, Paid ₹950)
 * TEST B: No Budget Historical Month (hasBudget = false, budgetUtilization = null)
 * TEST C: Future Month Semantics (Planned Income ₹50k, Actual ₹0, Savings Rate = null)
 * TEST D: Account Net Flow (Flow = ₹35k vs Net Savings = ₹30k)
 * TEST E: Trend Window Semantics (6 months ending Sept 2026 -> Apr to Sept)
 * TEST F: Category Deterministic Tie-Breaking (Amount DESC -> Name ASC -> ID ASC)
 */

import type { Account, Category, Transaction } from '../../types/transaction';
import type { MonthlyBudget, BudgetItem, PlannedIncomeItem } from '../../types/budget';
import type { Goal, GoalContribution } from '../../types/goal';
import type { RecurringSchedule, OccurrenceRecord } from '../../types/recurring';
import { getPeriodFromYearMonth } from '../periodService';
import {
  getExpenseCategoryBreakdown,
  getNeedWantBreakdown,
  getBudgetVsActualReport,
  getMonthlyReportSummary,
  comparePeriods,
  getMonthlyTrend,
} from '../reportCalculations';


function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- STARTING STAGE 9 VERIFICATION SUITE ---');

const baseCategories: Category[] = [
  { id: 'cat_salary', name: 'Salary', icon: 'briefcase', type: 'income', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'cat_freelance', name: 'Freelance', icon: 'laptop', type: 'income', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'cat_food', name: 'Food', icon: 'utensils', type: 'expense', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'cat_transport', name: 'Transport', icon: 'car', type: 'expense', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'cat_bills', name: 'Bills', icon: 'receipt', type: 'expense', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'cat_shopping', name: 'Shopping', icon: 'shopping-bag', type: 'expense', isSystem: true, isActive: true, createdAt: '', updatedAt: '' },
];

const baseAccounts: Account[] = [
  { id: 'acc_bank', name: 'Main Bank', type: 'bank', openingBalance: 10000000, currency: 'INR', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'acc_cash', name: 'Cash Wallet', type: 'cash', openingBalance: 2000000, currency: 'INR', isActive: true, createdAt: '', updatedAt: '' },
];

const septPeriod = getPeriodFromYearMonth(2026, 8); // September 2026
const augPeriod = getPeriodFromYearMonth(2026, 7);  // August 2026
const octPeriod = getPeriodFromYearMonth(2026, 9);  // October 2026 (future)

// TEST 1: Income ₹50,000, Expenses ₹30,000 -> Net Savings = ₹20,000
{
  const txns: Transaction[] = [
    { id: 't1', type: 'income', amount: 5000000, accountId: 'acc_bank', categoryId: 'cat_salary', date: '2026-09-01', createdAt: '', updatedAt: '' },
    { id: 't2', type: 'expense', amount: 3000000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-09-05', createdAt: '', updatedAt: '' },
  ];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, null, [], [], [], [], [], [], [], septPeriod);
  assert(report.actualIncomeMinor === 5000000, 'TEST 1: Actual Income is ₹50,000 (5000000 paise)');
  assert(report.actualExpensesMinor === 3000000, 'TEST 1: Actual Expenses is ₹30,000 (3000000 paise)');
  assert(report.netSavingsMinor === 2000000, 'TEST 1: Net Savings is ₹20,000 (2000000 paise)');
}

// TEST 2: Income ₹50,000, Expenses ₹30,000 -> Savings Rate = 40%
{
  const txns: Transaction[] = [
    { id: 't1', type: 'income', amount: 5000000, accountId: 'acc_bank', categoryId: 'cat_salary', date: '2026-09-01', createdAt: '', updatedAt: '' },
    { id: 't2', type: 'expense', amount: 3000000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-09-05', createdAt: '', updatedAt: '' },
  ];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, null, [], [], [], [], [], [], [], septPeriod);
  assert(report.savingsRate === 40, 'TEST 2: Savings Rate is 40.0%');
}

// TEST 3: Income = ₹0 -> Savings Rate is null (N/A, safe from division by zero)
{
  const txns: Transaction[] = [
    { id: 't1', type: 'expense', amount: 1000000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-09-05', createdAt: '', updatedAt: '' },
  ];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, null, [], [], [], [], [], [], [], septPeriod);
  assert(report.actualIncomeMinor === 0, 'TEST 3: Actual income is 0');
  assert(report.actualExpensesMinor === 1000000, 'TEST 3: Actual expenses is ₹10,000');
  assert(report.netSavingsMinor === -1000000, 'TEST 3: Net savings is -₹10,000');
  assert(report.savingsRate === null, 'TEST 3: Savings rate is null (N/A) when income is 0');
}

// TEST 4: Food budget ₹5,000, Actual Food ₹6,000 -> Variance = -₹1,000, Overspent = true
{
  const budget: MonthlyBudget = { id: 'b1', periodKey: '2026-09', plannedSavingsMinor: 0, createdAt: '', updatedAt: '' };
  const budgetItems: BudgetItem[] = [
    { id: 'bi1', monthlyBudgetId: 'b1', categoryId: 'cat_food', plannedAmountMinor: 500000, createdAt: '', updatedAt: '' },
  ];
  const txns: Transaction[] = [
    { id: 't1', type: 'expense', amount: 600000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-09-10', createdAt: '', updatedAt: '' },
  ];

  const bva = getBudgetVsActualReport(baseCategories, budget, budgetItems, txns, septPeriod);
  const foodItem = bva.items.find((i) => i.categoryId === 'cat_food');
  assert(foodItem !== undefined, 'TEST 4: Food item found');
  assert(foodItem!.plannedAmountMinor === 500000, 'TEST 4: Planned food is ₹5,000');
  assert(foodItem!.actualAmountMinor === 600000, 'TEST 4: Actual food is ₹6,000');
  assert(foodItem!.varianceMinor === -100000, 'TEST 4: Variance is -₹1,000 (planned - actual)');
  assert(foodItem!.status === 'overspent', 'TEST 4: Status is overspent');
}

// TEST 5: Food ₹6,000, Total Expenses ₹20,000 -> Food share = 30%
{
  const txns: Transaction[] = [
    { id: 't1', type: 'expense', amount: 600000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-09-02', createdAt: '', updatedAt: '' },
    { id: 't2', type: 'expense', amount: 1400000, accountId: 'acc_bank', categoryId: 'cat_bills', date: '2026-09-05', createdAt: '', updatedAt: '' },
  ];

  const breakdown = getExpenseCategoryBreakdown(txns, baseCategories, septPeriod);
  const food = breakdown.find((b) => b.categoryId === 'cat_food');
  assert(food !== undefined, 'TEST 5: Food item found in breakdown');
  assert(food!.sharePercentage === 30, 'TEST 5: Food spending share is 30%');
}

// TEST 6: Needs ₹12,000, Wants ₹5,000, Unclassified ₹3,000 -> Total = ₹20,000
{
  const txns: Transaction[] = [
    { id: 't1', type: 'expense', amount: 1200000, accountId: 'acc_bank', categoryId: 'cat_food', needOrWant: 'need', date: '2026-09-01', createdAt: '', updatedAt: '' },
    { id: 't2', type: 'expense', amount: 500000, accountId: 'acc_bank', categoryId: 'cat_shopping', needOrWant: 'want', date: '2026-09-02', createdAt: '', updatedAt: '' },
    { id: 't3', type: 'expense', amount: 300000, accountId: 'acc_bank', categoryId: 'cat_transport', date: '2026-09-03', createdAt: '', updatedAt: '' },
  ];

  const nw = getNeedWantBreakdown(txns, septPeriod);
  assert(nw.needsMinor === 1200000, 'TEST 6: Needs is ₹12,000');
  assert(nw.wantsMinor === 500000, 'TEST 6: Wants is ₹5,000');
  assert(nw.unclassifiedMinor === 300000, 'TEST 6: Unclassified is ₹3,000');
  assert(nw.totalExpensesMinor === 2000000, 'TEST 6: Total expenses is ₹20,000');
  assert(nw.needsPercentage === 60, 'TEST 6: Needs percentage is 60%');
  assert(nw.wantsPercentage === 25, 'TEST 6: Wants percentage is 25%');
  assert(nw.unclassifiedPercentage === 15, 'TEST 6: Unclassified percentage is 15%');
}

// TEST 7: Transfer ₹10,000 -> Income, Expenses, Net Savings remain unchanged
{
  const txns: Transaction[] = [
    { id: 't1', type: 'income', amount: 5000000, accountId: 'acc_bank', categoryId: 'cat_salary', date: '2026-09-01', createdAt: '', updatedAt: '' },
    { id: 't2', type: 'expense', amount: 2000000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-09-05', createdAt: '', updatedAt: '' },
    { id: 't3', type: 'transfer', amount: 1000000, fromAccountId: 'acc_bank', toAccountId: 'acc_cash', date: '2026-09-10', createdAt: '', updatedAt: '' },
  ];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, null, [], [], [], [], [], [], [], septPeriod);
  assert(report.actualIncomeMinor === 5000000, 'TEST 7: Actual income remains ₹50,000 (transfers excluded)');
  assert(report.actualExpensesMinor === 2000000, 'TEST 7: Actual expenses remains ₹20,000 (transfers excluded)');
  assert(report.netSavingsMinor === 3000000, 'TEST 7: Net savings remains ₹30,000');
  assert(report.transferSummary.totalTransferAmountMinor === 1000000, 'TEST 7: Transfer summary captures ₹10,000');
  assert(report.transferSummary.transferCount === 1, 'TEST 7: Transfer count is 1');
}

// TEST 8: Goal contribution ₹5,000 -> Goal summary increases, Expenses and Net Savings unchanged
{
  const goals: Goal[] = [
    { id: 'g1', name: 'Emergency Fund', targetAmountMinor: 10000000, targetDate: null, priority: 'high', status: 'active', category: 'emergency_fund', colorToken: 'success', createdAt: '', updatedAt: '' },
  ];
  const goalContributions: GoalContribution[] = [
    { id: 'gc1', goalId: 'g1', amountMinor: 500000, date: '2026-09-15', createdAt: '', updatedAt: '' },
  ];
  const txns: Transaction[] = [
    { id: 't1', type: 'income', amount: 5000000, accountId: 'acc_bank', categoryId: 'cat_salary', date: '2026-09-01', createdAt: '', updatedAt: '' },
    { id: 't2', type: 'expense', amount: 2000000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-09-05', createdAt: '', updatedAt: '' },
  ];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, null, [], [], goals, goalContributions, [], [], [], septPeriod);
  assert(report.totalGoalContributionsMinor === 500000, 'TEST 8: Total monthly goal contributions is ₹5,000');
  assert(report.actualExpensesMinor === 2000000, 'TEST 8: Expenses unchanged at ₹20,000');
  assert(report.netSavingsMinor === 3000000, 'TEST 8: Net Savings unchanged at ₹30,000');
}

// TEST 9: Scheduled unpaid expense ₹10,000 -> Actual Expenses unchanged, Expected recurring increases
{
  const schedules: RecurringSchedule[] = [
    { id: 's1', type: 'expense', name: 'Rent', amountMinor: 1000000, classification: 'rent', frequency: 'monthly', interval: 1, startDate: '2026-09-01', isActive: true, createdAt: '', updatedAt: '' },
  ];
  const txns: Transaction[] = [];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, null, [], [], [], [], schedules, [], [], septPeriod, new Date('2026-09-15'));
  assert(report.actualExpensesMinor === 0, 'TEST 9: Actual expenses is 0 (unpaid scheduled items excluded)');
  assert(report.recurringCommitments.expectedRecurringExpensesMinor === 1000000, 'TEST 9: Expected recurring expenses is ₹10,000');
  assert(report.recurringCommitments.actualRecurringExpensesPaidMinor === 0, 'TEST 9: Actual recurring paid is 0');
  assert(report.recurringCommitments.unpaidRecurringExpensesMinor === 1000000, 'TEST 9: Unpaid recurring is ₹10,000');
}

// TEST 10: Record payment ₹9,500 linked to occurrence -> Actual Expenses increases by ₹9,500, Expected recurring remains ₹10,000
{
  const schedules: RecurringSchedule[] = [
    { id: 's1', type: 'expense', name: 'Electricity Bill', amountMinor: 1000000, classification: 'bill', frequency: 'monthly', interval: 1, startDate: '2026-09-01', isActive: true, createdAt: '', updatedAt: '' },
  ];
  const occurrences: OccurrenceRecord[] = [
    { id: 'occ1', occurrenceKey: 's1_2026-09-01', scheduleId: 's1', billId: null, dueDate: '2026-09-01', status: 'paid', transactionId: 't_bill', actualAmountMinor: 950000, actualDate: '2026-09-02', createdAt: '', updatedAt: '' },
  ];
  const txns: Transaction[] = [
    { id: 't_bill', type: 'expense', amount: 950000, accountId: 'acc_bank', categoryId: 'cat_bills', date: '2026-09-02', createdAt: '', updatedAt: '' },
  ];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, null, [], [], [], [], schedules, [], occurrences, septPeriod, new Date('2026-09-15'));
  assert(report.actualExpensesMinor === 950000, 'TEST 10: Actual expenses increases by ₹9,500');
  assert(report.recurringCommitments.expectedRecurringExpensesMinor === 1000000, 'TEST 10: Expected recurring is ₹10,000');
  assert(report.recurringCommitments.actualRecurringExpensesPaidMinor === 950000, 'TEST 10: Actual recurring paid is ₹9,500');
  assert(report.recurringCommitments.paidOccurrencesCount === 1, 'TEST 10: Paid occurrences count is 1');
}

// TEST 11: Compare August vs September -> Verify income/expense/net-savings differences
{
  const augTxns: Transaction[] = [
    { id: 'ta1', type: 'income', amount: 5000000, accountId: 'acc_bank', categoryId: 'cat_salary', date: '2026-08-01', createdAt: '', updatedAt: '' },
    { id: 'ta2', type: 'expense', amount: 2000000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-08-05', createdAt: '', updatedAt: '' },
  ];
  const septTxns: Transaction[] = [
    { id: 'ts1', type: 'income', amount: 5500000, accountId: 'acc_bank', categoryId: 'cat_salary', date: '2026-09-01', createdAt: '', updatedAt: '' },
    { id: 'ts2', type: 'expense', amount: 2200000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-09-05', createdAt: '', updatedAt: '' },
  ];

  const allTxns = [...augTxns, ...septTxns];
  const augSummary = getMonthlyReportSummary(baseAccounts, baseCategories, allTxns, null, [], [], [], [], [], [], [], augPeriod);
  const septSummary = getMonthlyReportSummary(baseAccounts, baseCategories, allTxns, null, [], [], [], [], [], [], [], septPeriod);

  const comparison = comparePeriods(septSummary, augSummary);
  assert(comparison.incomeDifferenceMinor === 500000, 'TEST 11: Income difference is +₹5,000');
  assert(comparison.expensesDifferenceMinor === 200000, 'TEST 11: Expenses difference is +₹2,000');
  assert(comparison.netSavingsDifferenceMinor === 300000, 'TEST 11: Net Savings difference is +₹3,000');
}

// TEST 12: Future month with planned income but no actual income -> Actual income remains 0, Planned income visible
{
  const octBudget: MonthlyBudget = { id: 'b_oct', periodKey: '2026-10', plannedSavingsMinor: 1000000, createdAt: '', updatedAt: '' };
  const octPlannedIncome: PlannedIncomeItem[] = [
    { id: 'pi_oct', monthlyBudgetId: 'b_oct', name: 'Salary', plannedAmountMinor: 5000000, categoryId: 'cat_salary', createdAt: '', updatedAt: '' },
  ];
  const txns: Transaction[] = [];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, octBudget, [], octPlannedIncome, [], [], [], [], [], octPeriod);
  assert(report.actualIncomeMinor === 0, 'TEST 12: Future actual income is 0');
  assert(report.plannedIncomeMinor === 5000000, 'TEST 12: Future planned income is ₹50,000');
  assert(report.savingsRate === null, 'TEST 12: Future savings rate is null (N/A)');
}

// TEST 13: Historical month uses historical budget and transactions, not current month plan
{
  const augBudget: MonthlyBudget = { id: 'b_aug', periodKey: '2026-08', plannedSavingsMinor: 500000, createdAt: '', updatedAt: '' };
  const augBudgetItems: BudgetItem[] = [
    { id: 'bi_aug', monthlyBudgetId: 'b_aug', categoryId: 'cat_food', plannedAmountMinor: 400000, createdAt: '', updatedAt: '' },
  ];
  const txns: Transaction[] = [
    { id: 't_aug', type: 'expense', amount: 350000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-08-10', createdAt: '', updatedAt: '' },
  ];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, augBudget, augBudgetItems, [], [], [], [], [], [], augPeriod);
  assert(report.plannedExpensesMinor === 400000, 'TEST 13: Historical month uses August planned expenses (₹4,000, not Sept ₹7,000)');
  assert(report.actualExpensesMinor === 350000, 'TEST 13: Historical actual expenses is ₹3,500');
  assert(report.budgetVsActual[0].varianceMinor === 50000, 'TEST 13: Historical variance is +₹500 (under budget)');
}

// TEST 14: No financial data period -> Returns zeros/nulls, no fake numbers
{
  const emptyReport = getMonthlyReportSummary(baseAccounts, baseCategories, [], null, [], [], [], [], [], [], [], septPeriod);
  assert(emptyReport.actualIncomeMinor === 0, 'TEST 14: Actual income is 0');
  assert(emptyReport.actualExpensesMinor === 0, 'TEST 14: Actual expenses is 0');
  assert(emptyReport.netSavingsMinor === 0, 'TEST 14: Net savings is 0');
  assert(emptyReport.savingsRate === null, 'TEST 14: Savings rate is null (N/A)');
  assert(emptyReport.incomeBreakdown.length === 0, 'TEST 14: Income breakdown is empty');
  assert(emptyReport.expenseBreakdown.length === 0, 'TEST 14: Expense breakdown is empty');
  assert(emptyReport.hasBudget === false, 'TEST 14: hasBudget is false');
  assert(emptyReport.budgetUtilization === null, 'TEST 14: budgetUtilization is null');
}

// TEST A: Recurring payment double-count protection
// Scheduled: ₹1,000. Actual linked transaction: ₹950.
// Expected recurring: ₹1,000. Actual recurring paid: ₹950. Unpaid: ₹50. Actual expense increases only by ₹950.
{
  const schedule: RecurringSchedule = {
    id: 's_wifi',
    type: 'expense',
    name: 'WiFi Subscription',
    amountMinor: 100000, // ₹1,000
    classification: 'subscription',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-09-01',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };
  const occRecord: OccurrenceRecord = {
    id: 'rec1',
    occurrenceKey: 's_wifi_2026-09-01',
    scheduleId: 's_wifi',
    billId: null,
    dueDate: '2026-09-01',
    status: 'paid',
    transactionId: 'txn_wifi',
    actualAmountMinor: 95000, // ₹950
    actualDate: '2026-09-01',
    createdAt: '',
    updatedAt: '',
  };
  const txn: Transaction = {
    id: 'txn_wifi',
    type: 'expense',
    amount: 95000, // ₹950
    accountId: 'acc_bank',
    categoryId: 'cat_bills',
    date: '2026-09-01',
    createdAt: '',
    updatedAt: '',
  };

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, [txn], null, [], [], [], [], [schedule], [], [occRecord], septPeriod);
  assert(report.recurringCommitments.expectedRecurringExpensesMinor === 100000, 'TEST A: Expected recurring is ₹1,000');
  assert(report.recurringCommitments.actualRecurringExpensesPaidMinor === 95000, 'TEST A: Actual recurring paid is ₹950 (from linked txn)');
  assert(report.recurringCommitments.unpaidRecurringExpensesMinor === 5000, 'TEST A: Unpaid scheduled amount is ₹50 (difference)');
  assert(report.actualExpensesMinor === 95000, 'TEST A: Actual expenses increases only by ₹950 (never double-counted to ₹1,950)');
}

// TEST B: No budget for historical month
// August: no budget, actual expenses ₹20,000 -> hasBudget = false, budgetUtilization = null
{
  const txns: Transaction[] = [
    { id: 't_b', type: 'expense', amount: 2000000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-08-10', createdAt: '', updatedAt: '' },
  ];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, null, [], [], [], [], [], [], [], augPeriod);
  assert(report.actualExpensesMinor === 2000000, 'TEST B: Actual expenses is ₹20,000');
  assert(report.hasBudget === false, 'TEST B: hasBudget is false');
  assert(report.budgetUtilization === null, 'TEST B: budgetUtilization is null');
  assert(report.budgetVsActual.length === 0, 'TEST B: budget comparison items empty');
}

// TEST C: Future month semantics
// Planned income ₹50,000, Actual income ₹0 -> plannedIncome = ₹50,000, actualIncome = 0, savingsRate = null
{
  const octBudget: MonthlyBudget = { id: 'b_oct_c', periodKey: '2026-10', plannedSavingsMinor: 0, createdAt: '', updatedAt: '' };
  const octIncomeItem: PlannedIncomeItem[] = [
    { id: 'pi_c', monthlyBudgetId: 'b_oct_c', name: 'Salary', plannedAmountMinor: 5000000, categoryId: 'cat_salary', createdAt: '', updatedAt: '' },
  ];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, [], octBudget, [], octIncomeItem, [], [], [], [], [], octPeriod);
  assert(report.plannedIncomeMinor === 5000000, 'TEST C: Planned income is ₹50,000');
  assert(report.actualIncomeMinor === 0, 'TEST C: Actual income is 0');
  assert(report.savingsRate === null, 'TEST C: Savings rate is null (N/A)');
}

// TEST D: Account Net Flow vs Net Savings
// Income ₹50,000, Expense ₹20,000, Transfer in ₹10,000, Transfer out ₹5,000
// Expected: Account Net Flow = ₹35,000, Net Savings = ₹30,000
{
  const txns: Transaction[] = [
    { id: 't1', type: 'income', amount: 5000000, accountId: 'acc_bank', categoryId: 'cat_salary', date: '2026-09-01', createdAt: '', updatedAt: '' },
    { id: 't2', type: 'expense', amount: 2000000, accountId: 'acc_bank', categoryId: 'cat_food', date: '2026-09-02', createdAt: '', updatedAt: '' },
    { id: 't3', type: 'transfer', amount: 1000000, fromAccountId: 'acc_cash', toAccountId: 'acc_bank', date: '2026-09-03', createdAt: '', updatedAt: '' },
    { id: 't4', type: 'transfer', amount: 500000, fromAccountId: 'acc_bank', toAccountId: 'acc_cash', date: '2026-09-04', createdAt: '', updatedAt: '' },
  ];

  const report = getMonthlyReportSummary(baseAccounts, baseCategories, txns, null, [], [], [], [], [], [], [], septPeriod);
  const bankReport = report.accountReport.find((a) => a.accountId === 'acc_bank');
  assert(bankReport !== undefined, 'TEST D: Bank account report found');
  assert(bankReport!.periodIncomeMinor === 5000000, 'TEST D: Bank period income is ₹50,000');
  assert(bankReport!.periodExpensesMinor === 2000000, 'TEST D: Bank period expense is ₹20,000');
  assert(bankReport!.periodTransfersInMinor === 1000000, 'TEST D: Bank transfer in is ₹10,000');
  assert(bankReport!.periodTransfersOutMinor === 500000, 'TEST D: Bank transfer out is ₹5,000');
  assert(bankReport!.netFlowMinor === 3500000, 'TEST D: Bank Net Flow is ₹35,000 (50k + 10k - 20k - 5k)');
  assert(report.netSavingsMinor === 3000000, 'TEST D: Overall Net Savings remains strictly ₹30,000 (transfers excluded)');
}

// TEST E: Trend window semantics
// Selected period = September 2026, monthCount = 6 -> [2026-04, 2026-05, 2026-06, 2026-07, 2026-08, 2026-09]
{
  const trend = getMonthlyTrend([], septPeriod, 6);
  assert(trend.length === 6, 'TEST E: Trend contains 6 months');
  const periodKeys = trend.map((t) => t.period.periodKey);
  const expectedKeys = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  assert(
    JSON.stringify(periodKeys) === JSON.stringify(expectedKeys),
    `TEST E: Trend window periods are exact (${periodKeys.join(', ')})`,
  );
}

// TEST F: Category deterministic tie-breaking
// Two categories with equal actual amounts: 'Dining' vs 'Groceries'
{
  const testCats: Category[] = [
    { id: 'cat_g', name: 'Groceries', icon: 'shopping-cart', type: 'expense', isSystem: false, isActive: true, createdAt: '', updatedAt: '' },
    { id: 'cat_d', name: 'Dining', icon: 'utensils', type: 'expense', isSystem: false, isActive: true, createdAt: '', updatedAt: '' },
  ];
  const txns: Transaction[] = [
    { id: 't_g', type: 'expense', amount: 500000, accountId: 'acc_bank', categoryId: 'cat_g', date: '2026-09-01', createdAt: '', updatedAt: '' },
    { id: 't_d', type: 'expense', amount: 500000, accountId: 'acc_bank', categoryId: 'cat_d', date: '2026-09-02', createdAt: '', updatedAt: '' },
  ];

  const breakdown = getExpenseCategoryBreakdown(txns, testCats, septPeriod);
  assert(breakdown.length === 2, 'TEST F: Two categories in breakdown');
  assert(breakdown[0].categoryName === 'Dining', 'TEST F: "Dining" ordered before "Groceries" (alphabetical tie-breaker)');
  assert(breakdown[1].categoryName === 'Groceries', 'TEST F: "Groceries" second');
}

console.log('=== ALL STAGE 9 VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
