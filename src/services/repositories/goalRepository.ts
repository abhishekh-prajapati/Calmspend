import type { Goal } from '../../types/goal';
import { type IStorageAdapter, defaultStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

export class GoalRepository {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = defaultStorageAdapter) {
    this.adapter = adapter;
  }

  getAll(): Goal[] {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    return data.goals || [];
  }

  getById(id: string): Goal | undefined {
    return this.getAll().find((g) => g.id === id);
  }

  getActive(): Goal[] {
    return this.getAll().filter((g) => g.status === 'active');
  }

  create(goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Goal {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    const now = new Date().toISOString();
    const newGoal: Goal = {
      ...goalData,
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    if (!data.goals) data.goals = [];
    data.goals.push(newGoal);
    this.adapter.saveData(data);
    return newGoal;
  }

  update(id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>): Goal | undefined {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    if (!data.goals) return undefined;
    const index = data.goals.findIndex((g) => g.id === id);
    if (index === -1) return undefined;

    const updatedGoal: Goal = {
      ...data.goals[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    data.goals[index] = updatedGoal;
    this.adapter.saveData(data);
    return updatedGoal;
  }

  pause(id: string): Goal | undefined {
    return this.update(id, { status: 'paused' });
  }

  resume(id: string): Goal | undefined {
    return this.update(id, { status: 'active' });
  }

  archive(id: string): Goal | undefined {
    return this.update(id, { status: 'archived' });
  }

  unarchive(id: string): Goal | undefined {
    return this.update(id, { status: 'active' });
  }

  delete(id: string): boolean {
    const data = this.adapter.loadData(DEFAULT_SYSTEM_CATEGORIES);
    if (!data.goals) return false;
    const initialLen = data.goals.length;
    data.goals = data.goals.filter((g) => g.id !== id);

    if (data.goals.length === initialLen) return false;

    // Cascade delete associated goal contributions
    if (data.goalContributions) {
      data.goalContributions = data.goalContributions.filter((gc) => gc.goalId !== id);
    }

    this.adapter.saveData(data);
    return true;
  }
}

export const goalRepository = new GoalRepository();
