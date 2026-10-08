import React from 'react';
import type { GoalProgressSummary } from '../../types/goal';
import { toMajorUnits } from '../../utils/money';

export interface GoalHeroBannerProps {
  goalSummaries: GoalProgressSummary[];
  onNewGoalClick: () => void;
}

export const GoalHeroBanner: React.FC<GoalHeroBannerProps> = ({
  goalSummaries,
  onNewGoalClick,
}) => {
  const activeSummaries = goalSummaries.filter((g) => g.goal.status === 'active' && !g.isCompleted);
  const completedSummaries = goalSummaries.filter((g) => g.isCompleted || g.goal.status === 'completed');

  const totalSavedMinor = goalSummaries.reduce((sum, g) => sum + g.currentAmountMinor, 0);
  const totalTargetMinor = activeSummaries.reduce((sum, g) => sum + g.goal.targetAmountMinor, 0);
  const totalSavedMajor = toMajorUnits(totalSavedMinor);
  const totalTargetMajor = toMajorUnits(totalTargetMinor);

  const overallPct = totalTargetMajor > 0
    ? Math.min(100, Math.round((totalSavedMajor / totalTargetMajor) * 100))
    : (completedSummaries.length > 0 ? 100 : 0);

  const monthlyCommitmentMinor = activeSummaries.reduce(
    (sum, g) => sum + (g.monthlyTargetMinor || g.requiredMonthlyContributionMinor || 0),
    0
  );
  const monthlyCommitmentMajor = toMajorUnits(monthlyCommitmentMinor);

  return (
    <div className="calm-goal-hero-card">
      <div className="calm-goal-hero-card__top">
        <div className="calm-goal-hero-card__title-wrap">
          <div className="calm-goal-hero-card__icon">
            <span className="material-symbols-outlined">adjust</span>
          </div>
          <div>
            <span className="calm-goal-hero-card__label">Dedicated Target Vaults</span>
            <h2 className="calm-goal-hero-card__amount">
              ₹{Math.round(totalSavedMajor).toLocaleString('en-IN')}
            </h2>
          </div>
        </div>

        <button
          type="button"
          className="calm-goal-hero-card__add-btn"
          onClick={onNewGoalClick}
          aria-label="Create new savings target vault"
        >
          <span className="material-symbols-outlined">add</span>
          <span>New Target</span>
        </button>
      </div>

      <div className="calm-goal-hero-card__progress-wrap">
        <div className="calm-goal-hero-card__progress-header">
          <span>Overall Milestone Funding</span>
          <span className="calm-goal-hero-card__pct">{overallPct}% Funded</span>
        </div>
        <div className="calm-goal-hero-card__progress-track">
          <div
            className="calm-goal-hero-card__progress-fill"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      <div className="calm-goal-hero-card__metrics-row">
        <div className="calm-goal-hero-metric">
          <span className="calm-goal-hero-metric__label">Active Goals</span>
          <strong className="calm-goal-hero-metric__val text-emerald">
            {activeSummaries.length}
          </strong>
        </div>
        <div className="calm-goal-hero-metric">
          <span className="calm-goal-hero-metric__label">Monthly Auto-Commit</span>
          <strong className="calm-goal-hero-metric__val">
            ₹{Math.round(monthlyCommitmentMajor).toLocaleString('en-IN')}
          </strong>
        </div>
        <div className="calm-goal-hero-metric">
          <span className="calm-goal-hero-metric__label">Completed</span>
          <strong className="calm-goal-hero-metric__val text-indigo">
            {completedSummaries.length} 🎉
          </strong>
        </div>
      </div>
    </div>
  );
};
