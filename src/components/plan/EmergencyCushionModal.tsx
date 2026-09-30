import React, { useState } from 'react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits, toMinorUnits } from '../../utils/money';

interface EmergencyCushionModalProps {
  isOpen: boolean;
  onClose: () => void;
  surplusAfterNeedsMinor: number;
  currentCushionMinor: number;
  onSaveCushion: (amountMinor: number) => Promise<void>;
}

export const EmergencyCushionModal: React.FC<EmergencyCushionModalProps> = ({
  isOpen,
  onClose,
  surplusAfterNeedsMinor,
  currentCushionMinor,
  onSaveCushion,
}) => {
  const [cushionInput, setCushionInput] = useState(() => {
    const curMajor = toMajorUnits(currentCushionMinor);
    return curMajor > 0 ? String(curMajor) : '';
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const maxAvailableMinor = Math.max(0, surplusAfterNeedsMinor + currentCushionMinor);
  const maxAvailableMajor = toMajorUnits(maxAvailableMinor);
  const enteredMinor = cushionInput ? toMinorUnits(cushionInput) : 0;
  const isExceeding = enteredMinor > maxAvailableMinor;
  const hasSurplus = maxAvailableMinor > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExceeding) return;
    try {
      setIsSaving(true);
      await onSaveCushion(enteredMinor);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="calm-sheet-overlay" onClick={onClose}>
      <div className="calm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="calm-sheet__handle"></div>
        <div className="calm-sheet__header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <span className="calm-sheet__title">Unexpected Expenses Cushion</span>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Extra money set aside for forgotten or unexpected expenses.
          </span>
        </div>

        {hasSurplus ? (
          <form onSubmit={handleSubmit} className="calm-sheet__metrics">
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: 8 }}>
              Emergency Cushion Amount
            </label>
            <div className="calm-input-box">
              <span className="calm-input-currency">₹</span>
              <input
                type="number"
                className="calm-input-field"
                placeholder="e.g. 2000"
                value={cushionInput}
                onChange={(e) => setCushionInput(e.target.value)}
                autoFocus
                min="0"
                max={maxAvailableMajor}
              />
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
              {[
                { label: '₹1,000', val: '1000' },
                { label: '₹2,000', val: '2000' },
                { label: '₹5,000', val: '5000' },
                { label: `Max (₹${maxAvailableMajor})`, val: String(maxAvailableMajor) },
              ].map((btn, i) => (
                <button
                  key={i}
                  type="button"
                  className="calm-micro-btn"
                  style={{ height: 38, fontSize: 11 }}
                  onClick={() => setCushionInput(btn.val)}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div
              style={{
                background: 'var(--color-surface-container-low)',
                borderRadius: 'var(--radius-lg)',
                padding: '10px 14px',
                marginTop: 10,
                fontSize: 13,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>Surplus Available after Needs:</span>
              <strong>{formatCurrency(maxAvailableMajor)}</strong>
            </div>

            {isExceeding && (
              <div className="calm-budget-warning">
                <span className="material-symbols-outlined">error</span>
                <span>Cushion cannot exceed available surplus of {formatCurrency(maxAvailableMajor)}.</span>
              </div>
            )}

            <button
              type="submit"
              className="calm-sheet__close-btn"
              disabled={isSaving || isExceeding}
              style={{ marginTop: 12, opacity: isExceeding ? 0.6 : 1 }}
            >
              {isSaving ? 'Saving...' : 'Save Emergency Cushion'}
            </button>
          </form>
        ) : (
          <div className="calm-sheet__metrics">
            <div
              style={{
                background: 'var(--color-surface-container-low)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                textAlign: 'center',
                margin: '12px 0',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-tertiary)' }}>
                info
              </span>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 8, lineHeight: 1.4 }}>
                You do not have enough remaining income to set an unexpected expenses buffer this month. All income is allocated to essential needs.
              </p>
            </div>
            <button type="button" className="calm-sheet__close-btn" onClick={onClose}>
              Understood
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
