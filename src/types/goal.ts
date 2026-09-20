export type GoalPriority = 'high' | 'medium' | 'low';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export type GoalCategory =
  | 'emergency_fund'
  | 'travel'
  | 'education'
  | 'electronics'
  | 'vehicle'
  | 'business'
  | 'investment'
  | 'home'
  | 'custom';

export type GoalColorToken =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'pink'
  | 'neutral';

export interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmountMinor: number; // Integer minor units (paise)
  targetDate?: string | null; // ISO YYYY-MM-DD
  monthlyTargetMinor?: number | null; // User's configured monthly deduction/contribution amount
  priority: GoalPriority;
  category?: GoalCategory | null;
  customCategoryName?: string | null;
  icon?: string;
  colorToken?: GoalColorToken;
  status: GoalStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amountMinor: number; // Integer minor units (paise)
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface GoalProgressSummary {
  goal: Goal;
  currentAmountMinor: number;
  remainingAmountMinor: number;
  progressPercentage: number; // 0-100 (capped visually)
  isCompleted: boolean;
  isOverdue: boolean;
  remainingContributionMonths: number | null;
  requiredMonthlyContributionMinor: number | null;
  monthlyTargetMinor?: number | null; // User's chosen monthly deduction amount
  thisMonthContributionMinor?: number; // Total contributed this month
  contributions: GoalContribution[];
}
