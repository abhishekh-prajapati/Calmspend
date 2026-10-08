import React from 'react';

export interface FinalizedBudgetPaceAndLockProps {
  totalIncomeMajor: number;
  totalAllocatedMajor?: number;
  unassignedSurplusMajor?: number;
  isLocked: boolean;
  onToggleLock: () => void;
  onEditPlan: () => void;
}

export const FinalizedBudgetPaceAndLock: React.FC<FinalizedBudgetPaceAndLockProps> = ({
  totalIncomeMajor,
  totalAllocatedMajor = totalIncomeMajor,
  unassignedSurplusMajor = 0,
  isLocked,
  onToggleLock,
  onEditPlan,
}) => {
  return (
    <>
      {/* Budget Balance Status Banner */}
      <div className="calm-zero-based-banner">
        <div className="calm-banner-header">
          <div className="calm-zero-title-wrap">
            <div className="calm-zero-icon">
              <span className="material-symbols-outlined calm-icon-sm">verified</span>
            </div>
            <span className="calm-zero-title">Budget Balance Status</span>
          </div>
          <span className="calm-zero-balanced-badge">Balanced 🎉</span>
        </div>

        <div className="calm-zero-math-box">
          <div className="calm-zero-math-row">
            <span>Inflow Total</span>
            <span className="calm-zero-math-val">₹{totalIncomeMajor.toLocaleString()}</span>
          </div>
          <div className="calm-zero-math-row">
            <span>Needs + Wants + Goals</span>
            <span className="calm-zero-math-val">- ₹{totalAllocatedMajor.toLocaleString()}</span>
          </div>
          <div className="calm-zero-math-row calm-zero-math-row--remaining">
            <span>Remaining Safe Buffer</span>
            <span className="calm-text-emerald calm-font-bold">
              ₹{unassignedSurplusMajor.toLocaleString()} Left
            </span>
          </div>
        </div>
        <p className="calm-zero-footer-text">
          {unassignedSurplusMajor > 0
            ? `₹${unassignedSurplusMajor.toLocaleString()} is kept safely unassigned as your flexible buffer.`
            : 'Every rupee assigned a purposeful job. Mindful spending locked.'}
        </p>
      </div>

      {/* Lock Status & Action Buttons */}
      <div className="calm-lock-actions-section">
        <div className="calm-lock-status-bar">
          <div className="calm-lock-time-info">
            <span className="material-symbols-outlined calm-icon-xs">lock_clock</span>
            <span>Finalized for Active Period</span>
          </div>
          <button
            type="button"
            className={`calm-lock-btn ${isLocked ? 'locked' : 'unlocked'}`}
            onClick={onToggleLock}
          >
            <span className="material-symbols-outlined calm-icon-sm">
              {isLocked ? 'lock' : 'lock_open'}
            </span>
            <span>{isLocked ? 'Budget Locked' : 'Unlocked (Editing)'}</span>
          </button>
        </div>

        <div className="calm-action-btn-row">
          <button
            type="button"
            className="calm-edit-envelopes-btn"
            onClick={onEditPlan}
          >
            <span className="material-symbols-outlined calm-icon-sm">tune</span>
            <span>Edit Envelopes</span>
          </button>
          <button
            type="button"
            className="calm-recalc-ai-btn"
            onClick={onEditPlan}
          >
            <span className="material-symbols-outlined calm-icon-sm">smart_toy</span>
            <span>Recalculate AI</span>
          </button>
        </div>
      </div>
    </>
  );
};
