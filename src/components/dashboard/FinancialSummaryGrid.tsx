import React from 'react';
import { ArrowUpRight, ArrowDownLeft, PiggyBank } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import './FinancialSummaryGrid.css';

export interface FinancialSummaryGridProps {
  incomeMinor: number;
  expensesMinor: number;
  savingsMinor: number | null;
  className?: string;
}

export const FinancialSummaryGrid: React.FC<FinancialSummaryGridProps> = ({
  incomeMinor,
  expensesMinor,
  savingsMinor,
  className = '',
}) => {
  const summaryItems = [
    {
      id: 'income',
      label: 'Income',
      amountMinor: incomeMinor,
      isPending: false,
      icon: <ArrowUpRight size={16} />,
      colorClass: 'income',
    },
    {
      id: 'expenses',
      label: 'Expenses',
      amountMinor: expensesMinor,
      isPending: false,
      icon: <ArrowDownLeft size={16} />,
      colorClass: 'expenses',
    },
    {
      id: 'savings',
      label: 'Net Savings',
      amountMinor: savingsMinor,
      isPending: savingsMinor === null,
      icon: <PiggyBank size={16} />,
      colorClass: 'savings',
    },
  ];

  return (
    <div className={`financial-summary-grid ${className}`}>
      {summaryItems.map((item) => (
        <Card
          key={item.id}
          variant="default"
          padding="sm"
          radius="lg"
          className={`financial-summary-card financial-summary-card--${item.colorClass}`}
        >
          <div className="financial-summary-card__header">
            <div className="financial-summary-card__icon-wrap">
              {item.icon}
            </div>
            <span className="financial-summary-card__label caption">
              {item.label}
            </span>
          </div>
          <div className="financial-summary-card__amount-wrap">
            {item.isPending || item.amountMinor === null ? (
              <span className="financial-summary-card__amount financial-summary-card__amount--pending">
                Planning Required
              </span>
            ) : (
              <span className="financial-summary-card__amount">
                {formatCurrency(toMajorUnits(item.amountMinor))}
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

