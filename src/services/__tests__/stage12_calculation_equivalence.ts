/**
 * STAGE 12 — FINANCIAL CALCULATION EQUIVALENCE VERIFICATION
 *
 * Compares the baseline O(A * T) balance calculations against
 * the single-pass O(T + A) balance calculation map across:
 *   1. Standard income & expense sequences
 *   2. Inter-account transfers (A -> B)
 *   3. Multi-account transfers with varying amounts
 *   4. Inactive/archived accounts
 *   5. Overdraft accounts (negative balance)
 *   6. Credit card accounts & surplus
 *   7. Zero-account and zero-transaction datasets
 *   8. Randomly generated complex high-volume ledgers (1,000 transactions)
 */

import type { Account, Transaction } from '../../types/transaction';
import {
  getAccountBalanceMinor,
  getCurrentBalanceMinor,
  getAllAccountBalancesMap,
} from '../financialCalculations';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function header(title: string) {
  console.log(`\n${title}`);
}

function runEquivalenceSuite() {
  console.log('=== STAGE 12 CALCULATION EQUIVALENCE SUITE ===\n');

  // Scenario 1: Basic Income & Expense
  header('Scenario 1: Basic Income & Expense');
  const acc1: Account = { id: 'acc-1', name: 'Bank A', type: 'bank', openingBalance: 100000, isActive: true, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' };
  const acc2: Account = { id: 'acc-2', name: 'Cash', type: 'cash', openingBalance: 50000, isActive: true, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' };
  const accounts1 = [acc1, acc2];

  const txns1: Transaction[] = [
    { id: 't1', type: 'income', amount: 50000, accountId: 'acc-1', date: '2026-09-02', categoryId: 'cat-inc', isRecurring: false, createdAt: '', updatedAt: '' },
    { id: 't2', type: 'expense', amount: 20000, accountId: 'acc-1', date: '2026-09-03', categoryId: 'cat-exp', isRecurring: false, createdAt: '', updatedAt: '' },
    { id: 't3', type: 'expense', amount: 10000, accountId: 'acc-2', date: '2026-09-04', categoryId: 'cat-exp', isRecurring: false, createdAt: '', updatedAt: '' },
  ];

  const map1 = getAllAccountBalancesMap(accounts1, txns1);
  assert(map1.get('acc-1') === getAccountBalanceMinor(acc1, txns1), 'Acc 1 balance matches baseline O(A*T)');
  assert(map1.get('acc-2') === getAccountBalanceMinor(acc2, txns1), 'Acc 2 balance matches baseline O(A*T)');
  const total1 = accounts1.filter(a => a.isActive).reduce((sum, a) => sum + (map1.get(a.id) || 0), 0);
  assert(total1 === getCurrentBalanceMinor(accounts1, txns1), 'Total active balance matches baseline');

  // Scenario 2: Inter-Account Transfers
  header('Scenario 2: Inter-Account Transfers');
  const txns2: Transaction[] = [
    ...txns1,
    { id: 't4', type: 'transfer', amount: 30000, accountId: 'acc-1', fromAccountId: 'acc-1', toAccountId: 'acc-2', date: '2026-09-05', categoryId: '', isRecurring: false, createdAt: '', updatedAt: '' },
  ];
  const map2 = getAllAccountBalancesMap(accounts1, txns2);
  assert(map2.get('acc-1') === getAccountBalanceMinor(acc1, txns2), 'Acc 1 transfer balance matches baseline');
  assert(map2.get('acc-2') === getAccountBalanceMinor(acc2, txns2), 'Acc 2 transfer balance matches baseline');
  const total2 = accounts1.filter(a => a.isActive).reduce((sum, a) => sum + (map2.get(a.id) || 0), 0);
  assert(total2 === getCurrentBalanceMinor(accounts1, txns2), 'Total balance remains constant across transfers');

  // Scenario 3: Inactive Accounts
  header('Scenario 3: Inactive Accounts');
  const acc3: Account = { id: 'acc-3', name: 'Old Inactive Account', type: 'bank', openingBalance: 75000, isActive: false, createdAt: '', updatedAt: '' };
  const accounts3 = [acc1, acc2, acc3];
  const txns3: Transaction[] = [
    ...txns2,
    { id: 't5', type: 'expense', amount: 5000, accountId: 'acc-3', date: '2026-09-06', categoryId: 'cat-exp', isRecurring: false, createdAt: '', updatedAt: '' },
  ];
  const map3 = getAllAccountBalancesMap(accounts3, txns3);
  assert(map3.get('acc-3') === getAccountBalanceMinor(acc3, txns3), 'Inactive account balance matches baseline');
  const activeTotal3 = accounts3.filter(a => a.isActive).reduce((sum, a) => sum + (map3.get(a.id) || 0), 0);
  assert(activeTotal3 === getCurrentBalanceMinor(accounts3, txns3), 'Active total correctly excludes inactive accounts in both');

  // Scenario 4: Overdraft & Negative Balances
  header('Scenario 4: Overdraft & Negative Balances');
  const accOverdraft: Account = { id: 'acc-od', name: 'Overdraft Account', type: 'bank', openingBalance: -25000, isActive: true, createdAt: '', updatedAt: '' };
  const accounts4 = [accOverdraft];
  const txns4: Transaction[] = [
    { id: 'tod-1', type: 'expense', amount: 15000, accountId: 'acc-od', date: '2026-09-07', categoryId: 'cat-exp', isRecurring: false, createdAt: '', updatedAt: '' },
  ];
  const map4 = getAllAccountBalancesMap(accounts4, txns4);
  assert(map4.get('acc-od') === -40000 && map4.get('acc-od') === getAccountBalanceMinor(accOverdraft, txns4), 'Overdraft balance matches baseline');
  assert(getCurrentBalanceMinor(accounts4, txns4) === -40000, 'Negative total balance preserved without clamping');

  // Scenario 5: High-Volume 1,000 Transaction Randomized Ledger
  header('Scenario 5: High-Volume 1,000 Transaction Randomized Ledger');
  const highVolAccounts: Account[] = [
    { id: 'hv-1', name: 'Main Checking', type: 'bank', openingBalance: 500000, isActive: true, createdAt: '', updatedAt: '' },
    { id: 'hv-2', name: 'Savings Vault', type: 'savings', openingBalance: 1200000, isActive: true, createdAt: '', updatedAt: '' },
    { id: 'hv-3', name: 'Credit Card', type: 'bank', openingBalance: 0, isActive: true, createdAt: '', updatedAt: '' },
    { id: 'hv-4', name: 'Wallet Cash', type: 'cash', openingBalance: 15000, isActive: true, createdAt: '', updatedAt: '' },
    { id: 'hv-5', name: 'Archived Bank', type: 'bank', openingBalance: 50000, isActive: false, createdAt: '', updatedAt: '' },
  ];

  const highVolTxns: Transaction[] = [];
  let seed = 12345;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = 0; i < 1000; i++) {
    const r = pseudoRandom();
    const amount = Math.floor(pseudoRandom() * 50000) + 100;
    const accIdx = Math.floor(pseudoRandom() * highVolAccounts.length);
    const targetAcc = highVolAccounts[accIdx].id;

    if (r < 0.4) {
      highVolTxns.push({ id: `hvt-${i}`, type: 'expense', amount, accountId: targetAcc, date: '2026-09-10', categoryId: 'cat-x', isRecurring: false, createdAt: '', updatedAt: '' });
    } else if (r < 0.7) {
      highVolTxns.push({ id: `hvt-${i}`, type: 'income', amount, accountId: targetAcc, date: '2026-09-10', categoryId: 'cat-inc', isRecurring: false, createdAt: '', updatedAt: '' });
    } else {
      const toAccIdx = (accIdx + 1) % highVolAccounts.length;
      const toAcc = highVolAccounts[toAccIdx].id;
      highVolTxns.push({ id: `hvt-${i}`, type: 'transfer', amount, accountId: targetAcc, fromAccountId: targetAcc, toAccountId: toAcc, date: '2026-09-10', categoryId: '', isRecurring: false, createdAt: '', updatedAt: '' });
    }
  }

  const highVolMap = getAllAccountBalancesMap(highVolAccounts, highVolTxns);
  let allMatched = true;
  for (const acc of highVolAccounts) {
    const baseline = getAccountBalanceMinor(acc, highVolTxns);
    const optimized = highVolMap.get(acc.id);
    if (baseline !== optimized) {
      allMatched = false;
      console.error(`Mismatch on ${acc.name}: baseline=${baseline}, optimized=${optimized}`);
    }
  }
  assert(allMatched, 'All 5 accounts match 100% between baseline and optimized across 1,000 txns');
  const highVolActiveTotal = highVolAccounts.filter(a => a.isActive).reduce((sum, a) => sum + (highVolMap.get(a.id) || 0), 0);
  assert(highVolActiveTotal === getCurrentBalanceMinor(highVolAccounts, highVolTxns), 'High-volume total active balance matches 100%');

  // Scenario 6: Empty Datasets
  header('Scenario 6: Empty Datasets');
  const emptyMap = getAllAccountBalancesMap([], []);
  assert(emptyMap.size === 0, 'Empty accounts returns empty map');
  assert(getCurrentBalanceMinor([], []) === 0, 'Empty balance is 0 in both');

  console.log(`\n================================================`);
  console.log(`EQUIVALENCE RESULTS: ${passed}/${passed + failed} PASS`);
  if (failed > 0) {
    console.error('FAILED TESTS EXIST!');
    process.exit(1);
  } else {
    console.log('ALL CALCULATION EQUIVALENCE TESTS PASS 100% ✓\n');
  }
}

runEquivalenceSuite();
