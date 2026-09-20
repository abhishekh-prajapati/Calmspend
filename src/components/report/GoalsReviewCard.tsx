import React from 'react';
import { Target, ArrowRight, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { MonthlyGoalContributionItem } from '../../types/report';
import './GoalsReviewCard.css';

export interface GoalsReviewCardProps {
  totalGoalContributionsMinor: number;
  items: MonthlyGoalContributionItem[];
}

export const GoalsReviewCard: React.FC<GoalsReviewCardProps> = ({
  totalGoalContributionsMinor,
  items,
}) => {
  if (items.length === 0) {
    return (
      <Card variant="default" padding="lg" radius="lg" className="goals-review-card">
        <div className="card-header-simple">
          <span className="card-subtitle">Earmarked Savings</span>
          <h3 className="card-title">Goals Overview</h3>
        </div>
        <div className="empty-goals-state">
          <Target size={28} className="empty-goals-icon" />
          <p className="empty-goals-title">No financial goals configured</p>
          <p className="empty-goals-desc">Set up milestone goals to track earmarked savings and target deadlines.</p>
          <Link to="/home" className="create-goal-link">
            Configure Goals <ArrowRight size={14} />
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="lg" radius="lg" className="goals-review-card">
      <div className="card-header-with-badge">
        <div className="card-title-group">
          <span className="card-subtitle">Earmarked Savings</span>
          <h3 className="card-title">Goals Review</h3>
        </div>
        {totalGoalContributionsMinor > 0 && (
          <Badge variant="info" size="md">
            {formatCurrency(toMajorUnits(totalGoalContributionsMinor))} Contributed This Month
          </Badge>
        )}
      </div>

      <div className="goals-list-container">
        {items.map((goal) => (
          <div key={goal.goalId} className="goal-review-row">
            <div className="goal-header-row">
              <div className="goal-title-group">
                <Flag size={16} className="goal-flag-icon" />
                <span className="goal-name">{goal.goalName}</span>
              </div>
              <div className="goal-badges-group">
                {goal.isCompleted && <span className="goal-badge badge-completed">Completed</span>}
                {goal.isOverdue && !goal.isCompleted && <span className="goal-badge badge-overdue">Overdue</span>}
                {goal.monthlyContributionMinor > 0 && (
                  <span className="goal-badge badge-monthly">
                    +{formatCurrency(toMajorUnits(goal.monthlyContributionMinor))} this month
                  </span>
                )}
              </div>
            </div>

            <div className="goal-amounts-row">
              <span>
                Saved: <strong>{formatCurrency(toMajorUnits(goal.totalAccumulatedMinor))}</strong> of{' '}
                {formatCurrency(toMajorUnits(goal.targetAmountMinor))}
              </span>
              <span className="goal-progress-pct">{goal.progressPercentage}%</span>
            </div>

            <ProgressBar value={goal.progressPercentage} color="success" size="sm" />

            {goal.requiredMonthlyContributionMinor !== null && !goal.isCompleted && (
              <div className="goal-req-row">
                <span>
                  Required Monthly: <strong>{formatCurrency(toMajorUnits(goal.requiredMonthlyContributionMinor))}</strong>
                  {goal.targetDate && ` by ${goal.targetDate}`}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="goals-disclaimer">
        <span>Goal contributions represent earmarked money allocations and are strictly separate from monthly expense totals.</span>
      </div>
    </Card>
  );
};
