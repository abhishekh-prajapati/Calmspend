/**
 * STAGE 11 — BACKUP RESTORE SERVICE
 *
 * Atomic restore logic:
 *   1. Parse uploaded JSON file.
 *   2. Validate envelope (3-layer).
 *   3. Adapt BackupEnvelope.data → PersistedDataV2 via explicit adapter.
 *   4. Write safety backup to a separate localStorage key.
 *   5. Write restored PersistedDataV2 through the SINGLE authoritative
 *      storage key via storageAdapter.saveData(). No partial writes.
 *   6. On any failure the safety backup key is left intact;
 *      live financial data is NEVER partially overwritten.
 *
 * SAFETY INVARIANT: A failed import must NEVER partially overwrite live data.
 */

import type { BackupEnvelope, RestorePreviewInfo } from '../../types/backup';
import { SAFETY_BACKUP_STORAGE_KEY } from '../../types/backup';
import type { PersistedData } from '../storage/schema';
import { CURRENT_STORAGE_VERSION, migratePersistedData } from '../storage/schema';
import { validateBackupEnvelope } from './backupValidation';
import { buildBackupEnvelope } from './backupExportService';
import type { IStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

// ======================================================================
// ADAPTER: BackupEnvelope.data → PersistedData (PersistedDataV2)
// ======================================================================

/**
 * Converts a validated BackupEnvelope into the canonical PersistedDataV2
 * shape by passing it through the existing migration pipeline.
 *
 * The adapter explicitly builds the raw record that migratePersistedData()
 * expects, ensuring we NEVER pass BackupEnvelope.data directly.
 */
export function adaptEnvelopeToPersistedData(envelope: BackupEnvelope): PersistedData {
  const { data } = envelope;

  // Build the raw object in the shape migratePersistedData() reads.
  // storageVersion from the backup tells us what schema was in use at export time.
  const rawForMigration: Record<string, unknown> = {
    version: envelope.metadata.storageVersion ?? CURRENT_STORAGE_VERSION,
    accounts:           data.accounts,
    categories:         data.categories,
    transactions:       data.transactions,
    monthlyBudgets:     data.monthlyBudgets,
    budgetItems:        data.budgetItems,
    plannedIncomeItems: data.plannedIncomeItems,
    goals:              data.goals,
    goalContributions:  data.goalContributions,
    recurringSchedules: data.recurringSchedules,
    scheduledBills:     data.scheduledBills,
    occurrenceRecords:  data.occurrenceRecords,
    manualAssets:       data.manualAssets,
    manualLiabilities:  data.manualLiabilities,
    financialSnapshots: data.financialSnapshots,
  };

  // Run through the canonical migration pipeline.
  // This handles version upgrades, ensures all collections are present,
  // and merges missing system categories.
  return migratePersistedData(rawForMigration, DEFAULT_SYSTEM_CATEGORIES);
}

// ======================================================================
// PARSE FILE
// ======================================================================

/**
 * Reads a File object as text and parses JSON.
 * Throws descriptive Error if parse fails.
 */
export async function parseBackupFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        resolve(parsed);
      } catch {
        reject(new Error('The uploaded file is not valid JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read the uploaded file.'));
    reader.readAsText(file);
  });
}

// ======================================================================
// PREVIEW (validates without restoring)
// ======================================================================

export async function previewBackupFile(file: File): Promise<RestorePreviewInfo> {
  let raw: unknown;
  try {
    raw = await parseBackupFile(file);
  } catch (err) {
    return {
      isValid: false,
      errors: [{ field: 'file', message: (err as Error).message }],
      envelope: null,
      exportedAt: null,
      formatVersion: null,
      storageVersion: null,
      collectionCounts: null,
    };
  }

  const result = validateBackupEnvelope(raw);
  if (!result.isValid) {
    return {
      isValid: false,
      errors: result.errors,
      envelope: null,
      exportedAt: null,
      formatVersion: null,
      storageVersion: null,
      collectionCounts: null,
    };
  }

  const envelope = raw as BackupEnvelope;
  return {
    isValid: true,
    errors: [],
    envelope,
    exportedAt: envelope.exportedAt,
    formatVersion: envelope.formatVersion,
    storageVersion: envelope.metadata.storageVersion,
    collectionCounts: envelope.metadata.collectionCounts,
  };
}

// ======================================================================
// SAFETY BACKUP (saved before any restore)
// ======================================================================

/**
 * Persists the current live state to a separate safety key.
 * This is a BEST EFFORT operation — failure does not abort the restore.
 */
function writeSafetyBackup(currentData: PersistedData): boolean {
  try {
    const safetyEnvelope = buildBackupEnvelope(currentData);
    localStorage.setItem(SAFETY_BACKUP_STORAGE_KEY, JSON.stringify(safetyEnvelope));
    return true;
  } catch (err) {
    console.error('[RestoreService] Could not write safety backup:', err);
    return false;
  }
}

// ======================================================================
// ATOMIC RESTORE
// ======================================================================

export interface RestoreResult {
  success: boolean;
  errorMessage?: string;
  safetyBackupWritten: boolean;
}

/**
 * Full restore lifecycle:
 * 1. Write safety backup.
 * 2. Adapt envelope → PersistedDataV2.
 * 3. Write through adapter.saveData() in a SINGLE call.
 * 4. On failure, undo nothing (live data remains unchanged; safety backup is present).
 */
export async function performAtomicRestore(
  envelope: BackupEnvelope,
  adapter: IStorageAdapter,
): Promise<RestoreResult> {
  // Capture current live state for the safety backup before touching anything
  const currentData = adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
  const safetyBackupWritten = writeSafetyBackup(currentData);

  let restoredData: PersistedData;
  try {
    restoredData = adaptEnvelopeToPersistedData(envelope);
  } catch (err) {
    return {
      success: false,
      errorMessage: `Data adaptation failed: ${(err as Error).message}`,
      safetyBackupWritten,
    };
  }

  // ATOMIC: single write through the one authoritative storage key
  const wrote = adapter.saveData(restoredData);
  if (!wrote) {
    return {
      success: false,
      errorMessage: 'Failed to write restored data to storage. Your existing data has not been changed.',
      safetyBackupWritten,
    };
  }

  return { success: true, safetyBackupWritten };
}

// ======================================================================
// SAFETY BACKUP — UNDO RESTORE
// ======================================================================

/**
 * Reads the safety backup and restores it if present.
 * Used as an "undo last restore" mechanism.
 */
export function undoLastRestore(adapter: IStorageAdapter): boolean {
  try {
    const raw = localStorage.getItem(SAFETY_BACKUP_STORAGE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    const validation = validateBackupEnvelope(parsed);
    if (!validation.isValid) return false;

    const envelope = parsed as BackupEnvelope;
    const data = adaptEnvelopeToPersistedData(envelope);
    return adapter.saveData(data);
  } catch (err) {
    console.error('[RestoreService] undoLastRestore failed:', err);
    return false;
  }
}

/**
 * Removes the safety backup key from localStorage.
 */
export function clearSafetyBackup(): void {
  try {
    localStorage.removeItem(SAFETY_BACKUP_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Returns the date the safety backup was created, or null if absent.
 */
export function getSafetyBackupDate(): string | null {
  try {
    const raw = localStorage.getItem(SAFETY_BACKUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BackupEnvelope;
    return parsed.exportedAt ?? null;
  } catch {
    return null;
  }
}
