/**
 * STAGE 7.3 — QUEUE DRAIN SYNCHRONIZATION & PROVIDER PARSER TESTS
 *
 * Validates:
 * 1. Provider identification and registry lookup.
 * 2. Amount extraction (Indian currency notation, context-awareness against balance numbers).
 * 3. Direction and merchant extraction across Google Pay, PhonePe, Paytm, and BHIM.
 * 4. False-positive filtering (promotions, cashback, balance alerts, login alerts).
 * 5. Confidence scoring (>= 0.90 for high certainty).
 * 6. Queue drain service execution, batch deduplication, retry semantics, and acknowledgment.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getProviderFromPackage,
  getParserForPackage,
  getParserForProvider,
} from '../detection/parsers/parserRegistry';
import {
  extractAmount,
  extractTransactionReference,
  cleanMerchantName,
  isFalsePositive,
} from '../detection/parsers/parserUtils';
import {
  parseQueueItem,
  validateCandidate,
  drainNativeQueue,
} from '../detection/queueDrainService';
import {
  GOOGLE_PAY_FIXTURES,
  PHONEPE_FIXTURES,
  PAYTM_FIXTURES,
  BHIM_FIXTURES,
  FALSE_POSITIVE_FIXTURES,
} from '../detection/fixtures';
import {
  pushToWebMockQueue,
  clearWebMockQueue,
} from '../native/transactionDetectorPlugin';
import type { RawNotificationPayload, TransactionCandidate } from '../../types/detection';

describe('Stage 7.3: TypeScript Provider Parsers & Queue Drain Suite', () => {
  // ====================================================================
  // GROUP 1: PROVIDER IDENTIFICATION & REGISTRY
  // ====================================================================
  describe('Group 1: Provider Registry', () => {
    it('identifies Google Pay package correctly', () => {
      expect(getProviderFromPackage('com.google.android.apps.nbu.paisa.user')).toBe('google_pay');
    });

    it('identifies PhonePe package correctly', () => {
      expect(getProviderFromPackage('com.phonepe.app')).toBe('phonepe');
    });

    it('identifies Paytm package correctly', () => {
      expect(getProviderFromPackage('net.one97.paytm')).toBe('paytm');
    });

    it('identifies BHIM package correctly', () => {
      expect(getProviderFromPackage('in.org.npci.upiapp')).toBe('bhim');
    });

    it('returns null for unknown / non-whitelisted packages', () => {
      expect(getProviderFromPackage('com.whatsapp')).toBeNull();
      expect(getProviderFromPackage('com.fake.bank')).toBeNull();
      expect(getProviderFromPackage('')).toBeNull();
    });

    it('retrieves parser by provider name', () => {
      expect(getParserForProvider('google_pay')).toBeDefined();
      expect(getParserForProvider('phonepe')).toBeDefined();
      expect(getParserForProvider('paytm')).toBeDefined();
      expect(getParserForProvider('bhim')).toBeDefined();
    });
  });

  // ====================================================================
  // GROUP 2: AMOUNT EXTRACTION & INDIAN NUMBER FORMATTING
  // ====================================================================
  describe('Group 2: Amount Extraction', () => {
    it('extracts amounts with ₹ symbol', () => {
      expect(extractAmount('Paid ₹500 to Merchant')).toBe(500);
      expect(extractAmount('Paid ₹500.00 to Merchant')).toBe(500);
      expect(extractAmount('Paid ₹1,000 to Merchant')).toBe(1000);
      expect(extractAmount('Paid ₹1,00,000 to Merchant')).toBe(100000);
      expect(extractAmount('Paid ₹12,34,567.89 to Merchant')).toBe(1234567.89);
    });

    it('extracts amounts with Rs and INR prefixes', () => {
      expect(extractAmount('Paid Rs 500 to Merchant')).toBe(500);
      expect(extractAmount('Paid Rs. 500.50 to Merchant')).toBe(500.5);
      expect(extractAmount('Paid INR 1,500 to Merchant')).toBe(1500);
    });

    it('is context-aware and ignores balance amounts', () => {
      expect(extractAmount('₹500 debited. Available balance ₹12,450')).toBe(500);
      expect(extractAmount('Paid ₹450 to Amazon. Bal: ₹3,210')).toBe(450);
      expect(extractAmount('Sent ₹1,200 to John. Balance is ₹50,000')).toBe(1200);
    });

    it('rejects invalid or non-numeric amount text', () => {
      expect(extractAmount('No amount in this message')).toBeNull();
      expect(extractAmount('Paid ₹0 to test')).toBeNull();
      expect(extractAmount('Paid -₹50 to test')).toBeNull();
      expect(extractAmount('')).toBeNull();
    });
  });

  // ====================================================================
  // GROUP 3: REFERENCE & MERCHANT UTILITIES
  // ====================================================================
  describe('Group 3: Reference & Merchant Utilities', () => {
    it('extracts 12-digit UPI RRN / UTR references', () => {
      expect(extractTransactionReference('UPI Ref No: 428192849102')).toBe('428192849102');
      expect(extractTransactionReference('UTR: 123456789012')).toBe('123456789012');
      expect(extractTransactionReference('Txn ID: TXN9988776655')).toBe('TXN9988776655');
      expect(extractTransactionReference('No reference here')).toBeUndefined();
    });

    it('normalizes merchant names and strips VPA handles', () => {
      expect(cleanMerchantName('Starbucks Coffee')).toBe('Starbucks Coffee');
      expect(cleanMerchantName('swiggy@icici')).toBe('swiggy');
      expect(cleanMerchantName('zomato.order@okhdfcbank')).toBe('zomato.order');
      expect(cleanMerchantName('Merchant name (UPI: 12345)')).toBe('Merchant name');
      expect(cleanMerchantName('')).toBeUndefined();
    });
  });

  // ====================================================================
  // GROUP 4: PROVIDER FIXTURE PARSING
  // ====================================================================
  describe('Group 4: Provider Fixtures', () => {
    it('parses all Google Pay fixtures accurately', () => {
      const parser = getParserForPackage('com.google.android.apps.nbu.paisa.user')!;
      expect(parser).toBeDefined();

      for (const fixture of GOOGLE_PAY_FIXTURES) {
        const result = parser.parse(fixture.input);
        expect(result.status).toBe(fixture.expectedStatus);

        if (result.status === 'transaction') {
          expect(result.candidate.amount).toBe(fixture.expectedAmount);
          expect(result.candidate.direction).toBe(fixture.expectedDirection);
          expect(result.candidate.provider).toBe('google_pay');
          expect(result.candidate.currency).toBe('INR');
          expect(result.candidate.confidence).toBeGreaterThanOrEqual(0.9);

          if (fixture.expectedMerchant) {
            expect(result.candidate.merchant).toBe(fixture.expectedMerchant);
          }
          if (fixture.expectedReference) {
            expect(result.candidate.transactionReference).toBe(fixture.expectedReference);
          }
        }
      }
    });

    it('parses all PhonePe fixtures accurately', () => {
      const parser = getParserForPackage('com.phonepe.app')!;
      expect(parser).toBeDefined();

      for (const fixture of PHONEPE_FIXTURES) {
        const result = parser.parse(fixture.input);
        expect(result.status).toBe(fixture.expectedStatus);

        if (result.status === 'transaction') {
          expect(result.candidate.amount).toBe(fixture.expectedAmount);
          expect(result.candidate.direction).toBe(fixture.expectedDirection);
          expect(result.candidate.provider).toBe('phonepe');
          expect(result.candidate.confidence).toBeGreaterThanOrEqual(0.9);

          if (fixture.expectedMerchant) {
            expect(result.candidate.merchant).toBe(fixture.expectedMerchant);
          }
          if (fixture.expectedReference) {
            expect(result.candidate.transactionReference).toBe(fixture.expectedReference);
          }
        }
      }
    });

    it('parses all Paytm fixtures accurately', () => {
      const parser = getParserForPackage('net.one97.paytm')!;
      expect(parser).toBeDefined();

      for (const fixture of PAYTM_FIXTURES) {
        const result = parser.parse(fixture.input);
        expect(result.status).toBe(fixture.expectedStatus);

        if (result.status === 'transaction') {
          expect(result.candidate.amount).toBe(fixture.expectedAmount);
          expect(result.candidate.direction).toBe(fixture.expectedDirection);
          expect(result.candidate.provider).toBe('paytm');
          expect(result.candidate.confidence).toBeGreaterThanOrEqual(0.9);

          if (fixture.expectedMerchant) {
            expect(result.candidate.merchant).toBe(fixture.expectedMerchant);
          }
          if (fixture.expectedReference) {
            expect(result.candidate.transactionReference).toBe(fixture.expectedReference);
          }
        }
      }
    });

    it('parses all BHIM fixtures accurately', () => {
      const parser = getParserForPackage('in.org.npci.upiapp')!;
      expect(parser).toBeDefined();

      for (const fixture of BHIM_FIXTURES) {
        const result = parser.parse(fixture.input);
        expect(result.status).toBe(fixture.expectedStatus);

        if (result.status === 'transaction') {
          expect(result.candidate.amount).toBe(fixture.expectedAmount);
          expect(result.candidate.direction).toBe(fixture.expectedDirection);
          expect(result.candidate.provider).toBe('bhim');
          expect(result.candidate.confidence).toBeGreaterThanOrEqual(0.9);

          if (fixture.expectedMerchant) {
            expect(result.candidate.merchant).toBe(fixture.expectedMerchant);
          }
          if (fixture.expectedReference) {
            expect(result.candidate.transactionReference).toBe(fixture.expectedReference);
          }
        }
      }
    });
  });

  // ====================================================================
  // GROUP 5: FALSE POSITIVE FILTERING
  // ====================================================================
  describe('Group 5: False Positive Filtering', () => {
    it('correctly classifies promotional and alert notifications as not_transaction', () => {
      for (const fixture of FALSE_POSITIVE_FIXTURES) {
        const parser = getParserForPackage(fixture.input.packageName);
        if (parser) {
          const result = parser.parse(fixture.input);
          expect(result.status).toBe(fixture.expectedStatus);
        } else {
          expect(isFalsePositive(`${fixture.input.title} ${fixture.input.text}`)).toBe(true);
        }
      }
    });

    it('filters out pure balance notifications without transactions', () => {
      const balanceOnly: RawNotificationPayload = {
        eventId: 'evt_bal_1',
        packageName: 'com.phonepe.app',
        title: 'Bank Balance',
        text: 'Your A/c balance is ₹5,000.00',
        postTime: 1773829200000,
        notificationKey: 'k_bal',
      };

      const result = parseQueueItem(balanceOnly);
      expect(result.status).toBe('not_transaction');
    });
  });

  // ====================================================================
  // GROUP 6: CANDIDATE VALIDATION & QUEUE DRAIN
  // ====================================================================
  describe('Group 6: Candidate Validation & Queue Drain', () => {
    it('validates legitimate TransactionCandidate structures', () => {
      const validCandidate: TransactionCandidate = {
        eventId: 'evt_123',
        provider: 'google_pay',
        amount: 450,
        currency: 'INR',
        direction: 'debit',
        merchant: 'Swiggy',
        transactionReference: '428192849102',
        occurredAt: '2026-03-18T10:00:00.000Z',
        sourcePackage: 'com.google.android.apps.nbu.paisa.user',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };

      expect(validateCandidate(validCandidate)).toBe(true);
    });

    it('rejects candidates with invalid amount, currency, or confidence', () => {
      const badAmountCandidate: any = {
        eventId: 'evt_bad',
        provider: 'google_pay',
        amount: -100, // Invalid
        currency: 'INR',
        direction: 'debit',
        occurredAt: '2026-03-18T10:00:00.000Z',
        sourcePackage: 'com.google.android.apps.nbu.paisa.user',
        confidence: 0.95,
        parserVersion: '1.0.0',
      };

      expect(validateCandidate(badAmountCandidate)).toBe(false);
    });

    it('drains queue, deduplicates by eventId, and acknowledges processed items using webMockQueue', async () => {
      clearWebMockQueue();

      const mockRaw1: RawNotificationPayload = {
        eventId: 'evt_drain_001',
        packageName: 'com.google.android.apps.nbu.paisa.user',
        title: 'Google Pay',
        text: 'Paid ₹450 to Swiggy. UPI Ref: 428192849102',
        postTime: 1773829200000,
        notificationKey: 'k1',
      };

      const mockRaw1Dup: RawNotificationPayload = {
        ...mockRaw1,
      };

      const mockRawPromo: RawNotificationPayload = {
        eventId: 'evt_drain_promo',
        packageName: 'com.phonepe.app',
        title: 'PhonePe Offer',
        text: 'Get flat ₹50 cashback on recharge',
        postTime: 1773829205000,
        notificationKey: 'k2',
      };

      pushToWebMockQueue(mockRaw1);
      pushToWebMockQueue(mockRaw1Dup);
      pushToWebMockQueue(mockRawPromo);

      const drainResult = await drainNativeQueue({ autoAcknowledge: true });

      // Candidates deduplicated: only 1 candidate for evt_drain_001
      expect(drainResult.candidates).toHaveLength(1);
      expect(drainResult.candidates[0].eventId).toBe('evt_drain_001');
      expect(drainResult.candidates[0].amount).toBe(450);
      expect(drainResult.candidates[0].merchant).toBe('Swiggy');

      // Both the transaction events and promo are acknowledged (to clear the queue safely)
      expect(drainResult.processedQueueIds).toEqual(['evt_drain_001', 'evt_drain_001', 'evt_drain_promo']);
      expect(drainResult.ignoredCount).toBe(1);

      clearWebMockQueue();
    });

    it('does NOT acknowledge queue item if parser encounters an unexpected runtime error (retry semantics)', async () => {
      const badItem: RawNotificationPayload = {
        eventId: 'evt_drain_err',
        packageName: 'com.google.android.apps.nbu.paisa.user',
        title: 'Google Pay',
        text: 'Paid ₹200 to Chai Point',
        postTime: 1773829200000,
        notificationKey: 'k3',
      };

      // Force error during parser execution
      const origParser = getParserForPackage('com.google.android.apps.nbu.paisa.user');
      if (origParser) {
        const parseSpy = vi.spyOn(origParser, 'parse').mockImplementationOnce(() => {
          throw new Error('Unexpected catastrophic parsing failure');
        });

        const result = await drainNativeQueue({ autoAcknowledge: true, queueItems: [badItem] });

        // Failed item is NOT acknowledged, allowing subsequent retry
        expect(result.candidates).toHaveLength(0);
        expect(result.processedQueueIds).toHaveLength(0);

        parseSpy.mockRestore();
      }
    });
  });
});
