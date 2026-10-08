import React from 'react';
import type { WizardBudgetItem } from '../../../types/budgetWizard';

export interface StepGoalsAndBalanceCheckProps {
  income: number;
  needs: WizardBudgetItem[];
  wants: WizardBudgetItem[];
  emergencyBuffer: string;
  plannedSavings: string;
  goalsMonthlyTotal: number;
  onUpdateNeeds: (items: WizardBudgetItem[]) => void;
  onUpdateBuffer: (amount: string) => void;
  onUpdateSavings: (amount: string) => void;
  onBack: () => void;
  onFinalize: () => void;
}

export const StepGoalsAndBalanceCheck: React.FC<StepGoalsAndBalanceCheckProps> = ({
  income,
  needs,
  wants,
  emergencyBuffer,
  plannedSavings,
  goalsMonthlyTotal,
  onUpdateBuffer: _onUpdateBuffer,
  onUpdateSavings,
  onBack,
  onFinalize,
}) => {
  const needsTotal = needs.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const wantsTotal = wants.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const bufferTotal = parseFloat(emergencyBuffer) || 0;
  const savingsTotal = parseFloat(plannedSavings) || 0;

  const totalAllocated = needsTotal + wantsTotal + bufferTotal + savingsTotal + goalsMonthlyTotal;
  const isOverBudget = income > 0 && totalAllocated > income;
  const overAmount = Math.max(0, totalAllocated - income);
  const surplusAmount = Math.max(0, income - totalAllocated);

  return (
    <div className="calm-wizard-step">
      <div className="calm-wizard-step__header">
        <span className="calm-wizard-step__tag">Step 3 of 3</span>
        <h2 className="calm-wizard-step__title">Balance Check &amp; Review</h2>
        <p className="calm-wizard-step__desc">
          Combine essential needs, cushion, wishlist, goals, and savings.
        </p>
      </div>

      <div className="calm-zero-math-box">
        <div className="calm-zero-math-row">
          <span>Total Monthly Income</span>
          <span className="calm-zero-math-val">₹{income.toLocaleString('en-IN')}</span>
        </div>
        <div className="calm-zero-math-row">
          <span>1. Must-Pay Needs</span>
          <span>₹{needsTotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="calm-zero-math-row">
          <span>2. Unexpected Cushion</span>
          <span>₹{bufferTotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="calm-zero-math-row">
          <span>3. Wants &amp; Wishlist</span>
          <span>₹{wantsTotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="calm-zero-math-row">
          <span>4. Goals Target</span>
          <span>₹{goalsMonthlyTotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="calm-zero-math-row">
          <span>5. Extra Savings</span>
          <div className="calm-wizard-input-prefix-wrap">
            <span className="calm-wizard-currency-prefix">₹</span>
            <input
              type="number"
              className="calm-wizard-input--prefixed"
              value={plannedSavings}
              onChange={(e) => onUpdateSavings(e.target.value)}
              placeholder="0"
              aria-label="Planned savings"
            />
          </div>
        </div>
        <div className="calm-zero-math-row calm-zero-math-row--remaining">
          <span>Total Planned</span>
          <span className={isOverBudget ? 'calm-text-purple' : 'calm-text-emerald'}>
            ₹{totalAllocated.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {isOverBudget ? (
        <div className="calm-pace-desc-box">
          <span className="material-symbols-outlined calm-icon-purple">warning</span>
          <span className="calm-pace-desc-text">
            Plan is ₹{overAmount.toLocaleString('en-IN')} over income. Lower your cushion or wishlist.
          </span>
        </div>
      ) : (
        <div className="calm-pace-desc-box">
          <span className="material-symbols-outlined calm-icon-emerald">check_circle</span>
          <span className="calm-pace-desc-text">
            Balanced! ₹{surplusAmount.toLocaleString('en-IN')} unassigned safe buffer remaining.
          </span>
        </div>
      )}

      <div className="calm-wizard-step__actions">
        <button type="button" className="calm-wizard-btn-secondary" onClick={onBack}>
          <span className="material-symbols-outlined calm-icon-sm">arrow_back</span>
          <span>Back</span>
        </button>
        <button
          type="button"
          className="calm-wizard-btn-primary"
          onClick={onFinalize}
        >
          <span>Finalize &amp; Lock Plan</span>
          <span className="material-symbols-outlined calm-icon-sm">lock</span>
        </button>
      </div>
    </div>
  );
};
