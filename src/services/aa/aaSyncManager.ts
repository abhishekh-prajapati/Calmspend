import type { NormalizedDepositAccount } from '../../types/accountAggregator';
import type { Account, Category, Transaction } from '../../types/transaction';
import { accountRepository } from '../repositories/accountRepository';
import { transactionRepository } from '../repositories/transactionRepository';

export interface SyncResult {
  importedCount: number;
  skippedCount: number;
  createdAccounts: string[];
  updatedAccounts: string[];
}

export class AaSyncManager {
  /**
   * Matches bank narration to an existing system/user category
   */
  private matchCategory(
    narration: string,
    type: 'DEBIT' | 'CREDIT',
    categories: Category[]
  ): string | null {
    const text = narration.toLowerCase();

    if (type === 'CREDIT') {
      const incomeCat = categories.find((c) => c.type === 'income' && text.includes('salary'));
      if (incomeCat) return incomeCat.id;
      const anyIncome = categories.find((c) => c.type === 'income');
      return anyIncome ? anyIncome.id : null;
    }

    // Debit / Expense category keyword matching
    const expenseCats = categories.filter((c) => c.type === 'expense');

    if (text.includes('grocery') || text.includes('basket') || text.includes('supermarket') || text.includes('instamart')) {
      const grocery = expenseCats.find((c) => c.name.toLowerCase().includes('grocer') || c.name.toLowerCase().includes('food'));
      if (grocery) return grocery.id;
    }

    if (text.includes('coffee') || text.includes('cafe') || text.includes('restaurant') || text.includes('swiggy') || text.includes('zomato')) {
      const dining = expenseCats.find((c) => c.name.toLowerCase().includes('dining') || c.name.toLowerCase().includes('restaurant') || c.name.toLowerCase().includes('food'));
      if (dining) return dining.id;
    }

    if (text.includes('bill') || text.includes('electricity') || text.includes('bescom') || text.includes('utility') || text.includes('bbps')) {
      const util = expenseCats.find((c) => c.name.toLowerCase().includes('util') || c.name.toLowerCase().includes('bill'));
      if (util) return util.id;
    }

    if (text.includes('fuel') || text.includes('petrol') || text.includes('uber') || text.includes('ola') || text.includes('transport')) {
      const transport = expenseCats.find((c) => c.name.toLowerCase().includes('transport') || c.name.toLowerCase().includes('fuel'));
      if (transport) return transport.id;
    }

    // Default fallback
    return expenseCats.length > 0 ? expenseCats[0].id : null;
  }

  /**
   * Ingests normalized accounts and transactions into local storage
   */
  async ingestNormalizedAccounts(
    connectionId: string,
    normalizedAccounts: NormalizedDepositAccount[],
    existingCategories: Category[]
  ): Promise<SyncResult> {
    const existingAccounts = accountRepository.getAll();
    const existingTransactions = transactionRepository.getAll();

    let importedCount = 0;
    let skippedCount = 0;
    const createdAccounts: string[] = [];
    const updatedAccounts: string[] = [];

    // Map existing AA transaction IDs for duplicate check
    const existingTxnSet = new Set<string>();
    for (const t of existingTransactions) {
      if (t.sourceProvider === 'setu_aa' && t.sourceEventId) {
        existingTxnSet.add(t.sourceEventId);
      }
    }

    for (const bankAcc of normalizedAccounts) {
      // 1. Find or create matching account
      let targetAccount: Account | undefined = existingAccounts.find(
        (a) =>
          a.bankConnectionId === connectionId &&
          a.maskedAccountNumber === bankAcc.maskedAccountNumber
      );

      const now = new Date().toISOString();

      if (!targetAccount) {
        // Create new linked bank account in local store
        const accountName = `${bankAcc.fipName} (${bankAcc.maskedAccountNumber.slice(-4)})`;
        targetAccount = accountRepository.create({
          name: accountName,
          type: 'bank',
          openingBalance: bankAcc.currentBalanceMinor || 0,
          currency: 'INR',
          isActive: true,
          bankConnectionId: connectionId,
          fipId: bankAcc.fipId,
          fipName: bankAcc.fipName,
          maskedAccountNumber: bankAcc.maskedAccountNumber,
          accountCategory: bankAcc.accountType,
          lastSyncedAt: now,
          syncStatus: 'SUCCESS',
        });
        createdAccounts.push(targetAccount.name);
      } else {
        // Update sync timestamp
        accountRepository.update(targetAccount.id, {
          lastSyncedAt: now,
          syncStatus: 'SUCCESS',
        });
        updatedAccounts.push(targetAccount.name);
      }

      // 2. Ingest transactions with strict duplicate checking
      for (const txn of bankAcc.transactions) {
        if (existingTxnSet.has(txn.txnId) || transactionRepository.existsBySourceEvent('import', txn.txnId)) {
          skippedCount++;
          continue;
        }

        const categoryId = this.matchCategory(txn.narration, txn.type, existingCategories);
        const txnType = txn.type === 'CREDIT' ? 'income' : 'expense';

        const newTxnData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
          type: txnType,
          amount: txn.amountMinor,
          accountId: targetAccount.id,
          categoryId: categoryId || undefined,
          date: txn.valueDate || txn.transactionTimestamp.split('T')[0],
          description: txn.narration,
          source: 'import',
          sourceProvider: 'setu_aa',
          sourceEventId: txn.txnId,
          bankRawNarration: txn.narration,
          bankBalanceAfterTxn: txn.currentBalanceMinor,
        };

        try {
          transactionRepository.create(newTxnData);
          existingTxnSet.add(txn.txnId);
          importedCount++;
        } catch {
          // If already exists via UNIQUE constraint, record as skipped duplicate
          skippedCount++;
        }
      }
    }

    return {
      importedCount,
      skippedCount,
      createdAccounts,
      updatedAccounts,
    };
  }
}

export const aaSyncManager = new AaSyncManager();
