import assert from 'assert';

// Initialize mock in-memory localStorage for Node testing environment
const storageMap = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => { storageMap.set(key, val); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  length: 0,
  key: () => null,
};

// Enable simulator for local unit test harness
process.env.SETU_SANDBOX_SIMULATOR = 'true';

import { normalizerService } from '../../../backend/src/services/normalizerService';
import { sandboxSimulator } from '../../../backend/src/services/sandboxSimulator';
import { setuService } from '../../../backend/src/services/setuService';
import { aaSyncManager } from '../aa/aaSyncManager';
import { categoryRepository } from '../repositories/categoryRepository';


console.log('=== ACCOUNT AGGREGATOR (AA / FIU) INTEGRATION TEST SUITE ===\n');

// 1. Test Setu Service Consent Creation & Status Tracking
console.log('Test 1: Setu Service Consent Creation');
const consentResult = await setuService.createConsent({ mobileNumber: '9876543210' });
assert(consentResult.consentId.length > 0, 'ConsentId should be generated');
assert(consentResult.redirectUrl.length > 0, 'Redirect URL should be present');
assert.strictEqual(consentResult.status, 'PENDING');
const statusResult = await setuService.getConsentStatus(consentResult.consentId);
assert.strictEqual(statusResult.consentId, consentResult.consentId);
assert.strictEqual(statusResult.status, 'PENDING');
console.log('  ✓ Setu Consent lifecycle created & tracked successfully');

// 2. Test Normalizer & Deposit Payload Processing
console.log('\nTest 2: Normalizer parses ReBIT Deposit data into integer paise');
const samplePayload = {
  account: {
    maskedAccNumber: 'XXXX-XXXX-9999',
    type: 'SAVINGS',
    fipId: 'FIP-SBI',
    fipName: 'State Bank of India',
    summary: { currentBalance: '25450.50' },
    transactions: {
      transaction: [
        {
          txnId: 'SBI-TXN-001',
          type: 'CREDIT',
          amount: '50000.00',
          narration: 'SALARY CREDIT FOR SEPT',
          transactionTimestamp: '2026-09-01T10:00:00Z',
          valueDate: '2026-09-01',
        },
        {
          txnId: 'SBI-TXN-002',
          type: 'DEBIT',
          amount: '1500.75',
          narration: 'UPI / SUPERMARKET GROCERIES',
          transactionTimestamp: '2026-09-02T14:30:00Z',
          valueDate: '2026-09-02',
        },
      ],
    },
  },
};

const normalized = normalizerService.normalizeDepositPayload(samplePayload);
assert.strictEqual(normalized.length, 1, 'Should parse 1 account');
assert.strictEqual(normalized[0].maskedAccountNumber, 'XXXX-XXXX-9999');
assert.strictEqual(normalized[0].currentBalanceMinor, 2545050, '₹25,450.50 should be 2545050 paise');
assert.strictEqual(normalized[0].transactions.length, 2, 'Should parse 2 transactions');
assert.strictEqual(normalized[0].transactions[0].amountMinor, 5000000, '₹50,000.00 should be 5000000 paise');
assert.strictEqual(normalized[0].transactions[0].type, 'CREDIT');
assert.strictEqual(normalized[0].transactions[1].amountMinor, 150075, '₹1,500.75 should be 150075 paise');
assert.strictEqual(normalized[0].transactions[1].type, 'DEBIT');
console.log('  ✓ Deposit payload correctly converted without floating-point inaccuracies');

// 3. Test Sandbox Simulator Data
console.log('\nTest 3: Sandbox Simulator Data Consistency');
const simData = sandboxSimulator.generateSampleDepositData('HDFC Bank');
assert(simData.length > 0);
assert(simData[0].transactions.length >= 5);
assert.strictEqual(simData[0].fipName, 'HDFC Bank');
console.log('  ✓ Simulator provides structured sandbox accounts and transactions');

// 4. Test Ingestion & Idempotent Duplicate Protection
console.log('\nTest 4: Ingestion and Duplicate Protection Invariants');
const categories = categoryRepository.getAll();
const testConnectionId = 'test-conn-uuid-1';

// First Ingestion
const sync1 = await aaSyncManager.ingestNormalizedAccounts(
  testConnectionId,
  normalized,
  categories
);
assert.strictEqual(sync1.importedCount, 2, 'Should import 2 initial transactions');
assert.strictEqual(sync1.skippedCount, 0, 'Should skip 0 on first run');

// Second Ingestion of same data (Idempotency Check)
const sync2 = await aaSyncManager.ingestNormalizedAccounts(
  testConnectionId,
  normalized,
  categories
);
assert.strictEqual(sync2.importedCount, 0, 'Should import 0 on repeated sync');
assert.strictEqual(sync2.skippedCount, 2, 'Should skip 2 duplicate transactions');
console.log('  ✓ Repeated sync does NOT duplicate transactions (100% duplicate protected)');

console.log('\n================================================');
console.log('ALL ACCOUNT AGGREGATOR TESTS PASSED SUCCESSFULLY! ✓');
