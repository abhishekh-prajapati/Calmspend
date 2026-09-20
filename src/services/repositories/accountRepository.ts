import type { Account } from '../../types/transaction';
import { type IStorageAdapter, defaultStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

export class AccountRepository {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = defaultStorageAdapter) {
    this.adapter = adapter;
  }

  getAll(): Account[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return data.accounts.filter((a) => a.isActive);
  }

  getById(id: string): Account | undefined {
    const accounts = this.getAll();
    return accounts.find((a) => a.id === id);
  }

  create(accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();
    const newAccount: Account = {
      ...accountData,
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    data.accounts.push(newAccount);
    this.adapter.saveData(data);
    return newAccount;
  }

  update(id: string, updates: Partial<Omit<Account, 'id' | 'createdAt'>>): Account | undefined {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const index = data.accounts.findIndex((a) => a.id === id);
    if (index === -1) return undefined;

    const updatedAccount: Account = {
      ...data.accounts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    data.accounts[index] = updatedAccount;
    this.adapter.saveData(data);
    return updatedAccount;
  }

  delete(id: string): boolean {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const index = data.accounts.findIndex((a) => a.id === id);
    if (index === -1) return false;

    // Soft delete / deactivate
    data.accounts[index].isActive = false;
    data.accounts[index].updatedAt = new Date().toISOString();
    this.adapter.saveData(data);
    return true;
  }
}

export const accountRepository = new AccountRepository();
