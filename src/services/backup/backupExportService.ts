/**
 * STAGE 11 — BACKUP EXPORT SERVICE
 *
 * Reads live PersistedDataV2 from localStorage, constructs a BackupEnvelope
 * and triggers a browser file download. No mutations to stored data.
 */

import type { PersistedData } from '../storage/schema';
import { CURRENT_STORAGE_VERSION } from '../storage/schema';
import type { BackupEnvelope } from '../../types/backup';
import {
  BACKUP_FORMAT_IDENTIFIER,
  CURRENT_BACKUP_FORMAT_VERSION,
} from '../../types/backup';

const APP_VERSION = '1.0.0';

/**
 * Builds a BackupEnvelope from a PersistedDataV2 object.
 * Pure function — no I/O.
 */
export function buildBackupEnvelope(data: PersistedData): BackupEnvelope {
  const { version: _v, ...collections } = data;

  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT_IDENTIFIER,
    formatVersion: CURRENT_BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    currency: 'INR',
    metadata: {
      description: 'Personal Budget Planner — Full Data Export',
      storageVersion: CURRENT_STORAGE_VERSION,
      collectionCounts: {
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
    },
    data: { ...collections },
  };

  return envelope;
}

/**
 * Serialises a BackupEnvelope to a pretty-printed JSON string.
 */
export function serializeEnvelope(envelope: BackupEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

/**
 * Generates a filename for the backup.
 * Format: pbp-backup-YYYY-MM-DD.json
 */
export function generateBackupFilename(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `pbp-backup-${date}.json`;
}

/**
 * Triggers a browser file download of the backup JSON.
 * This is the main entry point called from UI.
 */
export function downloadBackupFile(data: PersistedData): void {
  const envelope = buildBackupEnvelope(data);
  const json = serializeEnvelope(envelope);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = generateBackupFilename();
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke after a short delay so the download can start
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
