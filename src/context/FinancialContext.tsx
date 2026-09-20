import React, { useState, useMemo, useCallback } from 'react';
import type { Account, Category, Transaction } from '../types/transaction';
import type { PeriodInfo } from '../types/finance';
import type { MonthlyPlanSummary, MonthlyBudget } from '../types/budget';
import type { Goal, GoalContribution, GoalProgressSummary } from '../types/goal';
import type { RecurringSchedule, ScheduledBill, OccurrenceRecord, ScheduledOccurrence } from '../types/recurring';
import type {
  ManualAsset,
  ManualLiability,
  FinancialSnapshot,
} from '../types/netWorth';
import { accountRepository } from '../services/repositories/accountRepository';
import { categoryRepository } from '../services/repositories/categoryRepository';
import { transactionRepository } from '../services/repositories/transactionRepository';
import { monthlyBudgetRepository } from '../services/repositories/monthlyBudgetRepository';
import { goalRepository } from '../services/repositories/goalRepository';
import { goalContributionRepository } from '../services/repositories/goalContributionRepository';
import { RecurringScheduleRepository } from '../services/repositories/recurringScheduleRepository';
import { ScheduledBillRepository } from '../services/repositories/scheduledBillRepository';
import { OccurrenceRecordRepository } from '../services/repositories/occurrenceRecordRepository';
import { manualAssetRepository } from '../services/repositories/manualAssetRepository';
import { manualLiabilityRepository } from '../services/repositories/manualLiabilityRepository';
import { financialSnapshotRepository } from '../services/repositories/financialSnapshotRepository';
import { localStorageAdapter } from '../services/storage/localStorageAdapter';
import type { StorageHealthInfo } from '../services/storage/storageHealth';
import { getPeriodInfo } from '../services/periodService';
import {
  getDashboardSummary,
  getSystemState,
  getMonthlyPlanSummary,
} from '../services/financialCalculations';
import { calculateGoalProgress } from '../services/goalCalculations';
import { generateScheduleOccurrences, formatDateKey } from '../services/recurrenceService';
import {
  calculateNetWorthSummary,
  createSnapshotFromCurrentState,
} from '../services/netWorthCalculations';
import { FinancialContext } from './financialContextDef';

const recurringScheduleRepository = new RecurringScheduleRepository(localStorageAdapter);
const scheduledBillRepository = new ScheduledBillRepository(localStorageAdapter);
const occurrenceRecordRepository = new OccurrenceRecordRepository(localStorageAdapter);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>(() => accountRepository.getAll());
  const [categories, setCategories] = useState<Category[]>(() => categoryRepository.getAll());
  const [transactions, setTransactions] = useState<Transaction[]>(() => transactionRepository.getAll());
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>(() => monthlyBudgetRepository.getAllBudgets());
  const [goals, setGoals] = useState<Goal[]>(() => goalRepository.getAll());
  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>(() => goalContributionRepository.getAll());
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>(() => localStorageAdapter.loadData().recurringSchedules || []);
  const [scheduledBills, setScheduledBills] = useState<ScheduledBill[]>(() => localStorageAdapter.loadData().scheduledBills || []);
  const [occurrenceRecords, setOccurrenceRecords] = useState<OccurrenceRecord[]>(() => localStorageAdapter.loadData().occurrenceRecords || []);
  const [manualAssets, setManualAssets] = useState<ManualAsset[]>(() => manualAssetRepository.getAll());
  const [manualLiabilities, setManualLiabilities] = useState<ManualLiability[]>(() => manualLiabilityRepository.getAll());
  const [financialSnapshots, setFinancialSnapshots] = useState<FinancialSnapshot[]>(() => financialSnapshotRepository.getAll());
  const [storageHealth, setStorageHealth] = useState<StorageHealthInfo>(() => localStorageAdapter.getHealthInfo());

  // Current period is anchored to the present calendar month
  const [period] = useState<PeriodInfo>(() => getPeriodInfo());
  // Selected plan period can be browsed across past, current, and future months
  const [selectedPlanPeriod, setSelectedPlanPeriod] = useState<PeriodInfo>(() => getPeriodInfo());

  const refreshData = useCallback(() => {
    setAccounts(accountRepository.getAll());
    setCategories(categoryRepository.getAll());
    setTransactions(transactionRepository.getAll());
    setMonthlyBudgets(monthlyBudgetRepository.getAllBudgets());
    setGoals(goalRepository.getAll());
    setGoalContributions(goalContributionRepository.getAll());
    setManualAssets(manualAssetRepository.getAll());
    setManualLiabilities(manualLiabilityRepository.getAll());
    setFinancialSnapshots(financialSnapshotRepository.getAll());
    const data = localStorageAdapter.loadData();
    setRecurringSchedules(data.recurringSchedules || []);
    setScheduledBills(data.scheduledBills || []);
    setOccurrenceRecords(data.occurrenceRecords || []);
    setStorageHealth(localStorageAdapter.getHealthInfo());
  }, []);

  const addTransaction = useCallback(
    async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
      const created = transactionRepository.create(data);
      refreshData();
      return created;
    },
    [refreshData],
  );

  const editTransaction = useCallback(
    async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction | undefined> => {
      const updated = transactionRepository.update(id, updates);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<boolean> => {
      const success = transactionRepository.delete(id);
      if (success) {
        refreshData();
      }
      return success;
    },
    [refreshData],
  );

  const addAccount = useCallback(
    async (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> => {
      const created = accountRepository.create(data);
      refreshData();
      return created;
    },
    [refreshData],
  );

  const getAccount = useCallback(
    (id: string): Account | undefined => {
      return accounts.find((a) => a.id === id);
    },
    [accounts],
  );

  const getCategory = useCallback(
    (id: string): Category | undefined => {
      return categories.find((c) => c.id === id);
    },
    [categories],
  );

  // Planning action handlers
  const saveBudgetItem = useCallback(
    async (periodKey: string, categoryId: string, plannedAmountMinor: number): Promise<void> => {
      monthlyBudgetRepository.saveBudgetItem(periodKey, categoryId, plannedAmountMinor);
      refreshData();
    },
    [refreshData],
  );

  const deleteBudgetItem = useCallback(
    async (id: string): Promise<void> => {
      monthlyBudgetRepository.deleteBudgetItem(id);
      refreshData();
    },
    [refreshData],
  );

  const savePlannedIncome = useCallback(
    async (
      periodKey: string,
      name: string,
      plannedAmountMinor: number,
      categoryId?: string,
      id?: string,
      accountId?: string,
    ): Promise<void> => {
      monthlyBudgetRepository.savePlannedIncomeItem(periodKey, name, plannedAmountMinor, categoryId, id, accountId);
      refreshData();
    },
    [refreshData],
  );

  const deletePlannedIncome = useCallback(
    async (id: string): Promise<void> => {
      monthlyBudgetRepository.deletePlannedIncomeItem(id);
      refreshData();
    },
    [refreshData],
  );

  const setPlannedSavings = useCallback(
    async (periodKey: string, plannedSavingsMinor: number): Promise<void> => {
      monthlyBudgetRepository.setPlannedSavings(periodKey, plannedSavingsMinor);
      refreshData();
    },
    [refreshData],
  );

  const setCustomDailyAllowance = useCallback(
    async (periodKey: string, customDailyAllowanceMinor: number | null): Promise<void> => {
      monthlyBudgetRepository.setCustomDailyAllowance(periodKey, customDailyAllowanceMinor);
      refreshData();
    },
    [refreshData],
  );

  const copyPreviousMonthPlan = useCallback(
    async (targetPeriodKey: string, sourcePeriodKey?: string): Promise<boolean> => {
      try {
        const sourceKey = sourcePeriodKey || '';
        const created = monthlyBudgetRepository.copyPlan(sourceKey, targetPeriodKey);
        if (created) {
          refreshData();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [refreshData],
  );

  const deleteMonthlyPlan = useCallback(
    async (periodKey: string): Promise<boolean> => {
      const success = monthlyBudgetRepository.deleteMonthlyPlan(periodKey);
      if (success) {
        refreshData();
      }
      return success;
    },
    [refreshData],
  );

  // Goal action handlers
  const createGoal = useCallback(
    async (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> => {
      const created = goalRepository.create(data);
      refreshData();
      return created;
    },
    [refreshData],
  );

  const updateGoal = useCallback(
    async (id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>): Promise<Goal | undefined> => {
      const updated = goalRepository.update(id, updates);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const pauseGoal = useCallback(
    async (id: string): Promise<Goal | undefined> => {
      const updated = goalRepository.pause(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const resumeGoal = useCallback(
    async (id: string): Promise<Goal | undefined> => {
      const updated = goalRepository.resume(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const archiveGoal = useCallback(
    async (id: string): Promise<Goal | undefined> => {
      const updated = goalRepository.archive(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const unarchiveGoal = useCallback(
    async (id: string): Promise<Goal | undefined> => {
      const updated = goalRepository.unarchive(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const deleteGoal = useCallback(
    async (id: string): Promise<boolean> => {
      const success = goalRepository.delete(id);
      if (success) {
        refreshData();
      }
      return success;
    },
    [refreshData],
  );

  const createGoalContribution = useCallback(
    async (
      data: Omit<GoalContribution, 'id' | 'createdAt' | 'updatedAt'> & { accountId?: string },
    ): Promise<GoalContribution> => {
      const created = goalContributionRepository.create(data);

      // Find goal name for description
      const goal = goalRepository.getById(data.goalId);
      const goalName = goal ? goal.name : 'Goal Savings';

      // Pick source account (from data or first active bank/savings/cash account)
      const activeAccs = accountRepository.getAll().filter((a) => a.isActive);
      const targetAccountId =
        data.accountId ||
        (activeAccs.length > 0
          ? (activeAccs.find((a) => a.type === 'bank' || a.type === 'savings' || a.type === 'cash') || activeAccs[0]).id
          : undefined);

      if (targetAccountId) {
        transactionRepository.create({
          type: 'saving',
          amount: data.amountMinor,
          accountId: targetAccountId,
          date: data.date,
          description: `${goalName} (Saved to Goal)`,
          source: 'manual',
        });
      }

      refreshData();
      return created;
    },
    [refreshData],
  );

  const updateGoalContribution = useCallback(
    async (id: string, updates: Partial<Omit<GoalContribution, 'id' | 'createdAt'>>): Promise<GoalContribution | undefined> => {
      const updated = goalContributionRepository.update(id, updates);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const deleteGoalContribution = useCallback(
    async (id: string): Promise<boolean> => {
      const success = goalContributionRepository.delete(id);
      if (success) {
        refreshData();
      }
      return success;
    },
    [refreshData],
  );

  // Recurring action handlers
  const createRecurringSchedule = useCallback(
    async (data: Omit<RecurringSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringSchedule> => {
      const created = recurringScheduleRepository.create(data);
      refreshData();
      return created;
    },
    [refreshData],
  );

  const updateRecurringSchedule = useCallback(
    async (id: string, updates: Partial<Omit<RecurringSchedule, 'id' | 'createdAt'>>): Promise<RecurringSchedule | undefined> => {
      const updated = recurringScheduleRepository.update(id, updates);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const cancelRecurringSchedule = useCallback(
    async (id: string): Promise<RecurringSchedule | undefined> => {
      const updated = recurringScheduleRepository.cancel(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const resumeRecurringSchedule = useCallback(
    async (id: string): Promise<RecurringSchedule | undefined> => {
      const updated = recurringScheduleRepository.resume(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const deleteRecurringSchedule = useCallback(
    async (id: string): Promise<boolean> => {
      await recurringScheduleRepository.delete(id);
      refreshData();
      return true;
    },
    [refreshData],
  );

  const createScheduledBill = useCallback(
    async (data: Omit<ScheduledBill, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledBill> => {
      const created = scheduledBillRepository.create(data);
      refreshData();
      return created;
    },
    [refreshData],
  );

  const updateScheduledBill = useCallback(
    async (id: string, updates: Partial<Omit<ScheduledBill, 'id' | 'createdAt'>>): Promise<ScheduledBill | undefined> => {
      const updated = scheduledBillRepository.update(id, updates);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const cancelScheduledBill = useCallback(
    async (id: string): Promise<ScheduledBill | undefined> => {
      const updated = scheduledBillRepository.cancel(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const deleteScheduledBill = useCallback(
    async (id: string): Promise<boolean> => {
      await scheduledBillRepository.delete(id);
      refreshData();
      return true;
    },
    [refreshData],
  );

  const recordOccurrencePayment = useCallback(
    async (
      occurrence: ScheduledOccurrence,
      paymentDetails: {
        amountMinor: number;
        date: string;
        accountId: string;
        description?: string;
      },
    ): Promise<Transaction> => {
      const type = occurrence.type === 'income' ? 'income' : 'expense';
      const txn = transactionRepository.create({
        type,
        amount: paymentDetails.amountMinor,
        accountId: paymentDetails.accountId,
        categoryId: occurrence.categoryId,
        date: paymentDetails.date,
        description: paymentDetails.description || `${occurrence.name} payment`,
      });

      await occurrenceRecordRepository.recordPaid({
        occurrenceKey: occurrence.occurrenceKey,
        scheduleId: occurrence.scheduleId,
        billId: occurrence.billId,
        dueDate: occurrence.dueDate,
        transactionId: txn.id,
        actualAmountMinor: paymentDetails.amountMinor,
        actualDate: paymentDetails.date,
      });

      refreshData();
      return txn;
    },
    [refreshData],
  );

  const skipOccurrence = useCallback(
    async (occurrence: ScheduledOccurrence): Promise<OccurrenceRecord> => {
      const record = await occurrenceRecordRepository.recordSkipped({
        occurrenceKey: occurrence.occurrenceKey,
        scheduleId: occurrence.scheduleId,
        billId: occurrence.billId,
        dueDate: occurrence.dueDate,
      });
      refreshData();
      return record;
    },
    [refreshData],
  );

  // Manual Asset Handlers
  const createManualAsset = useCallback(
    async (data: Omit<ManualAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<ManualAsset> => {
      const created = manualAssetRepository.create(data);
      refreshData();
      return created;
    },
    [refreshData],
  );

  const updateManualAsset = useCallback(
    async (id: string, updates: Partial<Omit<ManualAsset, 'id' | 'createdAt'>>): Promise<ManualAsset | undefined> => {
      const updated = manualAssetRepository.update(id, updates);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const archiveManualAsset = useCallback(
    async (id: string): Promise<ManualAsset | undefined> => {
      const updated = manualAssetRepository.archive(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const unarchiveManualAsset = useCallback(
    async (id: string): Promise<ManualAsset | undefined> => {
      const updated = manualAssetRepository.unarchive(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const deleteManualAsset = useCallback(
    async (id: string): Promise<boolean> => {
      const success = manualAssetRepository.delete(id);
      if (success) {
        refreshData();
      }
      return success;
    },
    [refreshData],
  );

  // Manual Liability Handlers
  const createManualLiability = useCallback(
    async (data: Omit<ManualLiability, 'id' | 'createdAt' | 'updatedAt'>): Promise<ManualLiability> => {
      const created = manualLiabilityRepository.create(data);
      refreshData();
      return created;
    },
    [refreshData],
  );

  const updateManualLiability = useCallback(
    async (id: string, updates: Partial<Omit<ManualLiability, 'id' | 'createdAt'>>): Promise<ManualLiability | undefined> => {
      const updated = manualLiabilityRepository.update(id, updates);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const archiveManualLiability = useCallback(
    async (id: string): Promise<ManualLiability | undefined> => {
      const updated = manualLiabilityRepository.archive(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const unarchiveManualLiability = useCallback(
    async (id: string): Promise<ManualLiability | undefined> => {
      const updated = manualLiabilityRepository.unarchive(id);
      refreshData();
      return updated;
    },
    [refreshData],
  );

  const deleteManualLiability = useCallback(
    async (id: string): Promise<boolean> => {
      const success = manualLiabilityRepository.delete(id);
      if (success) {
        refreshData();
      }
      return success;
    },
    [refreshData],
  );

  // Snapshot Handlers
  const createSnapshot = useCallback(
    async (snapshotDate: string, notes?: string): Promise<FinancialSnapshot> => {
      const rawSnapshot = createSnapshotFromCurrentState(
        accounts,
        transactions,
        manualAssets,
        manualLiabilities,
        snapshotDate,
        notes,
      );
      const created = financialSnapshotRepository.create(rawSnapshot);
      refreshData();
      return created;
    },
    [accounts, transactions, manualAssets, manualLiabilities, refreshData],
  );

  const deleteSnapshot = useCallback(
    async (id: string): Promise<boolean> => {
      const success = financialSnapshotRepository.delete(id);
      if (success) {
        refreshData();
      }
      return success;
    },
    [refreshData],
  );

  // Derived Net Worth Summary
  const netWorthSummary = useMemo(() => {
    return calculateNetWorthSummary(accounts, transactions, manualAssets, manualLiabilities, goals, goalContributions);
  }, [accounts, transactions, manualAssets, manualLiabilities, goals, goalContributions]);

  // Derived state calculations
  const summary = useMemo(() => {
    const currentMonthPlan = monthlyBudgetRepository.getByPeriodKey(period.periodKey);
    const budgetItems = currentMonthPlan
      ? monthlyBudgetRepository.getBudgetItems(currentMonthPlan.id)
      : [];
    const plannedIncomeItems = currentMonthPlan
      ? monthlyBudgetRepository.getPlannedIncomeItems(currentMonthPlan.id)
      : [];

    return getDashboardSummary(
      accounts,
      transactions,
      period,
      currentMonthPlan || null,
      budgetItems,
      plannedIncomeItems,
      categories,
    );
  }, [accounts, transactions, period, categories]);

  const systemState = useMemo(() => {
    return getSystemState(
      accounts,
      transactions,
      monthlyBudgets,
      goals,
      recurringSchedules,
      scheduledBills,
    );
  }, [accounts, transactions, monthlyBudgets, goals, recurringSchedules, scheduledBills]);

  const getPlanSummaryForPeriod = useCallback(
    (targetPeriod: PeriodInfo): MonthlyPlanSummary => {
      const budget = monthlyBudgetRepository.getByPeriodKey(targetPeriod.periodKey) || null;
      const budgetItems = budget ? monthlyBudgetRepository.getBudgetItems(budget.id) : [];
      const plannedIncomeItems = budget ? monthlyBudgetRepository.getPlannedIncomeItems(budget.id) : [];

      return getMonthlyPlanSummary(
        targetPeriod,
        budget,
        budgetItems,
        plannedIncomeItems,
        categories,
        transactions,
        accounts,
      );
    },
    [accounts, categories, transactions],
  );

  const currentPlanSummary = useMemo(() => {
    return getPlanSummaryForPeriod(selectedPlanPeriod);
  }, [getPlanSummaryForPeriod, selectedPlanPeriod]);

  const goalSummaries = useMemo<GoalProgressSummary[]>(() => {
    return goals.map((goal) => {
      const contributions = goalContributionRepository.getByGoalId(goal.id);
      return calculateGoalProgress(goal, contributions);
    });
  }, [goals]);

  const getGoalSummary = useCallback(
    (goalId: string): GoalProgressSummary | undefined => {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return undefined;
      const contributions = goalContributionRepository.getByGoalId(goalId);
      return calculateGoalProgress(goal, contributions);
    },
    [goals],
  );

  const upcomingOccurrences = useMemo<ScheduledOccurrence[]>(() => {
    const today = new Date();
    const rangeStart = formatDateKey(today);
    const futureDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const rangeEnd = formatDateKey(futureDate);

    const generated = generateScheduleOccurrences(
      recurringSchedules,
      scheduledBills,
      occurrenceRecords,
      rangeStart,
      rangeEnd,
    );

    return generated.filter((occ) => occ.status === 'upcoming').slice(0, 5);
  }, [recurringSchedules, scheduledBills, occurrenceRecords]);

  const value = useMemo(
    () => ({
      accounts,
      categories,
      transactions,
      goals,
      goalContributions,
      goalSummaries,
      recurringSchedules,
      scheduledBills,
      occurrenceRecords,
      upcomingOccurrences,
      manualAssets,
      manualLiabilities,
      financialSnapshots,
      netWorthSummary,
      period,
      selectedPlanPeriod,
      setSelectedPlanPeriod,
      systemState,
      summary,
      currentPlanSummary,
      getPlanSummaryForPeriod,
      getGoalSummary,
      addTransaction,
      editTransaction,
      deleteTransaction,
      addAccount,
      getAccount,
      getCategory,
      saveBudgetItem,
      deleteBudgetItem,
      savePlannedIncome,
      deletePlannedIncome,
      setPlannedSavings,
      setCustomDailyAllowance,
      copyPreviousMonthPlan,
      deleteMonthlyPlan,
      createGoal,
      updateGoal,
      pauseGoal,
      resumeGoal,
      archiveGoal,
      unarchiveGoal,
      deleteGoal,
      createGoalContribution,
      updateGoalContribution,
      deleteGoalContribution,
      createRecurringSchedule,
      updateRecurringSchedule,
      cancelRecurringSchedule,
      resumeRecurringSchedule,
      deleteRecurringSchedule,
      createScheduledBill,
      updateScheduledBill,
      cancelScheduledBill,
      deleteScheduledBill,
      recordOccurrencePayment,
      skipOccurrence,
      createManualAsset,
      updateManualAsset,
      archiveManualAsset,
      unarchiveManualAsset,
      deleteManualAsset,
      createManualLiability,
      updateManualLiability,
      archiveManualLiability,
      unarchiveManualLiability,
      deleteManualLiability,
      createSnapshot,
      deleteSnapshot,
      refreshData,
      storageHealth,
    }),
    [
      accounts,
      categories,
      transactions,
      goals,
      goalContributions,
      goalSummaries,
      recurringSchedules,
      scheduledBills,
      occurrenceRecords,
      upcomingOccurrences,
      manualAssets,
      manualLiabilities,
      financialSnapshots,
      netWorthSummary,
      period,
      selectedPlanPeriod,
      setSelectedPlanPeriod,
      systemState,
      summary,
      currentPlanSummary,
      getPlanSummaryForPeriod,
      getGoalSummary,
      addTransaction,
      editTransaction,
      deleteTransaction,
      addAccount,
      getAccount,
      getCategory,
      saveBudgetItem,
      deleteBudgetItem,
      savePlannedIncome,
      deletePlannedIncome,
      setPlannedSavings,
      copyPreviousMonthPlan,
      deleteMonthlyPlan,
      createGoal,
      updateGoal,
      pauseGoal,
      resumeGoal,
      archiveGoal,
      unarchiveGoal,
      deleteGoal,
      createGoalContribution,
      updateGoalContribution,
      deleteGoalContribution,
      createRecurringSchedule,
      updateRecurringSchedule,
      cancelRecurringSchedule,
      resumeRecurringSchedule,
      deleteRecurringSchedule,
      createScheduledBill,
      updateScheduledBill,
      cancelScheduledBill,
      deleteScheduledBill,
      recordOccurrencePayment,
      skipOccurrence,
      createManualAsset,
      updateManualAsset,
      archiveManualAsset,
      unarchiveManualAsset,
      deleteManualAsset,
      createManualLiability,
      updateManualLiability,
      archiveManualLiability,
      unarchiveManualLiability,
      deleteManualLiability,
      createSnapshot,
      deleteSnapshot,
      refreshData,
      storageHealth,
    ],
  );

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};
