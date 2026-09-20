import { createInitialPersistedData, type PersistedData, migratePersistedData } from './schema';
import type { Category } from '../../types/transaction';
import { DEFAULT_SYSTEM_CATEGORIES } from './categoryRegistry';
import { STORAGE_KEY, QUARANTINE_KEY, type StorageStatus, type StorageHealthInfo } from './storageHealth';

export interface IStorageAdapter {
  loadData(defaultCategories?: Category[]): PersistedData;
  saveData(data: PersistedData, force?: boolean): boolean;
  clearData(): void;
  getHealthInfo(): StorageHealthInfo;
  resetCorruptedState(): void;
}

export class LocalStorageAdapter implements IStorageAdapter {
  private key: string;
  private currentStatus: StorageStatus = 'missing';
  private lastError?: string;
  private cachedQuarantinedData?: string;

  constructor(key: string = STORAGE_KEY) {
    this.key = key;
  }

  loadData(defaultCategories: Category[] = DEFAULT_SYSTEM_CATEGORIES): PersistedData {
    try {
      if (typeof localStorage === 'undefined') {
        this.currentStatus = 'missing';
        return createInitialPersistedData(defaultCategories);
      }

      const raw = localStorage.getItem(this.key);
      if (raw === null) {
        this.currentStatus = 'missing';
        this.lastError = undefined;
        const initial = createInitialPersistedData(defaultCategories);
        this.saveData(initial, true);
        return initial;
      }

      const parsed = JSON.parse(raw);
      const migrated = migratePersistedData(parsed, defaultCategories);
      this.currentStatus = 'valid';
      this.lastError = undefined;
      return migrated;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.currentStatus = 'corrupt';
      this.lastError = errorMessage;

      // Preserve raw data in quarantine without destroying live key
      try {
        if (typeof localStorage !== 'undefined') {
          const rawCorrupt = localStorage.getItem(this.key);
          if (rawCorrupt) {
            this.cachedQuarantinedData = rawCorrupt;
            try {
              localStorage.setItem(QUARANTINE_KEY, rawCorrupt);
            } catch (quotaErr) {
              console.error('[LocalStorageAdapter] Failed to write quarantine store (quota or storage disabled):', quotaErr);
            }
          }
        }
      } catch (quarantineErr) {
        console.error('[LocalStorageAdapter] Failed to preserve corrupted data to quarantine:', quarantineErr);
      }

      console.error('[LocalStorageAdapter] Storage is corrupt or unparseable. Entering recovery mode:', errorMessage);
      // Return in-memory fallback without overwriting corrupted disk storage
      return createInitialPersistedData(defaultCategories);
    }
  }

  saveData(data: PersistedData, force: boolean = false): boolean {
    if (this.currentStatus === 'corrupt' && !force) {
      console.error('[LocalStorageAdapter] Refusing to overwrite corrupted storage without explicit recovery confirmation.');
      return false;
    }

    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.key, serialized);
      this.currentStatus = 'valid';
      this.lastError = undefined;
      return true;
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to save data to localStorage:', err);
      return false;
    }
  }

  clearData(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.key);
      }
      this.currentStatus = 'missing';
      this.lastError = undefined;
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to clear localStorage:', err);
    }
  }

  getHealthInfo(): StorageHealthInfo {
    return {
      status: this.currentStatus,
      error: this.lastError,
      rawQuarantinedData: this.cachedQuarantinedData,
      lastChecked: new Date().toISOString(),
    };
  }

  resetCorruptedState(): void {
    this.currentStatus = 'valid';
    this.lastError = undefined;
  }
}

export const defaultStorageAdapter = new LocalStorageAdapter();
export const localStorageAdapter = defaultStorageAdapter;
