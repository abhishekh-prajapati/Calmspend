import React from 'react';
import { Target, Plus, ChevronRight, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { SectionHeader } from '../ui/SectionHeader';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { Goal, GoalProgressSummary } from '../../types/goal';
import './GoalsOverviewCard.css';

export interface GoalsOverviewCardProps {
  goalSummaries?: GoalProgressSummary[];
  onNavigateToGoals: () => void;
  onQuickSaveGoal?: (goal: Goal, goalSummary: GoalProgressSummary) => void;
  className?: string;
}

export const GoalsOverviewCard: React.FC<GoalsOverviewCardProps> = ({
  goalSummaries = [],
  onNavigateToGoals,
  onQuickSaveGoal,
  className = '',
}) => {
  const activeGoals = goalSummaries.filter(
    (gs) => gs.goal.status === 'active' || gs.goal.status === 'completed',
  );

  // Deterministic sorting: active incomplete first, high priority first, then date
  const sortedGoals = [...activeGoals].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const pA = priorityWeight[a.goal.priority] || 2;
    const pB = priorityWeight[b.goal.priority] || 2;
    if (pB !== pA) return pB - pA;
    if (a.goal.targetDate && b.goal.targetDate) {
      return a.goal.targetDate.localeCompare(b.goal.targetDate);
    }
    return a.goal.name.localeCompare(b.goal.name);
  });

  const hasGoals = sortedGoals.length > 0;

  return (
    <div className={`goals-overview-section ${className}`}>
      <SectionHeader
        title="Financial Goals"
        action={
          <button
            type="button"
            className="goals-overview-section__see-all"
            onClick={onNavigateToGoals}
          >
            All Goals
          </button>
        }
      />

      <Card variant="default" padding="md" radius="xl" className="goals-overview-card">
        {!hasGoals ? (
          <div className="goals-overview-empty">
            <div className="goals-overview-empty__icon-wrap">
              <Target size={24} />
            </div>
            <h3 className="goals-overview-empty__title heading-3">No Goals Yet</h3>
            <p className="goals-overview-empty__desc body-sm">
              Set milestones for an emergency fund, vacation, or major purchase in Plan.
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={onNavigateToGoals}
              className="goals-overview-empty__btn"
            >
              Create Goal
            </Button>
          </div>
        ) : (
          <div className="goals-overview-list">
            {sortedGoals.slice(0, 3).map((item) => {
              const priorityVariant =
                item.goal.priority === 'high'
                  ? 'danger'
                  : item.goal.priority === 'medium'
                  ? 'warning'
                  : 'neutral';

              const progressColor = item.isCompleted
                ? 'success'
                : item.isOverdue
                ? 'danger'
                : item.progressPercentage > 75
                ? 'warning'
                : 'primary';

              return (
                <div
                  key={item.goal.id}
                  className="goals-overview-item"
                  onClick={onNavigateToGoals}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onNavigateToGoals();
                  }}
                >
                  <div className="goals-overview-item__top">
                    <div className="goals-overview-item__left">
                      <span className="goals-overview-item__name body-sm">{item.goal.name}</span>
                      <Badge variant={priorityVariant} size="sm">
                        {item.goal.priority}
                      </Badge>
                      {item.isCompleted && <Badge variant="success" size="sm">Completed</Badge>}
                    </div>

                    <div className="goals-overview-item__right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <span className="goals-overview-item__current body-sm" style={{ fontWeight: 600 }}>
                          {formatCurrency(toMajorUnits(item.currentAmountMinor))}
                        </span>
                        <span className="goals-overview-item__target caption" style={{ color: 'var(--color-text-muted)' }}>
                          {' '}/ {formatCurrency(toMajorUnits(item.goal.targetAmountMinor))}
                        </span>
                      </div>
                      {item.goal.status === 'active' && onQuickSaveGoal && (
                        <button
                          type="button"
                          className="goals-overview-save-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickSaveGoal(item.goal, item);
                          }}
                          title={`Save money to ${item.goal.name}`}
                        >
                          <Plus size={12} />
                          <span>Save</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <ProgressBar
                    value={item.currentAmountMinor}
                    max={Math.max(item.goal.targetAmountMinor, 1)}
                    color={progressColor}
                    size="sm"
                  />

                  <div className="goals-overview-item__bottom">
                    <span className="caption" style={{ color: 'var(--color-text-secondary)' }}>
                      {item.isCompleted
                        ? 'Target achieved!'
                        : `${formatCurrency(toMajorUnits(item.remainingAmountMinor))} remaining (${Math.round(item.progressPercentage)}%)`}
                    </span>

                    {item.goal.targetDate && (
                      <span className="caption" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {item.goal.targetDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {sortedGoals.length > 3 && (
              <button
                type="button"
                className="goals-overview-more-btn"
                onClick={onNavigateToGoals}
              >
                <span>+{sortedGoals.length - 3} more goals</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

