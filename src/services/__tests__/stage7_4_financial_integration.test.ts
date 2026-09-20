/**
 * STAGE 7.4 — FINANCIAL STORE INTEGRATION, IDEMPOTENCY & SAFE TRANSACTION CREATION TESTS
 *
 * Tests:
 * 1. Candidate validation (amounts, currency, direction, timestamps, confidence, provider/package match).
 * 2. Credit/Debit mapping and exact paise integer minor unit conversion.
 * 3. Merchant preservation and transaction date origin (occurredAt).
 * 4. Deterministic Account resolution (single account, explicit default, multiple accounts -> unresolved).
 * 5. Deterministic Category resolution (merchant rules, keyword patterns, direction fallbacks).
 * 6. Source metadata & provenance retention without raw notification payloads.
 * 7. Database-level idempotency: UNIQUE(source, sourceEventId) prevention of duplicates.
 * 8. Concurrency simulation: parallel candidate processing produces exactly 1 transaction.
 * 9. Crash / restart & queue retry simulation: safe idempotent acknowledgement without duplicate ledger records.
 * 10. Queue acknowledgement safety: ACK only after persistence; failure allows retry.
 * 11. Coexistence with manual transactions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  processTransactionCandidate,
  validateCandidateIntegrity,
} from '../detection/transactionCandidateProcessor';
import { resolveAccount } from '../detection/accountResolver';
import { resolveCategory } from '../detection/categoryResolver';
import {
  syncDetectionQueueToFinancialStore,
} from '../detection/detectionSyncService';
import {
  TransactionRepository,
  DuplicateTransactionError,
} from '../repositories/transactionRepository';
import {
  pushToWebMockQueue,
  clearWebMockQueue,
} from '../native/transactionDetectorPlugin';
import type { IStorageAdapter } from '../storage/storageAdapter';
import type { PersistedData } from '../storage/schema';
import { createInitialPersistedData } from '../storage/schema';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';
import type { TransactionCandidate, RawNotificationPayload } from '../../types/detection';
import type { Account, Category } from '../../types/transaction';

// In-Memory Storage Adapter for isolated testing
class MemoryStorageAdapter implements IStorageAdapter {
  private data: PersistedData;

  constructor(initialData?: PersistedData) {
    this.data = initialData || createInitialPersistedData(DEFAULT_SYSTEM_CATEGORIES);
  }

  loadData(): PersistedData {
    return JSON.parse(JSON.stringify(this.data));
  }

  saveData(data: PersistedData): boolean {
    this.data = JSON.parse(JSON.stringify(data));
    return true;
  }

  clearData(): void {
    this.data = createInitialPersistedData(DEFAULT_SYSTEM_CATEGORIES);
  }

  getHealthInfo() {
    return { status: 'valid' as const, lastChecked: new Date().toISOString() };
  }

  resetCorruptedState(): void {}
}

describe('Stage 7.4: Financial Store Integration & Idempotency Suite', () => {
  let memoryAdapter: MemoryStorageAdapter;
  let testRepo: TransactionRepository;
  let testAccounts: Account[];
  let testCategories: Category[];

  beforeEach(() => {
    clearWebMockQueue();

    testAccounts = [
      {
        id: 'acc_hdfc_primary',
        name: 'HDFC Salary Account',
        type: 'bank',
        openingBalance: 5000000,
        currency: 'INR',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    testCategories = [...DEFAULT_SYSTEM_CATEGORIES];

    const initialData = createInitialPersistedData(testCategories);
    initialData.accounts = [...testAccounts];
    memoryAdapter = new MemoryStorageAdapter(initialData);
    testRepo = new TransactionRepository(memoryAdapter);
  });

  // ====================================================================
  // GROUP 1: CANDIDATE VALIDATION
  // ====================================================================
  describe('Group 1: Candidate Integrity Validation', () => {
    it('validates a well-formed TransactionCandidate', () => {
      const validCandidate: TransactionCandidate = {
        eventId: 'evt_gpay_001',
        provider: 'google_pay',
        amount: 450,
        currency: 'INR',
        direction: 'debit',
        merchant: 'Swiggy',
        transactionReference: '428192849102',
        occurredAt: '2026-03-18T14:30:00.000Z',
        sourcePackage: 'com.google.android.apps.nbu.paisa.user',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };

      const result = validateCandidateIntegrity(validCandidate);
      expect(result.isValid).toBe(true);
    });

    it('rejects candidates with non-positive or non-finite amount', () => {
      const zeroAmount: any = {
        eventId: 'evt_001',
        provider: 'google_pay',
        amount: 0,
        currency: 'INR',
        direction: 'debit',
        occurredAt: '2026-03-18T14:30:00.000Z',
        sourcePackage: 'com.google.android.apps.nbu.paisa.user',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };
      expect(validateCandidateIntegrity(zeroAmount).isValid).toBe(false);

      const negativeAmount: any = { ...zeroAmount, amount: -500 };
      expect(validateCandidateIntegrity(negativeAmount).isValid).toBe(false);

      const nanAmount: any = { ...zeroAmount, amount: NaN };
      expect(validateCandidateIntegrity(nanAmount).isValid).toBe(false);
    });

    it('rejects candidates with unsupported currency or direction', () => {
      const usdCandidate: any = {
        eventId: 'evt_001',
        provider: 'google_pay',
        amount: 50,
        currency: 'USD', // Not INR
        direction: 'debit',
        occurredAt: '2026-03-18T14:30:00.000Z',
        sourcePackage: 'com.google.android.apps.nbu.paisa.user',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };
      expect(validateCandidateIntegrity(usdCandidate).isValid).toBe(false);

      const badDirection: any = { ...usdCandidate, currency: 'INR', direction: 'unknown' };
      expect(validateCandidateIntegrity(badDirection).isValid).toBe(false);
    });

    it('rejects candidates when provider does not match source package', () => {
      const spoofedCandidate: TransactionCandidate = {
        eventId: 'evt_001',
        provider: 'phonepe',
        amount: 500,
        currency: 'INR',
        direction: 'debit',
        occurredAt: '2026-03-18T14:30:00.000Z',
        sourcePackage: 'com.google.android.apps.nbu.paisa.user', // GPay package for PhonePe provider
        confidence: 0.95,
        parserVersion: '1.0.0',
      };
      expect(validateCandidateIntegrity(spoofedCandidate).isValid).toBe(false);
    });

    it('rejects candidates with confidence below minimum threshold (0.90)', () => {
      const lowConfidenceCandidate: TransactionCandidate = {
        eventId: 'evt_001',
        provider: 'paytm',
        amount: 500,
        currency: 'INR',
        direction: 'debit',
        occurredAt: '2026-03-18T14:30:00.000Z',
        sourcePackage: 'net.one97.paytm',
        confidence: 0.75, // Below 0.90
        parserVersion: '1.0.0',
      };
      expect(validateCandidateIntegrity(lowConfidenceCandidate).isValid).toBe(false);
    });
  });

  // ====================================================================
  // GROUP 2: ACCOUNT RESOLUTION
  // ====================================================================
  describe('Group 2: Account Resolution', () => {
    it('resolves automatically when exactly one active account exists', () => {
      const result = resolveAccount({ accounts: testAccounts });
      expect(result.status).toBe('resolved');
      if (result.status === 'resolved') {
        expect(result.accountId).toBe('acc_hdfc_primary');
      }
    });

    it('resolves explicit defaultAccountId when multiple accounts exist', () => {
      const multiAccounts: Account[] = [
        ...testAccounts,
        {
          id: 'acc_sbi_secondary',
          name: 'SBI Savings',
          type: 'bank',
          openingBalance: 1000000,
          currency: 'INR',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      const result = resolveAccount({
        defaultAccountId: 'acc_sbi_secondary',
        accounts: multiAccounts,
      });

      expect(result.status).toBe('resolved');
      if (result.status === 'resolved') {
        expect(result.accountId).toBe('acc_sbi_secondary');
      }
    });

    it('returns unresolved status when multiple accounts exist and no default matches', () => {
      const multiAccounts: Account[] = [
        ...testAccounts,
        {
          id: 'acc_sbi_secondary',
          name: 'SBI Savings',
          type: 'bank',
          openingBalance: 1000000,
          currency: 'INR',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      const result = resolveAccount({ accounts: multiAccounts });
      expect(result.status).toBe('unresolved');
    });

    it('returns unresolved status when no active accounts exist', () => {
      const result = resolveAccount({ accounts: [] });
      expect(result.status).toBe('unresolved');
    });
  });

  // ====================================================================
  // GROUP 3: CATEGORY RESOLUTION
  // ====================================================================
  describe('Group 3: Category Resolution', () => {
    it('matches food merchants to cat_food', () => {
      expect(resolveCategory({ merchant: 'Swiggy', direction: 'debit', categories: testCategories })).toBe('cat_food');
      expect(resolveCategory({ merchant: 'Zomato', direction: 'debit', categories: testCategories })).toBe('cat_food');
      expect(resolveCategory({ merchant: 'Starbucks Coffee', direction: 'debit', categories: testCategories })).toBe('cat_food');
    });

    it('matches transport merchants to cat_transport', () => {
      expect(resolveCategory({ merchant: 'Uber India', direction: 'debit', categories: testCategories })).toBe('cat_transport');
      expect(resolveCategory({ merchant: 'Ola Cabs', direction: 'debit', categories: testCategories })).toBe('cat_transport');
      expect(resolveCategory({ merchant: 'Indian Oil Petrol', direction: 'debit', categories: testCategories })).toBe('cat_transport');
    });

    it('matches shopping merchants to cat_shopping', () => {
      expect(resolveCategory({ merchant: 'Amazon Pay', direction: 'debit', categories: testCategories })).toBe('cat_shopping');
      expect(resolveCategory({ merchant: 'Flipkart', direction: 'debit', categories: testCategories })).toBe('cat_shopping');
    });

    it('applies custom MerchantCategoryRule override if provided', () => {
      const customRule = {
        id: 'mcr_1',
        normalizedMerchant: 'special boutique',
        categoryId: 'cat_personal',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const categoryId = resolveCategory({
        merchant: 'Special Boutique Bangalore',
        direction: 'debit',
        rules: [customRule],
        categories: testCategories,
      });

      expect(categoryId).toBe('cat_personal');
    });

    it('falls back to cat_other for debit and cat_other_income / cat_refund for credit', () => {
      expect(resolveCategory({ merchant: 'Unknown Shop', direction: 'debit', categories: testCategories })).toBe('cat_other');
      expect(resolveCategory({ merchant: 'Friend Transfer', direction: 'credit', categories: testCategories })).toBe('cat_other_income');
      expect(resolveCategory({ merchant: 'Refund for Order', direction: 'credit', categories: testCategories })).toBe('cat_refund');
    });
  });

  // ====================================================================
  // GROUP 4: CANDIDATE PROCESSOR & FINANCIAL PERSISTENCE
  // ====================================================================
  describe('Group 4: Candidate Processing to Financial Store', () => {
    it('creates an Expense transaction from a debit candidate with exact minor units (paise)', () => {
      const candidate: TransactionCandidate = {
        eventId: 'evt_proc_debit_01',
        provider: 'google_pay',
        amount: 450.5, // ₹450.50
        currency: 'INR',
        direction: 'debit',
        merchant: 'Swiggy',
        occurredAt: '2026-03-18T14:30:00.000Z',
        sourcePackage: 'com.google.android.apps.nbu.paisa.user',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };

      const result = processTransactionCandidate(candidate, {
        repository: testRepo,
        accounts: testAccounts,
      });

      expect(result.status).toBe('created');
      if (result.status === 'created') {
        expect(result.transaction.type).toBe('expense');
        expect(result.transaction.amount).toBe(45050); // 450.50 * 100 paise
        expect(result.transaction.accountId).toBe('acc_hdfc_primary');
        expect(result.transaction.categoryId).toBe('cat_food');
        expect(result.transaction.date).toBe('2026-03-18');
        expect(result.transaction.description).toBe('Swiggy');
        expect(result.transaction.source).toBe('notification');
        expect(result.transaction.sourceEventId).toBe('evt_proc_debit_01');
        expect(result.transaction.sourceProvider).toBe('google_pay');
        expect(result.transaction.parserVersion).toBe('1.0.0');
      }

      // Verify persisted in store
      const stored = testRepo.getAll();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(result.status === 'created' ? result.transactionId : '');
    });

    it('creates an Income transaction from a credit candidate with exact minor units (paise)', () => {
      const candidate: TransactionCandidate = {
        eventId: 'evt_proc_credit_01',
        provider: 'phonepe',
        amount: 2500, // ₹2,500
        currency: 'INR',
        direction: 'credit',
        merchant: 'Refund from Merchant',
        occurredAt: '2026-03-18T16:00:00.000Z',
        sourcePackage: 'com.phonepe.app',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };

      const result = processTransactionCandidate(candidate, {
        repository: testRepo,
        accounts: testAccounts,
      });

      expect(result.status).toBe('created');
      if (result.status === 'created') {
        expect(result.transaction.type).toBe('income');
        expect(result.transaction.amount).toBe(250000); // 2500 * 100 paise
        expect(result.transaction.categoryId).toBe('cat_refund');
        expect(result.transaction.source).toBe('notification');
      }
    });

    it('preserves occurredAt date rather than current processing timestamp', () => {
      const candidate: TransactionCandidate = {
        eventId: 'evt_date_test',
        provider: 'paytm',
        amount: 150,
        currency: 'INR',
        direction: 'debit',
        merchant: 'Chai Point',
        occurredAt: '2026-01-15T08:15:00.000Z', // Past date
        sourcePackage: 'net.one97.paytm',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };

      const result = processTransactionCandidate(candidate, {
        repository: testRepo,
        accounts: testAccounts,
      });

      expect(result.status).toBe('created');
      if (result.status === 'created') {
        expect(result.transaction.date).toBe('2026-01-15');
      }
    });
  });

  // ====================================================================
  // GROUP 5: IDEMPOTENCY & CRASH SAFETY
  // ====================================================================
  describe('Group 5: Database-Level Idempotency & Crash Recovery', () => {
    it('prevents duplicate transactions when the same event is processed twice', () => {
      const candidate: TransactionCandidate = {
        eventId: 'evt_idempotent_001',
        provider: 'google_pay',
        amount: 450,
        currency: 'INR',
        direction: 'debit',
        merchant: 'Swiggy',
        occurredAt: '2026-03-18T14:30:00.000Z',
        sourcePackage: 'com.google.android.apps.nbu.paisa.user',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };

      const firstAttempt = processTransactionCandidate(candidate, {
        repository: testRepo,
        accounts: testAccounts,
      });
      expect(firstAttempt.status).toBe('created');

      const secondAttempt = processTransactionCandidate(candidate, {
        repository: testRepo,
        accounts: testAccounts,
      });
      expect(secondAttempt.status).toBe('already_exists');
      if (secondAttempt.status === 'already_exists') {
        expect(secondAttempt.eventId).toBe('evt_idempotent_001');
      }

      // Assert exactly 1 transaction in financial ledger
      const allTxns = testRepo.getAll();
      expect(allTxns).toHaveLength(1);
    });

    it('throws DuplicateTransactionError when attempting raw repository create with identical source + sourceEventId', () => {
      testRepo.create({
        type: 'expense',
        amount: 50000,
        accountId: 'acc_hdfc_primary',
        categoryId: 'cat_food',
        date: '2026-03-18',
        source: 'notification',
        sourceEventId: 'evt_unique_constraint_test',
      });

      expect(() => {
        testRepo.create({
          type: 'expense',
          amount: 50000,
          accountId: 'acc_hdfc_primary',
          categoryId: 'cat_food',
          date: '2026-03-18',
          source: 'notification',
          sourceEventId: 'evt_unique_constraint_test',
        });
      }).toThrow(DuplicateTransactionError);

      expect(testRepo.getAll()).toHaveLength(1);
    });

    it('simulates app restart: recognizes pre-existing transaction across fresh repository instance', () => {
      const candidate: TransactionCandidate = {
        eventId: 'evt_restart_test',
        provider: 'bhim',
        amount: 300,
        currency: 'INR',
        direction: 'debit',
        merchant: 'Local Vendor',
        occurredAt: '2026-03-18T10:00:00.000Z',
        sourcePackage: 'in.org.npci.upiapp',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };

      // 1. Process candidate in initial session
      const result1 = processTransactionCandidate(candidate, {
        repository: testRepo,
        accounts: testAccounts,
      });
      expect(result1.status).toBe('created');

      // 2. Simulate application restart with new repository instance reading persisted storage
      const restartedRepo = new TransactionRepository(memoryAdapter);

      // 3. Re-process the same candidate
      const result2 = processTransactionCandidate(candidate, {
        repository: restartedRepo,
        accounts: testAccounts,
      });

      expect(result2.status).toBe('already_exists');
      expect(restartedRepo.getAll()).toHaveLength(1);
    });

    it('handles concurrent attempts cleanly without creating duplicate records', async () => {
      const candidate: TransactionCandidate = {
        eventId: 'evt_concurrent_001',
        provider: 'google_pay',
        amount: 800,
        currency: 'INR',
        direction: 'debit',
        merchant: 'Zomato',
        occurredAt: '2026-03-18T19:00:00.000Z',
        sourcePackage: 'com.google.android.apps.nbu.paisa.user',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };

      // Simulate 5 parallel workers attempting to process the same candidate
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          Promise.resolve(
            processTransactionCandidate(candidate, {
              repository: testRepo,
              accounts: testAccounts,
            }),
          ),
        ),
      );

      const created = results.filter((r) => r.status === 'created');
      const alreadyExisting = results.filter((r) => r.status === 'already_exists');

      expect(created).toHaveLength(1);
      expect(alreadyExisting).toHaveLength(4);
      expect(testRepo.getAll()).toHaveLength(1);
    });
  });

  // ====================================================================
  // GROUP 6: END-TO-END QUEUE SYNC & ACKNOWLEDGEMENT ORDER
  // ====================================================================
  describe('Group 6: End-to-End Detection Queue Sync & Acknowledgment Order', () => {
    it('processes native queue batch, creates transactions, and acknowledges processed items', async () => {
      const rawGPay: RawNotificationPayload = {
        eventId: 'evt_batch_01',
        packageName: 'com.google.android.apps.nbu.paisa.user',
        title: 'Google Pay',
        text: 'Paid ₹450 to Swiggy. UPI Ref: 428192849102',
        postTime: 1773829200000,
        notificationKey: 'k_b1',
      };

      const rawPhonePe: RawNotificationPayload = {
        eventId: 'evt_batch_02',
        packageName: 'com.phonepe.app',
        title: 'PhonePe',
        text: 'Payment of ₹1,200 to Starbucks successful. Ref: 998877665544',
        postTime: 1773829205000,
        notificationKey: 'k_b2',
      };

      const rawPromo: RawNotificationPayload = {
        eventId: 'evt_batch_promo',
        packageName: 'com.phonepe.app',
        title: 'PhonePe Offer',
        text: 'Get flat ₹50 cashback on bill payment',
        postTime: 1773829210000,
        notificationKey: 'k_b3',
      };

      pushToWebMockQueue(rawGPay);
      pushToWebMockQueue(rawPhonePe);
      pushToWebMockQueue(rawPromo);

      const syncResult = await syncDetectionQueueToFinancialStore({
        repository: testRepo,
        accounts: testAccounts,
        autoAcknowledge: true,
      });

      expect(syncResult.createdTransactions).toHaveLength(2);
      expect(syncResult.ignoredCount).toBe(1); // Promo safely ignored
      expect(syncResult.acknowledgedQueueIds).toEqual(['evt_batch_01', 'evt_batch_02', 'evt_batch_promo']);

      // Ledger has exactly 2 transactions
      const transactions = testRepo.getAll();
      expect(transactions).toHaveLength(2);
      expect(transactions[0].amount).toBe(120000); // Starbucks (sorted by date/createdAt)
      expect(transactions[1].amount).toBe(45000);  // Swiggy
    });

    it('does NOT acknowledge queue item if account is unresolved (safe retention)', async () => {
      const rawItem: RawNotificationPayload = {
        eventId: 'evt_unresolved_acc',
        packageName: 'com.google.android.apps.nbu.paisa.user',
        title: 'Google Pay',
        text: 'Paid ₹450 to Swiggy',
        postTime: 1773829200000,
        notificationKey: 'k_u1',
      };

      // Two accounts without default
      const multiAccounts: Account[] = [
        ...testAccounts,
        {
          id: 'acc_icici',
          name: 'ICICI Bank',
          type: 'bank',
          openingBalance: 1000,
          currency: 'INR',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      const syncResult = await syncDetectionQueueToFinancialStore({
        queueItems: [rawItem],
        repository: testRepo,
        accounts: multiAccounts,
        autoAcknowledge: true,
      });

      // Item should be unresolved
      expect(syncResult.unresolvedCandidates).toHaveLength(1);
      expect(syncResult.createdTransactions).toHaveLength(0);
      // Crucial guarantee: Unresolved items are NOT acknowledged
      expect(syncResult.acknowledgedQueueIds).toHaveLength(0);
      expect(testRepo.getAll()).toHaveLength(0);
    });

    it('allows manual transactions and notification transactions to coexist without interference', () => {
      // 1. Create a manual transaction
      const manualTxn = testRepo.create({
        type: 'expense',
        amount: 20000,
        accountId: 'acc_hdfc_primary',
        categoryId: 'cat_groceries',
        date: '2026-03-18',
        description: 'Manual Grocery Purchase',
        source: 'manual',
      });

      // 2. Process a notification candidate
      const candidate: TransactionCandidate = {
        eventId: 'evt_coexist_01',
        provider: 'google_pay',
        amount: 300,
        currency: 'INR',
        direction: 'debit',
        merchant: 'Swiggy',
        occurredAt: '2026-03-18T15:00:00.000Z',
        sourcePackage: 'com.google.android.apps.nbu.paisa.user',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };

      const notifResult = processTransactionCandidate(candidate, {
        repository: testRepo,
        accounts: testAccounts,
      });

      expect(notifResult.status).toBe('created');
      const allTxns = testRepo.getAll();
      expect(allTxns).toHaveLength(2);

      const foundManual = allTxns.find((t) => t.id === manualTxn.id);
      expect(foundManual?.source).toBe('manual');
      expect(foundManual?.sourceEventId).toBeUndefined();

      const foundNotif = allTxns.find((t) => t.sourceEventId === 'evt_coexist_01');
      expect(foundNotif?.source).toBe('notification');
      expect(foundNotif?.sourceProvider).toBe('google_pay');
    });
  });
});
