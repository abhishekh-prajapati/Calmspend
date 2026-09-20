import type { ManualAsset } from '../../types/netWorth';
import { type IStorageAdapter, defaultStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

export class ManualAssetRepository {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = defaultStorageAdapter) {
    this.adapter = adapter;
  }

  getAll(): ManualAsset[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return data.manualAssets || [];
  }

  getById(id: string): ManualAsset | undefined {
    return this.getAll().find((a) => a.id === id);
  }

  getActive(): ManualAsset[] {
    return this.getAll().filter((a) => !a.isArchived);
  }

  create(assetData: Omit<ManualAsset, 'id' | 'createdAt' | 'updatedAt'>): ManualAsset {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();
    const newAsset: ManualAsset = {
      ...assetData,
      id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    if (!data.manualAssets) data.manualAssets = [];
    data.manualAssets.push(newAsset);
    this.adapter.saveData(data);
    return newAsset;
  }

  update(id: string, updates: Partial<Omit<ManualAsset, 'id' | 'createdAt'>>): ManualAsset | undefined {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    if (!data.manualAssets) return undefined;
    const index = data.manualAssets.findIndex((a) => a.id === id);
    if (index === -1) return undefined;

    const updatedAsset: ManualAsset = {
      ...data.manualAssets[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    data.manualAssets[index] = updatedAsset;
    this.adapter.saveData(data);
    return updatedAsset;
  }

  archive(id: string): ManualAsset | undefined {
    return this.update(id, { isArchived: true });
  }

  unarchive(id: string): ManualAsset | undefined {
    return this.update(id, { isArchived: false });
  }

  delete(id: string): boolean {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    if (!data.manualAssets) return false;
    const initialLen = data.manualAssets.length;
    data.manualAssets = data.manualAssets.filter((a) => a.id !== id);

    if (data.manualAssets.length === initialLen) return false;

    this.adapter.saveData(data);
    return true;
  }
}

export const manualAssetRepository = new ManualAssetRepository();
