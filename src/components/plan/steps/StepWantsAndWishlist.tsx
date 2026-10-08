import React, { useState } from 'react';
import type { WizardBudgetItem } from '../../../types/budgetWizard';
import { StepWantsShiftSection } from './StepWantsShiftSection';

export interface StepWantsAndWishlistProps {
  needs: WizardBudgetItem[];
  wants: WizardBudgetItem[];
  onUpdateNeeds: (items: WizardBudgetItem[]) => void;
  onUpdateWants: (items: WizardBudgetItem[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export const StepWantsAndWishlist: React.FC<StepWantsAndWishlistProps> = ({
  needs,
  wants,
  onUpdateNeeds,
  onUpdateWants,
  onBack,
  onNext,
}) => {
  const [wantName, setWantName] = useState('');
  const [wantAmount, setWantAmount] = useState('');

  const handleAddWant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wantName.trim() || !wantAmount || parseFloat(wantAmount) <= 0) return;

    const newItem: WizardBudgetItem = {
      id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: wantName.trim(),
      amount: wantAmount,
      isRecurring: false,
      priority: 'want',
    };

    onUpdateWants([...wants, newItem]);
    setWantName('');
    setWantAmount('');
  };

  const handleMoveNeedToWant = (item: WizardBudgetItem) => {
    onUpdateNeeds(needs.filter((n) => n.id !== item.id));
    onUpdateWants([...wants, { ...item, priority: 'want' }]);
  };

  const handleMoveWantToNeed = (item: WizardBudgetItem) => {
    onUpdateWants(wants.filter((w) => w.id !== item.id));
    onUpdateNeeds([...needs, { ...item, priority: 'need' }]);
  };

  return (
    <div className="calm-wizard-step">
      <div className="calm-wizard-step__header">
        <span className="calm-wizard-step__tag">Step 2 of 3</span>
        <h2 className="calm-wizard-step__title">Wants &amp; Wishlist</h2>
        <p className="calm-wizard-step__desc">
          Add discretionary lifestyle spending (dining out, shopping, leisure) or move flexible items from Must-Pays.
        </p>
      </div>

      {/* Add New Want Form */}
      <form className="calm-wizard-form" onSubmit={handleAddWant}>
        <div className="calm-wizard-form__inputs">
          <input
            type="text"
            className="calm-wizard-input"
            placeholder="Wishlist item (e.g. Dining out)"
            value={wantName}
            onChange={(e) => setWantName(e.target.value)}
            aria-label="Wishlist item name"
          />
          <div className="calm-wizard-input-prefix-wrap">
            <span className="calm-wizard-currency-prefix">₹</span>
            <input
              type="number"
              step="any"
              className="calm-wizard-input--prefixed"
              placeholder="Amount"
              value={wantAmount}
              onChange={(e) => setWantAmount(e.target.value)}
              aria-label="Wishlist amount"
            />
          </div>
        </div>
        <div className="calm-wizard-form__options">
          <span className="calm-inflow-status">Optional • Funded after essential needs</span>
          <button
            type="submit"
            className="calm-wizard-add-btn"
            disabled={!wantName.trim() || !wantAmount || parseFloat(wantAmount) <= 0}
          >
            + Add Want
          </button>
        </div>
      </form>

      {/* Shift Must-Pay Items to Wants */}
      <StepWantsShiftSection
        needs={needs}
        onShiftToWant={handleMoveNeedToWant}
      />

      {/* Current Wants List */}
      <div className="calm-wizard-items-list">
        {wants.map((item) => (
          <div key={item.id} className="calm-wizard-item-row calm-wizard-item-row--want">
            <div className="calm-wizard-item-info">
              <div className="calm-wizard-item-name">{item.name}</div>
              <span className="calm-wizard-item-tag">Priority 2 (Want)</span>
            </div>
            <div className="calm-amount-group">
              <span className="calm-wizard-item-amount">₹{parseFloat(item.amount || '0').toLocaleString('en-IN')}</span>
              <button
                type="button"
                className="calm-wizard-remove-btn"
                onClick={() => handleMoveWantToNeed(item)}
                title="Move back to Must-Pays"
              >
                <span className="material-symbols-outlined calm-icon-sm">arrow_upward</span>
              </button>
              <button
                type="button"
                className="calm-wizard-remove-btn"
                onClick={() => onUpdateWants(wants.filter((w) => w.id !== item.id))}
                aria-label={`Remove ${item.name}`}
              >
                <span className="material-symbols-outlined calm-icon-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Wizard Step Actions */}
      <div className="calm-wizard-step__actions">
        <button type="button" className="calm-wizard-btn-secondary" onClick={onBack}>
          <span className="material-symbols-outlined calm-icon-sm">arrow_back</span>
          <span>Back</span>
        </button>
        <button type="button" className="calm-wizard-btn-primary" onClick={onNext}>
          <span>Check Balance &amp; Goals</span>
          <span className="material-symbols-outlined calm-icon-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
