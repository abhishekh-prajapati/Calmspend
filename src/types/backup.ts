import type { Account, Category, Transaction } from './transaction';
import type { MonthlyBudget, BudgetItem, PlannedIncomeItem } from './budget';
import type { Goal, GoalContribution } from './goal';
import type { RecurringSchedule, ScheduledBill, OccurrenceRecord } from './recurring';
import type { ManualAsset, ManualLiability, FinancialSnapshot } from './netWorth';
import type { DetectedTransaction, DetectionSettings, MerchantCategoryRule } from './detection';

export const BACKUP_FORMAT_IDENTIFIER = 'personal-budget-planner-backup' as const;
export const CURRENT_BACKUP_FORMAT_VERSION = 2 as const;
export const SAFETY_BACKUP_STORAGE_KEY = 'pbp_pre_restore_safety_backup' as const;

export interface BackupMetadata {
  description: string;
  storageVersion: number;
  collectionCounts: {
    accounts: number;
    categories: number;
    transactions: number;
    monthlyBudgets: number;
    budgetItems: number;
    plannedIncomeItems: number;
    goals: number;
    goalContributions: number;
    recurringSchedules: number;
    scheduledBills: number;
    occurrenceRecords: number;
    manualAssets: number;
    manualLiabilities: number;
    financialSnapshots: number;
    detectedTransactions?: number;
    merchantCategoryRules?: number;
  };
}

export interface BackupData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  monthlyBudgets: MonthlyBudget[];
  budgetItems: BudgetItem[];
  plannedIncomeItems: PlannedIncomeItem[];
  goals: Goal[];
  goalContributions: GoalContribution[];
  recurringSchedules: RecurringSchedule[];
  scheduledBills: ScheduledBill[];
  occurrenceRecords: OccurrenceRecord[];
  manualAssets: ManualAsset[];
  manualLiabilities: ManualLiability[];
  financialSnapshots: FinancialSnapshot[];
  detectedTransactions?: DetectedTransaction[];
  detectionSettings?: DetectionSettings;
  merchantCategoryRules?: MerchantCategoryRule[];
}

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT_IDENTIFIER;
  formatVersion: number;
  appVersion: string;
  exportedAt: string;   // ISO timestamp
  currency: string;
  metadata: BackupMetadata;
  data: BackupData;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface StorageInfo {
  storageVersion: number;
  storageKey: string;
  collections: {
    accounts: number;
    categories: number;
    transactions: number;
    monthlyBudgets: number;
    budgetItems: number;
    plannedIncomeItems: number;
    goals: number;
    goalContributions: number;
    recurringSchedules: number;
    scheduledBills: number;
    occurrenceRecords: number;
    manualAssets: number;
    manualLiabilities: number;
    financialSnapshots: number;
  };
  estimatedSizeBytes: number;
  hasSafetyBackup: boolean;
  safetyBackupDate: string | null;
}

export interface RestorePreviewInfo {
  isValid: boolean;
  errors: ValidationError[];
  envelope: BackupEnvelope | null;
  exportedAt: string | null;
  formatVersion: number | null;
  storageVersion: number | null;
  collectionCounts: BackupMetadata['collectionCounts'] | null;
}
