import React, { useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Card } from '../ui/Card';
import { CategoryIcon } from '../ui/CategoryIcon';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { CategoryBreakdownItem } from '../../types/report';
import './ExpenseCompositionCard.css';

export interface ExpenseCompositionCardProps {
  totalActualExpensesMinor: number;
  items: CategoryBreakdownItem[];
  topSpendingCategories: CategoryBreakdownItem[];
}

export const ExpenseCompositionCard: React.FC<ExpenseCompositionCardProps> = ({
  totalActualExpensesMinor,
  items,
  topSpendingCategories,
}) => {
  // Calculate SVG Donut Segments with useMemo
  const donutSegments = useMemo(() => {
    const segments = [];
    let cumulative = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const percent = item.sharePercentage || 0;
      const startAngle = (cumulative / 100) * 360;
      const nextCumulative = cumulative + percent;
      const endAngle = (nextCumulative / 100) * 360;
      cumulative = nextCumulative;

      // Convert polar coordinates to Cartesian
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = 100 + 70 * Math.cos(startRad);
      const y1 = 100 + 70 * Math.sin(startRad);
      const x2 = 100 + 70 * Math.cos(endRad);
      const y2 = 100 + 70 * Math.sin(endRad);

      const largeArc = percent > 50 ? 1 : 0;
      const pathData =
        percent >= 99.9
          ? 'M 100 30 A 70 70 0 1 1 99.9 30'
          : `M ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2}`;

      segments.push({
        categoryId: item.categoryId,
        pathData,
        color: item.categoryColor,
        percent,
      });
    }
    return segments;
  }, [items]);

  if (items.length === 0 || totalActualExpensesMinor === 0) {
    return (
      <Card variant="default" padding="lg" radius="lg" className="expense-composition-card">
        <div className="card-header-simple">
          <span className="card-subtitle">Spending Breakdown</span>
          <h3 className="card-title">Expense Composition</h3>
        </div>
        <div className="empty-breakdown-state">
          <ShoppingBag size={28} className="empty-breakdown-icon" />
          <p className="empty-breakdown-text">No expense transactions recorded for this period</p>
        </div>
      </Card>
    );
  }


  return (
    <Card variant="default" padding="lg" radius="lg" className="expense-composition-card">
      <div className="card-header-simple">
        <span className="card-subtitle">Spending Distribution</span>
        <h3 className="card-title">Expense Composition</h3>
      </div>

      {/* Visual Donut Chart Section */}
      <div className="composition-visual-row">
        <div className="donut-wrapper">
          <svg viewBox="0 0 200 200" className="donut-svg" aria-label="Expense distribution chart">
            {/* Background ring */}
            <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="22" />

            {/* Slices */}
            {donutSegments.map((segment) => (
              <path
                key={segment.categoryId}
                d={segment.pathData}
                fill="none"
                stroke={segment.color}
                strokeWidth="22"
                strokeLinecap="round"
                className="donut-slice"
              />
            ))}
          </svg>
          <div className="donut-center-text">
            <span className="donut-center-label">Total Spent</span>
            <span className="donut-center-val">
              {formatCurrency(toMajorUnits(totalActualExpensesMinor))}
            </span>
          </div>
        </div>

        {/* Top Spenders Quick List */}
        <div className="top-spenders-box">
          <h4 className="top-spenders-title">Top Expense Categories</h4>
          <div className="top-spenders-list">
            {topSpendingCategories.map((item, index) => (
              <div key={item.categoryId} className="top-spender-row">
                <span className="top-spender-rank">#{index + 1}</span>
                <span className="top-spender-name">{item.categoryName}</span>
                <span className="top-spender-val">
                  {formatCurrency(toMajorUnits(item.actualAmountMinor))}
                  <small className="top-spender-share">({item.sharePercentage?.toFixed(1)}%)</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Category Table / List */}
      <div className="category-breakdown-table">
        <div className="table-head-row">
          <span>Category</span>
          <span className="text-right">Share</span>
          <span className="text-right">Amount</span>
        </div>
        {items.map((item) => (
          <div key={item.categoryId} className="table-data-row">
            <div className="cat-cell">
              <CategoryIcon iconName={item.categoryIcon} size={18} />
              <div>
                <span className="cat-cell-name">{item.categoryName}</span>
                <span className="cat-cell-count">{item.transactionCount} txn{item.transactionCount > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="share-cell text-right">
              <span className="share-pill" style={{ background: `${item.categoryColor}20`, color: item.categoryColor }}>
                {item.sharePercentage?.toFixed(1)}%
              </span>
            </div>
            <div className="amount-cell text-right">
              <span className="amount-val">{formatCurrency(toMajorUnits(item.actualAmountMinor))}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
