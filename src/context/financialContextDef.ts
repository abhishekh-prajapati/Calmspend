import { createContext } from 'react';
import type { Account, Category, Transaction } from '../types/transaction';
import type { DashboardSummary, FinancialSystemState, PeriodInfo } from '../types/finance';
import type { MonthlyPlanSummary } from '../types/budget';
import type { Goal, GoalContribution, GoalProgressSummary } from '../types/goal';
import type { RecurringSchedule, ScheduledBill, OccurrenceRecord, ScheduledOccurrence } from '../types/recurring';
import type {
  ManualAsset,
  ManualLiability,
  FinancialSnapshot,
  NetWorthSummary,
} from '../types/netWorth';
import type { StorageHealthInfo } from '../services/storage/storageHealth';

export interface FinancialContextType {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  goalContributions: GoalContribution[];
  goalSummaries: GoalProgressSummary[];
  recurringSchedules: RecurringSchedule[];
  scheduledBills: ScheduledBill[];
  occurrenceRecords: OccurrenceRecord[];
  upcomingOccurrences: ScheduledOccurrence[];
  manualAssets: ManualAsset[];
  manualLiabilities: ManualLiability[];
  financialSnapshots: FinancialSnapshot[];
  netWorthSummary: NetWorthSummary;
  period: PeriodInfo;
  selectedPlanPeriod: PeriodInfo;
  setSelectedPlanPeriod: (period: PeriodInfo) => void;
  systemState: FinancialSystemState;
  summary: DashboardSummary;
  currentPlanSummary: MonthlyPlanSummary;
  getPlanSummaryForPeriod: (period: PeriodInfo) => MonthlyPlanSummary;
  getGoalSummary: (goalId: string) => GoalProgressSummary | undefined;
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  editTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => Promise<Transaction | undefined>;
  deleteTransaction: (id: string) => Promise<boolean>;
  addAccount: (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Account>;
  getAccount: (id: string) => Account | undefined;
  disconnectLinkedBank: (accountId: string) => Promise<void>;
  getCategory: (id: string) => Category | undefined;
  saveBudgetItem: (periodKey: string, categoryId: string, plannedAmountMinor: number, priority?: 'need' | 'want') => Promise<void>;
  deleteBudgetItem: (id: string) => Promise<void>;
  savePlannedIncome: (periodKey: string, name: string, plannedAmountMinor: number, categoryId?: string, id?: string, accountId?: string) => Promise<void>;
  deletePlannedIncome: (id: string) => Promise<void>;
  setPlannedSavings: (periodKey: string, plannedSavingsMinor: number) => Promise<void>;
  setEmergencyCushion: (periodKey: string, emergencyCushionMinor: number) => Promise<void>;
  setCustomDailyAllowance: (periodKey: string, customDailyAllowanceMinor: number | null) => Promise<void>;
  copyPreviousMonthPlan: (targetPeriodKey: string, sourcePeriodKey?: string) => Promise<boolean>;
  deleteMonthlyPlan: (periodKey: string) => Promise<boolean>;
  createGoal: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>) => Promise<Goal | undefined>;
  pauseGoal: (id: string) => Promise<Goal | undefined>;
  resumeGoal: (id: string) => Promise<Goal | undefined>;
  archiveGoal: (id: string) => Promise<Goal | undefined>;
  unarchiveGoal: (id: string) => Promise<Goal | undefined>;
  deleteGoal: (id: string) => Promise<boolean>;
  createGoalContribution: (data: Omit<GoalContribution, 'id' | 'createdAt' | 'updatedAt'> & { accountId?: string }) => Promise<GoalContribution>;
  updateGoalContribution: (id: string, updates: Partial<Omit<GoalContribution, 'id' | 'createdAt'>>) => Promise<GoalContribution | undefined>;
  deleteGoalContribution: (id: string) => Promise<boolean>;
  createRecurringSchedule: (data: Omit<RecurringSchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<RecurringSchedule>;
  updateRecurringSchedule: (id: string, updates: Partial<Omit<RecurringSchedule, 'id' | 'createdAt'>>) => Promise<RecurringSchedule | undefined>;
  cancelRecurringSchedule: (id: string) => Promise<RecurringSchedule | undefined>;
  resumeRecurringSchedule: (id: string) => Promise<RecurringSchedule | undefined>;
  deleteRecurringSchedule: (id: string) => Promise<boolean>;
  createScheduledBill: (data: Omit<ScheduledBill, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ScheduledBill>;
  updateScheduledBill: (id: string, updates: Partial<Omit<ScheduledBill, 'id' | 'createdAt'>>) => Promise<ScheduledBill | undefined>;
  cancelScheduledBill: (id: string) => Promise<ScheduledBill | undefined>;
  deleteScheduledBill: (id: string) => Promise<boolean>;
  recordOccurrencePayment: (
    occurrence: ScheduledOccurrence,
    paymentDetails: {
      amountMinor: number;
      date: string;
      accountId: string;
      description?: string;
    },
  ) => Promise<Transaction>;
  skipOccurrence: (occurrence: ScheduledOccurrence) => Promise<OccurrenceRecord>;
  createManualAsset: (data: Omit<ManualAsset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ManualAsset>;
  updateManualAsset: (id: string, updates: Partial<Omit<ManualAsset, 'id' | 'createdAt'>>) => Promise<ManualAsset | undefined>;
  archiveManualAsset: (id: string) => Promise<ManualAsset | undefined>;
  unarchiveManualAsset: (id: string) => Promise<ManualAsset | undefined>;
  deleteManualAsset: (id: string) => Promise<boolean>;
  createManualLiability: (data: Omit<ManualLiability, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ManualLiability>;
  updateManualLiability: (id: string, updates: Partial<Omit<ManualLiability, 'id' | 'createdAt'>>) => Promise<ManualLiability | undefined>;
  archiveManualLiability: (id: string) => Promise<ManualLiability | undefined>;
  unarchiveManualLiability: (id: string) => Promise<ManualLiability | undefined>;
  deleteManualLiability: (id: string) => Promise<boolean>;
  createSnapshot: (snapshotDate: string, notes?: string) => Promise<FinancialSnapshot>;
  deleteSnapshot: (id: string) => Promise<boolean>;
  refreshData: () => void;
  storageHealth: StorageHealthInfo;
  notifications: import('../types/notification').AppNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  applyDailySweepRollover: (notificationId: string, surplusMinor: number) => Promise<void>;
  applyDailySweepToGoal: (notificationId: string, goalId: string, surplusMinor: number) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);
