import type { ParserInput } from '../../../types/detection';

export interface TestFixture {
  input: ParserInput;
  expectedStatus: 'transaction' | 'not_transaction' | 'unrecognized';
  expectedAmount?: number;
  expectedDirection?: 'credit' | 'debit';
  expectedMerchant?: string;
  expectedReference?: string;
}

export const GOOGLE_PAY_FIXTURES: TestFixture[] = [
  {
    input: {
      eventId: 'evt_gpay_001',
      packageName: 'com.google.android.apps.nbu.paisa.user',
      title: 'Google Pay',
      text: 'Paid ₹450 to Swiggy. UPI transaction ID: 428192849102',
      subText: '',
      postTime: 1773829200000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 450,
    expectedDirection: 'debit',
    expectedMerchant: 'Swiggy',
    expectedReference: '428192849102',
  },
  {
    input: {
      eventId: 'evt_gpay_002',
      packageName: 'com.google.android.apps.nbu.paisa.user',
      title: 'Google Pay',
      text: 'You paid ₹1,200 to Starbucks Coffee. Ref: 987654321012',
      subText: '',
      postTime: 1773829205000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 1200,
    expectedDirection: 'debit',
    expectedMerchant: 'Starbucks Coffee',
    expectedReference: '987654321012',
  },
  {
    input: {
      eventId: 'evt_gpay_003',
      packageName: 'com.google.android.apps.nbu.paisa.user',
      title: 'Google Pay',
      text: '₹2,000 received from Rahul Sharma',
      subText: 'Google Pay',
      postTime: 1773829210000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 2000,
    expectedDirection: 'credit',
    expectedMerchant: 'Rahul Sharma',
  },
  {
    input: {
      eventId: 'evt_gpay_004',
      packageName: 'com.google.android.apps.nbu.paisa.user',
      title: 'Google Pay',
      text: 'Payment to Uber of ₹350.50 was successful. UTR: 112233445566',
      subText: '',
      postTime: 1773829215000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 350.5,
    expectedDirection: 'debit',
    expectedMerchant: 'Uber',
    expectedReference: '112233445566',
  },
];
