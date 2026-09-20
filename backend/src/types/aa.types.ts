export type AAConsentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'PAUSED'
  | 'FAILED';

export interface CreateConsentRequest {
  mobileNumber: string;
  customerVpa?: string;
  redirectUrl?: string;
}

export interface CreateConsentResponse {
  consentId: string;
  redirectUrl: string;
  status: AAConsentStatus;
  validFrom: string;
  validTo: string;
}

export interface ConsentStatusResponse {
  consentId: string;
  status: AAConsentStatus;
  fipId?: string;
  fipName?: string;
  accountsCount?: number;
  validFrom: string;
  validTo: string;
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
