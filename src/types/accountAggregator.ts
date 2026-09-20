export type AAConsentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'PAUSED'
  | 'FAILED';

export type AASyncStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';

export type FIType = 'DEPOSIT';

export interface BankConnection {
  id: string;
  provider: 'setu';
  customerVpa: string;
  mobileNumber?: string;
  status: AAConsentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AAConsent {
  id: string;
  connectionId: string;
  setuConsentId: string;
  consentStatus: AAConsentStatus;
  consentHandle?: string;
  consentUrl?: string;
  validFrom: string;
  validTo: string;
  fipId?: string;
  fipName?: string;
  accounts?: LinkedBankAccount[];
  createdAt: string;
  updatedAt: string;
}

export interface LinkedBankAccount {
  id: string;
  connectionId: string;
  consentId: string;
  fipId: string;
  fipName: string;
  maskedAccountNumber: string;
  accountCategory: 'SAVINGS' | 'CURRENT';
  accountType: 'bank' | 'savings';
  currentBalanceMinor?: number;
  lastSyncedAt?: string;
  syncStatus: AASyncStatus;
  localAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AASyncLog {
  id: string;
  consentId: string;
  sessionId?: string;
  triggerType: 'INITIAL_FETCH' | 'PERIODIC_SYNC' | 'MANUAL';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  transactionsFetched: number;
  transactionsImported: number;
  transactionsSkipped: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface NormalizedBankTransaction {
  txnId: string;
  type: 'DEBIT' | 'CREDIT';
  amountMinor: number;
  narration: string;
  transactionTimestamp: string;
  valueDate: string;
  currentBalanceMinor?: number;
  mode?: string;
  reference?: string;
}

export interface NormalizedDepositAccount {
  fipId: string;
  fipName: string;
  maskedAccountNumber: string;
  accountType: 'SAVINGS' | 'CURRENT';
  currentBalanceMinor: number;
  transactions: NormalizedBankTransaction[];
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
