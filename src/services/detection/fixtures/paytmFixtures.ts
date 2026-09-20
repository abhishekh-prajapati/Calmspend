import type { TestFixture } from './googlePayFixtures';

export const PAYTM_FIXTURES: TestFixture[] = [
  {
    input: {
      eventId: 'evt_paytm_001',
      packageName: 'net.one97.paytm',
      title: 'Paytm',
      text: 'Paid ₹150 at McDonalds. UPI Ref: 428192849104',
      subText: '',
      postTime: 1773829400000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 150,
    expectedDirection: 'debit',
    expectedMerchant: 'McDonalds',
    expectedReference: '428192849104',
  },
  {
    input: {
      eventId: 'evt_paytm_002',
      packageName: 'net.one97.paytm',
      title: 'Paytm',
      text: 'Payment of ₹999 at Reliance Digital successful',
      subText: '',
      postTime: 1773829405000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 999,
    expectedDirection: 'debit',
    expectedMerchant: 'Reliance Digital',
  },
  {
    input: {
      eventId: 'evt_paytm_003',
      packageName: 'net.one97.paytm',
      title: 'Paytm',
      text: 'Money Received: ₹1,000 from Amit Patel',
      subText: '',
      postTime: 1773829410000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 1000,
    expectedDirection: 'credit',
    expectedMerchant: 'Amit Patel',
  },
];
