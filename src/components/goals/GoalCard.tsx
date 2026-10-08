import React from 'react';
import type { GoalProgressSummary } from '../../types/goal';
import { toMajorUnits } from '../../utils/money';

export interface GoalCardProps {
  summary: GoalProgressSummary;
  onMicroDeposit: (goalId: string, amountMajor: number, goalName: string) => void;
  onCustomDeposit: (goalId: string, goalName: string) => void;
  onEditGoal: (goalId: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  summary,
  onMicroDeposit,
  onCustomDeposit,
  onEditGoal,
}) => {
  const { goal, currentAmountMinor, progressPercentage } = summary;
  const savedMajor = toMajorUnits(currentAmountMinor);
  const targetMajor = toMajorUnits(goal.targetAmountMinor);
  const isCompleted = summary.isCompleted || savedMajor >= targetMajor;

  const roundedPct = Math.min(100, Math.max(0, Math.round(progressPercentage)));

  // SVG radial progress calculation (r=40, circumference ≈ 251.2)
  const circumference = 251.2;
  const strokeDashoffset = circumference - (circumference * roundedPct) / 100;

  return (
    <div className={`calm-target-vault-card ${isCompleted ? 'completed' : ''}`}>
      <div className="calm-goal-header-row">
        <div className="calm-goal-title-group">
          <div className={`calm-target-vault-icon ${isCompleted ? 'bg-emerald-fill' : 'bg-emerald-light'}`}>
            <span className="material-symbols-outlined text-[22px]">
              {goal.icon || (isCompleted ? 'verified' : 'verified_user')}
            </span>
          </div>
          <div>
            <h3 className="calm-target-vault-title">{goal.name}</h3>
            <p className="calm-target-vault-sub">
              {isCompleted ? 'Milestone Achieved! 100% Funded ✨' : 'Target Milestone'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`calm-target-status-badge ${isCompleted ? 'badge-completed' : 'badge-ontrack'}`}>
            <span className="calm-status-dot" />
            {isCompleted ? 'GOAL MET' : 'On Track'}
          </span>
          <button
            type="button"
            className="calm-goal-edit-btn"
            onClick={() => onEditGoal(goal.id)}
            aria-label={`Edit ${goal.name}`}
            title="Edit goal"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
          </button>
        </div>
      </div>

      <div className="calm-goal-content-row">
        {/* Radial SVG Gauge */}
        <div className="calm-radial-gauge-wrap">
          <svg className="calm-radial-gauge-svg" viewBox="0 0 100 100">
            <circle
              className="calm-radial-gauge-track"
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              strokeWidth="8"
            />
            <circle
              className="calm-radial-gauge-fill"
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke={isCompleted ? '#059669' : '#10B981'}
              strokeWidth="8.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="calm-radial-gauge-center">
            <span className="calm-radial-gauge-pct">{roundedPct}%</span>
            <span className="calm-radial-gauge-lbl">funded</span>
          </div>
        </div>

        <div className="calm-goal-info-col">
          <div className="calm-goal-amounts-row">
            <span className="calm-vault-saved-amt">₹{Math.round(savedMajor).toLocaleString('en-IN')}</span>
            <span className="calm-vault-target-amt">of ₹{Math.round(targetMajor).toLocaleString('en-IN')}</span>
          </div>
          <div className="calm-goal-sweep-row">
            <span className="material-symbols-outlined text-[15px] text-emerald">sync</span>
            <span className="truncate">
              {goal.monthlyTargetMinor
                ? `₹${Math.round(toMajorUnits(goal.monthlyTargetMinor)).toLocaleString('en-IN')}/mo target`
                : 'Auto-sweep on 1st'}
            </span>
          </div>
        </div>
      </div>

      <div className="calm-vault-card-footer">
        {!isCompleted ? (
          <div className="calm-vault-actions-bar">
            <button
              type="button"
              className="calm-boost-vault-btn"
              onClick={() => onMicroDeposit(goal.id, 500, goal.name)}
            >
              <span>+₹500</span>
              <span className="material-symbols-outlined text-[14px]">north_east</span>
            </button>
            <button
              type="button"
              className="calm-boost-vault-btn"
              onClick={() => onMicroDeposit(goal.id, 1000, goal.name)}
            >
              <span>+₹1,000</span>
              <span className="material-symbols-outlined text-[14px]">north_east</span>
            </button>
            <button
              type="button"
              className="calm-custom-deposit-btn"
              onClick={() => onCustomDeposit(goal.id, goal.name)}
            >
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              <span>Deposit</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="calm-claim-liquid-btn"
            onClick={() => onEditGoal(goal.id)}
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Milestone Achieved (Manage Goal)</span>
          </button>
        )}
      </div>
    </div>
  );
};
