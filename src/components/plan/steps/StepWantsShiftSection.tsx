import React from 'react';
import type { WizardBudgetItem } from '../../../types/budgetWizard';

export interface StepWantsShiftSectionProps {
  needs: WizardBudgetItem[];
  onShiftToWant: (item: WizardBudgetItem) => void;
}

export const StepWantsShiftSection: React.FC<StepWantsShiftSectionProps> = ({
  needs,
  onShiftToWant,
}) => {
  if (needs.length === 0) return null;

  return (
    <div className="calm-shift-section">
      <div className="calm-shift-header">
        <span className="material-symbols-outlined calm-icon-sm calm-icon-purple">swap_vert</span>
        <span className="calm-shift-title">Move Must-Pay Item to Wishlist:</span>
      </div>
      <div className="calm-shift-chips-wrap">
        {needs.map((item) => (
          <button
            key={item.id}
            type="button"
            className="calm-shift-chip"
            onClick={() => onShiftToWant(item)}
            title={`Shift ${item.name} to Wants`}
          >
            <span className="calm-shift-chip-name">{item.name}</span>
            <span className="calm-shift-chip-amount">₹{parseFloat(item.amount || '0').toLocaleString('en-IN')}</span>
            <span className="material-symbols-outlined calm-icon-xs">arrow_downward</span>
          </button>
        ))}
      </div>
    </div>
  );
};
