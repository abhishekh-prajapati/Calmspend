import { toMinorUnits } from '../utils/money';
import { categoryRepository } from './repositories/categoryRepository';
import type { Category } from '../types/transaction';
import type { WizardBudgetItem } from '../types/budgetWizard';

export function resolveOrCreateCategory(name: string, categories: Category[]): Category {
  const cleanName = name.trim();
  const existing = categories.find(
    (c) => c.name.toLowerCase() === cleanName.toLowerCase() && c.type === 'expense'
  );
  if (existing) return existing;

  return categoryRepository.create({
    name: cleanName,
    type: 'expense',
    icon: 'payments',
    color: '#059669',
    isActive: true,
  });
}

export async function persistWizardBudget(
  periodKey: string,
  needs: WizardBudgetItem[],
  wants: WizardBudgetItem[],
  emergencyBuffer: string,
  plannedSavings: string,
  categories: Category[],
  saveBudgetItem: (periodKey: string, categoryId: string, amountMinor: number, priority?: 'need' | 'want') => Promise<void>,
  setEmergencyCushion: (periodKey: string, minor: number) => Promise<void>,
  setPlannedSavings: (periodKey: string, minor: number) => Promise<void>,
): Promise<void> {
  // 1. Save all Needs
  for (const item of needs) {
    const category = resolveOrCreateCategory(item.name, categories);
    const amountMinor = toMinorUnits(parseFloat(item.amount) || 0);
    await saveBudgetItem(periodKey, category.id, amountMinor, 'need');
  }

  // 2. Save all Wants
  for (const item of wants) {
    const category = resolveOrCreateCategory(item.name, categories);
    const amountMinor = toMinorUnits(parseFloat(item.amount) || 0);
    await saveBudgetItem(periodKey, category.id, amountMinor, 'want');
  }

  // 3. Save Emergency Cushion
  const bufferMinor = toMinorUnits(parseFloat(emergencyBuffer) || 0);
  await setEmergencyCushion(periodKey, bufferMinor);

  // 4. Save Planned Savings
  const savingsMinor = toMinorUnits(parseFloat(plannedSavings) || 0);
  await setPlannedSavings(periodKey, savingsMinor);
}
