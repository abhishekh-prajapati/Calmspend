import type {
  NormalizedBankTransaction,
  NormalizedDepositAccount,
} from '../types/aa.types';

interface RawRebitTxn {
  txnId?: string;
  id?: string;
  type?: string;
  amount?: string | number;
  narration?: string;
  description?: string;
  transactionTimestamp?: string;
  txnDateTime?: string;
  valueDate?: string;
  currentBalance?: string | number;
  balance?: string | number;
  mode?: string;
  reference?: string;
  refNo?: string;
}

interface RawRebitAccount {
  maskedAccNumber?: string;
  accountNumber?: string;
  type?: string;
  accountType?: string;
  fipId?: string;
  fipName?: string;
  summary?: {
    currentBalance?: string | number;
    balance?: string | number;
  };
  transactions?: {
    transaction?: RawRebitTxn[] | RawRebitTxn;
  } | RawRebitTxn[];
}

export class NormalizerService {
  /**
   * Converts a major decimal amount string/number into integer minor units (paise) safely
   * without floating-point arithmetic errors.
   */
  toMinorPaise(amount: string | number | undefined): number {
    if (amount === undefined || amount === null) return 0;
    const cleanStr = String(amount).replace(/,/g, '').trim();
    if (!cleanStr) return 0;

    const parts = cleanStr.split('.');
    const integerPart = parseInt(parts[0] || '0', 10);
    const decimalPart = parts[1] ? parts[1].padEnd(2, '0').slice(0, 2) : '00';

    if (isNaN(integerPart)) return 0;
    return integerPart * 100 + parseInt(decimalPart, 10);
  }

  /**
   * Normalizes ReBIT Deposit JSON/XML data into a structured deposit account object
   */
  normalizeDepositPayload(
    rawPayload: unknown,
    fallbackFipId: string = 'SETU-FIP',
    fallbackFipName: string = 'Bank'
  ): NormalizedDepositAccount[] {
    const results: NormalizedDepositAccount[] = [];

    if (!rawPayload || typeof rawPayload !== 'object') {
      return results;
    }

    const payloadObj = rawPayload as Record<string, unknown>;
    const rawAccounts: RawRebitAccount[] = Array.isArray(payloadObj.account)
      ? (payloadObj.account as RawRebitAccount[])
      : payloadObj.account
      ? [payloadObj.account as RawRebitAccount]
      : Array.isArray(payloadObj.accounts)
      ? (payloadObj.accounts as RawRebitAccount[])
      : [payloadObj as RawRebitAccount];

    for (const rawAcc of rawAccounts) {
      const maskedAccountNumber =
        rawAcc.maskedAccNumber || rawAcc.accountNumber || 'XXXX-XXXX-0000';
      const fipId = rawAcc.fipId || fallbackFipId;
      const fipName = rawAcc.fipName || fallbackFipName;
      const rawCategory = (rawAcc.type || rawAcc.accountType || 'SAVINGS').toUpperCase();
      const accountCategory: 'SAVINGS' | 'CURRENT' = rawCategory.includes('CURRENT')
        ? 'CURRENT'
        : 'SAVINGS';

      const currentBalanceMinor = this.toMinorPaise(
        rawAcc.summary?.currentBalance || rawAcc.summary?.balance || 0
      );

      let rawTxnList: RawRebitTxn[] = [];
      if (rawAcc.transactions) {
        if (Array.isArray(rawAcc.transactions)) {
          rawTxnList = rawAcc.transactions;
        } else if (rawAcc.transactions.transaction) {
          rawTxnList = Array.isArray(rawAcc.transactions.transaction)
            ? rawAcc.transactions.transaction
            : [rawAcc.transactions.transaction];
        }
      }

      const normalizedTxns: NormalizedBankTransaction[] = [];
      for (const rawTxn of rawTxnList) {
        const rawType = (rawTxn.type || '').toUpperCase();
        const type: 'DEBIT' | 'CREDIT' =
          rawType.includes('CR') || rawType === 'CREDIT' ? 'CREDIT' : 'DEBIT';

        const amountMinor = this.toMinorPaise(rawTxn.amount);
        const narration = (rawTxn.narration || rawTxn.description || 'Bank Transaction').trim();
        const txnTimestamp =
          rawTxn.transactionTimestamp || rawTxn.txnDateTime || new Date().toISOString();
        const valueDate = rawTxn.valueDate || txnTimestamp.split('T')[0];

        const txnId =
          rawTxn.txnId ||
          rawTxn.id ||
          rawTxn.reference ||
          rawTxn.refNo ||
          `TXN-${Date.parse(txnTimestamp)}-${amountMinor}`;

        normalizedTxns.push({
          txnId,
          type,
          amountMinor,
          narration,
          transactionTimestamp: txnTimestamp,
          valueDate,
          currentBalanceMinor: this.toMinorPaise(rawTxn.currentBalance || rawTxn.balance),
          mode: rawTxn.mode,
          reference: rawTxn.reference || rawTxn.refNo,
        });
      }

      results.push({
        fipId,
        fipName,
        maskedAccountNumber,
        accountType: accountCategory,
        currentBalanceMinor,
        transactions: normalizedTxns,
      });
    }

    return results;
  }
}

export const normalizerService = new NormalizerService();
