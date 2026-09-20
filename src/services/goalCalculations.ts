import type { Goal, GoalContribution, GoalProgressSummary } from '../types/goal';
import type { PeriodInfo } from '../types/finance';
import { getRemainingContributionMonths } from './periodService';

/**
 * Computes progress, remaining allocation, and required monthly contribution for a single goal.
 * Strict rules:
 * - ACTIVE + future target date -> calculate required monthly contribution (ceil rounded)
 * - ACTIVE + no target date -> null
 * - PAUSED -> null
 * - COMPLETED -> null
 * - ARCHIVED -> null
 * - ACTIVE + target date passed + incomplete -> null and isOverdue = true
 */
export function calculateGoalProgress(
  goal: Goal,
  contributions: GoalContribution[],
  currentDate: Date = new Date(),
): GoalProgressSummary {
  const currentAmountMinor = contributions.reduce((acc, c) => acc + c.amountMinor, 0);
  const remainingAmountMinor = Math.max(0, goal.targetAmountMinor - currentAmountMinor);
  const isCompleted = currentAmountMinor >= goal.targetAmountMinor && goal.targetAmountMinor > 0;
  const progressPercentage =
    goal.targetAmountMinor > 0 ? Math.min(100, (currentAmountMinor / goal.targetAmountMinor) * 100) : 0;

  let isOverdue = false;
  let remainingContributionMonths: number | null = null;
  let requiredMonthlyContributionMinor: number | null = null;

  if (goal.targetDate) {
    const { remainingMonths, isPast } = getRemainingContributionMonths(goal.targetDate, currentDate);

    if (isPast && !isCompleted) {
      isOverdue = true;
      remainingContributionMonths = 0;
      requiredMonthlyContributionMinor = null;
    } else if (!isPast) {
      remainingContributionMonths = remainingMonths;
      // Only active, incomplete goals receive a required monthly contribution
      if (goal.status === 'active' && !isCompleted) {
        requiredMonthlyContributionMinor = Math.ceil(remainingAmountMinor / remainingMonths);
      }
    }
  }

  // Ensure paused, completed, and archived goals have null required monthly contribution
  if (goal.status === 'paused' || goal.status === 'archived' || isCompleted) {
    requiredMonthlyContributionMinor = null;
  }

  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthContributionMinor = contributions
    .filter((c) => c.date.startsWith(currentMonthKey))
    .reduce((acc, c) => acc + c.amountMinor, 0);

  const monthlyTargetMinor =
    goal.monthlyTargetMinor !== null && goal.monthlyTargetMinor !== undefined && goal.monthlyTargetMinor > 0
      ? goal.monthlyTargetMinor
      : requiredMonthlyContributionMinor;

  return {
    goal,
    currentAmountMinor,
    remainingAmountMinor,
    progressPercentage,
    isCompleted,
    isOverdue,
    remainingContributionMonths,
    requiredMonthlyContributionMinor,
    monthlyTargetMinor,
    thisMonthContributionMinor,
    contributions,
  };
}

/**
 * Computes total goal allocations recorded strictly in the specified financial period (YYYY-MM).
 */
export function calculateMonthlyGoalContributionsMinor(
  contributions: GoalContribution[],
  period: PeriodInfo,
): number {
  return contributions
    .filter((gc) => gc.date.startsWith(period.periodKey))
    .reduce((acc, gc) => acc + gc.amountMinor, 0);
}
