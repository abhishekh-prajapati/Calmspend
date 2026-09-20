import React from 'react';
import { ShieldCheck, CalendarClock, Clock, Sliders } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import './AvailableToSpendCard.css';

export interface AvailableToSpendCardProps {
  availableAmountMinor: number | null;
  dailyAllowanceMinor: number | null;
  autoDailyAllowanceMinor?: number | null;
  customDailyAllowanceMinor?: number | null;
  isSystemEmpty: boolean;
  onOpenAllowanceModal?: () => void;
  className?: string;
}

export const AvailableToSpendCard: React.FC<AvailableToSpendCardProps> = ({
  availableAmountMinor,
  dailyAllowanceMinor,
  autoDailyAllowanceMinor: _autoDailyAllowanceMinor,
  customDailyAllowanceMinor,
  isSystemEmpty,
  onOpenAllowanceModal,
  className = '',
}) => {
  const isBudgetUnset = availableAmountMinor === null;
  const isCustomActive =
    customDailyAllowanceMinor !== null &&
    customDailyAllowanceMinor !== undefined &&
    customDailyAllowanceMinor > 0;

  return (
    <Card variant="default" padding="md" radius="xl" className={`available-to-spend-card ${className}`}>
      <div className="available-to-spend-card__main">
        <div className="available-to-spend-card__header">
          <div className="available-to-spend-card__icon-badge">
            <ShieldCheck size={18} />
          </div>
          <div className="available-to-spend-card__titles">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="available-to-spend-card__title body-medium">Remaining Expense Budget</span>
              {isBudgetUnset && <Badge variant="neutral" size="sm">Budget Not Set</Badge>}
            </div>
            <span className="available-to-spend-card__subtitle caption">
              Remaining planned budget for this month
            </span>
          </div>
        </div>

        <div className="available-to-spend-card__amount-row">
          {isBudgetUnset ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
              <Clock size={18} style={{ color: 'var(--color-primary)' }} />
              <span className="body-medium">Requires monthly budget plan</span>
            </div>
          ) : (
            <span className="available-to-spend-card__amount heading-1">
              {formatCurrency(toMajorUnits(availableAmountMinor))}
            </span>
          )}
        </div>
      </div>

      <div className="available-to-spend-card__daily-divider" />

      <div className="available-to-spend-card__daily-section">
        <div className="available-to-spend-card__daily-label-group">
          <CalendarClock size={16} className="available-to-spend-card__daily-icon" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="body-sm" style={{ fontWeight: 500 }}>Daily Spending Allowance</span>
            {isCustomActive && (
              <Badge variant="primary" size="sm">Custom Limit</Badge>
            )}
          </div>
        </div>
        {dailyAllowanceMinor === null ? (
          <span className="caption" style={{ color: 'var(--color-text-muted)' }}>
            Available in Budget Plan
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="available-to-spend-card__daily-amount body-medium">
              {formatCurrency(toMajorUnits(dailyAllowanceMinor))}
              <span className="caption" style={{ color: 'var(--color-text-muted)', marginLeft: '4px' }}>/ day</span>
            </span>
            {onOpenAllowanceModal && (
              <button
                type="button"
                className="available-to-spend-card__adjust-btn"
                onClick={onOpenAllowanceModal}
                title="Adjust Daily Spending Limit"
              >
                <Sliders size={13} />
                <span>Adjust</span>
              </button>
            )}
          </div>
        )}
      </div>

      {isSystemEmpty && (
        <div className="available-to-spend-card__empty-hint caption">
          Calculated automatically once income and budgets are configured
        </div>
      )}
    </Card>
  );
};
