import type { TestFixture } from './googlePayFixtures';

export const BHIM_FIXTURES: TestFixture[] = [
  {
    input: {
      eventId: 'evt_bhim_001',
      packageName: 'in.org.npci.upiapp',
      title: 'BHIM',
      text: 'Sent ₹300 to BigBasket. UPI Ref: 428192849105',
      subText: '',
      postTime: 1773829500000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 300,
    expectedDirection: 'debit',
    expectedMerchant: 'BigBasket',
    expectedReference: '428192849105',
  },
  {
    input: {
      eventId: 'evt_bhim_002',
      packageName: 'in.org.npci.upiapp',
      title: 'BHIM',
      text: 'Payment of ₹1,500 to Electricity Board successful',
      subText: '',
      postTime: 1773829505000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 1500,
    expectedDirection: 'debit',
    expectedMerchant: 'Electricity Board',
  },
  {
    input: {
      eventId: 'evt_bhim_003',
      packageName: 'in.org.npci.upiapp',
      title: 'BHIM',
      text: 'Received ₹750 from shopkeeper@upi',
      subText: '',
      postTime: 1773829510000,
    },
    expectedStatus: 'transaction',
    expectedAmount: 750,
    expectedDirection: 'credit',
  },
];
