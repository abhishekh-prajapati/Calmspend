import React from 'react';
import type { GoalProgressSummary } from '../../types/goal';
import { GoalCard } from './GoalCard';

export interface GoalsListProps {
  goalSummaries: GoalProgressSummary[];
  onNewGoalClick: () => void;
  onMicroDeposit: (goalId: string, amountMajor: number, goalName: string) => void;
  onCustomDeposit: (goalId: string, goalName: string) => void;
  onEditGoal: (goalId: string) => void;
}

export const GoalsList: React.FC<GoalsListProps> = ({
  goalSummaries,
  onNewGoalClick,
  onMicroDeposit,
  onCustomDeposit,
  onEditGoal,
}) => {
  const activeGoals = goalSummaries.filter((g) => g.goal.status === 'active' && !g.isCompleted);
  const completedGoals = goalSummaries.filter((g) => g.isCompleted || g.goal.status === 'completed');

  return (
    <div className="calm-goals-section">
      <div className="calm-goals-header">
        <div className="calm-goals-header__left">
          <div className="calm-goals-header__icon-box">
            <span className="material-symbols-outlined">adjust</span>
          </div>
          <div>
            <h2 className="calm-goals-header__title">Active Savings Goals</h2>
            <span className="calm-goals-header__subtitle">
              {activeGoals.length} {activeGoals.length === 1 ? 'Target' : 'Targets'} in progress
            </span>
          </div>
        </div>
        <button
          type="button"
          className="calm-goals-header__add-btn"
          onClick={onNewGoalClick}
          aria-label="Add new goal"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Add Goal</span>
        </button>
      </div>

      <div className="calm-goals-list">
        {activeGoals.length > 0 ? (
          activeGoals.map((item) => (
            <GoalCard
              key={item.goal.id}
              summary={item}
              onMicroDeposit={onMicroDeposit}
              onCustomDeposit={onCustomDeposit}
              onEditGoal={onEditGoal}
            />
          ))
        ) : (
          <div className="calm-goal-empty-card">
            <div className="calm-goal-empty-icon">
              <span className="material-symbols-outlined">savings</span>
            </div>
            <h3 className="calm-goal-empty-title">No active savings targets yet</h3>
            <p className="calm-goal-empty-desc">
              Create an Emergency Cushion, Vacation Fund, or Dream Milestone to track your progress effortlessly.
            </p>
            <button
              type="button"
              className="calm-goal-empty-btn"
              onClick={onNewGoalClick}
            >
              <span className="material-symbols-outlined">add_circle</span>
              <span>Create Your First Target Vault</span>
            </button>
          </div>
        )}

        {/* Completed Milestones Group */}
        {completedGoals.length > 0 && (
          <div className="calm-completed-goals-group">
            <div className="calm-goals-header calm-goals-header--completed">
              <div className="calm-goals-header__left">
                <div className="calm-goals-header__icon-box calm-goals-header__icon-box--gold">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <div>
                  <h2 className="calm-goals-header__title">Completed Milestones</h2>
                  <span className="calm-goals-header__subtitle">
                    {completedGoals.length} {completedGoals.length === 1 ? 'Milestone' : 'Milestones'} fully funded 🎉
                  </span>
                </div>
              </div>
            </div>
            {completedGoals.map((item) => (
              <GoalCard
                key={item.goal.id}
                summary={item}
                onMicroDeposit={onMicroDeposit}
                onCustomDeposit={onCustomDeposit}
                onEditGoal={onEditGoal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
