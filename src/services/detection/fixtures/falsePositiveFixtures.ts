import type { TestFixture } from './googlePayFixtures';

export const FALSE_POSITIVE_FIXTURES: TestFixture[] = [
  {
    input: {
      eventId: 'evt_promo_001',
      packageName: 'com.google.android.apps.nbu.paisa.user',
      title: 'Google Pay Rewards',
      text: 'You won a scratch card! Get flat ₹100 cashback on your next bill payment',
      subText: '',
      postTime: 1773829600000,
    },
    expectedStatus: 'not_transaction',
  },
  {
    input: {
      eventId: 'evt_promo_002',
      packageName: 'com.phonepe.app',
      title: 'Special Offer',
      text: 'Earn ₹50 on mobile recharge today. Tap to claim your coupon discount',
      subText: '',
      postTime: 1773829605000,
    },
    expectedStatus: 'not_transaction',
  },
  {
    input: {
      eventId: 'evt_security_001',
      packageName: 'net.one97.paytm',
      title: 'Security Alert',
      text: 'Your Paytm account was logged in from a new device in Mumbai. If this was not you, change your password.',
      subText: '',
      postTime: 1773829610000,
    },
    expectedStatus: 'not_transaction',
  },
  {
    input: {
      eventId: 'evt_balance_001',
      packageName: 'in.org.npci.upiapp',
      title: 'BHIM Balance Inquiry',
      text: 'Your available balance in HDFC Bank A/c XX1234 is ₹12,450.50',
      subText: '',
      postTime: 1773829615000,
    },
    expectedStatus: 'not_transaction',
  },
  {
    input: {
      eventId: 'evt_reminder_001',
      packageName: 'com.phonepe.app',
      title: 'Electricity Bill Reminder',
      text: 'Your electricity bill is due tomorrow. Avoid late fees by paying now.',
      subText: '',
      postTime: 1773829620000,
    },
    expectedStatus: 'not_transaction',
  },
];
