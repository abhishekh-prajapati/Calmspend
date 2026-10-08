import React from 'react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { CategoryBudgetProgress } from '../../types/budget';
import type { Category } from '../../types/transaction';

export interface NeedItemChecklistRowProps {
  progress: CategoryBudgetProgress;
  category?: Category;
  isCompleted: boolean;
  onOpenPayModal: (progress: CategoryBudgetProgress) => void;
  onToggleCheck: (categoryId: string) => void;
}

export const NeedItemChecklistRow: React.FC<NeedItemChecklistRowProps> = ({
  progress,
  category,
  isCompleted,
  onOpenPayModal,
  onToggleCheck,
}) => {
  const spentMajor = toMajorUnits(progress.actualAmountMinor);
  const plannedMajor = toMajorUnits(progress.plannedAmountMinor);
  const remainingMajor = Math.max(0, plannedMajor - spentMajor);
  const progressPercent = plannedMajor > 0 ? Math.min(100, Math.round((spentMajor / plannedMajor) * 100)) : 0;
  const categoryName = progress.categoryName || category?.name || 'Essential Need';
  const iconName = category?.icon || 'home';

  return (
    <div className={`calm-need-item-card ${isCompleted ? 'calm-need-item-card--completed' : ''}`}>
      <div className="calm-need-card-main">
        {/* Left Category Icon & Toggle */}
        <button
          type="button"
          className={`calm-need-icon-badge ${isCompleted ? 'checked' : ''}`}
          onClick={() => onToggleCheck(progress.categoryId)}
          aria-label={`Mark ${categoryName} as ${isCompleted ? 'unpaid' : 'paid'}`}
          title={isCompleted ? 'Mark as pending' : 'Mark as cleared'}
        >
          <span className="material-symbols-outlined calm-need-icon">
            {isCompleted ? 'check_circle' : iconName}
          </span>
        </button>

        {/* Center Details */}
        <div className="calm-need-details">
          <div className="calm-need-title-row">
            <h3 className="calm-need-name">{categoryName}</h3>
            <span className="calm-need-target">₹{plannedMajor.toLocaleString('en-IN')}</span>
          </div>

          <div className="calm-need-metrics-row">
            <span className="calm-need-spent-label">
              {isCompleted ? (
                <span className="calm-need-cleared-tag">
                  <span className="material-symbols-outlined text-[13px]">task_alt</span> Fully Paid
                </span>
              ) : (
                `₹${spentMajor.toLocaleString('en-IN')} paid • ₹${remainingMajor.toLocaleString('en-IN')} left`
              )}
            </span>
            <span className="calm-need-percent-label">{isCompleted ? '100%' : `${progressPercent}%`}</span>
          </div>

          {/* Progress Indicator */}
          <div className="calm-need-progress-track">
            <div
              className={`calm-need-progress-fill ${isCompleted ? 'completed' : ''}`}
              style={{ width: `${isCompleted ? 100 : progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right Action Button */}
        <div className="calm-need-action-slot">
          {isCompleted ? (
            <div className="calm-need-cleared-badge" title="Cleared for this month">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Paid</span>
            </div>
          ) : (
            <button
              type="button"
              className="calm-need-pay-action-btn"
              onClick={() => onOpenPayModal(progress)}
              aria-label={`Record payment for ${categoryName}`}
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Pay {remainingMajor > 0 ? formatCurrency(remainingMajor) : ''}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
