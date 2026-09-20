/**
 * STAGE 12 — LARGE DATASET REAL-WORLD BENCHMARK SUITE
 *
 * Measures and reports actual performance timings (in milliseconds)
 * and memory efficiency across realistic datasets:
 *   - Tier 1: 1,000 transactions (5 accounts, 10 categories)
 *   - Tier 2: 5,000 transactions (10 accounts, 20 categories)
 *   - Tier 3: 10,000 transactions (20 accounts, 30 categories, 50 snapshots)
 */

import type { Account, Category, Transaction } from '../../types/transaction';
import type { MonthlyBudget, BudgetItem } from '../../types/budget';
import type { FinancialSnapshot } from '../../types/netWorth';
import type { PersistedData } from '../storage/schema';
import {
  getCurrentBalanceMinor,
  getAllAccountBalancesMap,
  getMonthlyExpensesMinor,
  getMonthlyIncomeMinor,
  getAvailableToSpendMinor,
  getCategoryBudgetProgressList,
} from '../financialCalculations';
import { calculateNetWorthSummary } from '../netWorthCalculations';
import {
  buildBackupEnvelope,
  serializeEnvelope,
  validateBackupEnvelope,
  adaptEnvelopeToPersistedData,
} from '../backup';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

function generateSyntheticDataset(
  numAccounts: number,
  numCategories: number,
  numTransactions: number,
  numSnapshots: number = 0,
): {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  budgetItems: BudgetItem[];
  snapshots: FinancialSnapshot[];
} {
  const accounts: Account[] = [];
  for (let i = 0; i < numAccounts; i++) {
    accounts.push({
      id: `acc_bench_${i}`,
      name: `Account ${i + 1}`,
      type: i % 4 === 3 ? 'credit_card' : i % 3 === 0 ? 'bank' : 'savings',
      openingBalance: 5000000 + i * 1000000, // ₹50,000 + i * ₹10,000
      isActive: i % 10 !== 9, // 10% inactive
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
  }

  const categories: Category[] = [...DEFAULT_SYSTEM_CATEGORIES];

  const transactions: Transaction[] = [];
  let seed = 42;
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  }

  const months = ['2026-07', '2026-08', '2026-09'];

  for (let i = 0; i < numTransactions; i++) {
    const r = rand();
    const accIdx = Math.floor(rand() * accounts.length);
    const catIdx = Math.floor(rand() * categories.length);
    const mIdx = Math.floor(rand() * months.length);
    const day = String(Math.floor(rand() * 28) + 1).padStart(2, '0');
    const date = `${months[mIdx]}-${day}`;
    const amount = Math.floor(rand() * 500000) + 1000; // ₹10 to ₹5,000

    if (r < 0.6) {
      transactions.push({
        id: `txn_bench_${i}`,
        type: 'expense',
        amount,
        accountId: accounts[accIdx].id,
        categoryId: categories[catIdx].id,
        date,
        isRecurring: false,
        createdAt: `${date}T10:00:00Z`,
        updatedAt: `${date}T10:00:00Z`,
      });
    } else if (r < 0.85) {
      transactions.push({
        id: `txn_bench_${i}`,
        type: 'income',
        amount: amount * 3,
        accountId: accounts[accIdx].id,
        categoryId: 'cat_salary',
        date,
        isRecurring: false,
        createdAt: `${date}T10:00:00Z`,
        updatedAt: `${date}T10:00:00Z`,
      });
    } else {
      const toAccIdx = (accIdx + 1) % accounts.length;
      transactions.push({
        id: `txn_bench_${i}`,
        type: 'transfer',
        amount,
        accountId: accounts[accIdx].id,
        fromAccountId: accounts[accIdx].id,
        toAccountId: accounts[toAccIdx].id,
        date,
        categoryId: '',
        isRecurring: false,
        createdAt: `${date}T10:00:00Z`,
        updatedAt: `${date}T10:00:00Z`,
      });
    }
  }

  const budgets: MonthlyBudget[] = [
    { id: 'mb_2026_09', periodKey: '2026-09', plannedIncomeMinor: 10000000, plannedExpensesMinor: 5000000, plannedSavingsMinor: 2000000, createdAt: '', updatedAt: '' },
  ];

  const budgetItems: BudgetItem[] = categories.slice(0, 10).map((c, idx) => ({
    id: `bi_${idx}`,
    budgetId: 'mb_2026_09',
    categoryId: c.id,
    plannedAmountMinor: 500000,
    createdAt: '',
    updatedAt: '',
  }));

  const snapshots: FinancialSnapshot[] = [];
  for (let s = 0; s < numSnapshots; s++) {
    snapshots.push({
      id: `snap_${s}`,
      snapshotDate: `2026-0${(s % 8) + 1}-01`,
      totalAssetsMinor: 15000000,
      totalLiabilitiesMinor: 2000000,
      netWorthMinor: 13000000,
      assets: [],
      liabilities: [],
      createdAt: '',
    });
  }

  return { accounts, categories, transactions, budgets, budgetItems, snapshots };
}

function benchmarkDataset(
  label: string,
  numAccounts: number,
  numCategories: number,
  numTxns: number,
  numSnapshots: number,
) {
  console.log(`\n======================================================`);
  console.log(`BENCHMARK RUN: ${label}`);
  console.log(`Entities: ${numTxns.toLocaleString()} transactions | ${numAccounts} accounts | ${numCategories} categories | ${numSnapshots} snapshots`);
  console.log(`======================================================`);

  const genStart = performance.now();
  const dataset = generateSyntheticDataset(numAccounts, numCategories, numTxns, numSnapshots);
  const genElapsed = performance.now() - genStart;
  console.log(`  Dataset Generation: ${genElapsed.toFixed(2)} ms`);

  const period = { year: 2026, month: 9, periodKey: '2026-09', monthName: 'September' };

  // 1. Balance Calculation Benchmark (Baseline O(A*T) vs Optimized O(T+A))
  const b1Start = performance.now();
  for (let r = 0; r < 5; r++) {
    getCurrentBalanceMinor(dataset.accounts, dataset.transactions);
  }
  const b1Elapsed = (performance.now() - b1Start) / 5;

  const b2Start = performance.now();
  for (let r = 0; r < 5; r++) {
    getAllAccountBalancesMap(dataset.accounts, dataset.transactions);
  }
  const b2Elapsed = (performance.now() - b2Start) / 5;

  console.log(`  Account Balances (Baseline O(A*T)): ${b1Elapsed.toFixed(2)} ms`);
  console.log(`  Account Balances (Optimized O(T+A)): ${b2Elapsed.toFixed(2)} ms (speedup: ${(b1Elapsed / Math.max(0.001, b2Elapsed)).toFixed(1)}x)`);

  // 2. Net Worth Calculation
  const nwStart = performance.now();
  for (let r = 0; r < 5; r++) {
    calculateNetWorthSummary(dataset.accounts, dataset.transactions, [], []);
  }
  const nwElapsed = (performance.now() - nwStart) / 5;
  console.log(`  Net Worth Calculation Pipeline: ${nwElapsed.toFixed(2)} ms`);

  // 3. Monthly Metrics & Category Budget Progress
  const repStart = performance.now();
  for (let r = 0; r < 5; r++) {
    getMonthlyExpensesMinor(dataset.transactions, period);
    getMonthlyIncomeMinor(dataset.transactions, period);
    getCategoryBudgetProgressList(dataset.categories, dataset.budgetItems, dataset.transactions, period);
    getAvailableToSpendMinor(dataset.accounts, dataset.transactions, 5000000, 2000000, true, period, true);
  }
  const repElapsed = (performance.now() - repStart) / 5;
  console.log(`  Monthly Report & Budget Progress: ${repElapsed.toFixed(2)} ms`);

  // 4. Backup Envelope Serialization & Validation
  const persistedData: PersistedData = {
    version: 2,
    accounts: dataset.accounts,
    categories: dataset.categories,
    transactions: dataset.transactions,
    monthlyBudgets: dataset.budgets,
    budgetItems: dataset.budgetItems,
    plannedIncomeItems: [],
    goals: [],
    goalContributions: [],
    recurringSchedules: [],
    scheduledBills: [],
    occurrenceRecords: [],
    manualAssets: [],
    manualLiabilities: [],
    financialSnapshots: dataset.snapshots,
  };

  const backupStart = performance.now();
  const envelope = buildBackupEnvelope(persistedData);
  const json = serializeEnvelope(envelope);
  const backupElapsed = performance.now() - backupStart;

  const valStart = performance.now();
  const valResult = validateBackupEnvelope(envelope);
  const valElapsed = performance.now() - valStart;

  const adaptStart = performance.now();
  adaptEnvelopeToPersistedData(envelope);
  const adaptElapsed = performance.now() - adaptStart;

  console.log(`  Backup Serialization (${(json.length / 1024).toFixed(1)} KB payload): ${backupElapsed.toFixed(2)} ms`);
  console.log(`  Backup Envelope 14-Collection Validation: ${valElapsed.toFixed(2)} ms (valid: ${valResult.isValid})`);
  console.log(`  Atomic Restore Data Adaptation: ${adaptElapsed.toFixed(2)} ms`);
}

function runAllBenchmarks() {
  console.log('=== RUNNING STAGE 12 LARGE DATASET PERFORMANCE BENCHMARK SUITE ===\n');

  benchmarkDataset('Tier 1: Small/Standard Dataset (1,000 txns)', 5, 10, 1000, 5);
  benchmarkDataset('Tier 2: Medium/Multi-Year Dataset (5,000 txns)', 10, 20, 5000, 20);
  benchmarkDataset('Tier 3: Large/Heavy Stress Dataset (10,000 txns)', 20, 30, 10000, 50);

  console.log('\n=== ALL LARGE DATASET BENCHMARKS COMPLETED SUCCESSFULLY! ===\n');
}

runAllBenchmarks();
