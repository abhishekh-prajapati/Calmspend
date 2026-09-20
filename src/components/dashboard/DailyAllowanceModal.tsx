import React, { useState, useEffect } from 'react';
import { X, Sliders, Sparkles, TrendingUp, AlertCircle, RotateCcw, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits, toMinorUnits, isValidCurrencyInput } from '../../utils/money';
import { getRemainingDaysInMonth } from '../../services/periodService';
import { registerBackHandler } from '../../services/mobile/backButtonService';
import './DailyAllowanceModal.css';

export interface DailyAllowanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodKey: string;
  availableAmountMinor: number | null;
  autoDailyAllowanceMinor: number | null;
  customDailyAllowanceMinor?: number | null;
  onSaveCustomAllowance: (periodKey: string, customDailyAllowanceMinor: number | null) => Promise<void>;
}

export const DailyAllowanceModal: React.FC<DailyAllowanceModalProps> = ({
  isOpen,
  onClose,
  periodKey,
  availableAmountMinor,
  autoDailyAllowanceMinor,
  customDailyAllowanceMinor,
  onSaveCustomAllowance,
}) => {
  const [dailyAmountStr, setDailyAmountStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingDays = Math.max(1, getRemainingDaysInMonth(new Date()));
  const autoMajor = autoDailyAllowanceMinor ? toMajorUnits(autoDailyAllowanceMinor) : 0;
  const availableMajor = availableAmountMinor ? toMajorUnits(availableAmountMinor) : 0;

  useEffect(() => {
    if (isOpen) {
      if (customDailyAllowanceMinor !== null && customDailyAllowanceMinor !== undefined && customDailyAllowanceMinor > 0) {
        setDailyAmountStr(String(toMajorUnits(customDailyAllowanceMinor)));
      } else if (autoDailyAllowanceMinor !== null && autoDailyAllowanceMinor !== undefined) {
        setDailyAmountStr(String(toMajorUnits(autoDailyAllowanceMinor)));
      } else {
        setDailyAmountStr('');
      }
      setError(null);
    }
  }, [isOpen, customDailyAllowanceMinor, autoDailyAllowanceMinor]);

  // Handle hardware / gesture back button
  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentEnteredValue = parseFloat(dailyAmountStr) || 0;
  const totalPlannedSpendWithLimit = Math.round(currentEnteredValue * remainingDays);
  const projectedExtraSavings = Math.max(0, availableMajor - totalPlannedSpendWithLimit);
  const isHigherThanAuto = autoMajor > 0 && currentEnteredValue > autoMajor;
  const isLowerThanAuto = autoMajor > 0 && currentEnteredValue < autoMajor && currentEnteredValue > 0;
  const isCustomActive = customDailyAllowanceMinor !== null && customDailyAllowanceMinor !== undefined && customDailyAllowanceMinor > 0;

  const handlePresetSelect = (reductionPercentage: number) => {
    if (autoMajor <= 0) return;
    const reduced = Math.round(autoMajor * (1 - reductionPercentage / 100));
    setDailyAmountStr(String(Math.max(1, reduced)));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyAmountStr || !isValidCurrencyInput(dailyAmountStr) || currentEnteredValue <= 0) {
      setError('Please enter a valid daily amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const minor = toMinorUnits(currentEnteredValue);
      await onSaveCustomAllowance(periodKey, minor);
      onClose();
    } catch {
      setError('Failed to update daily allowance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToAuto = async () => {
    setIsSubmitting(true);
    try {
      await onSaveCustomAllowance(periodKey, null);
      onClose();
    } catch {
      setError('Failed to reset daily allowance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="daily-allowance-modal-overlay" onClick={onClose}>
      <div
        className="daily-allowance-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="daily-allowance-modal-title"
      >
        {/* Header */}
        <div className="daily-allowance-modal-header">
          <div className="daily-allowance-modal-title-wrap">
            <div className="daily-allowance-modal-icon">
              <Sliders size={20} />
            </div>
            <div>
              <h2 id="daily-allowance-modal-title" className="daily-allowance-modal-title">
                Adjust Daily Spending Limit
              </h2>
              <p className="daily-allowance-modal-subtitle">
                Decrease your daily limit to spend less and save more money
              </p>
            </div>
          </div>
          <button
            type="button"
            className="daily-allowance-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="daily-allowance-modal-body">
          {/* Current Calculation Context */}
          <div className="daily-allowance-context-card">
            <div className="daily-allowance-context-row">
              <span className="caption">Calculated Maximum:</span>
              <span className="daily-allowance-context-val">
                {formatCurrency(autoMajor)} / day
              </span>
            </div>
            <div className="daily-allowance-context-row">
              <span className="caption">Remaining in Month:</span>
              <span className="daily-allowance-context-val">
                {remainingDays} {remainingDays === 1 ? 'day' : 'days'} ({formatCurrency(availableMajor)} available)
              </span>
            </div>
            {isCustomActive && (
              <div className="daily-allowance-context-row" style={{ marginTop: '4px' }}>
                <span className="caption">Current Active Limit:</span>
                <Badge variant="primary" size="sm">
                  {formatCurrency(toMajorUnits(customDailyAllowanceMinor!))} / day (Custom)
                </Badge>
              </div>
            )}
          </div>

          {/* Quick Reduction Presets */}
          {autoMajor > 0 && (
            <div className="daily-allowance-presets-container">
              <span className="caption" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Quick Reductions:
              </span>
              <div className="daily-allowance-presets-list">
                <button
                  type="button"
                  className="daily-allowance-preset-btn"
                  onClick={() => handlePresetSelect(15)}
                >
                  -15% ({formatCurrency(Math.round(autoMajor * 0.85))})
                </button>
                <button
                  type="button"
                  className="daily-allowance-preset-btn"
                  onClick={() => handlePresetSelect(25)}
                >
                  -25% ({formatCurrency(Math.round(autoMajor * 0.75))})
                </button>
                <button
                  type="button"
                  className="daily-allowance-preset-btn"
                  onClick={() => handlePresetSelect(40)}
                >
                  -40% ({formatCurrency(Math.round(autoMajor * 0.6))})
                </button>
                <button
                  type="button"
                  className="daily-allowance-preset-btn"
                  onClick={() => {
                    setDailyAmountStr(String(autoMajor));
                    setError(null);
                  }}
                >
                  Auto Max ({formatCurrency(autoMajor)})
                </button>
              </div>
            </div>
          )}

          {/* Input field */}
          <div className="daily-allowance-input-group">
            <label htmlFor="custom-daily-input" className="daily-allowance-label">
              Your Daily Spending Limit (₹)
            </label>
            <div className="daily-allowance-input-wrap">
              <span className="daily-allowance-currency-symbol">₹</span>
              <input
                id="custom-daily-input"
                type="number"
                min="1"
                step="any"
                className={`daily-allowance-input ${error ? 'daily-allowance-input--error' : ''}`}
                value={dailyAmountStr}
                onChange={(e) => {
                  setDailyAmountStr(e.target.value);
                  setError(null);
                }}
                placeholder={String(autoMajor)}
                autoFocus
              />
            </div>
            {error && (
              <div className="daily-allowance-error-text">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Live Impact Insight Card */}
          {currentEnteredValue > 0 && (
            <div className={`daily-allowance-impact-box ${isLowerThanAuto ? 'daily-allowance-impact-box--positive' : ''}`}>
              <div className="daily-allowance-impact-header">
                {isLowerThanAuto ? (
                  <Sparkles size={16} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
                )}
                <span className="body-sm" style={{ fontWeight: 600 }}>
                  {isLowerThanAuto ? 'Savings Boost Preview' : 'Spending Forecast'}
                </span>
              </div>

              <div className="daily-allowance-impact-stats">
                <div className="daily-allowance-impact-col">
                  <span className="caption">Total Planned Spend ({remainingDays}d):</span>
                  <span className="body-medium" style={{ fontWeight: 700 }}>
                    {formatCurrency(totalPlannedSpendWithLimit)}
                  </span>
                </div>
                {isLowerThanAuto && (
                  <div className="daily-allowance-impact-col" style={{ textAlign: 'right' }}>
                    <span className="caption">Extra Month Savings:</span>
                    <span className="body-medium" style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                      +{formatCurrency(projectedExtraSavings)}
                    </span>
                  </div>
                )}
              </div>

              {isHigherThanAuto && (
                <div className="daily-allowance-warning-text">
                  <AlertCircle size={14} />
                  <span>
                    This limit is higher than your calculated rate of {formatCurrency(autoMajor)}/day and may exceed your monthly plan.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="daily-allowance-actions">
            {isCustomActive && (
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<RotateCcw size={16} />}
                onClick={handleResetToAuto}
                disabled={isSubmitting}
              >
                Reset to Auto
              </Button>
            )}
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
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
                disabled={isSubmitting || !dailyAmountStr}
              >
                {isSubmitting ? 'Saving...' : 'Save Limit'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
