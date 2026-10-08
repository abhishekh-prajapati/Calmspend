import React from 'react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import './IncomeExpenseSummaryCard.css';

export interface IncomeExpenseSummaryCardProps {
  monthlyIncomeMinor: number;
  monthlyExpensesMinor: number;
  onViewReport?: () => void;
}

export const IncomeExpenseSummaryCard: React.FC<IncomeExpenseSummaryCardProps> = ({
  monthlyIncomeMinor,
  monthlyExpensesMinor,
  onViewReport,
}) => {
  const incomeMajor = toMajorUnits(monthlyIncomeMinor);
  const expensesMajor = toMajorUnits(monthlyExpensesMinor);
  const netSavingsMinor = monthlyIncomeMinor - monthlyExpensesMinor;
  const isNetPositive = netSavingsMinor >= 0;
  const netSavingsMajor = Math.abs(toMajorUnits(netSavingsMinor));
  const hasData = monthlyIncomeMinor > 0 || monthlyExpensesMinor > 0;

  return (
    <section className="calm-in-ex-banner" aria-label="Monthly Cashflow Summary">
      <div className="calm-in-ex-container">
        {/* Income Block */}
        <div className="calm-in-ex-col income">
          <div className="calm-in-ex-header">
            <span className="calm-in-ex-icon-box bg-emerald-light text-emerald">
              <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
            </span>
            <span className="calm-in-ex-label">Income</span>
          </div>
          <div className="calm-in-ex-amount text-emerald">
            {formatCurrency(incomeMajor)}
          </div>
        </div>

        {/* Divider */}
        <div className="calm-in-ex-divider" />

        {/* Expense Block */}
        <div className="calm-in-ex-col expense">
          <div className="calm-in-ex-header">
            <span className="calm-in-ex-icon-box bg-rose-light text-rose">
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
            </span>
            <span className="calm-in-ex-label">Expense</span>
          </div>
          <div className="calm-in-ex-amount text-rose">
            {formatCurrency(expensesMajor)}
          </div>
        </div>

        {/* Net Cashflow / Report Button */}
        {onViewReport && (
          <button
            type="button"
            className="calm-in-ex-cta-btn"
            onClick={onViewReport}
            aria-label="View Monthly Report"
          >
            <span className={`calm-in-ex-pill ${isNetPositive ? 'pill-positive' : 'pill-negative'}`}>
              {hasData
                ? isNetPositive
                  ? `+${formatCurrency(netSavingsMajor)}`
                  : `-${formatCurrency(netSavingsMajor)}`
                : 'Balanced'}
            </span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        )}
      </div>
    </section>
  );
};

export default IncomeExpenseSummaryCard;
