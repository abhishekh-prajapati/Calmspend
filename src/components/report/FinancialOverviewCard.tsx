import React from 'react';
import { TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { MonthlyReportSummary } from '../../types/report';
import './FinancialOverviewCard.css';

export interface FinancialOverviewCardProps {
  summary: MonthlyReportSummary;
}

export const FinancialOverviewCard: React.FC<FinancialOverviewCardProps> = ({ summary }) => {
  const isPositiveSavings = summary.netSavingsMinor >= 0;
  const savingsRateText =
    summary.savingsRate !== null ? `${summary.savingsRate.toFixed(1)}%` : 'N/A';

  return (
    <Card variant="subtle" padding="lg" radius="lg" className="financial-overview-card">
      <div className="overview-header">
        <div className="overview-title-group">
          <span className="overview-subtitle">Monthly Summary</span>
          <h2 className="overview-title">Financial Overview</h2>
        </div>
        {summary.savingsRate !== null && (
          <Badge
            variant={summary.savingsRate >= 20 ? 'success' : summary.savingsRate > 0 ? 'info' : 'warning'}
            size="md"
          >
            {summary.savingsRate >= 0 ? '+' : ''}{savingsRateText} Savings Rate
          </Badge>
        )}
      </div>

      <div className="overview-stats-grid">
        {/* Actual Income */}
        <div className="stat-box income-box">
          <div className="stat-icon-wrapper income-icon">
            <ArrowUpRight size={18} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Actual Income</span>
            <span className="stat-value income-val">
              {formatCurrency(toMajorUnits(summary.actualIncomeMinor))}
            </span>
            {summary.hasBudget && summary.plannedIncomeMinor > 0 && (
              <span className="stat-subtext">
                Planned: {formatCurrency(toMajorUnits(summary.plannedIncomeMinor))}
              </span>
            )}
          </div>
        </div>

        {/* Actual Expenses */}
        <div className="stat-box expense-box">
          <div className="stat-icon-wrapper expense-icon">
            <ArrowDownRight size={18} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Actual Expenses</span>
            <span className="stat-value expense-val">
              {formatCurrency(toMajorUnits(summary.actualExpensesMinor))}
            </span>
            {summary.hasBudget && summary.plannedExpensesMinor > 0 && (
              <span className="stat-subtext">
                Budget: {formatCurrency(toMajorUnits(summary.plannedExpensesMinor))}
              </span>
            )}
          </div>
        </div>

        {/* Net Savings */}
        <div className={`stat-box net-savings-box ${isPositiveSavings ? 'positive' : 'negative'}`}>
          <div className={`stat-icon-wrapper ${isPositiveSavings ? 'savings-icon-pos' : 'savings-icon-neg'}`}>
            {isPositiveSavings ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
          <div className="stat-details">
            <span className="stat-label">Net Savings</span>
            <span className={`stat-value ${isPositiveSavings ? 'savings-val-pos' : 'savings-val-neg'}`}>
              {formatCurrency(toMajorUnits(summary.netSavingsMinor))}
            </span>
            <span className="stat-subtext">
              {isPositiveSavings ? 'Surplus this month' : 'Deficit this month'}
            </span>
          </div>
        </div>

        {/* Savings Rate / Rate Indicator */}
        <div className="stat-box rate-box">
          <div className="stat-icon-wrapper rate-icon-wrapper">
            <PiggyBank size={18} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Savings Rate</span>
            <span className="stat-value rate-val">
              {savingsRateText}
            </span>
            <span className="stat-subtext">
              {summary.actualIncomeMinor > 0 ? 'of total income' : 'No income recorded'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
