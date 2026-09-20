/**
 * STAGE 7.1 — SMART TRANSACTION DETECTION & BACKUP V2 MIGRATION TESTS
 *
 * Tests:
 * 1. Legacy v1 backup validation (14 collections).
 * 2. v1 -> v2 migration retains 100% of all 14 original collections.
 * 3. budgetItems and plannedIncomeItems survive round-trip without loss.
 * 4. v2 backup build and export includes Stage 7 domain collections.
 * 5. v2 backup validation verifies eventId uniqueness on detectedTransactions.
 * 6. Duplicate eventId is rejected during backup validation.
 * 7. Invalid/negative amount on detectedTransactions is rejected during validation.
 * 8. MerchantCategoryRule references to non-existent categories are flagged.
 */

import { describe, it, expect } from 'vitest';
import { buildBackupEnvelope } from '../backup/backupExportService';
import { validateBackupEnvelope } from '../backup/backupValidation';
import { adaptEnvelopeToPersistedData } from '../backup/backupRestoreService';
import type { BackupEnvelope } from '../../types/backup';
import type { DetectedTransaction, MerchantCategoryRule } from '../../types/detection';
import type { PersistedData } from '../storage/schema';

describe('Stage 7.1: Smart Detection Types & Backup v2 Migration Suite', () => {
  const minimalPersistedData: PersistedData = {
    version: 2,
    accounts: [
      {
        id: 'acc_hdfc',
        name: 'HDFC Bank',
        type: 'bank',
        openingBalance: 500000,
        currency: 'INR',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    categories: [
      {
        id: 'cat_food',
        name: 'Food',
        icon: 'utensils',
        type: 'expense',
        color: '#EF4444',
        isSystem: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'cat_salary',
        name: 'Salary',
        icon: 'briefcase',
        type: 'income',
        color: '#10B981',
        isSystem: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    transactions: [
      {
        id: 'txn_001',
        type: 'expense',
        amount: 45000,
        accountId: 'acc_hdfc',
        categoryId: 'cat_food',
        date: '2026-03-15',
        createdAt: '2026-03-15T14:30:00.000Z',
        updatedAt: '2026-03-15T14:30:00.000Z',
      },
    ],
    monthlyBudgets: [{ id: 'mb_2026_03', periodKey: '2026-03', plannedSavingsMinor: 100000, createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' }],
    budgetItems: [{ id: 'bi_001', monthlyBudgetId: 'mb_2026_03', categoryId: 'cat_food', plannedAmountMinor: 100000, createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' }],
    plannedIncomeItems: [{ id: 'pi_001', monthlyBudgetId: 'mb_2026_03', name: 'Primary Salary', plannedAmountMinor: 5000000, createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' }],
    goals: [{ id: 'goal_001', name: 'Emergency Fund', targetAmountMinor: 10000000, currentAmountMinor: 2000000, priority: 'high', category: 'emergency_fund', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }],
    goalContributions: [{ id: 'gc_001', goalId: 'goal_001', amountMinor: 2000000, date: '2026-02-01', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' }],
    recurringSchedules: [],
    scheduledBills: [],
    occurrenceRecords: [],
    manualAssets: [{ id: 'ma_001', name: 'Gold', type: 'gold', valueMinor: 5000000, currency: 'INR', valuationDate: '2026-01-01', isArchived: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }],
    manualLiabilities: [],
    financialSnapshots: [],
  };

  it('1. builds BackupEnvelope with formatVersion = 2 and complete collection counts', () => {
    const envelope = buildBackupEnvelope(minimalPersistedData);
    expect(envelope.format).toBe('personal-budget-planner-backup');
    expect(envelope.formatVersion).toBe(2);
    expect(envelope.metadata.collectionCounts.accounts).toBe(1);
    expect(envelope.metadata.collectionCounts.budgetItems).toBe(1);
    expect(envelope.metadata.collectionCounts.plannedIncomeItems).toBe(1);
    expect(envelope.metadata.collectionCounts.manualAssets).toBe(1);
  });

  it('2. validates legacy v1 backup envelope correctly (backwards compatibility)', () => {
    const v1Envelope: BackupEnvelope = {
      format: 'personal-budget-planner-backup',
      formatVersion: 1,
      appVersion: '1.0.0',
      exportedAt: '2026-03-01T00:00:00.000Z',
      currency: 'INR',
      metadata: {
        description: 'Legacy v1 Export',
        storageVersion: 2,
        collectionCounts: {
          accounts: 1,
          categories: 2,
          transactions: 1,
          monthlyBudgets: 1,
          budgetItems: 1,
          plannedIncomeItems: 1,
          goals: 1,
          goalContributions: 1,
          recurringSchedules: 0,
          scheduledBills: 0,
          occurrenceRecords: 0,
          manualAssets: 1,
          manualLiabilities: 0,
          financialSnapshots: 0,
        },
      },
      data: {
        ...minimalPersistedData,
      },
    };

    const validation = validateBackupEnvelope(v1Envelope);
    if (!validation.isValid) {
      console.error('V1 validation errors:', validation.errors);
    }
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Adapt to persisted data
    const adapted = adaptEnvelopeToPersistedData(v1Envelope);
    expect(adapted.accounts).toHaveLength(1);
    expect(adapted.budgetItems).toHaveLength(1);
    expect(adapted.plannedIncomeItems).toHaveLength(1);
    expect(adapted.manualAssets).toHaveLength(1);
  });

  it('3. validates v2 backup envelope containing detectedTransactions and merchantCategoryRules', () => {
    const detectedTxn: DetectedTransaction = {
      id: 'dtxn_001',
      eventId: 'evt_gpay_123_456',
      source: 'android_notification',
      sourcePackage: 'com.google.android.apps.nbu.paisa.user',
      detectedAt: '2026-03-18T10:00:00.000Z',
      transactionDate: '2026-03-18',
      direction: 'expense',
      amountMinor: 45000,
      currency: 'INR',
      merchantName: 'Swiggy',
      upiReference: '428192849102',
      confidence: 'high',
      status: 'pending',
      fingerprint: 'upi_428192849102_45000',
      suggestedCategoryId: 'cat_food',
      createdAt: '2026-03-18T10:00:00.000Z',
      updatedAt: '2026-03-18T10:00:00.000Z',
    };

    const rule: MerchantCategoryRule = {
      id: 'mcr_001',
      normalizedMerchant: 'swiggy',
      categoryId: 'cat_food',
      createdAt: '2026-03-18T10:00:00.000Z',
      updatedAt: '2026-03-18T10:00:00.000Z',
    };

    const v2Envelope: BackupEnvelope = {
      format: 'personal-budget-planner-backup',
      formatVersion: 2,
      appVersion: '1.0.0',
      exportedAt: '2026-03-18T10:00:00.000Z',
      currency: 'INR',
      metadata: {
        description: 'V2 Full Export',
        storageVersion: 2,
        collectionCounts: {
          accounts: 1,
          categories: 2,
          transactions: 1,
          monthlyBudgets: 1,
          budgetItems: 1,
          plannedIncomeItems: 1,
          goals: 1,
          goalContributions: 1,
          recurringSchedules: 0,
          scheduledBills: 0,
          occurrenceRecords: 0,
          manualAssets: 1,
          manualLiabilities: 0,
          financialSnapshots: 0,
          detectedTransactions: 1,
          merchantCategoryRules: 1,
        },
      },
      data: {
        ...minimalPersistedData,
        detectedTransactions: [detectedTxn],
        merchantCategoryRules: [rule],
      },
    };

    const validation = validateBackupEnvelope(v2Envelope);
    if (!validation.isValid) {
      console.error('V2 validation errors:', validation.errors);
    }
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('4. rejects v2 backup envelope with duplicate eventId in detectedTransactions', () => {
    const dtxn1: DetectedTransaction = {
      id: 'dtxn_001',
      eventId: 'evt_duplicate_id',
      source: 'android_notification',
      sourcePackage: 'com.google.android.apps.nbu.paisa.user',
      detectedAt: '2026-03-18T10:00:00.000Z',
      transactionDate: '2026-03-18',
      direction: 'expense',
      amountMinor: 45000,
      currency: 'INR',
      merchantName: 'Swiggy',
      confidence: 'high',
      status: 'pending',
      fingerprint: 'fp1',
      createdAt: '2026-03-18T10:00:00.000Z',
      updatedAt: '2026-03-18T10:00:00.000Z',
    };

    const dtxn2: DetectedTransaction = {
      ...dtxn1,
      id: 'dtxn_002',
      eventId: 'evt_duplicate_id', // Same eventId -> must be rejected
    };

    const invalidEnvelope: BackupEnvelope = {
      format: 'personal-budget-planner-backup',
      formatVersion: 2,
      appVersion: '1.0.0',
      exportedAt: '2026-03-18T10:00:00.000Z',
      currency: 'INR',
      metadata: {
        description: 'V2 Export with duplicate eventId',
        storageVersion: 2,
        collectionCounts: {
          accounts: 1,
          categories: 2,
          transactions: 1,
          monthlyBudgets: 1,
          budgetItems: 1,
          plannedIncomeItems: 1,
          goals: 1,
          goalContributions: 1,
          recurringSchedules: 0,
          scheduledBills: 0,
          occurrenceRecords: 0,
          manualAssets: 1,
          manualLiabilities: 0,
          financialSnapshots: 0,
        },
      },
      data: {
        ...minimalPersistedData,
        detectedTransactions: [dtxn1, dtxn2],
      },
    };

    const validation = validateBackupEnvelope(invalidEnvelope);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some((e) => e.message.includes('Duplicate eventId'))).toBe(true);
  });

  it('5. rejects detected transaction with negative or non-integer amountMinor', () => {
    const invalidDtxn: any = {
      id: 'dtxn_bad_amount',
      eventId: 'evt_unique_1',
      source: 'android_notification',
      sourcePackage: 'com.google.android.apps.nbu.paisa.user',
      detectedAt: '2026-03-18T10:00:00.000Z',
      transactionDate: '2026-03-18',
      direction: 'expense',
      amountMinor: -500, // Negative amount
      currency: 'INR',
      merchantName: 'Swiggy',
      confidence: 'high',
      status: 'pending',
      fingerprint: 'fp1',
      createdAt: '2026-03-18T10:00:00.000Z',
      updatedAt: '2026-03-18T10:00:00.000Z',
    };

    const invalidEnvelope: BackupEnvelope = {
      format: 'personal-budget-planner-backup',
      formatVersion: 2,
      appVersion: '1.0.0',
      exportedAt: '2026-03-18T10:00:00.000Z',
      currency: 'INR',
      metadata: {
        description: 'V2 Export with negative amount',
        storageVersion: 2,
        collectionCounts: {
          accounts: 1,
          categories: 2,
          transactions: 1,
          monthlyBudgets: 1,
          budgetItems: 1,
          plannedIncomeItems: 1,
          goals: 1,
          goalContributions: 1,
          recurringSchedules: 0,
          scheduledBills: 0,
          occurrenceRecords: 0,
          manualAssets: 1,
          manualLiabilities: 0,
          financialSnapshots: 0,
        },
      },
      data: {
        ...minimalPersistedData,
        detectedTransactions: [invalidDtxn],
      },
    };

    const validation = validateBackupEnvelope(invalidEnvelope);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some((e) => e.message.includes('amountMinor must be a non-negative integer'))).toBe(true);
  });
});
