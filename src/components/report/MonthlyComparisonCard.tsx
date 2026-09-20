import React from 'react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { MonthlyComparisonReport } from '../../types/report';
import './MonthlyComparisonCard.css';

export interface MonthlyComparisonCardProps {
  comparison: MonthlyComparisonReport;
}

export const MonthlyComparisonCard: React.FC<MonthlyComparisonCardProps> = ({ comparison }) => {
  const isIncomeUp = comparison.incomeDifferenceMinor > 0;
  const isIncomeDown = comparison.incomeDifferenceMinor < 0;

  const isExpenseUp = comparison.expensesDifferenceMinor > 0;
  const isExpenseDown = comparison.expensesDifferenceMinor < 0;

  const isSavingsUp = comparison.netSavingsDifferenceMinor > 0;
  const isSavingsDown = comparison.netSavingsDifferenceMinor < 0;

  const comparisonItems = [
    {
      id: 'income',
      name: 'Income',
      prevVal: formatCurrency(toMajorUnits(comparison.comparisonIncomeMinor)),
      currVal: formatCurrency(toMajorUnits(comparison.currentIncomeMinor)),
      diffStr: `${comparison.incomeDifferenceMinor >= 0 ? '+' : ''}${formatCurrency(toMajorUnits(comparison.incomeDifferenceMinor))}`,
      deltaClass: isIncomeUp ? 'delta-pos' : isIncomeDown ? 'delta-neg' : 'delta-neu',
      isHighlight: false,
    },
    {
      id: 'expenses',
      name: 'Expenses',
      prevVal: formatCurrency(toMajorUnits(comparison.comparisonExpensesMinor)),
      currVal: formatCurrency(toMajorUnits(comparison.currentExpensesMinor)),
      diffStr: `${comparison.expensesDifferenceMinor >= 0 ? '+' : ''}${formatCurrency(toMajorUnits(comparison.expensesDifferenceMinor))}`,
      deltaClass: isExpenseDown ? 'delta-pos' : isExpenseUp ? 'delta-neg' : 'delta-neu',
      isHighlight: false,
    },
    {
      id: 'net-savings',
      name: 'Net Savings',
      prevVal: formatCurrency(toMajorUnits(comparison.comparisonNetSavingsMinor)),
      currVal: formatCurrency(toMajorUnits(comparison.currentNetSavingsMinor)),
      diffStr: `${comparison.netSavingsDifferenceMinor >= 0 ? '+' : ''}${formatCurrency(toMajorUnits(comparison.netSavingsDifferenceMinor))}`,
      deltaClass: isSavingsUp ? 'delta-pos' : isSavingsDown ? 'delta-neg' : 'delta-neu',
      isHighlight: true,
    },
    {
      id: 'savings-rate',
      name: 'Savings Rate',
      prevVal: comparison.comparisonSavingsRate !== null ? `${comparison.comparisonSavingsRate.toFixed(1)}%` : 'N/A',
      currVal: comparison.currentSavingsRate !== null ? `${comparison.currentSavingsRate.toFixed(1)}%` : 'N/A',
      diffStr:
        comparison.savingsRateDifference !== null
          ? `${comparison.savingsRateDifference >= 0 ? '+' : ''}${comparison.savingsRateDifference.toFixed(1)}%`
          : '—',
      deltaClass:
        comparison.savingsRateDifference !== null
          ? comparison.savingsRateDifference >= 0
            ? 'delta-pos'
            : 'delta-neg'
          : 'delta-neu',
      isHighlight: false,
    },
    {
      id: 'goal-contributions',
      name: 'Goal Contributions',
      prevVal: formatCurrency(toMajorUnits(comparison.comparisonGoalContributionsMinor)),
      currVal: formatCurrency(toMajorUnits(comparison.currentGoalContributionsMinor)),
      diffStr:
        comparison.goalContributionsDifferenceMinor !== 0
          ? `${comparison.goalContributionsDifferenceMinor > 0 ? '+' : ''}${formatCurrency(toMajorUnits(comparison.goalContributionsDifferenceMinor))}`
          : '—',
      deltaClass: comparison.goalContributionsDifferenceMinor > 0 ? 'delta-pos' : 'delta-neu',
      isHighlight: false,
    },
  ];

  return (
    <Card variant="default" padding="lg" radius="lg" className="monthly-comparison-card">
      <div className="card-header-simple">
        <span className="card-subtitle">Period Over Period</span>
        <h3 className="card-title">
          {comparison.currentPeriod.formattedPeriod} vs. {comparison.comparisonPeriod.formattedPeriod}
        </h3>
      </div>

      {/* Desktop Table View (visible on screens >= 600px) */}
      <div className="comparison-table comp-desktop-only">
        {/* Header */}
        <div className="comp-head-row">
          <span>Metric</span>
          <span className="text-right">{comparison.comparisonPeriod.monthName.slice(0, 3)}</span>
          <span className="text-right">{comparison.currentPeriod.monthName.slice(0, 3)}</span>
          <span className="text-right">Change</span>
        </div>

        {comparisonItems.map((item) => (
          <div
            key={item.id}
            className={`comp-data-row ${item.isHighlight ? 'comp-data-row-highlight' : ''}`}
          >
            <span className="comp-metric-name">{item.name}</span>
            <span className="comp-val-prev text-right">{item.prevVal}</span>
            <span className="comp-val-curr text-right">{item.currVal}</span>
            <span className={`comp-delta text-right ${item.deltaClass}`}>
              {item.diffStr}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile Card-Based List View (visible on screens < 600px) */}
      <div className="comp-mobile-list">
        {comparisonItems.map((item) => (
          <div
            key={item.id}
            className={`comp-mobile-card ${item.isHighlight ? 'comp-mobile-card--highlight' : ''}`}
          >
            <div className="comp-mobile-header">
              <span className="comp-mobile-metric">{item.name}</span>
              <span className={`comp-mobile-delta ${item.deltaClass}`}>
                {item.diffStr}
              </span>
            </div>

            <div className="comp-mobile-values">
              <div className="comp-mobile-val-box">
                <span className="comp-mobile-label">{comparison.comparisonPeriod.monthName.slice(0, 3)}</span>
                <span className="comp-mobile-amount comp-val-prev">{item.prevVal}</span>
              </div>

              <div className="comp-mobile-arrow">→</div>

              <div className="comp-mobile-val-box comp-mobile-val-box--curr">
                <span className="comp-mobile-label">{comparison.currentPeriod.monthName.slice(0, 3)}</span>
                <span className="comp-mobile-amount comp-val-curr">{item.currVal}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
