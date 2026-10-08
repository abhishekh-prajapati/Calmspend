import React, { useState } from 'react';
import type { WizardBudgetItem } from '../../../types/budgetWizard';

export interface StepNeedsAndBufferProps {
  needs: WizardBudgetItem[];
  emergencyBuffer: string;
  onUpdateNeeds: (items: WizardBudgetItem[]) => void;
  onUpdateBuffer: (amount: string) => void;
  onNext: () => void;
}

export const StepNeedsAndBuffer: React.FC<StepNeedsAndBufferProps> = ({
  needs,
  emergencyBuffer,
  onUpdateNeeds,
  onUpdateBuffer,
  onNext,
}) => {
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemAmount || parseFloat(itemAmount) <= 0) return;

    const newItem: WizardBudgetItem = {
      id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: itemName.trim(),
      amount: itemAmount,
      isRecurring,
      priority: 'need',
    };

    onUpdateNeeds([...needs, newItem]);
    setItemName('');
    setItemAmount('');
    setIsRecurring(false);
  };

  const isNextDisabled = needs.length === 0;

  return (
    <div className="calm-wizard-step">
      <div className="calm-wizard-step__header">
        <span className="calm-wizard-step__tag">Step 1 of 3</span>
        <h2 className="calm-wizard-step__title">Must-Pay Expenses &amp; Buffer</h2>
        <p className="calm-wizard-step__desc">
          Add essential expenses (rent, groceries, utilities) and allocate an unexpected buffer.
        </p>
      </div>

      <form className="calm-wizard-form" onSubmit={handleAddItem}>
        <div className="calm-wizard-form__inputs">
          <input
            type="text"
            className="calm-wizard-input"
            placeholder="Expense name (e.g. Rent)"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            aria-label="Expense name"
          />
          <div className="calm-wizard-input-prefix-wrap">
            <span className="calm-wizard-currency-prefix">₹</span>
            <input
              type="number"
              step="any"
              className="calm-wizard-input--prefixed"
              placeholder="Amount"
              value={itemAmount}
              onChange={(e) => setItemAmount(e.target.value)}
              aria-label="Expense amount"
            />
          </div>
        </div>

        <div className="calm-wizard-form__options">
          <label className="calm-wizard-checkbox-label">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            <span>Repeats monthly</span>
          </label>
          <button
            type="submit"
            className="calm-wizard-add-btn"
            disabled={!itemName.trim() || !itemAmount || parseFloat(itemAmount) <= 0}
          >
            + Add Expense
          </button>
        </div>
      </form>

      <div className="calm-wizard-items-list">
        {needs.map((item) => (
          <div key={item.id} className="calm-wizard-item-row">
            <div>
              <div className="calm-wizard-item-name">{item.name}</div>
              {item.isRecurring && <span className="calm-wizard-item-tag">Monthly</span>}
            </div>
            <div className="calm-amount-group">
              <span className="calm-wizard-item-amount">₹{parseFloat(item.amount).toLocaleString('en-IN')}</span>
              <button
                type="button"
                className="calm-wizard-remove-btn"
                onClick={() => onUpdateNeeds(needs.filter((n) => n.id !== item.id))}
                aria-label={`Remove ${item.name}`}
              >
                <span className="material-symbols-outlined calm-icon-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="calm-wizard-form">
        <div className="calm-blueprint-pill-title">Unexpected Expenses Buffer</div>
        <div className="calm-wizard-input-prefix-wrap">
          <span className="calm-wizard-currency-prefix">₹</span>
          <input
            type="number"
            step="any"
            className="calm-wizard-input--prefixed"
            placeholder="0"
            value={emergencyBuffer}
            onChange={(e) => onUpdateBuffer(e.target.value)}
            aria-label="Buffer amount"
          />
        </div>
      </div>

      <div className="calm-wizard-step__actions">
        <button
          type="button"
          className="calm-wizard-btn-primary"
          disabled={isNextDisabled}
          onClick={onNext}
        >
          <span>Continue to Wants</span>
          <span className="material-symbols-outlined calm-icon-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
