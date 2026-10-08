import React from 'react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';

export interface DailyMonthlyUsageCardProps {
  dailyAllowedMinor: number;
  spentTodayMinor: number;
  totalMonthlyUsageMinor: number;
  totalMonthlyBudgetMinor: number;
  availableMoneyMinor?: number;
  monthlyIncomeMinor?: number;
  onHelpClick?: () => void;
}

export const DailyMonthlyUsageCard: React.FC<DailyMonthlyUsageCardProps> = ({
  dailyAllowedMinor,
  spentTodayMinor,
  totalMonthlyUsageMinor,
  totalMonthlyBudgetMinor,
  availableMoneyMinor,
  monthlyIncomeMinor,
  onHelpClick,
}) => {
  const dailyRemainingMinor = Math.max(0, dailyAllowedMinor - spentTodayMinor);
  const isDailyExceeded = spentTodayMinor > dailyAllowedMinor && dailyAllowedMinor > 0;
  
  const dailyProgressPercent = dailyAllowedMinor > 0
    ? Math.min(100, Math.round((dailyRemainingMinor / dailyAllowedMinor) * 100))
    : 100;

  // Circumference for r=82 is 2 * PI * 82 ≈ 515.22
  const circumference = 515.22;
  const strokeDashoffset = circumference - (circumference * dailyProgressPercent) / 100;
  const monthlyCushionMinor = Math.max(0, totalMonthlyBudgetMinor - totalMonthlyUsageMinor);

  return (
    <section className="calm-usage-card" aria-label="Daily and Monthly Usage Summary">
      <div className="calm-usage-card__glow-bg" />
      
      <div className="calm-usage-card__center-content">
        {/* Circular Progress Gauge */}
        <div className="calm-gauge-container">
          <svg className="calm-gauge-svg" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="emeraldGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <circle
              className="calm-gauge-track"
              cx="100"
              cy="100"
              r="82"
              fill="transparent"
              strokeWidth="12"
            />
            <circle
              className="calm-gauge-fill"
              cx="100"
              cy="100"
              r="82"
              fill="transparent"
              stroke={isDailyExceeded ? '#EF4444' : 'url(#emeraldGaugeGrad)'}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          <div className="calm-gauge-inner">
            <span className="calm-gauge-label">Safe to Spend</span>
            <span className="calm-gauge-amount">
              {formatCurrency(toMajorUnits(dailyRemainingMinor))}
            </span>
            <span className="calm-gauge-cap">
              of {formatCurrency(toMajorUnits(dailyAllowedMinor))} cap
            </span>
          </div>
        </div>

        {/* Pacing Badge */}
        <div className="calm-pacing-badge">
          <span className="calm-pacing-dot" />
          <span>
            {isDailyExceeded
              ? `Limit Exceeded • ${formatCurrency(toMajorUnits(spentTodayMinor))} spent`
              : `Pacing Optimal • ${formatCurrency(toMajorUnits(spentTodayMinor))} spent today`}
          </span>
        </div>

        {/* Monthly Cashflow Indicator (When Income is Recorded) */}
        {monthlyIncomeMinor !== undefined && monthlyIncomeMinor > 0 && (
          <div className="calm-monthly-cashflow-pill">
            <div className="calm-cashflow-pill-tag calm-cashflow-pill-tag--income">
              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              <span>Inflow: +{formatCurrency(toMajorUnits(monthlyIncomeMinor))}</span>
            </div>
            <div className="calm-cashflow-pill-tag calm-cashflow-pill-tag--expense">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              <span>Spent: -{formatCurrency(toMajorUnits(totalMonthlyUsageMinor))}</span>
            </div>
          </div>
        )}

        {/* Sub Metrics: Available Money & Cushion & Streak */}
        <div className={`calm-sub-metrics-grid ${availableMoneyMinor !== undefined ? 'calm-sub-metrics-grid--tri' : ''}`}>
          {availableMoneyMinor !== undefined && (
            <div className="calm-sub-metric-col left">
              <span className="calm-sub-metric-label">Available Money</span>
              <strong className="calm-sub-metric-val emerald">
                {formatCurrency(toMajorUnits(availableMoneyMinor))}
              </strong>
            </div>
          )}
          <div className="calm-sub-metric-col center">
            <span className="calm-sub-metric-label">Monthly Cushion</span>
            <strong className="calm-sub-metric-val">
              {formatCurrency(toMajorUnits(monthlyCushionMinor))}
            </strong>
          </div>
          <div className="calm-sub-metric-col right">
            <span className="calm-sub-metric-label">Calm Streak</span>
            <strong className="calm-sub-metric-val emerald flex items-center gap-1">
              14 Days <span className="streak-fire">🔥</span>
            </strong>
          </div>
        </div>

        {/* Adjust Cap Button */}
        {onHelpClick && (
          <button
            type="button"
            className="calm-adjust-cap-btn"
            onClick={onHelpClick}
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Adjust Daily Budget Cap</span>
          </button>
        )}
      </div>
    </section>
  );
};
