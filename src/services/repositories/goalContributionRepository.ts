import type { GoalContribution } from '../../types/goal';
import { type IStorageAdapter, defaultStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

export class GoalContributionRepository {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = defaultStorageAdapter) {
    this.adapter = adapter;
  }

  getAll(): GoalContribution[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return data.goalContributions || [];
  }

  getById(id: string): GoalContribution | undefined {
    return this.getAll().find((gc) => gc.id === id);
  }

  getByGoalId(goalId: string): GoalContribution[] {
    const contributions = this.getAll().filter((gc) => gc.goalId === goalId);
    return contributions.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  getByPeriodKey(periodKey: string): GoalContribution[] {
    return this.getAll().filter((gc) => gc.date.startsWith(periodKey));
  }

  create(data: Omit<GoalContribution, 'id' | 'createdAt' | 'updatedAt'>): GoalContribution {
    const store = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();
    const newContribution: GoalContribution = {
      ...data,
      id: `gc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    if (!store.goalContributions) store.goalContributions = [];
    store.goalContributions.push(newContribution);
    this.adapter.saveData(store);
    return newContribution;
  }

  update(
    id: string,
    updates: Partial<Omit<GoalContribution, 'id' | 'createdAt'>>,
  ): GoalContribution | undefined {
    const store = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    if (!store.goalContributions) return undefined;
    const index = store.goalContributions.findIndex((gc) => gc.id === id);
    if (index === -1) return undefined;

    const updated: GoalContribution = {
      ...store.goalContributions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    store.goalContributions[index] = updated;
    this.adapter.saveData(store);
    return updated;
  }

  delete(id: string): boolean {
    const store = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    if (!store.goalContributions) return false;
    const initialLen = store.goalContributions.length;
    store.goalContributions = store.goalContributions.filter((gc) => gc.id !== id);

    if (store.goalContributions.length === initialLen) return false;
    this.adapter.saveData(store);
    return true;
  }
}

export const goalContributionRepository = new GoalContributionRepository();
