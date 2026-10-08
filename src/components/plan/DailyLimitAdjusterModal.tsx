import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../services/currency';
import { toMinorUnits, toMajorUnits } from '../../utils/money';

export interface DailyLimitAdjusterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDailyMinor?: number | null;
  autoDailyMinor?: number | null;
  remainingDays: number;
  onSaveDailyLimit: (amountMinor: number | null) => Promise<void>;
}

export const DailyLimitAdjusterModal: React.FC<DailyLimitAdjusterModalProps> = ({
  isOpen,
  onClose,
  currentDailyMinor,
  autoDailyMinor,
  remainingDays,
  onSaveDailyLimit,
}) => {
  const [limitInput, setLimitInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentDailyMinor && currentDailyMinor > 0) {
        setLimitInput(String(toMajorUnits(currentDailyMinor)));
      } else if (autoDailyMinor && autoDailyMinor > 0) {
        setLimitInput(String(toMajorUnits(autoDailyMinor)));
      } else {
        setLimitInput('');
      }
    }
  }, [isOpen, currentDailyMinor, autoDailyMinor]);

  if (!isOpen) return null;

  const parsedLimit = parseFloat(limitInput) || 0;
  const projectedTotalRemaining = parsedLimit * remainingDays;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const amountMinor = parsedLimit > 0 ? toMinorUnits(parsedLimit) : null;
      await onSaveDailyLimit(amountMinor);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToAuto = async () => {
    setIsSaving(true);
    try {
      await onSaveDailyLimit(null);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="calm-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="calm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calm-modal__header">
          <div className="calm-modal__icon">
            <span className="material-symbols-outlined">tune</span>
          </div>
          <div>
            <h3 className="calm-modal__title">Daily Expense Limit</h3>
            <p className="calm-modal__subtitle">
              Set a daily allowance to help guide your everyday spending pace.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="calm-modal__body">
          <div className="calm-modal__field">
            <label className="calm-modal__label">Daily Limit (₹)</label>
            <input
              type="number"
              step="any"
              className="calm-modal__input"
              placeholder="e.g. 500"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              autoFocus
            />
          </div>

          {/* Live Remaining Days Projection */}
          <div className="calm-limit-projection-box">
            <span className="calm-limit-projection-box__title">Live Pace Projection:</span>
            <div className="calm-limit-projection-box__row">
              <span>{remainingDays} days remaining in month</span>
              <strong>{formatCurrency(projectedTotalRemaining)} total</strong>
            </div>
            <p className="calm-limit-projection-box__note">
              At {formatCurrency(parsedLimit)} per day, this covers {remainingDays} days.
            </p>
          </div>

          <div className="calm-modal__actions">
            <button
              type="button"
              className="calm-modal__btn calm-modal__btn--secondary"
              onClick={handleResetToAuto}
              disabled={isSaving}
            >
              Reset to Auto
            </button>
            <button
              type="submit"
              className="calm-modal__btn calm-modal__btn--primary"
              disabled={isSaving || parsedLimit < 0}
            >
              {isSaving ? 'Saving...' : 'Set Daily Limit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
