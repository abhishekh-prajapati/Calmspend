import type { MonthlyBudget, BudgetItem, PlannedIncomeItem } from '../../types/budget';
import { type IStorageAdapter, defaultStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';
import { getPeriodFromKey, getAdjacentPeriod } from '../periodService';

export class MonthlyBudgetRepository {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = defaultStorageAdapter) {
    this.adapter = adapter;
  }

  getAllBudgets(): MonthlyBudget[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return data.monthlyBudgets || [];
  }

  getByPeriodKey(periodKey: string): MonthlyBudget | undefined {
    const budgets = this.getAllBudgets();
    return budgets.find((b) => b.periodKey === periodKey);
  }

  getBudgetItems(monthlyBudgetId: string): BudgetItem[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return (data.budgetItems || []).filter((item) => item.monthlyBudgetId === monthlyBudgetId);
  }

  getPlannedIncomeItems(monthlyBudgetId: string): PlannedIncomeItem[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return (data.plannedIncomeItems || []).filter((item) => item.monthlyBudgetId === monthlyBudgetId);
  }

  getBudgetItemsByPeriodKey(periodKey: string): BudgetItem[] {
    const budget = this.getByPeriodKey(periodKey);
    if (!budget) return [];
    return this.getBudgetItems(budget.id);
  }

  getPlannedIncomeItemsByPeriodKey(periodKey: string): PlannedIncomeItem[] {
    const budget = this.getByPeriodKey(periodKey);
    if (!budget) return [];
    return this.getPlannedIncomeItems(budget.id);
  }

  ensureMonthlyBudget(periodKey: string): MonthlyBudget {
    const existing = this.getByPeriodKey(periodKey);
    if (existing) return existing;

    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();
    const newBudget: MonthlyBudget = {
      id: `mb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      periodKey,
      plannedSavingsMinor: 0,
      createdAt: now,
      updatedAt: now,
    };

    data.monthlyBudgets.push(newBudget);
    this.adapter.saveData(data);
    return newBudget;
  }

  setPlannedSavings(periodKey: string, plannedSavingsMinor: number): MonthlyBudget {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    let budget = data.monthlyBudgets.find((b) => b.periodKey === periodKey);
    const now = new Date().toISOString();

    if (!budget) {
      budget = {
        id: `mb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        periodKey,
        plannedSavingsMinor: Math.max(0, Math.round(plannedSavingsMinor)),
        createdAt: now,
        updatedAt: now,
      };
      data.monthlyBudgets.push(budget);
    } else {
      budget.plannedSavingsMinor = Math.max(0, Math.round(plannedSavingsMinor));
      budget.updatedAt = now;
    }

    this.adapter.saveData(data);
    return budget;
  }

  setCustomDailyAllowance(periodKey: string, customDailyAllowanceMinor: number | null): MonthlyBudget {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    let budget = data.monthlyBudgets.find((b) => b.periodKey === periodKey);
    const now = new Date().toISOString();

    const cleanAmount =
      customDailyAllowanceMinor === null || customDailyAllowanceMinor === undefined
        ? null
        : Math.max(0, Math.round(customDailyAllowanceMinor));

    if (!budget) {
      budget = {
        id: `mb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        periodKey,
        plannedSavingsMinor: 0,
        customDailyAllowanceMinor: cleanAmount,
        createdAt: now,
        updatedAt: now,
      };
      data.monthlyBudgets.push(budget);
    } else {
      budget.customDailyAllowanceMinor = cleanAmount;
      budget.updatedAt = now;
    }

    this.adapter.saveData(data);
    return budget;
  }

  saveBudgetItem(
    periodKey: string,
    categoryId: string,
    plannedAmountMinor: number,
  ): BudgetItem {
    const budget = this.ensureMonthlyBudget(periodKey);
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();
    const cleanAmount = Math.max(0, Math.round(plannedAmountMinor));

    // Check if category already budgeted for this month
    const existingIndex = data.budgetItems.findIndex(
      (item) => item.monthlyBudgetId === budget.id && item.categoryId === categoryId,
    );

    let savedItem: BudgetItem;
    if (existingIndex !== -1) {
      savedItem = {
        ...data.budgetItems[existingIndex],
        plannedAmountMinor: cleanAmount,
        updatedAt: now,
      };
      data.budgetItems[existingIndex] = savedItem;
    } else {
      savedItem = {
        id: `bi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        monthlyBudgetId: budget.id,
        categoryId,
        plannedAmountMinor: cleanAmount,
        createdAt: now,
        updatedAt: now,
      };
      data.budgetItems.push(savedItem);
    }

    this.adapter.saveData(data);
    return savedItem;
  }

  deleteBudgetItem(id: string): boolean {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const initialLen = data.budgetItems.length;
    data.budgetItems = data.budgetItems.filter((b) => b.id !== id);

    if (data.budgetItems.length === initialLen) return false;
    this.adapter.saveData(data);
    return true;
  }

  savePlannedIncomeItem(
    periodKey: string,
    name: string,
    plannedAmountMinor: number,
    categoryId?: string,
    id?: string,
    accountId?: string,
  ): PlannedIncomeItem {
    const budget = this.ensureMonthlyBudget(periodKey);
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();
    const cleanAmount = Math.max(0, Math.round(plannedAmountMinor));

    let savedItem: PlannedIncomeItem;

    if (id) {
      const index = data.plannedIncomeItems.findIndex((item) => item.id === id);
      if (index !== -1) {
        savedItem = {
          ...data.plannedIncomeItems[index],
          name: name.trim(),
          plannedAmountMinor: cleanAmount,
          categoryId,
          accountId,
          updatedAt: now,
        };
        data.plannedIncomeItems[index] = savedItem;
      } else {
        savedItem = {
          id,
          monthlyBudgetId: budget.id,
          name: name.trim(),
          plannedAmountMinor: cleanAmount,
          categoryId,
          accountId,
          createdAt: now,
          updatedAt: now,
        };
        data.plannedIncomeItems.push(savedItem);
      }
    } else {
      savedItem = {
        id: `pi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        monthlyBudgetId: budget.id,
        name: name.trim(),
        plannedAmountMinor: cleanAmount,
        categoryId,
        accountId,
        createdAt: now,
        updatedAt: now,
      };
      data.plannedIncomeItems.push(savedItem);
    }

    this.adapter.saveData(data);
    return savedItem;
  }

  deletePlannedIncomeItem(id: string): boolean {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const initialLen = data.plannedIncomeItems.length;
    data.plannedIncomeItems = data.plannedIncomeItems.filter((i) => i.id !== id);

    if (data.plannedIncomeItems.length === initialLen) return false;

    this.adapter.saveData(data);
    return true;
  }

  deleteMonthlyPlan(periodKey: string): boolean {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const budgetIndex = data.monthlyBudgets.findIndex((b) => b.periodKey === periodKey);
    if (budgetIndex === -1) return false;

    const budgetId = data.monthlyBudgets[budgetIndex].id;

    // Remove budget and associated items ONLY. Transactions and accounts remain completely untouched.
    data.monthlyBudgets.splice(budgetIndex, 1);
    data.budgetItems = data.budgetItems.filter((item) => item.monthlyBudgetId !== budgetId);
    data.plannedIncomeItems = data.plannedIncomeItems.filter((item) => item.monthlyBudgetId !== budgetId);

    this.adapter.saveData(data);
    return true;
  }

  copyPlan(sourcePeriodKey: string, targetPeriodKey: string): MonthlyBudget {
    const sourceBudget = this.getByPeriodKey(sourcePeriodKey);
    if (!sourceBudget) {
      throw new Error(`Source plan for period ${sourcePeriodKey} does not exist`);
    }

    const sourceBudgetItems = this.getBudgetItems(sourceBudget.id);
    const sourceIncomeItems = this.getPlannedIncomeItems(sourceBudget.id);

    // Clean any existing plan for target period first to avoid duplication
    this.deleteMonthlyPlan(targetPeriodKey);

    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();

    const targetBudget: MonthlyBudget = {
      id: `mb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      periodKey: targetPeriodKey,
      plannedSavingsMinor: sourceBudget.plannedSavingsMinor,
      createdAt: now,
      updatedAt: now,
    };
    data.monthlyBudgets.push(targetBudget);

    // Copy budget items with new IDs
    for (const item of sourceBudgetItems) {
      const newBudgetItem: BudgetItem = {
        id: `bi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        monthlyBudgetId: targetBudget.id,
        categoryId: item.categoryId,
        plannedAmountMinor: item.plannedAmountMinor,
        createdAt: now,
        updatedAt: now,
      };
      data.budgetItems.push(newBudgetItem);
    }

    // Copy planned income items with new IDs
    for (const item of sourceIncomeItems) {
      const newIncomeItem: PlannedIncomeItem = {
        id: `pi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        monthlyBudgetId: targetBudget.id,
        name: item.name,
        plannedAmountMinor: item.plannedAmountMinor,
        categoryId: item.categoryId,
        accountId: item.accountId,
        createdAt: now,
        updatedAt: now,
      };
      data.plannedIncomeItems.push(newIncomeItem);
    }

    this.adapter.saveData(data);
    return targetBudget;
  }

  copyPlanFromPreviousMonth(targetPeriodKey: string, sourcePeriodKey?: string): boolean {
    try {
      let srcKey = sourcePeriodKey;
      if (!srcKey) {
        const currentPeriod = getPeriodFromKey(targetPeriodKey);
        const prevPeriod = getAdjacentPeriod(currentPeriod, -1);
        srcKey = prevPeriod.periodKey;
      }
      const sourceBudget = this.getByPeriodKey(srcKey);
      if (!sourceBudget) return false;
      this.copyPlan(srcKey, targetPeriodKey);
      return true;
    } catch {
      return false;
    }
  }

  deletePlan(periodKey: string): boolean {
    return this.deleteMonthlyPlan(periodKey);
  }
}

export const monthlyBudgetRepository = new MonthlyBudgetRepository();

