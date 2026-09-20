export type TransactionType = 'expense' | 'income' | 'transfer' | 'saving' | 'goal';
export type NeedOrWant = 'need' | 'want';
export type AccountType = 'cash' | 'bank' | 'savings' | 'credit_card';

export type TransactionSource = 'manual' | 'notification' | 'import' | 'recurring';

/**
 * Extensible Transaction Model
 * Supports future transaction types without model restructuring.
 * For Stage 3 Expense: accountId and categoryId are required.
 */
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Integer minor units (paise) to prevent floating point inaccuracies
  accountId?: string | null;     // Required for expense, income, saving, goal
  categoryId?: string | null;    // Required for expense, income
  fromAccountId?: string | null; // For transfers
  toAccountId?: string | null;   // For transfers
  date: string;                  // YYYY-MM-DD
  description?: string;
  needOrWant?: NeedOrWant | null;
  tags?: string[];
  source?: TransactionSource;
  sourceEventId?: string;
  sourceProvider?: string;
  parserVersion?: string;
  bankRawNarration?: string;
  bankBalanceAfterTxn?: number;
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number; // Integer minor units (paise)
  currency: string;       // Default 'INR'
  isActive: boolean;
  bankConnectionId?: string;
  fipId?: string;
  fipName?: string;
  maskedAccountNumber?: string;
  accountCategory?: 'SAVINGS' | 'CURRENT';
  lastSyncedAt?: string;
  syncStatus?: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;           // Controlled registry key (e.g. 'utensils', 'car')
  type: 'expense' | 'income';
  color?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
