import type {
  NormalizedDepositAccount,
  NormalizedBankTransaction,
} from '../types/aa.types';

export class SandboxSimulator {
  /**
   * Generates realistic sandbox bank deposit transactions matching Setu Mock FIP
   */
  generateSampleDepositData(fipName: string = 'HDFC Bank'): NormalizedDepositAccount[] {
    const today = new Date();
    const getDateDaysAgo = (daysAgo: number): string => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString();
    };

    const sampleTxns: NormalizedBankTransaction[] = [
      {
        txnId: `SETU-SANDBOX-TXN-${today.getFullYear()}-001`,
        type: 'CREDIT',
        amountMinor: 8500000, // ₹85,000.00
        narration: 'SALARY / TECH CORP INDIA PVT LTD / ACH-CR',
        transactionTimestamp: getDateDaysAgo(2),
        valueDate: getDateDaysAgo(2).split('T')[0],
        currentBalanceMinor: 11250000,
        mode: 'ACH',
        reference: 'ACH098234710',
      },
      {
        txnId: `SETU-SANDBOX-TXN-${today.getFullYear()}-002`,
        type: 'DEBIT',
        amountMinor: 420000, // ₹4,200.00
        narration: 'UPI / NATURE BASKET / GROCERIES / 9821389021@okaxis',
        transactionTimestamp: getDateDaysAgo(3),
        valueDate: getDateDaysAgo(3).split('T')[0],
        currentBalanceMinor: 2750000,
        mode: 'UPI',
        reference: 'UPI4981729381',
      },
      {
        txnId: `SETU-SANDBOX-TXN-${today.getFullYear()}-003`,
        type: 'DEBIT',
        amountMinor: 185000, // ₹1,850.00
        narration: 'POS / BLUE TOKAI COFFEE / CAFE & DINING',
        transactionTimestamp: getDateDaysAgo(5),
        valueDate: getDateDaysAgo(5).split('T')[0],
        currentBalanceMinor: 3170000,
        mode: 'POS',
        reference: 'POS891230192',
      },
      {
        txnId: `SETU-SANDBOX-TXN-${today.getFullYear()}-004`,
        type: 'DEBIT',
        amountMinor: 125000, // ₹1,250.00
        narration: 'BBPS / BESCOM ELECTRICITY BILL / AUTO-DEBIT',
        transactionTimestamp: getDateDaysAgo(8),
        valueDate: getDateDaysAgo(8).split('T')[0],
        currentBalanceMinor: 3355000,
        mode: 'BBPS',
        reference: 'BBPS91820491',
      },
      {
        txnId: `SETU-SANDBOX-TXN-${today.getFullYear()}-005`,
        type: 'DEBIT',
        amountMinor: 240000, // ₹2,400.00
        narration: 'UPI / SWIGGY INSTAMART / QUICK COMMERCE',
        transactionTimestamp: getDateDaysAgo(10),
        valueDate: getDateDaysAgo(10).split('T')[0],
        currentBalanceMinor: 3480000,
        mode: 'UPI',
        reference: 'UPI391028472',
      },
    ];

    return [
      {
        fipId: 'SETU-FIP-HDFC',
        fipName,
        maskedAccountNumber: 'XXXX-XXXX-4821',
        accountType: 'SAVINGS',
        currentBalanceMinor: 11250000, // ₹1,12,500.00
        transactions: sampleTxns,
      },
    ];
  }
}

export const sandboxSimulator = new SandboxSimulator();
