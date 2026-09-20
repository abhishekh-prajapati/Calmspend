/**
 * STAGE 11 — STORAGE INFO SERVICE
 *
 * Reads metadata about the current localStorage state.
 * Pure query — no mutations.
 */

import type { StorageInfo } from '../../types/backup';
import { SAFETY_BACKUP_STORAGE_KEY } from '../../types/backup';
import type { PersistedData } from '../storage/schema';
import { CURRENT_STORAGE_VERSION } from '../storage/schema';
import { getSafetyBackupDate } from './backupRestoreService';

const STORAGE_KEY = 'pbp_financial_store_v1';

/**
 * Estimates the byte size of a localStorage key.
 * Uses UTF-16 encoding (2 bytes per char) as a conservative estimate.
 */
function estimateBytesForKey(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    return raw.length * 2;
  } catch {
    return 0;
  }
}

/**
 * Builds a StorageInfo snapshot from the current live PersistedData.
 * The caller provides the already-loaded PersistedData to avoid double-reads.
 */
export function getStorageInfo(data: PersistedData): StorageInfo {
  const mainBytes = estimateBytesForKey(STORAGE_KEY);
  const safetyBytes = estimateBytesForKey(SAFETY_BACKUP_STORAGE_KEY);

  const hasSafetyBackup = (() => {
    try {
      return localStorage.getItem(SAFETY_BACKUP_STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  })();

  return {
    storageVersion: CURRENT_STORAGE_VERSION,
    storageKey: STORAGE_KEY,
    collections: {
      accounts:           data.accounts.length,
      categories:         data.categories.length,
      transactions:       data.transactions.length,
      monthlyBudgets:     data.monthlyBudgets.length,
      budgetItems:        data.budgetItems.length,
      plannedIncomeItems: data.plannedIncomeItems.length,
      goals:              data.goals.length,
      goalContributions:  data.goalContributions.length,
      recurringSchedules: data.recurringSchedules.length,
      scheduledBills:     data.scheduledBills.length,
      occurrenceRecords:  data.occurrenceRecords.length,
      manualAssets:       data.manualAssets.length,
      manualLiabilities:  data.manualLiabilities.length,
      financialSnapshots: data.financialSnapshots.length,
    },
    estimatedSizeBytes: mainBytes + safetyBytes,
    hasSafetyBackup,
    safetyBackupDate: getSafetyBackupDate(),
  };
}
