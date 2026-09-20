import type { FinancialSnapshot } from '../../types/netWorth';
import { type IStorageAdapter, defaultStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

export class FinancialSnapshotRepository {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = defaultStorageAdapter) {
    this.adapter = adapter;
  }

  getAll(): FinancialSnapshot[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const snapshots = data.financialSnapshots || [];
    // Deterministically sort by snapshotDate DESC, then timestamp DESC
    return [...snapshots].sort((a, b) => {
      const dateCmp = b.snapshotDate.localeCompare(a.snapshotDate);
      if (dateCmp !== 0) return dateCmp;
      return b.timestamp.localeCompare(a.timestamp);
    });
  }

  getById(id: string): FinancialSnapshot | undefined {
    return this.getAll().find((s) => s.id === id);
  }

  create(snapshotData: Omit<FinancialSnapshot, 'id' | 'createdAt'>): FinancialSnapshot {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();
    const newSnapshot: FinancialSnapshot = {
      ...snapshotData,
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
    };

    if (!data.financialSnapshots) data.financialSnapshots = [];
    data.financialSnapshots.push(newSnapshot);
    this.adapter.saveData(data);
    return newSnapshot;
  }

  delete(id: string): boolean {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    if (!data.financialSnapshots) return false;
    const initialLen = data.financialSnapshots.length;
    data.financialSnapshots = data.financialSnapshots.filter((s) => s.id !== id);

    if (data.financialSnapshots.length === initialLen) return false;

    this.adapter.saveData(data);
    return true;
  }
}

export const financialSnapshotRepository = new FinancialSnapshotRepository();
