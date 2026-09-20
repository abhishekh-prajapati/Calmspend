/**
 * Storage Health and Recovery State Definitions
 * Implements strict 3-state machine: 'missing' | 'valid' | 'corrupt'
 * Ensures corrupted data is never silently overwritten.
 */

export type StorageStatus = 'missing' | 'valid' | 'corrupt';

export interface StorageHealthInfo {
  status: StorageStatus;
  error?: string;
  rawQuarantinedData?: string;
  lastChecked: string;
}

export const STORAGE_KEY = 'pbp_financial_store_v1';
export const QUARANTINE_KEY = 'pbp_quarantine_corrupted_v1';

export function getQuarantinedData(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(QUARANTINE_KEY);
  } catch {
    return null;
  }
}

export function clearQuarantinedData(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(QUARANTINE_KEY);
  } catch {
    // ignore
  }
}
