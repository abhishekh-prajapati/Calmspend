import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits, toMinorUnits, isValidCurrencyInput } from '../../utils/money';
import { registerBackHandler } from '../../services/mobile/backButtonService';
import type { CategoryBudgetProgress } from '../../types/budget';
import type { Account, Category } from '../../types/transaction';
import './QuickPayModal.css';

export interface QuickPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CategoryBudgetProgress | null;
  category?: Category | null;
  accounts: Account[];
  onConfirmPayment: (data: {
    amount: number;
    categoryId: string;
    accountId: string;
    date: string;
    description: string;
  }) => Promise<void>;
}

export const QuickPayModal: React.FC<QuickPayModalProps> = ({
  isOpen,
  onClose,
  item,
  category,
  accounts,
  onConfirmPayment,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeAccounts = accounts.filter((a) => a.isActive);
  const availableAccounts: Account[] = activeAccounts.length > 0
    ? activeAccounts
    : accounts.length > 0
    ? accounts
    : [
        {
          id: 'acc_primary',
          name: 'Primary Account (Default)',
          type: 'bank',
          openingBalance: 0,
          currency: 'INR',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

  // Initialize or reset form when item changes
  useEffect(() => {
    if (isOpen && item) {
      // Default amount to remaining planned amount if > 0, otherwise full planned amount
      const initialAmountMinor = item.remainingAmountMinor > 0
        ? item.remainingAmountMinor
        : item.plannedAmountMinor;
      setAmountStr((toMajorUnits(initialAmountMinor)).toString());
      setDescription(`${item.categoryName} Payment`);
      setDate(new Date().toISOString().split('T')[0]);
      setError(null);

      if (availableAccounts.length > 0) {
        setSelectedAccountId(availableAccounts[0].id);
      }
    }
  }, [isOpen, item, accounts]);

  // Hardware/gesture back handler for mobile
  useEffect(() => {
    if (isOpen) {
      const unregister = registerBackHandler(() => {
        onClose();
        return true;
      });
      return () => unregister();
    }
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isValidCurrencyInput(amountStr) || parseFloat(amountStr) <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (!selectedAccountId) {
      setError('Please select an account for this payment.');
      return;
    }

    if (!date) {
      setError('Please choose a date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const amountMinor = toMinorUnits(amountStr);
      await onConfirmPayment({
        amount: amountMinor,
        categoryId: item.categoryId,
        accountId: selectedAccountId,
        date,
        description: description.trim() || `${item.categoryName} Payment`,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quick-pay-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-pay-modal__header">
          <div className="quick-pay-modal__title-group">
            <div
              className="quick-pay-modal__cat-badge"
              style={{ backgroundColor: `${category?.color || '#3b82f6'}18` }}
            >
              <CategoryIcon iconName={category?.icon || item.categoryIcon || 'Tag'} size={20} />
            </div>
            <div>
              <h3 className="quick-pay-modal__title">Pay {item.categoryName}</h3>
              <span className="quick-pay-modal__subtitle">
                Planned: {formatCurrency(toMajorUnits(item.plannedAmountMinor))} •{' '}
                {item.remainingAmountMinor > 0
                  ? `${formatCurrency(toMajorUnits(item.remainingAmountMinor))} remaining`
                  : 'Budget complete'}
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="quick-pay-modal__form">
          {error && <div className="quick-pay-modal__error-banner">{error}</div>}

          {/* Amount input */}
          <div className="quick-pay-modal__form-group">
            <label className="ui-input-label" htmlFor="quick-pay-amount">
              Payment Amount (₹) *
            </label>
            <div className="quick-pay-modal__amount-input-wrap">
              <span className="quick-pay-modal__currency-prefix">₹</span>
              <input
                id="quick-pay-amount"
                type="number"
                step="any"
                inputMode="decimal"
                className="quick-pay-modal__amount-input"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          {/* Account selector */}
          <div className="quick-pay-modal__form-group">
            <label className="ui-input-label" htmlFor="quick-pay-account">
              Paid From Account *
            </label>
            {availableAccounts.length === 0 ? (
              <p className="caption" style={{ color: 'var(--color-danger)' }}>
                No active accounts found. Please create an account first.
              </p>
            ) : (
              <select
                id="quick-pay-account"
                className="quick-pay-modal__select"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
              >
                {availableAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date & Note Row */}
          <div className="quick-pay-modal__row">
            <div className="quick-pay-modal__form-group" style={{ flex: 1 }}>
              <label className="ui-input-label" htmlFor="quick-pay-date">
                Payment Date
              </label>
              <input
                id="quick-pay-date"
                type="date"
                className="quick-pay-modal__input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="quick-pay-modal__form-group" style={{ flex: 1.5 }}>
              <label className="ui-input-label" htmlFor="quick-pay-note">
                Note / Description
              </label>
              <input
                id="quick-pay-note"
                type="text"
                className="quick-pay-modal__input"
                placeholder="e.g. Monthly rent, Bill"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="quick-pay-modal__actions">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<CheckCircle size={16} />}
              disabled={isSubmitting || availableAccounts.length === 0}
            >
              {isSubmitting ? 'Recording...' : 'Confirm & Pay'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
