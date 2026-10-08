import type { Transaction } from '../types/transaction';
import type { GoalProgressSummary } from '../types/goal';
import { notificationRepository } from './repositories/notificationRepository';
import { osNotificationService } from './native/osNotificationService';
import { toMajorUnits } from '../utils/money';

export const notificationEngine = {
  /**
   * Run all checks: daily sweep leftovers, goal targets, milestones
   */
  async runAutomatedChecks(params: {
    transactions: Transaction[];
    goalSummaries: GoalProgressSummary[];
    dailyAllowanceMinor: number;
    todayIso?: string;
  }): Promise<void> {
    const { transactions, goalSummaries, dailyAllowanceMinor } = params;
    const today = params.todayIso || new Date().toISOString().split('T')[0];

    // 1. Check Daily Leftover / Surplus Sweep for Yesterday
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayIso = yesterdayDate.toISOString().split('T')[0];

    const existingSweep = notificationRepository
      .getAll()
      .find((n) => n.type === 'daily_sweep' && n.metadata?.dateKey === yesterdayIso);

    if (!existingSweep && dailyAllowanceMinor > 0) {
      const yesterdaySpentMinor = transactions
        .filter((t) => t.type === 'expense' && t.date === yesterdayIso)
        .reduce((sum, t) => sum + t.amount, 0);

      const surplusMinor = dailyAllowanceMinor - yesterdaySpentMinor;

      // If user saved ₹50 or more from daily allowance
      if (surplusMinor >= 5000) {
        const surplusMajor = toMajorUnits(surplusMinor);
        const title = `🌟 You saved ₹${surplusMajor} yesterday!`;
        const message = `You stayed well within your daily budget. Would you like to roll ₹${surplusMajor} over to today's budget or stash it into your savings goal?`;

        notificationRepository.add({
          type: 'daily_sweep',
          title,
          message,
          metadata: {
            dateKey: yesterdayIso,
            surplusMinor,
          },
        });

        // Send to native OS / Device Control Center
        await osNotificationService.sendSystemNotification(title, message, 101);
      }
    }

    // 2. Check Monthly Goal Target Reminders
    const currentMonthKey = today.slice(0, 7);
    for (const item of goalSummaries) {
      if (item.goal.status !== 'active' || item.isCompleted) continue;

      const monthlyTarget = item.monthlyTargetMinor || item.requiredMonthlyContributionMinor || 0;
      if (monthlyTarget <= 0) continue;

      const thisMonthContributed = item.thisMonthContributionMinor || 0;
      const remainingForMonthMinor = Math.max(0, monthlyTarget - thisMonthContributed);

      // If month is ongoing and goal target is pending
      const goalNotifKey = `goal_monthly_${item.goal.id}_${currentMonthKey}`;
      const existingGoalNotif = notificationRepository
        .getAll()
        .find((n) => n.id.includes(goalNotifKey));

      // Day of month is around mid-month or later (e.g. >= 15th)
      const dayOfMonth = new Date().getDate();
      if (!existingGoalNotif && remainingForMonthMinor > 0 && dayOfMonth >= 15) {
        const remMajor = toMajorUnits(remainingForMonthMinor);
        const title = `🎯 Monthly Goal Reminder: ${item.goal.name}`;
        const message = `You're ₹${remMajor} away from your monthly target for ${item.goal.name}. Stash a small amount to keep your streak!`;

        notificationRepository.add({
          type: 'goal_monthly_reminder',
          title,
          message,
          metadata: {
            goalId: item.goal.id,
            goalName: item.goal.name,
            monthlyTargetMinor: monthlyTarget,
          },
        });

        await osNotificationService.sendSystemNotification(title, message, 202);
      }
    }
  },

  /**
   * Trigger celebratory notification when milestone hit
   */
  async notifyGoalMilestone(goalName: string, milestonePercent: number): Promise<void> {
    const title = `🎉 Milestone Achieved: ${goalName}!`;
    const message = `You've reached ${milestonePercent}% of your target for ${goalName}. Keep up the great pace!`;

    notificationRepository.add({
      type: 'goal_milestone',
      title,
      message,
      metadata: {
        goalName,
        milestonePercent,
      },
    });

    await osNotificationService.sendSystemNotification(title, message, 303);
  },
};
