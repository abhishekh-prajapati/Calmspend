import React, { useState, useEffect } from 'react';
import { X, PiggyBank, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits, toMinorUnits, isValidCurrencyInput } from '../../utils/money';
import { registerBackHandler } from '../../services/mobile/backButtonService';
import type { Goal, GoalProgressSummary } from '../../types/goal';
import type { Account } from '../../types/transaction';
import './GoalQuickSaveModal.css';

export interface GoalQuickSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  goalSummary?: GoalProgressSummary | null;
  accounts?: Account[];
  onConfirmSave: (data: {
    goalId: string;
    amountMinor: number;
    date: string;
    note?: string;
    accountId?: string;
  }) => Promise<void>;
}

export const GoalQuickSaveModal: React.FC<GoalQuickSaveModalProps> = ({
  isOpen,
  onClose,
  goal,
  goalSummary,
  accounts = [],
  onConfirmSave,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && goal) {
      // Default to user's monthly target if configured, else required monthly, else default amount
      const targetMinor =
        goalSummary?.monthlyTargetMinor ||
        goal.monthlyTargetMinor ||
        goalSummary?.requiredMonthlyContributionMinor ||
        0;

      const initialAmountMajor = targetMinor > 0 ? toMajorUnits(targetMinor) : '';
      setAmountStr(initialAmountMajor ? String(initialAmountMajor) : '');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('Monthly Savings Allocation');
      setError(null);

      const activeAccounts = accounts.filter((a) => a.isActive);
      if (activeAccounts.length > 0) {
        setSelectedAccountId(activeAccounts[0].id);
      }
    }
  }, [isOpen, goal, goalSummary, accounts]);

  // Handle hardware / gesture back button
  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  if (!isOpen || !goal) return null;

  const currentEnteredValue = parseFloat(amountStr) || 0;
  const currentSavedMinor = goalSummary?.currentAmountMinor || 0;
  const targetMinor = goal.targetAmountMinor;
  const newProjectedMinor = currentSavedMinor + toMinorUnits(currentEnteredValue);
  const projectedPercentage = targetMinor > 0 ? Math.min(100, (newProjectedMinor / targetMinor) * 100) : 0;

  const handleChipClick = (amountMajor: number) => {
    setAmountStr(String(amountMajor));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountStr || !isValidCurrencyInput(amountStr) || currentEnteredValue <= 0) {
      setError('Please enter a valid savings amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const amountMinor = toMinorUnits(currentEnteredValue);
      await onConfirmSave({
        goalId: goal.id,
        amountMinor,
        date,
        note: note.trim() || undefined,
        accountId: selectedAccountId || undefined,
      });
      onClose();
    } catch {
      setError('Failed to save to goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="goal-save-modal-overlay" onClick={onClose}>
      <div
        className="goal-save-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="goal-save-modal-title"
      >
        {/* Header */}
        <div className="goal-save-modal-header">
          <div className="goal-save-modal-title-wrap">
            <div className="goal-save-modal-icon">
              <PiggyBank size={22} />
            </div>
            <div>
              <h2 id="goal-save-modal-title" className="goal-save-modal-title">
                Save for Goal
              </h2>
              <p className="goal-save-modal-subtitle">
                Allocate money directly to <strong>{goal.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="goal-save-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="goal-save-modal-body">
          {/* Goal Status & Progress Preview */}
          <div className="goal-save-context-card">
            <div className="goal-save-context-top">
              <span className="body-sm" style={{ fontWeight: 600 }}>{goal.name}</span>
              <Badge variant="primary" size="sm">
                {Math.round(goalSummary?.progressPercentage || 0)}% Saved
              </Badge>
            </div>

            <ProgressBar
              value={newProjectedMinor}
              max={Math.max(targetMinor, 1)}
              color="success"
              size="sm"
            />

            <div className="goal-save-context-bottom">
              <span className="caption" style={{ color: 'var(--color-text-secondary)' }}>
                Current: {formatCurrency(toMajorUnits(currentSavedMinor))}
              </span>
              <span className="caption" style={{ color: 'var(--color-text-muted)' }}>
                Target: {formatCurrency(toMajorUnits(targetMinor))}
              </span>
            </div>
          </div>

          {/* Quick Amount Selection Chips */}
          <div className="goal-save-chips-container">
            <span className="caption" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Quick Suggestions:
            </span>
            <div className="goal-save-chips-list">
              {goalSummary?.monthlyTargetMinor && goalSummary.monthlyTargetMinor > 0 && (
                <button
                  type="button"
                  className="goal-save-chip-btn goal-save-chip-btn--highlight"
                  onClick={() => handleChipClick(toMajorUnits(goalSummary.monthlyTargetMinor!))}
                >
                  Monthly Target ({formatCurrency(toMajorUnits(goalSummary.monthlyTargetMinor!))})
                </button>
              )}
              <button
                type="button"
                className="goal-save-chip-btn"
                onClick={() => handleChipClick(500)}
              >
                ₹500
              </button>
              <button
                type="button"
                className="goal-save-chip-btn"
                onClick={() => handleChipClick(1000)}
              >
                ₹1,000
              </button>
              <button
                type="button"
                className="goal-save-chip-btn"
                onClick={() => handleChipClick(2000)}
              >
                ₹2,000
              </button>
              <button
                type="button"
                className="goal-save-chip-btn"
                onClick={() => handleChipClick(5000)}
              >
                ₹5,000
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="goal-save-input-group">
            <label htmlFor="goal-save-amount" className="goal-save-label">
              Amount to Save (₹)
            </label>
            <div className="goal-save-input-wrap">
              <span className="goal-save-currency-symbol">₹</span>
              <input
                id="goal-save-amount"
                type="number"
                min="1"
                step="any"
                className={`goal-save-input ${error ? 'goal-save-input--error' : ''}`}
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setError(null);
                }}
                placeholder="0"
                autoFocus
              />
            </div>
            {error && (
              <div className="goal-save-error-text">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Source Bank Account Picker */}
          {accounts && accounts.length > 0 && (
            <div className="goal-save-input-group">
              <label htmlFor="goal-save-account" className="goal-save-label caption">
                Deduct From Bank Account
              </label>
              <select
                id="goal-save-account"
                className="goal-save-secondary-input"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: 'var(--color-surface-subtle)',
                  border: '1px solid var(--color-border-subtle)',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: 'var(--color-text-primary)',
                }}
              >
                {accounts
                  .filter((a) => a.isActive)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type.toUpperCase()})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Date & Note in Compact Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="goal-save-input-group">
              <label htmlFor="goal-save-date" className="goal-save-label caption">
                Date
              </label>
              <input
                id="goal-save-date"
                type="date"
                className="goal-save-secondary-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="goal-save-input-group">
              <label htmlFor="goal-save-note" className="goal-save-label caption">
                Note
              </label>
              <input
                id="goal-save-note"
                type="text"
                className="goal-save-secondary-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Monthly allocation"
              />
            </div>
          </div>

          {/* Impact Insight Card */}
          {currentEnteredValue > 0 && (
            <div className="goal-save-impact-card">
              <Sparkles size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
              <span className="caption" style={{ color: 'var(--color-text-primary)' }}>
                Goal progress will increase to <strong>{Math.round(projectedPercentage)}%</strong> (
                {formatCurrency(toMajorUnits(newProjectedMinor))} / {formatCurrency(toMajorUnits(targetMinor))})
              </span>
            </div>
          )}

          {/* Action Footer */}
          <div className="goal-save-actions">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Check size={16} />}
              disabled={isSubmitting || !amountStr}
            >
              {isSubmitting ? 'Saving...' : 'Add to Goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
