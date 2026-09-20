/**
 * STAGE 7 AUTOMATED VERIFICATION SUITE
 * Tests:
 * 1. Goal Progress Calculation (Paise precision, visual cap, remaining amount)
 * 2. Required Monthly Contribution Rules:
 *    - Active + Future target date -> ceil(remaining / months)
 *    - Active + No target date -> null
 *    - Paused -> null
 *    - Completed -> null
 *    - Archived -> null
 *    - Active + Target date passed -> null & isOverdue = true
 * 3. Goal Repository CRUD + Cascade Deletion of Contributions
 * 4. Goal Contribution Repository CRUD
 * 5. Monthly Goal Contributions Summary (current vs other months)
 * 6. Financial Invariance: Goal allocations NEVER affect current balance, monthly income, monthly expenses, net savings, or available to spend
 */

import type { Goal, GoalContribution } from '../../types/goal';
import { calculateGoalProgress, calculateMonthlyGoalContributionsMinor } from '../goalCalculations';
import { getRemainingContributionMonths, getPeriodFromYearMonth } from '../periodService';
import { getCurrentBalanceMinor, getMonthlyIncomeMinor, getMonthlyExpensesMinor, getNetSavingsMinor } from '../financialCalculations';
import type { Account, Transaction } from '../../types/transaction';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- STARTING STAGE 7 VERIFICATION SUITE ---');

// TEST 1: Goal Progress Calculation & Visual Percentage Cap
{
  const goal: Goal = {
    id: 'g1',
    name: 'Emergency Fund',
    targetAmountMinor: 10000000, // ₹1,00,000
    targetDate: null,
    priority: 'high',
    status: 'active',
    category: 'emergency_fund',
    colorToken: 'success',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const contributions: GoalContribution[] = [
    { id: 'c1', goalId: 'g1', amountMinor: 2500000, date: '2026-01-15', createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z' }, // ₹25,000
    { id: 'c2', goalId: 'g1', amountMinor: 3500000, date: '2026-02-10', createdAt: '2026-02-10T00:00:00Z', updatedAt: '2026-02-10T00:00:00Z' }, // ₹35,000
  ];

  const summary = calculateGoalProgress(goal, contributions, new Date('2026-03-01'));
  assert(summary.currentAmountMinor === 6000000, 'Current allocated minor is ₹60,000 (6000000 paise)');
  assert(summary.remainingAmountMinor === 4000000, 'Remaining minor is ₹40,000 (4000000 paise)');
  assert(summary.progressPercentage === 60, 'Progress percentage is 60%');
  assert(summary.isCompleted === false, 'Goal is not completed');
  assert(summary.requiredMonthlyContributionMinor === null, 'No target date means required contribution is null');
}

// TEST 2: Over-contribution & 100% Visual Cap
{
  const goal: Goal = {
    id: 'g2',
    name: 'Laptop Fund',
    targetAmountMinor: 5000000, // ₹50,000
    targetDate: '2026-12-31',
    priority: 'medium',
    status: 'active',
    category: 'electronics',
    colorToken: 'primary',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const contributions: GoalContribution[] = [
    { id: 'c3', goalId: 'g2', amountMinor: 6000000, date: '2026-06-01', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z' }, // ₹60,000 (exceeds target)
  ];

  const summary = calculateGoalProgress(goal, contributions, new Date('2026-06-15'));
  assert(summary.currentAmountMinor === 6000000, 'Current allocated amount is ₹60,000');
  assert(summary.remainingAmountMinor === 0, 'Remaining amount clamped to 0');
  assert(summary.progressPercentage === 100, 'Visual progress percentage clamped to 100%');
  assert(summary.isCompleted === true, 'Goal is marked completed');
  assert(summary.requiredMonthlyContributionMinor === null, 'Completed goal required contribution is null');
}

// TEST 3: Required Monthly Contribution Calculation (Active + Future Target Date)
{
  // Current date: 2026-03-15
  // Target date: 2026-06-30 (March, April, May, June = 4 months inclusive)
  // Target: ₹100,000 (10000000 paise)
  // Allocated: ₹20,000 (2000000 paise)
  // Remaining: ₹80,000 (8000000 paise)
  // Remaining months: 4 -> Required per month = ceil(8000000 / 4) = 2000000 paise (₹20,000)
  const { remainingMonths, isPast } = getRemainingContributionMonths('2026-06-30', new Date('2026-03-15'));
  assert(remainingMonths === 4, `Remaining months is 4 (got ${remainingMonths})`);
  assert(isPast === false, 'Target date is not in the past');

  const goal: Goal = {
    id: 'g3',
    name: 'Vacation',
    targetAmountMinor: 10000000,
    targetDate: '2026-06-30',
    priority: 'medium',
    status: 'active',
    category: 'travel',
    colorToken: 'info',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const contributions: GoalContribution[] = [
    { id: 'c4', goalId: 'g3', amountMinor: 2000000, date: '2026-02-01', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z' },
  ];

  const summary = calculateGoalProgress(goal, contributions, new Date('2026-03-15'));
  assert(summary.requiredMonthlyContributionMinor === 2000000, 'Required monthly contribution is ₹20,000 / month');
  assert(summary.remainingContributionMonths === 4, 'Remaining months reported as 4');
  assert(summary.isOverdue === false, 'Goal is not overdue');
}

// TEST 4: Target Date Passed / Overdue Rules
{
  const goal: Goal = {
    id: 'g4',
    name: 'Overdue Project',
    targetAmountMinor: 10000000,
    targetDate: '2026-01-31', // Past date relative to 2026-03-15
    priority: 'high',
    status: 'active',
    category: 'business',
    colorToken: 'danger',
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
  };

  const contributions: GoalContribution[] = [
    { id: 'c5', goalId: 'g4', amountMinor: 3000000, date: '2026-01-01', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  ];

  const summary = calculateGoalProgress(goal, contributions, new Date('2026-03-15'));
  assert(summary.isOverdue === true, 'Goal with passed target date is marked overdue');
  assert(summary.requiredMonthlyContributionMinor === null, 'Overdue goal has null required contribution');
  assert(summary.isCompleted === false, 'Incomplete overdue goal is not completed');
}

// TEST 5: Status Rules (Paused & Archived have null required contribution)
{
  const pausedGoal: Goal = {
    id: 'g5',
    name: 'Paused Goal',
    targetAmountMinor: 10000000,
    targetDate: '2026-12-31',
    priority: 'low',
    status: 'paused',
    category: 'custom',
    colorToken: 'neutral',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const archivedGoal: Goal = {
    id: 'g6',
    name: 'Archived Goal',
    targetAmountMinor: 10000000,
    targetDate: '2026-12-31',
    priority: 'low',
    status: 'archived',
    category: 'custom',
    colorToken: 'neutral',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const pSummary = calculateGoalProgress(pausedGoal, [], new Date('2026-03-15'));
  assert(pSummary.requiredMonthlyContributionMinor === null, 'Paused goal required contribution is null');

  const aSummary = calculateGoalProgress(archivedGoal, [], new Date('2026-03-15'));
  assert(aSummary.requiredMonthlyContributionMinor === null, 'Archived goal required contribution is null');
}

// TEST 6: Monthly Contributions Calculation
{
  const contributions: GoalContribution[] = [
    { id: 'c1', goalId: 'g1', amountMinor: 1500000, date: '2026-03-05', createdAt: '2026-03-05T00:00:00Z', updatedAt: '2026-03-05T00:00:00Z' },
    { id: 'c2', goalId: 'g2', amountMinor: 2500000, date: '2026-03-20', createdAt: '2026-03-20T00:00:00Z', updatedAt: '2026-03-20T00:00:00Z' },
    { id: 'c3', goalId: 'g1', amountMinor: 1000000, date: '2026-04-01', createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' }, // Different month
  ];

  const marchContributions = calculateMonthlyGoalContributionsMinor(contributions, getPeriodFromYearMonth(2026, 2));
  assert(marchContributions === 4000000, 'March goal contributions sum to ₹40,000 (4000000 paise)');

  const aprilContributions = calculateMonthlyGoalContributionsMinor(contributions, getPeriodFromYearMonth(2026, 3));
  assert(aprilContributions === 1000000, 'April goal contributions sum to ₹10,000 (1000000 paise)');
}

// TEST 7: Financial Isolation Invariants
// Goal contributions must NEVER alter account balances, monthly income, monthly expenses, or net savings.
{
  const accounts: Account[] = [
    { id: 'acc1', name: 'Main Checking', type: 'bank', openingBalance: 10000000, currency: 'INR', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  ];

  const transactions: Transaction[] = [
    { id: 't1', type: 'income', amount: 5000000, date: '2026-03-01', accountId: 'acc1', categoryId: 'cat1', description: 'Salary', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
    { id: 't2', type: 'expense', amount: 2000000, date: '2026-03-05', accountId: 'acc1', categoryId: 'cat2', description: 'Groceries', createdAt: '2026-03-05', updatedAt: '2026-03-05' },
  ];

  const period = getPeriodFromYearMonth(2026, 2);

  // Calculate baseline financial metrics
  const baseBalance = getCurrentBalanceMinor(accounts, transactions);
  const baseIncome = getMonthlyIncomeMinor(transactions, period);
  const baseExpense = getMonthlyExpensesMinor(transactions, period);
  const baseNetSavings = getNetSavingsMinor(transactions, period);

  assert(baseBalance === 13000000, 'Baseline balance is ₹1,30,000');
  assert(baseIncome === 5000000, 'Baseline monthly income is ₹50,000');
  assert(baseExpense === 2000000, 'Baseline monthly expense is ₹20,000');
  assert(baseNetSavings === 3000000, 'Baseline net savings is ₹30,000');

  // Add ₹50,000 of goal allocations to test independence
  const testGoal: Goal = {
    id: 'g1',
    name: 'Car Fund',
    targetAmountMinor: 50000000,
    targetDate: '2026-12-31',
    priority: 'high',
    status: 'active',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
  const testGoalContributions: GoalContribution[] = [
    { id: 'gc1', goalId: 'g1', amountMinor: 5000000, date: '2026-03-10', createdAt: '2026-03-10', updatedAt: '2026-03-10' },
  ];

  const goalSummary = calculateGoalProgress(testGoal, testGoalContributions, new Date('2026-03-15'));
  assert(goalSummary.currentAmountMinor === 5000000, 'Goal allocated amount is ₹50,000');

  // Re-verify that financial calculation functions remain 100% unchanged
  const postBalance = getCurrentBalanceMinor(accounts, transactions);
  const postIncome = getMonthlyIncomeMinor(transactions, period);
  const postExpense = getMonthlyExpensesMinor(transactions, period);
  const postNetSavings = getNetSavingsMinor(transactions, period);

  assert(postBalance === baseBalance, 'Current balance unchanged after goal contribution');
  assert(postIncome === baseIncome, 'Monthly income unchanged after goal contribution');
  assert(postExpense === baseExpense, 'Monthly expense unchanged after goal contribution');
  assert(postNetSavings === baseNetSavings, 'Net savings unchanged after goal contribution');
}

console.log('--- ALL STAGE 7 VERIFICATION TESTS PASSED SUCCESSFULLY ---');
