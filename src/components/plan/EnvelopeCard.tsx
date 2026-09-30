import React from 'react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { CategoryBudgetProgress } from '../../types/budget';
import type { Category } from '../../types/transaction';

interface EnvelopeCardProps {
  progress: CategoryBudgetProgress;
  category?: Category;
  onEdit: () => void;
}

export const EnvelopeCard: React.FC<EnvelopeCardProps> = ({
  progress,
  category,
  onEdit,
}) => {
  const spentMajor = toMajorUnits(progress.actualAmountMinor);
  const plannedMajor = toMajorUnits(progress.plannedAmountMinor);
  const remainingMajor = Math.max(0, plannedMajor - spentMajor);
  const isWant = progress.priority === 'want';
  const spentPercent = plannedMajor > 0
    ? Math.min(100, Math.round((spentMajor / plannedMajor) * 100))
    : spentMajor > 0 ? 100 : 0;

  const isNearLimit = spentPercent >= 85;
  const isSettled = spentPercent >= 100;

  return (
    <div
      className="calm-envelope-card"
      onClick={onEdit}
      style={{ cursor: 'pointer' }}
      title="Tap to adjust envelope budget"
    >
      <div className="calm-envelope-card__top">
        <div className="calm-envelope-card__left">
          <div
            className="calm-envelope-card__icon"
            style={{ color: category?.color || 'var(--color-primary)' }}
          >
            <CategoryIcon iconName={category?.icon || 'shopping-cart'} size={20} />
          </div>
          <div className="calm-envelope-card__info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="calm-envelope-card__name">{progress.categoryName}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: isWant ? 'var(--color-surface-container-high)' : 'var(--color-primary-light)',
                  color: isWant ? 'var(--color-text-secondary)' : 'var(--color-primary)',
                }}
              >
                {isWant ? 'Want' : 'Need'}
              </span>
            </div>
            <span className="calm-envelope-card__sub">
              {plannedMajor > 0
                ? `${formatCurrency(spentMajor)} spent of ${formatCurrency(plannedMajor)}`
                : `${formatCurrency(spentMajor)} spent (No budget assigned)`}
            </span>
          </div>
        </div>
        <div className="calm-envelope-card__right">
          <span className="calm-envelope-card__remaining">
            {plannedMajor > 0 ? formatCurrency(remainingMajor) : formatCurrency(spentMajor)}
          </span>
          <span className="calm-envelope-card__left-label">
            {plannedMajor > 0 ? 'left' : 'spent'}
          </span>
        </div>
      </div>

      <div className="calm-envelope-track">
        <div
          className={`calm-envelope-bar ${isNearLimit ? 'calm-envelope-bar--caution' : ''}`}
          style={{ width: `${spentPercent}%` }}
        ></div>
      </div>

      <div className="calm-envelope-card__footer">
        <div
          className={`calm-envelope-badge ${
            isSettled
              ? 'calm-envelope-badge--settled'
              : isNearLimit
              ? 'calm-envelope-badge--caution'
              : 'calm-envelope-badge--safe'
          }`}
        >
          <span className="material-symbols-outlined">
            {isSettled ? 'check_circle' : isNearLimit ? 'pace' : 'verified'}
          </span>
          <span>
            {isSettled
              ? 'Budget exhausted'
              : isNearLimit
              ? 'Near limit — pace spending'
              : 'On track'}
          </span>
        </div>
        <span className="calm-envelope-card__percent">{spentPercent}%</span>
      </div>
    </div>
  );
};
