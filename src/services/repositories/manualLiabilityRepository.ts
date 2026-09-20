import type { ManualLiability } from '../../types/netWorth';
import { type IStorageAdapter, defaultStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

export class ManualLiabilityRepository {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = defaultStorageAdapter) {
    this.adapter = adapter;
  }

  getAll(): ManualLiability[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return data.manualLiabilities || [];
  }

  getById(id: string): ManualLiability | undefined {
    return this.getAll().find((l) => l.id === id);
  }

  getActive(): ManualLiability[] {
    return this.getAll().filter((l) => !l.isArchived);
  }

  create(liabilityData: Omit<ManualLiability, 'id' | 'createdAt' | 'updatedAt'>): ManualLiability {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();
    const newLiability: ManualLiability = {
      ...liabilityData,
      id: `liab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    if (!data.manualLiabilities) data.manualLiabilities = [];
    data.manualLiabilities.push(newLiability);
    this.adapter.saveData(data);
    return newLiability;
  }

  update(id: string, updates: Partial<Omit<ManualLiability, 'id' | 'createdAt'>>): ManualLiability | undefined {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    if (!data.manualLiabilities) return undefined;
    const index = data.manualLiabilities.findIndex((l) => l.id === id);
    if (index === -1) return undefined;

    const updatedLiability: ManualLiability = {
      ...data.manualLiabilities[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    data.manualLiabilities[index] = updatedLiability;
    this.adapter.saveData(data);
    return updatedLiability;
  }

  archive(id: string): ManualLiability | undefined {
    return this.update(id, { isArchived: true });
  }

  unarchive(id: string): ManualLiability | undefined {
    return this.update(id, { isArchived: false });
  }

  delete(id: string): boolean {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    if (!data.manualLiabilities) return false;
    const initialLen = data.manualLiabilities.length;
    data.manualLiabilities = data.manualLiabilities.filter((l) => l.id !== id);

    if (data.manualLiabilities.length === initialLen) return false;

    this.adapter.saveData(data);
    return true;
  }
}

export const manualLiabilityRepository = new ManualLiabilityRepository();
