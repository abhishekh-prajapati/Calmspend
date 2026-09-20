import React from 'react';
import { DollarSign } from 'lucide-react';
import { Card } from '../ui/Card';
import { CategoryIcon } from '../ui/CategoryIcon';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { CategoryBreakdownItem } from '../../types/report';
import './IncomeCompositionCard.css';

export interface IncomeCompositionCardProps {
  totalActualIncomeMinor: number;
  items: CategoryBreakdownItem[];
}

export const IncomeCompositionCard: React.FC<IncomeCompositionCardProps> = ({
  totalActualIncomeMinor,
  items,
}) => {
  if (items.length === 0 || totalActualIncomeMinor === 0) {
    return (
      <Card variant="default" padding="lg" radius="lg" className="income-composition-card">
        <div className="card-header-simple">
          <span className="card-subtitle">Income Sources</span>
          <h3 className="card-title">Income Breakdown</h3>
        </div>
        <div className="empty-income-state">
          <DollarSign size={28} className="empty-income-icon" />
          <p className="empty-income-text">No income transactions recorded for this period</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="lg" radius="lg" className="income-composition-card">
      <div className="card-header-simple">
        <span className="card-subtitle">Earnings Distribution</span>
        <h3 className="card-title">Income Breakdown</h3>
      </div>

      <div className="income-breakdown-list">
        {items.map((item) => (
          <div key={item.categoryId} className="income-breakdown-row">
            <div className="income-cat-left">
              <CategoryIcon iconName={item.categoryIcon} size={18} />
              <div>
                <span className="income-cat-name">{item.categoryName}</span>
                <span className="income-cat-count">{item.transactionCount} deposit{item.transactionCount > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="income-cat-right">
              <span className="income-cat-amount">
                {formatCurrency(toMajorUnits(item.actualAmountMinor))}
              </span>
              <span className="income-cat-share">
                {item.sharePercentage !== null ? `${item.sharePercentage.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
