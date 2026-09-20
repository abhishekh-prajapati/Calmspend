import type { Account, Transaction } from '../../types/transaction';
import type { ManualAsset, ManualLiability, FinancialSnapshot } from '../../types/netWorth';
import {
  calculateNetWorthSummary,
  createSnapshotFromCurrentState,
  compareSnapshots,
} from '../netWorthCalculations';
import { getMonthlyExpensesMinor } from '../financialCalculations';
import { migratePersistedData } from '../storage/schema';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- STARTING STAGE 10 VERIFICATION SUITE ---');

// ==========================================
// TEST 1: Asset Account Calculation (Bank + Savings + Cash)
// ==========================================
const bankAcc: Account = {
  id: 'acc_bank',
  name: 'HDFC Bank',
  type: 'bank',
  openingBalance: 5000000, // ₹50,000
  currency: 'INR',
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const cashAcc: Account = {
  id: 'acc_cash',
  name: 'Cash Wallet',
  type: 'cash',
  openingBalance: 500000, // ₹5,000
  currency: 'INR',
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const test1Summary = calculateNetWorthSummary([bankAcc, cashAcc], [], [], []);
assert(test1Summary.totalAssetsMinor === 5500000, 'TEST 1: Total Assets is ₹55,000 (5500000 paise)');
assert(test1Summary.totalLiabilitiesMinor === 0, 'TEST 1: Total Liabilities is 0');
assert(test1Summary.netWorthMinor === 5500000, 'TEST 1: Net Worth is ₹55,000');

// ==========================================
// TEST 2: Credit Card Liability Calculation (Purchase Expense)
// ==========================================
const ccAcc: Account = {
  id: 'acc_cc',
  name: 'ICICI Credit Card',
  type: 'credit_card',
  openingBalance: 0,
  currency: 'INR',
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const ccExpenseTxn: Transaction = {
  id: 'txn_cc_exp',
  type: 'expense',
  amount: 1500000, // ₹15,000
  accountId: 'acc_cc',
  categoryId: 'cat_food',
  date: '2026-09-05',
  createdAt: '2026-09-05T00:00:00Z',
  updatedAt: '2026-09-05T00:00:00Z',
};

const test2Summary = calculateNetWorthSummary([bankAcc, ccAcc], [ccExpenseTxn], [], []);
assert(test2Summary.totalAssetsMinor === 5000000, 'TEST 2: Total Assets remains ₹50,000');
assert(test2Summary.totalLiabilitiesMinor === 1500000, 'TEST 2: Total Liabilities is ₹15,000 (1500000 paise)');
assert(test2Summary.netWorthMinor === 3500000, 'TEST 2: Net Worth is ₹35,000 (₹50k - ₹15k)');

// ==========================================
// TEST 2B: Explicit Credit Card Purchase (Liability Increases & Net Worth Decreases Exactly Once)
// ==========================================
const testPeriod = { year: 2026, monthIndex: 8, monthName: 'September', formattedPeriod: 'September 2026', periodKey: '2026-09' };

const initialNWSummary = calculateNetWorthSummary([bankAcc, ccAcc], [], [], []);
assert(initialNWSummary.totalAssetsMinor === 5000000, 'TEST 2B: Initial Assets is ₹50,000');
assert(initialNWSummary.totalLiabilitiesMinor === 0, 'TEST 2B: Initial Liabilities is ₹0');
assert(initialNWSummary.netWorthMinor === 5000000, 'TEST 2B: Initial Net Worth is ₹50,000');

const singlePurchaseTxn: Transaction = {
  id: 'txn_purchase_1',
  type: 'expense',
  amount: 1200000, // ₹12,000
  accountId: 'acc_cc',
  categoryId: 'cat_electronics',
  date: '2026-09-05',
  createdAt: '2026-09-05T00:00:00Z',
  updatedAt: '2026-09-05T00:00:00Z',
};

const afterPurchaseSummary = calculateNetWorthSummary([bankAcc, ccAcc], [singlePurchaseTxn], [], []);
assert(afterPurchaseSummary.totalAssetsMinor === 5000000, 'TEST 2B: Bank assets unchanged at ₹50,000');
assert(afterPurchaseSummary.totalLiabilitiesMinor === 1200000, 'TEST 2B: CC liability increased to ₹12,000');
assert(afterPurchaseSummary.netWorthMinor === 3800000, 'TEST 2B: Net Worth decreased exactly by ₹12,000 (to ₹38,000)');

const purchaseMonthlyExp = getMonthlyExpensesMinor([singlePurchaseTxn], testPeriod);
assert(purchaseMonthlyExp === 1200000, 'TEST 2B: Monthly expense recorded exactly once (₹12,000)');

// ==========================================
// TEST 2C: Explicit Partial Credit-Card Payment Verification
// ==========================================
// Pay ₹5,000 from Bank to CC (Partial payment of ₹12,000 debt)
const partialPaymentTxn: Transaction = {
  id: 'txn_partial_pay',
  type: 'transfer',
  amount: 500000, // ₹5,000
  fromAccountId: 'acc_bank',
  toAccountId: 'acc_cc',
  date: '2026-09-10',
  createdAt: '2026-09-10T00:00:00Z',
  updatedAt: '2026-09-10T00:00:00Z',
};

const afterPartialSummary = calculateNetWorthSummary(
  [bankAcc, ccAcc],
  [singlePurchaseTxn, partialPaymentTxn],
  [],
  [],
);
assert(afterPartialSummary.totalAssetsMinor === 4500000, 'TEST 2C: Bank assets decreased by ₹5,000 to ₹45,000');
assert(afterPartialSummary.totalLiabilitiesMinor === 700000, 'TEST 2C: CC remaining debt decreased by ₹5,000 to ₹7,000');
assert(afterPartialSummary.netWorthMinor === 3800000, 'TEST 2C: Net Worth remains strictly ₹38,000 (0 delta during payment)');

const partialMonthlyExp = getMonthlyExpensesMinor([singlePurchaseTxn, partialPaymentTxn], testPeriod);
assert(partialMonthlyExp === 1200000, 'TEST 2C: Monthly expense remains ₹12,000 (transfer is NOT counted as expense)');

// ==========================================
// TEST 2D: Explicit Full-Cycle Credit-Card Verification (Purchase -> Bank Payment)
// ==========================================
// Pay remaining ₹7,000 from Bank to CC
const finalPaymentTxn: Transaction = {
  id: 'txn_final_pay',
  type: 'transfer',
  amount: 700000, // ₹7,000
  fromAccountId: 'acc_bank',
  toAccountId: 'acc_cc',
  date: '2026-09-15',
  createdAt: '2026-09-15T00:00:00Z',
  updatedAt: '2026-09-15T00:00:00Z',
};

const afterFullCycleSummary = calculateNetWorthSummary(
  [bankAcc, ccAcc],
  [singlePurchaseTxn, partialPaymentTxn, finalPaymentTxn],
  [],
  [],
);
assert(afterFullCycleSummary.totalAssetsMinor === 3800000, 'TEST 2D: Bank assets is ₹38,000');
assert(afterFullCycleSummary.totalLiabilitiesMinor === 0, 'TEST 2D: CC debt reaches exactly ZERO');
assert(afterFullCycleSummary.netWorthMinor === 3800000, 'TEST 2D: Net Worth is ₹38,000 (decreased only by initial ₹12,000 purchase)');

const fullCycleMonthlyExp = getMonthlyExpensesMinor([singlePurchaseTxn, partialPaymentTxn, finalPaymentTxn], testPeriod);
assert(fullCycleMonthlyExp === 1200000, 'TEST 2D: Monthly expenses strictly ₹12,000 across entire purchase-to-pay lifecycle');

// ==========================================
// TEST 3: Credit Card Overpayment (Surplus Credit)
// ==========================================
const ccRefundTxn: Transaction = {
  id: 'txn_cc_ref',
  type: 'income',
  amount: 200000, // ₹2,000 refund/overpayment
  accountId: 'acc_cc',
  categoryId: 'cat_refund',
  date: '2026-09-06',
  createdAt: '2026-09-06T00:00:00Z',
  updatedAt: '2026-09-06T00:00:00Z',
};

const test3Summary = calculateNetWorthSummary([ccAcc], [ccRefundTxn], [], []);
assert(test3Summary.totalLiabilitiesMinor === 0, 'TEST 3: CC Liability is 0 on overpayment');
assert(test3Summary.creditCardCreditMinor === 200000, 'TEST 3: CC Surplus of ₹2,000 recognized as asset');
assert(test3Summary.totalAssetsMinor === 200000, 'TEST 3: Total Assets is ₹2,000');
assert(test3Summary.netWorthMinor === 200000, 'TEST 3: Net worth is +₹2,000');

// ==========================================
// TEST 4: Manual Asset Creation & Summing
// ==========================================
const investmentAsset: ManualAsset = {
  id: 'asset_inv',
  name: 'Mutual Fund Portfolio',
  type: 'investment',
  valueMinor: 10000000, // ₹1,00,000
  currency: 'INR',
  valuationDate: '2026-09-01',
  isArchived: false,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const goldAsset: ManualAsset = {
  id: 'asset_gold',
  name: 'Gold Coins (20g)',
  type: 'gold',
  valueMinor: 15000000, // ₹1,50,000
  currency: 'INR',
  valuationDate: '2026-09-01',
  isArchived: false,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const test4Summary = calculateNetWorthSummary([], [], [investmentAsset, goldAsset], []);
assert(test4Summary.manualAssetsMinor === 25000000, 'TEST 4: Manual Assets sum to ₹2,50,000');
assert(test4Summary.totalAssetsMinor === 25000000, 'TEST 4: Total Assets is ₹2,50,000');

// ==========================================
// TEST 5: Manual Liability Creation & Summing
// ==========================================
const carLoan: ManualLiability = {
  id: 'liab_car',
  name: 'Car Loan EMI',
  type: 'loan',
  outstandingMinor: 8000000, // ₹80,000
  currency: 'INR',
  valuationDate: '2026-09-01',
  isArchived: false,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const test5Summary = calculateNetWorthSummary([], [], [], [carLoan]);
assert(test5Summary.manualLiabilitiesMinor === 8000000, 'TEST 5: Manual Liabilities sum to ₹80,000');
assert(test5Summary.totalLiabilitiesMinor === 8000000, 'TEST 5: Total Liabilities is ₹80,000');

// ==========================================
// TEST 6: Complete Deterministic Net Worth Equation
// ==========================================
// Total Assets = Bank (₹50k) + Cash (₹5k) + MF (₹100k) + Gold (₹150k) = ₹3,05,000 (30500000 paise)
// Total Liabilities = CC (₹15k) + Car Loan (₹80k) = ₹95,000 (9500000 paise)
// Net Worth = ₹3,05,000 - ₹95,000 = ₹2,10,000 (21000000 paise)
const test6Summary = calculateNetWorthSummary(
  [bankAcc, cashAcc, ccAcc],
  [ccExpenseTxn],
  [investmentAsset, goldAsset],
  [carLoan],
);
assert(test6Summary.totalAssetsMinor === 30500000, 'TEST 6: Total Assets is ₹3,05,000');
assert(test6Summary.totalLiabilitiesMinor === 9500000, 'TEST 6: Total Liabilities is ₹95,000');
assert(test6Summary.netWorthMinor === 21000000, 'TEST 6: Net Worth is ₹2,10,000');
assert(test6Summary.assetToDebtRatio === 3.21, 'TEST 6: Asset to debt ratio is 3.21x (305000/95000)');

// ==========================================
// TEST 7: Zero Assets & Zero Liabilities Empty State
// ==========================================
const test7Summary = calculateNetWorthSummary([], [], [], []);
assert(test7Summary.totalAssetsMinor === 0, 'TEST 7: Empty total assets is 0');
assert(test7Summary.totalLiabilitiesMinor === 0, 'TEST 7: Empty total liabilities is 0');
assert(test7Summary.netWorthMinor === 0, 'TEST 7: Empty net worth is 0');
assert(test7Summary.assetToDebtRatio === null, 'TEST 7: Debt ratio is null when debt is 0');
assert(test7Summary.assetItems.length === 0, 'TEST 7: Empty asset items array');

// ==========================================
// TEST 8: Transfer between Asset Accounts (Invariant: Net Worth Delta = 0)
// ==========================================
const transferTxn: Transaction = {
  id: 'txn_transfer',
  type: 'transfer',
  amount: 2000000, // ₹20,000 from Bank to Cash
  fromAccountId: 'acc_bank',
  toAccountId: 'acc_cash',
  date: '2026-09-07',
  createdAt: '2026-09-07T00:00:00Z',
  updatedAt: '2026-09-07T00:00:00Z',
};

const test8Summary = calculateNetWorthSummary([bankAcc, cashAcc], [transferTxn], [], []);
assert(test8Summary.accountAssetsMinor === 5500000, 'TEST 8: Total account assets unchanged at ₹55,000');
assert(test8Summary.netWorthMinor === 5500000, 'TEST 8: Net worth unchanged after transfer');

// ==========================================
// TEST 9: Inactive Accounts & Archived Assets Excluded
// ==========================================
const inactiveBank: Account = {
  ...bankAcc,
  id: 'acc_inactive',
  isActive: false,
};

const archivedAsset: ManualAsset = {
  ...goldAsset,
  id: 'asset_archived',
  isArchived: true,
};

const test9Summary = calculateNetWorthSummary([inactiveBank], [], [archivedAsset], []);
assert(test9Summary.totalAssetsMinor === 0, 'TEST 9: Inactive accounts and archived assets excluded');
assert(test9Summary.netWorthMinor === 0, 'TEST 9: Net worth is 0 for inactive/archived items');

// ==========================================
// TEST 10: Snapshot Creation & Freeze Preservation
// ==========================================
const snapshot1 = createSnapshotFromCurrentState(
  [bankAcc, ccAcc],
  [ccExpenseTxn],
  [investmentAsset],
  [carLoan],
  '2026-09-15',
  'Mid-month review',
);
assert(snapshot1.snapshotDate === '2026-09-15', 'TEST 10: Snapshot date is 2026-09-15');
assert(snapshot1.totalAssetsMinor === 15000000, 'TEST 10: Frozen total assets is ₹1,50,000 (50k bank + 100k MF)');
assert(snapshot1.totalLiabilitiesMinor === 9500000, 'TEST 10: Frozen liabilities is ₹95,000 (15k CC + 80k car)');
assert(snapshot1.netWorthMinor === 5500000, 'TEST 10: Frozen net worth is ₹55,000');
assert(snapshot1.assetItems.length === 2, 'TEST 10: 2 frozen asset items captured');
assert(snapshot1.liabilityItems.length === 2, 'TEST 10: 2 frozen liability items captured');

// ==========================================
// TEST 11: Snapshot Immutability against Subsequent Transactions
// ==========================================
const subsequentTxn: Transaction = {
  id: 'txn_subseq',
  type: 'expense',
  amount: 3000000, // ₹30,000 expense
  accountId: 'acc_bank',
  categoryId: 'cat_rent',
  date: '2026-09-20',
  createdAt: '2026-09-20T00:00:00Z',
  updatedAt: '2026-09-20T00:00:00Z',
};

const liveSummaryAfter = calculateNetWorthSummary(
  [bankAcc, ccAcc],
  [ccExpenseTxn, subsequentTxn],
  [investmentAsset],
  [carLoan],
);
assert(liveSummaryAfter.netWorthMinor === 2500000, 'TEST 11: Live net worth decreased to ₹25,000');
assert(snapshot1.netWorthMinor === 5500000, 'TEST 11: Snapshot 1 remains immutable at ₹55,000');

// ==========================================
// TEST 12: Snapshot Comparison Delta and Percentages
// ==========================================
const snapshot2: FinancialSnapshot = {
  id: 'snap_2',
  snapshotDate: '2026-09-30',
  timestamp: '2026-09-30T18:00:00Z',
  totalAssetsMinor: 20000000, // ₹2,00,000
  totalLiabilitiesMinor: 5000000,  // ₹50,000
  netWorthMinor: 15000000,        // ₹1,50,000
  assetItems: [],
  liabilityItems: [],
  createdAt: '2026-09-30T18:00:00Z',
};

const snap1Obj: FinancialSnapshot = {
  id: 'snap_1',
  ...snapshot1,
  createdAt: '2026-09-15T00:00:00Z',
};

const comp = compareSnapshots(snapshot2, snap1Obj);
assert(comp.netWorthDeltaMinor === 9500000, 'TEST 12: Net worth delta is +₹95,000 (150k - 55k)');
assert(comp.assetsDeltaMinor === 5000000, 'TEST 12: Assets delta is +₹50,000 (200k - 150k)');
assert(comp.liabilitiesDeltaMinor === -4500000, 'TEST 12: Liabilities delta is -₹45,000 (50k - 95k)');
assert(comp.percentageChange === 172.7, 'TEST 12: Percentage change is +172.7%');

// ==========================================
// TEST 13: Storage Migration V1 -> V2
// ==========================================
const rawV1Data = {
  version: 1,
  accounts: [bankAcc],
  categories: DEFAULT_SYSTEM_CATEGORIES,
  transactions: [ccExpenseTxn],
  monthlyBudgets: [],
  budgetItems: [],
  plannedIncomeItems: [],
  goals: [],
  goalContributions: [],
  recurringSchedules: [],
  scheduledBills: [],
  occurrenceRecords: [],
};

const migrated = migratePersistedData(rawV1Data, DEFAULT_SYSTEM_CATEGORIES);
assert(migrated.version === 2, 'TEST 13: Version safely bumped to 2');
assert(migrated.accounts.length === 1, 'TEST 13: Preserved 1 account');
assert(migrated.transactions.length === 1, 'TEST 13: Preserved 1 transaction');
assert(Array.isArray(migrated.manualAssets) && migrated.manualAssets.length === 0, 'TEST 13: Initialized manualAssets array');
assert(Array.isArray(migrated.manualLiabilities) && migrated.manualLiabilities.length === 0, 'TEST 13: Initialized manualLiabilities array');
assert(Array.isArray(migrated.financialSnapshots) && migrated.financialSnapshots.length === 0, 'TEST 13: Initialized financialSnapshots array');

console.log('=== ALL STAGE 10 VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
