/**
 * STAGE 7 — SMART TRANSACTION DETECTION DOMAIN TYPES
 */

export type DetectedTransactionSource =
  | 'android_notification'
  | 'manual_share'
  | 'account_aggregator_future';

export type DetectionStatus =
  | 'pending'    // Awaiting user review in inbox
  | 'confirmed'  // User converted into actual Transaction
  | 'ignored'    // User dismissed/ignored
  | 'expired'    // Auto-pruned after retention window
  | 'failed';    // Parsing/validation error

export type DetectionDirection = 'expense' | 'income' | 'transfer_suggested' | 'unknown';

export type DetectionConfidence = 'high' | 'medium' | 'low';

export type TransactionProvider = 'google_pay' | 'phonepe' | 'paytm' | 'bhim';

export interface DetectionQueueItem {
  id: string;
  eventId: string;
  packageName: string;
  title: string | null;
  text: string | null;
  subText: string | null;
  postTime: number;
  notificationKey: string | null;
  createdAt: string;
  processedAt: string | null;
  expiresAt: string;
}

export interface ParserInput {
  eventId: string;
  packageName: string;
  title: string;
  text: string;
  subText: string;
  postTime: number;
}

export interface TransactionCandidate {
  eventId: string;
  provider: TransactionProvider;
  amount: number; // Exact currency amount (major units, e.g. 450, 1000.5)
  currency: 'INR';
  direction: 'credit' | 'debit';
  merchant?: string;
  transactionReference?: string;
  occurredAt: string; // ISO 8601 string
  sourcePackage: string;
  confidence: number; // 0.0 to 1.0 (>= 0.90 for high certainty)
  parserVersion: string;
}

export type ParserResult =
  | {
      status: 'transaction';
      candidate: TransactionCandidate;
    }
  | {
      status: 'not_transaction';
      reason: string;
    }
  | {
      status: 'unrecognized';
      reason: string;
    };

export interface ProviderParser {
  readonly provider: TransactionProvider;
  readonly version: string;
  parse(input: ParserInput): ParserResult;
}

export interface DetectedTransaction {
  id: string;                          // Unique candidate ID (e.g. 'dtxn_...')
  eventId: string;                     // Deterministic source event ID for idempotency (e.g. 'evt_...')
  source: DetectedTransactionSource;
  sourcePackage: string;               // e.g. 'com.google.android.apps.nbu.paisa.user'
  detectedAt: string;                  // ISO 8601 timestamp
  transactionDate: string;             // YYYY-MM-DD
  direction: DetectionDirection;
  amountMinor: number;                 // Exact integer paise
  currency: string;                    // 'INR'
  merchantName: string;                // Counterparty / merchant / entity name
  accountHint?: string;                // e.g. 'HDFC Bank ••1234'
  suggestedAccountId?: string;         // Matched PBP Account ID
  suggestedCategoryId?: string;        // Matched PBP Category ID
  suggestedToAccountId?: string;       // For suggested transfers (e.g. CC Bill payment)
  upiReference?: string;               // RRN / UTR / Reference ID
  confidence: DetectionConfidence;
  status: DetectionStatus;
  fingerprint: string;                 // Deterministic duplicate identifier
  isProbableDuplicate?: boolean;       // Flagged for user review without silent drop
  convertedTransactionId?: string;     // Link to created Transaction once confirmed
  isTransferSuspected?: boolean;
  isCreditCardBillSuspected?: boolean;
  matchedScheduledBillId?: string;     // Matched Stage 8 recurring schedule
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantCategoryRule {
  id: string;                          // 'mcr_...'
  normalizedMerchant: string;          // e.g. 'swiggy'
  categoryId: string;                  // 'cat_food'
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProviderDefinition {
  id: string;
  displayName: string;
  packageNames: string[];
  enabledByDefault: boolean;
  parserVersion: number;
}

export interface DetectionSettings {
  isEnabled: boolean;
  enabledProviders: Record<string, boolean>; // providerId -> boolean
  autoExpireDays: number;                    // Default 30 days
  hideDetailsOnLockScreen: boolean;          // Default true (generic notification text)
}

export const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
  isEnabled: false,
  enabledProviders: {
    gpay: true,
    phonepe: true,
    paytm: true,
    bhim: true,
  },
  autoExpireDays: 30,
  hideDetailsOnLockScreen: true,
};

export interface RawNotificationPayload {
  eventId: string;
  packageName: string;
  title: string;
  text: string;
  subText?: string;
  postTime: number;
  notificationKey: string;
}
