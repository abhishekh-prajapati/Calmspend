import {
  derivePlanStatus,
  getAvailableToSpendMinor,
  getDailyAllowanceMinor,
  getCurrentBalanceMinor,
  getCategoryBudgetProgressList,
} from '../financialCalculations';
import {
  getPeriodInfo,
  getPeriodFromYearMonth,
  isCurrentPeriod,
  getDaysInMonth,
  getRemainingDaysInMonth,
} from '../periodService';
import { MonthlyBudgetRepository } from '../repositories/monthlyBudgetRepository';
import type { IStorageAdapter } from '../storage/storageAdapter';
import type { PersistedData } from '../storage/schema';
import type { Account, Category, Transaction } from '../../types/transaction';
import type { BudgetItem } from '../../types/budget';


// In-Memory Storage Adapter for unit testing
class MockStorageAdapter implements IStorageAdapter {
  private data: PersistedData;

  constructor(initialData?: Partial<PersistedData>) {
    this.data = {
      version: 2,
      accounts: [],
      categories: [
        { id: 'cat_food', name: 'Food & Dining', icon: 'Utensils', color: '#ef4444', type: 'expense', isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
        { id: 'cat_transport', name: 'Transportation', icon: 'Car', color: '#f59e0b', type: 'expense', isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
        { id: 'cat_bills', name: 'Bills & Utilities', icon: 'Receipt', color: '#8b5cf6', type: 'expense', isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
        { id: 'cat_salary', name: 'Salary', icon: 'Briefcase', color: '#10b981', type: 'income', isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
      ],
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
      ...initialData,
    };
  }

  loadData(): PersistedData {
    return JSON.parse(JSON.stringify(this.data));
  }

  saveData(data: PersistedData): boolean {
    this.data = JSON.parse(JSON.stringify(data));
    return true;
  }

  clearData(): void {
    this.data.transactions = [];
    this.data.monthlyBudgets = [];
    this.data.budgetItems = [];
    this.data.plannedIncomeItems = [];
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
  console.log(`PASS: ${msg}`);
}

async function runStage6Verification() {
  console.log('=== RUNNING STAGE 6 VERIFICATION SUITE ===\n');

  // TEST E: No planning data exists -> Status = Not Started
  {
    const status = derivePlanStatus(0, 0, 0, 0, 0);
    assert(status === 'not_started', 'TEST E: No planning data -> Status is not_started');
  }

  // TEST F: Planned Income = ₹50,000, Planned Expenses = ₹30,000, Planned Savings = ₹10,000 -> Fully Planned, Unallocated = ₹10,000
  {
    const income = 5000000;
    const expenses = 3000000;
    const savings = 1000000;
    const status = derivePlanStatus(income, expenses, savings, 1, 1);
    const unallocated = income - expenses - savings;
    assert(status === 'fully_planned', 'TEST F: Plan status is fully_planned');
    assert(unallocated === 1000000, 'TEST F: Unallocated is ₹10,000 (1000000 paise)');
  }

  // TEST G: Planned Income = ₹50,000, Planned Expenses = ₹35,000, Planned Savings = ₹20,000 -> Over Allocated, Unallocated = -₹5,000
  {
    const income = 5000000;
    const expenses = 3500000;
    const savings = 2000000;
    const status = derivePlanStatus(income, expenses, savings, 1, 1);
    const unallocated = income - expenses - savings;
    assert(status === 'over_allocated', 'TEST G: Plan status is over_allocated');
    assert(unallocated === -500000, 'TEST G: Unallocated is -₹5,000 (-500000 paise)');
  }

  // TEST D: Current Month Non-Circular Available To Spend
  // Current Balance = ₹40,000, Planned Expenses = ₹30,000, Actual Expenses = ₹15,000, Planned Savings = ₹10,000
  // Remaining Planned Expenses = max(0, 30000 - 15000) = ₹15,000
  // Available To Spend = 40000 - 15000 - 10000 = ₹15,000
  {
    const accounts: Account[] = [
      { id: 'acc1', name: 'Main Bank', type: 'bank', openingBalance: 4000000, currency: 'INR', isActive: true, createdAt: '', updatedAt: '' },
    ];
    const period = getPeriodInfo(new Date('2026-09-15'));
    const transactions: Transaction[] = [
      { id: 'txn1', type: 'expense', amount: 1500000, accountId: 'acc1', categoryId: 'cat_food', date: '2026-09-10', description: 'Grocery', createdAt: '', updatedAt: '' },
    ];
    // Current balance is 4000000 - 1500000 = 2500000 paise (₹25,000).
    // Let's set opening balance to 5500000 so current balance after 1500000 spend is 4000000 paise (₹40,000) as in test description.
    accounts[0].openingBalance = 5500000; // balance after 1500000 spend = 4000000 paise
    const curBal = getCurrentBalanceMinor(accounts, transactions);
    assert(curBal === 4000000, 'TEST D: Current Usable Balance is ₹40,000 (4000000 paise)');

    const plannedExpensesMinor = 3000000; // ₹30,000
    const plannedSavingsMinor = 1000000; // ₹10,000
    const ats = getAvailableToSpendMinor(accounts, transactions, plannedExpensesMinor, plannedSavingsMinor, true, period, true);
    assert(ats === 1500000, `TEST D: Available to Spend is ₹15,000 (1500000 paise). Actual was ${ats}`);
  }

  // TEST A: Current month has a valid budget -> ATS and Daily Allowance calculated
  {
    const accounts: Account[] = [
      { id: 'acc1', name: 'Bank', type: 'bank', openingBalance: 5000000, currency: 'INR', isActive: true, createdAt: '', updatedAt: '' },
    ];
    const fixedDate = new Date('2026-09-16'); // Day 16 of 30 days -> 30 - 16 + 1 = 15 remaining days
    const period = getPeriodInfo(fixedDate);
    const transactions: Transaction[] = [];
    const ats = getAvailableToSpendMinor(accounts, transactions, 2000000, 1000000, true, period, true);
    assert(ats === 2000000, 'TEST A: Available to Spend calculated for current month (₹20,000)');

    const da = getDailyAllowanceMinor(ats, true, fixedDate);
    // 2000000 paise / 15 remaining days = 133333 paise (₹1,333.33)
    assert(da === Math.round(2000000 / 15), `TEST A: Daily Allowance calculated for current month (${da} paise)`);
  }

  // TEST B: Past Month Selected -> ATS and Daily Allowance MUST BE null
  {
    const accounts: Account[] = [
      { id: 'acc1', name: 'Bank', type: 'bank', openingBalance: 5000000, currency: 'INR', isActive: true, createdAt: '', updatedAt: '' },
    ];
    const pastPeriod = getPeriodFromYearMonth(2026, 7); // August 2026 (past relative to Sept 2026)
    const transactions: Transaction[] = [];
    const isCur = isCurrentPeriod(pastPeriod, new Date('2026-09-16'));
    assert(!isCur, 'TEST B: August is correctly identified as not current period');

    const ats = getAvailableToSpendMinor(accounts, transactions, 2000000, 1000000, isCur, pastPeriod, true);
    const da = getDailyAllowanceMinor(ats, isCur, new Date('2026-09-16'));
    assert(ats === null, 'TEST B: Available to Spend is null for past month');
    assert(da === null, 'TEST B: Daily Allowance is null for past month');
  }

  // TEST C: Future Month Selected -> ATS and Daily Allowance MUST BE null
  {
    const accounts: Account[] = [
      { id: 'acc1', name: 'Bank', type: 'bank', openingBalance: 5000000, currency: 'INR', isActive: true, createdAt: '', updatedAt: '' },
    ];
    const futurePeriod = getPeriodFromYearMonth(2026, 9); // October 2026 (future relative to Sept 2026)
    const transactions: Transaction[] = [];
    const isCur = isCurrentPeriod(futurePeriod, new Date('2026-09-16'));
    assert(!isCur, 'TEST C: October is correctly identified as not current period');

    const ats = getAvailableToSpendMinor(accounts, transactions, 2000000, 1000000, isCur, futurePeriod, true);
    const da = getDailyAllowanceMinor(ats, isCur, new Date('2026-09-16'));
    assert(ats === null, 'TEST C: Available to Spend is null for future month');
    assert(da === null, 'TEST C: Daily Allowance is null for future month');
  }

  // TEST 45: Category Budget vs Actual & Overspending
  {
    const categories: Category[] = [
      { id: 'cat_food', name: 'Food', icon: 'Utensils', type: 'expense', isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
    ];
    const period = getPeriodInfo(new Date('2026-09-01'));
    const budgetItems: BudgetItem[] = [
      { id: 'b1', monthlyBudgetId: 'mb1', categoryId: 'cat_food', plannedAmountMinor: 500000, createdAt: '', updatedAt: '' }, // ₹5,000
    ];
    let transactions: Transaction[] = [
      { id: 't1', type: 'expense', amount: 200000, accountId: 'a1', categoryId: 'cat_food', date: '2026-09-05', description: 'Lunch', createdAt: '', updatedAt: '' }, // ₹2,000
    ];

    let progress = getCategoryBudgetProgressList(categories, budgetItems, transactions, period);
    assert(progress[0].actualAmountMinor === 200000, 'TEST 45: Actual food expense is ₹2,000 (200000 paise)');
    assert(progress[0].remainingAmountMinor === 300000, 'TEST 45: Remaining budget is ₹3,000 (300000 paise)');
    assert(!progress[0].isOverspent, 'TEST 45: Not overspent yet');

    // Add ₹4,000 more food expense -> total ₹6,000
    transactions.push({
      id: 't2', type: 'expense', amount: 400000, accountId: 'a1', categoryId: 'cat_food', date: '2026-09-12', description: 'Dinner', createdAt: '', updatedAt: ''
    });
    progress = getCategoryBudgetProgressList(categories, budgetItems, transactions, period);
    assert(progress[0].actualAmountMinor === 600000, 'TEST 45: Actual food expense is ₹6,000 (600000 paise)');
    assert(progress[0].remainingAmountMinor === -100000, 'TEST 45: Remaining budget is -₹1,000 (-100000 paise)');
    assert(progress[0].isOverspent === true, 'TEST 45: Category is marked as isOverspent = true');
  }

  // TEST 46 & 47: Period Isolation & Future Month Safety
  {
    const adapter = new MockStorageAdapter();
    const repo = new MonthlyBudgetRepository(adapter);

    repo.saveBudgetItem('2026-08', 'cat_food', 400000); // August Food ₹4,000
    repo.saveBudgetItem('2026-09', 'cat_food', 500000); // September Food ₹5,000
    repo.saveBudgetItem('2026-10', 'cat_food', 600000); // October Food ₹6,000

    const augItems = repo.getBudgetItemsByPeriodKey('2026-08');
    const septItems = repo.getBudgetItemsByPeriodKey('2026-09');
    const octItems = repo.getBudgetItemsByPeriodKey('2026-10');

    assert(augItems[0].plannedAmountMinor === 400000, 'TEST 46: August Food remains ₹4,000');
    assert(septItems[0].plannedAmountMinor === 500000, 'TEST 46: September Food is ₹5,000');
    assert(octItems[0].plannedAmountMinor === 600000, 'TEST 47: October Food exists independently at ₹6,000');
  }

  // TEST 48: Copy Previous Month Plan
  {
    const adapter = new MockStorageAdapter();
    const repo = new MonthlyBudgetRepository(adapter);

    repo.saveBudgetItem('2026-09', 'cat_food', 500000);
    repo.saveBudgetItem('2026-09', 'cat_transport', 300000);
    repo.savePlannedIncomeItem('2026-09', 'Salary', 5000000);
    repo.setPlannedSavings('2026-09', 1000000);

    // Copy to 2026-10
    const copied = repo.copyPlan('2026-09', '2026-10');
    assert(copied.periodKey === '2026-10', 'TEST 48: Copied plan period is 2026-10');
    assert(copied.plannedSavingsMinor === 1000000, 'TEST 48: Copied planned savings is ₹10,000');

    const octBudgets = repo.getBudgetItemsByPeriodKey('2026-10');
    assert(octBudgets.length === 2, 'TEST 48: Copied 2 budget envelopes');
    const octIncome = repo.getPlannedIncomeItemsByPeriodKey('2026-10');
    assert(octIncome.length === 1 && octIncome[0].plannedAmountMinor === 5000000, 'TEST 48: Copied planned income source');
  }

  // TEST 50: Dynamic Daily Allowance Edge Cases (Leap year, 28, 29, 30, 31 days)
  {
    // Feb in non-leap year (2025)
    assert(getDaysInMonth(2025, 1) === 28, 'TEST 50: Feb 2025 has 28 days');
    // Feb in leap year (2024)
    assert(getDaysInMonth(2024, 1) === 29, 'TEST 50: Feb 2024 has 29 days (Leap Year)');
    // Sept (30 days)
    assert(getDaysInMonth(2026, 8) === 30, 'TEST 50: Sept 2026 has 30 days');
    // Aug (31 days)
    assert(getDaysInMonth(2026, 7) === 31, 'TEST 50: Aug 2026 has 31 days');

    // First day of month (Sept 1) -> remaining days = 30 - 1 + 1 = 30
    assert(getRemainingDaysInMonth(new Date('2026-09-01')) === 30, 'TEST 50: Sept 1 has 30 remaining days');
    // Final day of month (Sept 30) -> remaining days = 30 - 30 + 1 = 1
    assert(getRemainingDaysInMonth(new Date('2026-09-30')) === 1, 'TEST 50: Sept 30 has 1 remaining day');
    // Final day allowance = availableToSpend / 1 = availableToSpend (no zero division)
    const daLastDay = getDailyAllowanceMinor(1500000, true, new Date('2026-09-30'));
    assert(daLastDay === 1500000, 'TEST 50: Last day allowance equals full remaining Available to Spend');
  }

  // TEST 51 & 52: Persistence & Delete Plan Safety (Transactions 100% intact)
  {
    const adapter = new MockStorageAdapter();
    const repo = new MonthlyBudgetRepository(adapter);

    // Add a transaction to store
    const storeData = adapter.loadData();
    storeData.transactions.push({
      id: 'real_txn_1',
      type: 'expense',
      amount: 250000,
      accountId: 'acc1',
      date: '2026-09-10',
      description: 'Real Grocery',
      createdAt: '',
      updatedAt: '',
    });
    storeData.accounts.push({
      id: 'acc1',
      name: 'Checking',
      type: 'bank',
      openingBalance: 10000000,
      currency: 'INR',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    });
    adapter.saveData(storeData);

    // Create plan
    repo.saveBudgetItem('2026-09', 'cat_food', 500000);
    repo.savePlannedIncomeItem('2026-09', 'Salary', 5000000);

    // Delete plan
    const deleted = repo.deleteMonthlyPlan('2026-09');
    assert(deleted === true, 'TEST 52: Monthly plan deleted successfully');

    // Verify planning records removed
    assert(repo.getByPeriodKey('2026-09') === undefined, 'TEST 52: Budget record removed');
    assert(repo.getBudgetItemsByPeriodKey('2026-09').length === 0, 'TEST 52: Budget items removed');

    // Verify real transaction & account are completely intact
    const finalStore = adapter.loadData();
    assert(finalStore.transactions.length === 1, 'TEST 52: Real transaction is 100% intact');
    assert(finalStore.accounts.length === 1, 'TEST 52: Account is 100% intact');
  }

  console.log('\n=== ALL STAGE 6 VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runStage6Verification().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
});
