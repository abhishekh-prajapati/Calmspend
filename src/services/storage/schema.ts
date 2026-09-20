import type { Account, Category, Transaction } from '../../types/transaction';
import type { MonthlyBudget, BudgetItem, PlannedIncomeItem } from '../../types/budget';
import type { Goal, GoalContribution } from '../../types/goal';
import type { RecurringSchedule, ScheduledBill, OccurrenceRecord } from '../../types/recurring';
import type { ManualAsset, ManualLiability, FinancialSnapshot } from '../../types/netWorth';

export const CURRENT_STORAGE_VERSION = 2;

export interface PersistedDataV1 {
  version: 1;
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
}

export interface PersistedDataV2 {
  version: 2;
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
}

export type PersistedData = PersistedDataV2;

/**
 * Creates a clean default persisted store envelope with seeded system categories.
 */
export function createInitialPersistedData(initialCategories: Category[] = []): PersistedDataV2 {
  return {
    version: 2,
    accounts: [],
    categories: initialCategories,
    transactions: [],
    monthlyBudgets: [],
    budgetItems: [],
    plannedIncomeItems: [],
    goals: [],
    goalContributions: [],
    recurringSchedules: [],
    scheduledBills: [],
    occurrenceRecords: [],
    manualAssets: [],
    manualLiabilities: [],
    financialSnapshots: [],
  };
}

/**
 * Migration runner: upgrades stored data if older versions are loaded.
 */
export function migratePersistedData(raw: unknown, defaultCategories: Category[]): PersistedDataV2 {
  if (!raw || typeof raw !== 'object') {
    return createInitialPersistedData(defaultCategories);
  }

  const data = raw as Record<string, unknown>;
  const version = typeof data.version === 'number' ? data.version : 1;

  const rawCategories = Array.isArray(data.categories) ? (data.categories as Category[]) : [];
  const existingIds = new Set(rawCategories.map((c) => c.id));
  const mergedCategories = [...rawCategories];
  for (const defCat of defaultCategories) {
    if (!existingIds.has(defCat.id)) {
      mergedCategories.push(defCat);
      existingIds.add(defCat.id);
    }
  }

  const baseV1 = {
    accounts: Array.isArray(data.accounts) ? (data.accounts as Account[]) : [],
    categories: mergedCategories.length > 0 ? mergedCategories : defaultCategories,
    transactions: Array.isArray(data.transactions) ? (data.transactions as Transaction[]) : [],
    monthlyBudgets: Array.isArray(data.monthlyBudgets) ? (data.monthlyBudgets as MonthlyBudget[]) : [],
    budgetItems: Array.isArray(data.budgetItems) ? (data.budgetItems as BudgetItem[]) : [],
    plannedIncomeItems: Array.isArray(data.plannedIncomeItems) ? (data.plannedIncomeItems as PlannedIncomeItem[]) : [],
    goals: Array.isArray(data.goals) ? (data.goals as Goal[]) : [],
    goalContributions: Array.isArray(data.goalContributions) ? (data.goalContributions as GoalContribution[]) : [],
    recurringSchedules: Array.isArray(data.recurringSchedules) ? (data.recurringSchedules as RecurringSchedule[]) : [],
    scheduledBills: Array.isArray(data.scheduledBills) ? (data.scheduledBills as ScheduledBill[]) : [],
    occurrenceRecords: Array.isArray(data.occurrenceRecords) ? (data.occurrenceRecords as OccurrenceRecord[]) : [],
  };

  if (version <= 2) {
    return {
      version: 2,
      ...baseV1,
      manualAssets: Array.isArray(data.manualAssets) ? (data.manualAssets as ManualAsset[]) : [],
      manualLiabilities: Array.isArray(data.manualLiabilities) ? (data.manualLiabilities as ManualLiability[]) : [],
      financialSnapshots: Array.isArray(data.financialSnapshots) ? (data.financialSnapshots as FinancialSnapshot[]) : [],
    };
  }

  return createInitialPersistedData(defaultCategories);
}
