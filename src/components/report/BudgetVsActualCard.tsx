import React from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { CategoryIcon } from '../ui/CategoryIcon';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { BudgetVsActualCategoryItem } from '../../types/report';
import './BudgetVsActualCard.css';

export interface BudgetVsActualCardProps {
  hasBudget: boolean;
  budgetUtilization: number | null;
  totalPlannedExpensesMinor: number;
  totalActualExpensesMinor: number;
  items: BudgetVsActualCategoryItem[];
}

export const BudgetVsActualCard: React.FC<BudgetVsActualCardProps> = ({
  hasBudget,
  budgetUtilization,
  totalPlannedExpensesMinor,
  totalActualExpensesMinor,
  items,
}) => {
  if (!hasBudget) {
    return (
      <Card variant="default" padding="lg" radius="lg" className="budget-vs-actual-card">
        <div className="card-header-with-badge">
          <div className="card-title-group">
            <span className="card-subtitle">Planning Variance</span>
            <h3 className="card-title">Budget vs. Actual</h3>
          </div>
          <Badge variant="neutral" size="sm">No Plan for Period</Badge>
        </div>

        <div className="no-budget-empty-state">
          <HelpCircle size={32} className="no-budget-icon" />
          <p className="no-budget-title">Budget comparison unavailable</p>
          <p className="no-budget-desc">
            No monthly budget envelopes were configured for this period. Actual expense tracking remains fully accurate.
          </p>
          <Link to="/plan" className="create-plan-link">
            Create a Monthly Plan <ArrowRight size={14} />
          </Link>
        </div>
      </Card>
    );
  }

  const utilizationText =
    budgetUtilization !== null ? `${budgetUtilization.toFixed(1)}%` : 'N/A';
  const isOverallOverspent = budgetUtilization !== null && budgetUtilization > 100;

  return (
    <Card variant="default" padding="lg" radius="lg" className="budget-vs-actual-card">
      <div className="card-header-with-badge">
        <div className="card-title-group">
          <span className="card-subtitle">Envelope Review</span>
          <h3 className="card-title">Budget vs. Actual</h3>
        </div>
        {budgetUtilization !== null && (
          <Badge
            variant={isOverallOverspent ? 'warning' : 'success'}
            size="md"
          >
            {utilizationText} Utilization
          </Badge>
        )}
      </div>

      {/* Overall Progress Banner */}
      <div className="overall-budget-banner">
        <div className="banner-stats-row">
          <div>
            <span className="banner-stat-label">Total Spent</span>
            <span className="banner-stat-val">
              {formatCurrency(toMajorUnits(totalActualExpensesMinor))}
            </span>
          </div>
          <div className="text-right">
            <span className="banner-stat-label">Total Budget</span>
            <span className="banner-stat-val">
              {formatCurrency(toMajorUnits(totalPlannedExpensesMinor))}
            </span>
          </div>
        </div>
        <ProgressBar
          value={budgetUtilization !== null ? budgetUtilization : 0}
          color={isOverallOverspent ? 'danger' : 'primary'}
          size="md"
        />
      </div>

      {/* Category Envelopes List */}
      <div className="bva-category-list">
        {items.map((item) => {
          const isOver = item.status === 'overspent';
          const isUnbudgeted = item.status === 'unbudgeted';
          const isUnder = item.status === 'under_budget';

          return (
            <div key={item.categoryId} className="bva-category-row">
              <div className="bva-cat-header">
                <div className="bva-cat-name-group">
                  <CategoryIcon
                    iconName={item.categoryIcon}
                    size={18}
                  />
                  <span className="bva-cat-name">{item.categoryName}</span>
                </div>

                <div className="bva-status-badge-group">
                  {isOver && (
                    <span className="bva-badge badge-over">
                      Overspent by {formatCurrency(toMajorUnits(Math.abs(item.varianceMinor)))}
                    </span>
                  )}
                  {isUnder && (
                    <span className="bva-badge badge-under">
                      {formatCurrency(toMajorUnits(item.varianceMinor))} left
                    </span>
                  )}
                  {isUnbudgeted && (
                    <span className="bva-badge badge-unbudgeted">Unbudgeted</span>
                  )}
                  {item.status === 'on_track' && item.plannedAmountMinor > 0 && (
                    <span className="bva-badge badge-ontrack">On Track</span>
                  )}
                </div>
              </div>

              <div className="bva-cat-numbers">
                <span>
                  Actual: <strong>{formatCurrency(toMajorUnits(item.actualAmountMinor))}</strong>
                </span>
                <span>
                  Budget: {formatCurrency(toMajorUnits(item.plannedAmountMinor))}
                </span>
              </div>

              {item.plannedAmountMinor > 0 && (
                <div className="bva-cat-progress">
                  <ProgressBar
                    value={item.utilizationPercentage || 0}
                    color={isOver ? 'danger' : 'primary'}
                    size="sm"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
