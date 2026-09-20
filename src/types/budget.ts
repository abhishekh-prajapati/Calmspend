import type { PeriodInfo } from './finance';

export type PlanStatus = 'not_started' | 'partially_planned' | 'fully_planned' | 'over_allocated';

export interface MonthlyBudget {
  id: string;
  periodKey: string; // YYYY-MM
  plannedSavingsMinor: number; // Integer minor units (paise)
  customDailyAllowanceMinor?: number | null; // Optional user-defined daily spending limit
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface BudgetItem {
  id: string;
  monthlyBudgetId: string;
  categoryId: string; // Strictly active expense categories
  plannedAmountMinor: number; // Integer minor units (paise)
  createdAt: string;
  updatedAt: string;
}

export interface PlannedIncomeItem {
  id: string;
  monthlyBudgetId: string;
  name: string;
  plannedAmountMinor: number; // Integer minor units (paise)
  categoryId?: string;
  accountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBudgetProgress {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  plannedAmountMinor: number;
  actualAmountMinor: number;
  remainingAmountMinor: number;
  isOverspent: boolean;
  spentPercentage: number;
}

export interface MonthlyPlanSummary {
  period: PeriodInfo;
  isCurrentMonth: boolean;
  budget: MonthlyBudget | null;
  plannedIncomeItems: PlannedIncomeItem[];
  budgetItems: BudgetItem[];
  totalPlannedIncomeMinor: number;
  totalPlannedExpensesMinor: number;
  plannedSavingsMinor: number;
  unallocatedMinor: number;
  status: PlanStatus;
  categoryProgress: CategoryBudgetProgress[];
  netSavingsMinor: number;
  availableToSpendMinor: number | null;
  dailyAllowanceMinor: number | null;
  customDailyAllowanceMinor?: number | null;
  autoDailyAllowanceMinor?: number | null;
}
