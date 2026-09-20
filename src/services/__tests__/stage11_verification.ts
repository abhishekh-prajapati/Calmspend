/**
 * STAGE 11 VERIFICATION SUITE — 28-point test
 *
 * Tests:
 *   Group A: Backup Envelope & Export (6)
 *   Group B: Backup Validation (8)
 *   Group C: Restore Adapter (3)
 *   Group D: Atomic Restore Safety (4)
 *   Group E: Storage Info (2)
 *   Group F: Financial Round-Trip (5)
 *
 * Run: npx tsx src/services/__tests__/stage11_verification.ts
 */

import { buildBackupEnvelope, serializeEnvelope, generateBackupFilename } from '../backup/backupExportService';
import { validateBackupEnvelope } from '../backup/backupValidation';
import { adaptEnvelopeToPersistedData } from '../backup/backupRestoreService';
import { getStorageInfo } from '../backup/storageInfoService';
import type { BackupEnvelope } from '../../types/backup';
import { BACKUP_FORMAT_IDENTIFIER, CURRENT_BACKUP_FORMAT_VERSION } from '../../types/backup';
import type { PersistedData } from '../storage/schema';
import { CURRENT_STORAGE_VERSION } from '../storage/schema';

// ======================================================================
// TEST HARNESS
// ======================================================================

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
    errors.push(name);
  }
}

function group(title: string): void {
  console.log(`\n${title}`);
}

// ======================================================================
// FIXTURES
// ======================================================================

function makeMinimalData(): PersistedData {
  return {
    version: 2,
    accounts: [],
    categories: [],
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

function makeFullData(): PersistedData {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  return {
    version: 2,
    accounts: [
      { id: 'acc1', name: 'Bank', type: 'bank', openingBalance: 100000, currency: 'INR', isActive: true, createdAt: now, updatedAt: now },
      { id: 'acc2', name: 'Credit Card', type: 'credit_card', openingBalance: 0, currency: 'INR', isActive: true, createdAt: now, updatedAt: now },
    ],
    categories: [
      { id: 'cat1', name: 'Food', icon: 'utensils', type: 'expense', isSystem: true, isActive: true, createdAt: now, updatedAt: now },
      { id: 'cat2', name: 'Salary', icon: 'briefcase', type: 'income', isSystem: true, isActive: true, createdAt: now, updatedAt: now },
    ],
    transactions: [
      {
        id: 'txn1', type: 'expense', amount: 50000, accountId: 'acc1', categoryId: 'cat1',
        date: today, description: 'Dinner', needOrWant: 'want', createdAt: now, updatedAt: now,
      },
      {
        id: 'txn2', type: 'income', amount: 500000, accountId: 'acc1', categoryId: 'cat2',
        date: today, createdAt: now, updatedAt: now,
      },
      {
        id: 'txn3', type: 'transfer', amount: 100000, fromAccountId: 'acc1', toAccountId: 'acc2',
        date: today, createdAt: now, updatedAt: now,
      },
    ],
    monthlyBudgets: [
      { id: 'mb1', periodKey: '2026-09', plannedSavingsMinor: 100000, createdAt: now, updatedAt: now },
    ],
    budgetItems: [
      { id: 'bi1', monthlyBudgetId: 'mb1', categoryId: 'cat1', plannedAmountMinor: 60000, createdAt: now, updatedAt: now },
    ],
    plannedIncomeItems: [
      { id: 'pi1', monthlyBudgetId: 'mb1', name: 'Salary', plannedAmountMinor: 500000, createdAt: now, updatedAt: now },
    ],
    goals: [
      { id: 'g1', name: 'Emergency Fund', targetAmountMinor: 1000000, priority: 'high', status: 'active', createdAt: now, updatedAt: now },
    ],
    goalContributions: [
      { id: 'gc1', goalId: 'g1', amountMinor: 50000, date: today, createdAt: now, updatedAt: now },
    ],
    recurringSchedules: [
      {
        id: 'rs1', type: 'expense', name: 'Netflix', amountMinor: 19900, classification: 'subscription',
        frequency: 'monthly', interval: 1, startDate: today, isActive: true, createdAt: now, updatedAt: now,
      },
    ],
    scheduledBills: [
      {
        id: 'sb1', name: 'Electric Bill', amountMinor: 150000, dueDate: today,
        classification: 'bill', status: 'upcoming', createdAt: now, updatedAt: now,
      },
    ],
    occurrenceRecords: [
      {
        id: 'or1', occurrenceKey: 'rs1_' + today, scheduleId: 'rs1', dueDate: today,
        status: 'paid', transactionId: 'txn1', actualAmountMinor: 19900, actualDate: today,
        createdAt: now, updatedAt: now,
      },
    ],
    manualAssets: [
      {
        id: 'ma1', name: 'Mutual Fund', type: 'investment', valueMinor: 500000, currency: 'INR',
        valuationDate: today, isArchived: false, createdAt: now, updatedAt: now,
      },
    ],
    manualLiabilities: [
      {
        id: 'ml1', name: 'Car Loan', type: 'loan', outstandingMinor: 300000, currency: 'INR',
        valuationDate: today, isArchived: false, createdAt: now, updatedAt: now,
      },
    ],
    financialSnapshots: [
      {
        id: 'sn1', snapshotDate: today, timestamp: now, totalAssetsMinor: 800000,
        totalLiabilitiesMinor: 300000, netWorthMinor: 500000,
        assetItems: [{ id: 'ma1', name: 'Mutual Fund', type: 'investment', source: 'manual', valueMinor: 500000 }],
        liabilityItems: [{ id: 'ml1', name: 'Car Loan', type: 'loan', source: 'manual', outstandingMinor: 300000 }],
        createdAt: now,
      },
      // Snapshot with negative net worth (liabilities > assets)
      {
        id: 'sn2', snapshotDate: today, timestamp: now, totalAssetsMinor: 100000,
        totalLiabilitiesMinor: 300000, netWorthMinor: -200000,
        assetItems: [],
        liabilityItems: [],
        createdAt: now,
      },
    ],
  };
}

// ======================================================================
// GROUP A: BACKUP ENVELOPE & EXPORT
// ======================================================================

function runGroupA(): void {
  group('Group A: Backup Envelope & Export');

  // A1: buildBackupEnvelope sets correct format identifier
  const minimal = makeMinimalData();
  const envelope = buildBackupEnvelope(minimal);
  assert('A1: format identifier is correct', envelope.format === BACKUP_FORMAT_IDENTIFIER);

  // A2: formatVersion matches CURRENT_BACKUP_FORMAT_VERSION
  assert('A2: formatVersion matches constant', envelope.formatVersion === CURRENT_BACKUP_FORMAT_VERSION);

  // A3: exportedAt is a valid ISO timestamp
  const exportedAtDate = new Date(envelope.exportedAt);
  assert('A3: exportedAt is valid ISO timestamp', !isNaN(exportedAtDate.getTime()));

  // A4: metadata.collectionCounts are all 0 for empty data
  const counts = envelope.metadata.collectionCounts;
  const allZero = Object.values(counts).every((v) => v === 0);
  assert('A4: collection counts are 0 for empty data', allZero, JSON.stringify(counts));

  // A5: buildBackupEnvelope with full data — collection counts match source
  const fullData = makeFullData();
  const fullEnvelope = buildBackupEnvelope(fullData);
  assert('A5: accounts count matches', fullEnvelope.metadata.collectionCounts.accounts === 2);
  assert('A5b: transactions count matches', fullEnvelope.metadata.collectionCounts.transactions === 3);

  // A6: serializeEnvelope produces valid JSON
  const json = serializeEnvelope(envelope);
  let roundTripped: unknown;
  try {
    roundTripped = JSON.parse(json);
  } catch {
    roundTripped = null;
  }
  assert('A6: serializeEnvelope produces valid JSON', roundTripped !== null);

  // A7: generateBackupFilename matches pattern pbp-backup-YYYY-MM-DD.json
  const filename = generateBackupFilename();
  assert('A7: filename matches pattern', /^pbp-backup-\d{4}-\d{2}-\d{2}\.json$/.test(filename), filename);

  // A8: version field is stripped from envelope.data (no internal schema field leaks)
  assert('A8: envelope.data has no "version" field',
    !Object.prototype.hasOwnProperty.call(fullEnvelope.data, 'version')
  );
}

// ======================================================================
// GROUP B: VALIDATION (8 tests)
// ======================================================================

function runGroupB(): void {
  group('Group B: Backup Validation');

  const fullData = makeFullData();
  const validEnvelope = buildBackupEnvelope(fullData);

  // B1: Valid full envelope passes
  const r1 = validateBackupEnvelope(validEnvelope);
  assert('B1: valid full envelope passes validation', r1.isValid, r1.errors.map((e) => e.message).join('; '));

  // B2: Wrong format identifier fails
  const wrongFormat = { ...validEnvelope, format: 'wrong-format' };
  const r2 = validateBackupEnvelope(wrongFormat);
  assert('B2: wrong format identifier rejected', !r2.isValid);

  // B3: Missing data collection fails
  const missingData = JSON.parse(JSON.stringify(validEnvelope));
  delete missingData.data.accounts;
  const r3 = validateBackupEnvelope(missingData);
  assert('B3: missing collection rejected', !r3.isValid);

  // B4: Negative transaction amount fails
  const badTxn = JSON.parse(JSON.stringify(validEnvelope));
  badTxn.data.transactions[0].amount = -100;
  const r4 = validateBackupEnvelope(badTxn);
  assert('B4: negative transaction amount rejected', !r4.isValid);

  // B5: Fractional transaction amount fails
  const fracTxn = JSON.parse(JSON.stringify(validEnvelope));
  fracTxn.data.transactions[0].amount = 500.5;
  const r5 = validateBackupEnvelope(fracTxn);
  assert('B5: fractional transaction amount rejected', !r5.isValid);

  // B6: Negative net worth in snapshot is ALLOWED (valid financial state)
  const negNW = JSON.parse(JSON.stringify(validEnvelope));
  negNW.data.financialSnapshots[1].netWorthMinor = -200000;
  negNW.data.financialSnapshots[1].totalAssetsMinor = 100000;
  negNW.data.financialSnapshots[1].totalLiabilitiesMinor = 300000;
  const r6 = validateBackupEnvelope(negNW);
  assert('B6: negative snapshot netWorthMinor is valid', r6.isValid, r6.errors.map((e) => e.message).join('; '));

  // B7: Negative account openingBalance is ALLOWED (overdraft)
  const negBal = JSON.parse(JSON.stringify(validEnvelope));
  negBal.data.accounts[0].openingBalance = -50000;
  const r7 = validateBackupEnvelope(negBal);
  assert('B7: negative account openingBalance is valid (overdraft)', r7.isValid, r7.errors.map((e) => e.message).join('; '));

  // B8: Orphan transactionId in occurrenceRecord fails (referential integrity)
  const orphanTxn = JSON.parse(JSON.stringify(validEnvelope));
  orphanTxn.data.occurrenceRecords[0].transactionId = 'txn_does_not_exist';
  const r8 = validateBackupEnvelope(orphanTxn);
  assert('B8: orphan transactionId in occurrenceRecord rejected', !r8.isValid);
}

// ======================================================================
// GROUP C: RESTORE ADAPTER (3 tests)
// ======================================================================

function runGroupC(): void {
  group('Group C: Restore Adapter');

  const fullData = makeFullData();
  const envelope = buildBackupEnvelope(fullData);

  // C1: adaptEnvelopeToPersistedData returns PersistedDataV2 (version:2)
  const adapted = adaptEnvelopeToPersistedData(envelope);
  assert('C1: adapter returns version:2 PersistedData', adapted.version === 2);

  // C2: All 14 collections are present in adapted output
  const collections = [
    'accounts', 'categories', 'transactions', 'monthlyBudgets', 'budgetItems',
    'plannedIncomeItems', 'goals', 'goalContributions', 'recurringSchedules',
    'scheduledBills', 'occurrenceRecords', 'manualAssets', 'manualLiabilities', 'financialSnapshots',
  ];
  const allPresent = collections.every((c) => Array.isArray((adapted as Record<string, unknown>)[c]));
  assert('C2: all 14 collections present in adapted output', allPresent);

  // C3: Snapshot fields are semantically preserved after adaptation (deep equality)
  const origSnap = fullData.financialSnapshots[0];
  const adaptedSnap = adapted.financialSnapshots.find((s) => s.id === origSnap.id);
  assert('C3: snapshot fields semantically preserved after adaptation',
    adaptedSnap !== undefined &&
    adaptedSnap.netWorthMinor === origSnap.netWorthMinor &&
    adaptedSnap.totalAssetsMinor === origSnap.totalAssetsMinor &&
    adaptedSnap.totalLiabilitiesMinor === origSnap.totalLiabilitiesMinor &&
    adaptedSnap.assetItems.length === origSnap.assetItems.length &&
    adaptedSnap.liabilityItems.length === origSnap.liabilityItems.length &&
    adaptedSnap.assetItems[0].valueMinor === origSnap.assetItems[0].valueMinor &&
    adaptedSnap.liabilityItems[0].outstandingMinor === origSnap.liabilityItems[0].outstandingMinor,
    `adapted: ${JSON.stringify(adaptedSnap)}`
  );
}

// ======================================================================
// GROUP D: ATOMIC RESTORE SAFETY (4 tests)
// ======================================================================

// Minimal mock adapter for testing
interface MockStorageRecord {
  loadCallCount: number;
  saveCallCount: number;
  lastSaved: PersistedData | null;
  shouldFailSave: boolean;
}

function makeMockAdapter(initial: PersistedData, shouldFailSave = false) {
  const record: MockStorageRecord = { loadCallCount: 0, saveCallCount: 0, lastSaved: null, shouldFailSave };
  return {
    record,
    adapter: {
      loadData: (): PersistedData => {
        record.loadCallCount++;
        return initial;
      },
      saveData: (data: PersistedData): boolean => {
        record.saveCallCount++;
        if (record.shouldFailSave) return false;
        record.lastSaved = data;
        return true;
      },
      clearData: () => {},
    },
  };
}

async function runGroupD(): Promise<void> {
  group('Group D: Atomic Restore Safety');

  const { performAtomicRestore } = await import('../backup/backupRestoreService');

  const fullData = makeFullData();
  const envelope = buildBackupEnvelope(fullData);
  validateBackupEnvelope(envelope);

  // D1: Successful restore writes data exactly once through adapter
  const { adapter: adapter1, record: rec1 } = makeMockAdapter(makeMinimalData());
  const result1 = await performAtomicRestore(envelope as BackupEnvelope, adapter1);
  assert('D1: successful restore writes exactly once', rec1.saveCallCount === 1, `saveCallCount: ${rec1.saveCallCount}`);
  assert('D1b: successful restore returns success:true', result1.success === true);

  // D2: Failed adapter write returns success:false without throwing
  const { adapter: adapter2, record: _rec2 } = makeMockAdapter(makeMinimalData(), true /* failSave */);
  const result2 = await performAtomicRestore(envelope as BackupEnvelope, adapter2);
  assert('D2: failed storage write returns success:false', result2.success === false);

  // D3: Restore sets safetyBackupWritten flag (best-effort, may be false in test env without localStorage)
  assert('D3: restore result contains safetyBackupWritten field', typeof result1.safetyBackupWritten === 'boolean');
}

// ======================================================================
// GROUP E: STORAGE INFO (2 tests)
// ======================================================================

function runGroupE(): void {
  group('Group E: Storage Info');

  const fullData = makeFullData();
  const info = getStorageInfo(fullData);

  // E1: storageVersion matches constant
  assert('E1: storageVersion matches CURRENT_STORAGE_VERSION', info.storageVersion === CURRENT_STORAGE_VERSION);

  // E2: collection counts match source data
  assert('E2: collection counts correct',
    info.collections.accounts === 2 &&
    info.collections.transactions === 3 &&
    info.collections.financialSnapshots === 2,
    JSON.stringify(info.collections)
  );
}

// ======================================================================
// GROUP F: FINANCIAL ROUND-TRIP (5 tests)
// ======================================================================

function runGroupF(): void {
  group('Group F: Financial Round-Trip Calculation Consistency');

  const fullData = makeFullData();
  const envelope = buildBackupEnvelope(fullData);
  const adapted = adaptEnvelopeToPersistedData(envelope);

  // F1: Transaction count preserved
  assert('F1: transaction count preserved through backup/restore cycle',
    adapted.transactions.length === fullData.transactions.length
  );

  // F2: Transaction amounts preserved (no mutation)
  const origAmounts = fullData.transactions.map((t) => t.amount).sort((a, b) => a - b);
  const adaptedAmounts = adapted.transactions.map((t) => t.amount).sort((a, b) => a - b);
  assert('F2: transaction amounts preserved',
    JSON.stringify(origAmounts) === JSON.stringify(adaptedAmounts)
  );

  // F3: Account count preserved
  assert('F3: account count preserved', adapted.accounts.length === fullData.accounts.length);

  // F4: Snapshot frozen breakdown preserved (semantic equality)
  const origSnap2 = fullData.financialSnapshots.find((s) => s.netWorthMinor < 0);
  const adaptedSnap2 = adapted.financialSnapshots.find((s) => s.id === origSnap2?.id);
  assert('F4: negative-net-worth snapshot preserved after round-trip',
    adaptedSnap2 !== undefined &&
    adaptedSnap2.netWorthMinor === -200000 &&
    adaptedSnap2.totalAssetsMinor === 100000 &&
    adaptedSnap2.totalLiabilitiesMinor === 300000
  );

  // F5: goalContribution amount preserved
  const origGC = fullData.goalContributions[0];
  const adaptedGC = adapted.goalContributions.find((g) => g.id === origGC.id);
  assert('F5: goal contribution amount preserved',
    adaptedGC?.amountMinor === origGC.amountMinor
  );
}

// ======================================================================
// MAIN
// ======================================================================

async function main(): Promise<void> {
  console.log('=== STAGE 11 VERIFICATION SUITE ===\n');
  console.log('Running backup, validation, restore, and round-trip tests...');

  runGroupA();
  runGroupB();
  runGroupC();
  await runGroupD();
  runGroupE();
  runGroupF();

  const total = passed + failed;
  console.log(`\n${'='.repeat(48)}`);
  console.log(`STAGE 11 RESULTS: ${passed}/${total} PASS`);
  if (failed > 0) {
    console.log(`FAILED (${failed}):`);
    errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(1);
  } else {
    console.log('ALL TESTS PASS ✓');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
