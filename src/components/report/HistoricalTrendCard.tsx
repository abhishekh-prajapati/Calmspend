import React from 'react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { MonthlyTrendItem } from '../../types/report';
import './HistoricalTrendCard.css';

export interface HistoricalTrendCardProps {
  trendData: MonthlyTrendItem[];
  selectedMonthCount: number;
  onSelectMonthCount: (count: number) => void;
}

export const HistoricalTrendCard: React.FC<HistoricalTrendCardProps> = ({
  trendData,
  selectedMonthCount,
  onSelectMonthCount,
}) => {
  // Find highest single metric amount for scaling chart
  let maxAmountMinor = 0;

  for (const item of trendData) {
    if (item.incomeMinor > maxAmountMinor) maxAmountMinor = item.incomeMinor;
    if (item.expensesMinor > maxAmountMinor) maxAmountMinor = item.expensesMinor;
  }

  // Baseline minimum height so chart renders nicely
  if (maxAmountMinor === 0) maxAmountMinor = 100000;

  return (
    <Card variant="default" padding="lg" radius="lg" className="historical-trend-card">
      <div className="trend-header-row">
        <div className="trend-title-group">
          <span className="card-subtitle">Multi-Month Review</span>
          <h3 className="card-title">Cash Flow Trends</h3>
        </div>

        {/* Range Buttons */}
        <div className="trend-range-selector">
          {[3, 6, 12].map((count) => (
            <button
              key={count}
              type="button"
              className={`range-btn ${selectedMonthCount === count ? 'active' : ''}`}
              onClick={() => onSelectMonthCount(count)}
            >
              {count}M
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="trend-legend-row">
        <div className="legend-item">
          <span className="legend-dot dot-income" />
          <span>Income</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-expense" />
          <span>Expenses</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-savings" />
          <span>Net Savings</span>
        </div>
      </div>

      {/* Responsive SVG / Column Chart */}
      <div className="trend-chart-container">
        <div className="trend-columns-track">
          {trendData.map((item) => {
            const incomeHeight = Math.min(100, Math.max(4, (item.incomeMinor / maxAmountMinor) * 100));
            const expenseHeight = Math.min(100, Math.max(4, (item.expensesMinor / maxAmountMinor) * 100));
            const isPositiveNet = item.netSavingsMinor >= 0;

            return (
              <div key={item.period.periodKey} className="trend-column-group">
                <div className="bars-pair">
                  <div
                    className="trend-bar bar-income"
                    style={{ height: `${incomeHeight}%` }}
                    title={`Income: ${formatCurrency(toMajorUnits(item.incomeMinor))}`}
                  />
                  <div
                    className="trend-bar bar-expense"
                    style={{ height: `${expenseHeight}%` }}
                    title={`Expenses: ${formatCurrency(toMajorUnits(item.expensesMinor))}`}
                  />
                </div>

                <div className="col-period-label">
                  <span className="period-month">{item.period.monthName.slice(0, 3)}</span>
                  <span className={`period-net ${isPositiveNet ? 'net-pos' : 'net-neg'}`}>
                    {isPositiveNet ? '+' : ''}{formatCurrency(toMajorUnits(item.netSavingsMinor))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accessible Text Table Fallback */}
      <div className="trend-data-table">
        <div className="trend-table-head">
          <span>Month</span>
          <span className="text-right">Income</span>
          <span className="text-right">Expenses</span>
          <span className="text-right">Savings Rate</span>
        </div>
        {trendData.map((item) => (
          <div key={item.period.periodKey} className="trend-table-row">
            <span className="trend-td-period">{item.period.formattedPeriod}</span>
            <span className="trend-td-income text-right">{formatCurrency(toMajorUnits(item.incomeMinor))}</span>
            <span className="trend-td-expense text-right">{formatCurrency(toMajorUnits(item.expensesMinor))}</span>
            <span className="trend-td-rate text-right">
              {item.savingsRate !== null ? `${item.savingsRate.toFixed(1)}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
