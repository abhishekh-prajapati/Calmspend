import type { TestFixture } from './googlePayFixtures';

export const PHONEPE_FIXTURES: TestFixture[] = [
  {
    input: {
      eventId: 'evt_phonepe_001',
      packageName: 'com.phonepe.app',
      title: 'PhonePe',
      text: 'Paid ₹500 to Flipkart. Txn ID: T26031812345678',
      subText: 'Payment Successful',
      postTime: 1773829300000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 500,
    expectedDirection: 'debit',
    expectedMerchant: 'Flipkart',
    expectedReference: 'T26031812345678',
  },
  {
    input: {
      eventId: 'evt_phonepe_002',
      packageName: 'com.phonepe.app',
      title: 'PhonePe',
      text: 'Money sent to Ramesh Kumar ₹1,500. UTR: 428192849103',
      subText: '',
      postTime: 1773829305000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 1500,
    expectedDirection: 'debit',
    expectedMerchant: 'Ramesh Kumar',
    expectedReference: '428192849103',
  },
  {
    input: {
      eventId: 'evt_phonepe_003',
      packageName: 'com.phonepe.app',
      title: 'PhonePe',
      text: 'Received ₹5,000 from Priya Verma in your bank account',
      subText: '',
      postTime: 1773829310000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 5000,
    expectedDirection: 'credit',
    expectedMerchant: 'Priya Verma',
  },
];
