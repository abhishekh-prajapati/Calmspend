import type { Transaction, TransactionSource } from '../../types/transaction';
import { type IStorageAdapter, defaultStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

export class DuplicateTransactionError extends Error {
  public readonly existingTransactionId: string;
  public readonly sourceEventId: string;

  constructor(message: string, existingTransactionId: string, sourceEventId: string) {
    super(message);
    this.name = 'DuplicateTransactionError';
    this.existingTransactionId = existingTransactionId;
    this.sourceEventId = sourceEventId;
  }
}

/**
 * Deterministic transaction sorting:
 * 1. date descending (YYYY-MM-DD)
 * 2. createdAt descending (ISO timestamp)
 * 3. id tie-breaker
 */
export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    // 1. Date comparison
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    // 2. CreatedAt comparison
    if (a.createdAt !== b.createdAt) {
      return b.createdAt.localeCompare(a.createdAt);
    }
    // 3. ID tie-breaker
    return b.id.localeCompare(a.id);
  });
}

export class TransactionRepository {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = defaultStorageAdapter) {
    this.adapter = adapter;
  }

  getAll(): Transaction[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return sortTransactions(data.transactions);
  }

  getById(id: string): Transaction | undefined {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return data.transactions.find((t) => t.id === id);
  }

  getByAccountId(accountId: string): Transaction[] {
    return this.getAll().filter((t) => t.accountId === accountId || t.fromAccountId === accountId || t.toAccountId === accountId);
  }

  getBySourceEvent(source: TransactionSource, sourceEventId: string): Transaction | undefined {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return data.transactions.find((t) => t.source === source && t.sourceEventId === sourceEventId);
  }

  existsBySourceEvent(source: TransactionSource, sourceEventId: string): boolean {
    return this.getBySourceEvent(source, sourceEventId) !== undefined;
  }

  create(transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);

    // Database-level / persistent store idempotency constraint: UNIQUE(source, sourceEventId)
    if (transactionData.source && transactionData.sourceEventId) {
      const existing = data.transactions.find(
        (t) => t.source === transactionData.source && t.sourceEventId === transactionData.sourceEventId,
      );
      if (existing) {
        throw new DuplicateTransactionError(
          `Transaction already exists for source "${transactionData.source}" and event ID "${transactionData.sourceEventId}".`,
          existing.id,
          transactionData.sourceEventId,
        );
      }
    }

    const now = new Date().toISOString();
    const newTransaction: Transaction = {
      ...transactionData,
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    data.transactions.push(newTransaction);
    this.adapter.saveData(data);
    return newTransaction;
  }

  update(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Transaction | undefined {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const index = data.transactions.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    const updatedTransaction: Transaction = {
      ...data.transactions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    data.transactions[index] = updatedTransaction;
    this.adapter.saveData(data);
    return updatedTransaction;
  }

  delete(id: string): boolean {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const initialLen = data.transactions.length;
    data.transactions = data.transactions.filter((t) => t.id !== id);

    if (data.transactions.length === initialLen) {
      return false;
    }

    this.adapter.saveData(data);
    return true;
  }
}

export const transactionRepository = new TransactionRepository();
