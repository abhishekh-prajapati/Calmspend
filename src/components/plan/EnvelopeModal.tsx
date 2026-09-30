import React, { useState } from 'react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits, toMinorUnits } from '../../utils/money';
import type { Category } from '../../types/transaction';

interface EnvelopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingCategoryIds: Set<string>;
  editingEnvelope?: {
    id: string;
    name: string;
    spent: number;
    amount: string;
    priority: 'need' | 'want';
  } | null;
  maxAvailableForNeedMinor: number;
  onSave: (categoryId: string, amountMinor: number, priority: 'need' | 'want') => Promise<void>;
  onDelete?: (categoryId: string) => Promise<void>;
}

export const EnvelopeModal: React.FC<EnvelopeModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingCategoryIds,
  editingEnvelope,
  maxAvailableForNeedMinor,
  onSave,
  onDelete,
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>(() => {
    if (editingEnvelope) return editingEnvelope.id;
    const firstUnbudgeted = categories.find((c) => !existingCategoryIds.has(c.id));
    return firstUnbudgeted ? firstUnbudgeted.id : categories[0]?.id || '';
  });

  const [amount, setAmount] = useState<string>(() => {
    return editingEnvelope ? editingEnvelope.amount : '1000';
  });

  const [priority, setPriority] = useState<'need' | 'want'>(() => {
    return editingEnvelope ? editingEnvelope.priority : 'need';
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const isEditing = Boolean(editingEnvelope);
  const enteredMinor = toMinorUnits(amount || '0');
  const isNeed = priority === 'need';
  const isExceeding = isNeed && maxAvailableForNeedMinor >= 0 && enteredMinor > maxAvailableForNeedMinor;
  const maxAvailableMajor = toMajorUnits(Math.max(0, maxAvailableForNeedMinor));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExceeding || isSaving) return;
    try {
      setIsSaving(true);
      await onSave(selectedCatId, enteredMinor, priority);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEnvelope || !onDelete || isSaving) return;
    try {
      setIsSaving(true);
      await onDelete(editingEnvelope.id);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="calm-sheet-overlay" onClick={onClose}>
      <form
        className="calm-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="calm-sheet__handle"></div>
        <div className="calm-sheet__header">
          <span className="calm-sheet__title">
            {isEditing ? `Edit Budget for ${editingEnvelope?.name}` : 'Add Monthly Expense Budget'}
          </span>
        </div>

        <div className="calm-sheet__metrics">
          {/* Priority: User selects Need or Want */}
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Choose Category Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className={`calm-micro-btn ${priority === 'need' ? 'calm-micro-btn--active' : ''}`}
              style={{
                height: 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                borderRadius: 'var(--radius-lg)',
                borderColor: priority === 'need' ? 'var(--color-primary)' : 'var(--color-border)',
                background: priority === 'need' ? 'var(--color-primary-light)' : 'transparent',
                color: priority === 'need' ? 'var(--color-primary-dark)' : 'var(--color-text-primary)',
              }}
              onClick={() => setPriority('need')}
            >
              <span style={{ fontWeight: 700, fontSize: 13 }}>Need (Priority 1)</span>
              <span style={{ fontSize: 11, opacity: 0.8 }}>Essential to live</span>
            </button>

            <button
              type="button"
              className={`calm-micro-btn ${priority === 'want' ? 'calm-micro-btn--active' : ''}`}
              style={{
                height: 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                borderRadius: 'var(--radius-lg)',
                borderColor: priority === 'want' ? 'var(--color-tertiary)' : 'var(--color-border)',
                background: priority === 'want' ? 'var(--color-surface-container-high)' : 'transparent',
                color: priority === 'want' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              }}
              onClick={() => setPriority('want')}
            >
              <span style={{ fontWeight: 700, fontSize: 13 }}>Want (Priority 2)</span>
              <span style={{ fontSize: 11, opacity: 0.8 }}>Wishlist</span>
            </button>
          </div>

          {!isEditing && (
            <>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                Category Name
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-container-lowest)',
                  fontSize: 14,
                }}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {existingCategoryIds.has(cat.id) ? '(Already added)' : ''}
                  </option>
                ))}
              </select>
            </>
          )}

          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: 8 }}>
            Planned Spending Amount
          </label>
          <div className="calm-input-box">
            <span className="calm-input-currency">₹</span>
            <input
              type="number"
              className="calm-input-field"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
              min="0"
            />
          </div>

          {/* Presets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
            {['500', '1000', '2500', '5000'].map((amt) => (
              <button
                key={amt}
                type="button"
                className="calm-micro-btn"
                style={{ height: 38, fontSize: 13 }}
                onClick={() => setAmount(amt)}
              >
                ₹{amt}
              </button>
            ))}
          </div>

          {/* Validation Warning if exceeding income */}
          {isExceeding && (
            <div className="calm-budget-warning">
              <span className="material-symbols-outlined">error</span>
              <span>
                Exceeds remaining income. Available for this Need: {formatCurrency(maxAvailableMajor)}.
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {isEditing && onDelete && (
            <button
              type="button"
              className="calm-micro-btn"
              style={{
                height: 48,
                flex: '0 0 auto',
                padding: '0 16px',
                color: 'var(--color-terracotta)',
                borderColor: 'var(--color-terracotta)',
              }}
              onClick={handleDelete}
              disabled={isSaving}
            >
              <span className="material-symbols-outlined">delete</span>
              <span>Remove</span>
            </button>
          )}
          <button
            type="submit"
            className="calm-sheet__close-btn"
            disabled={isSaving || isExceeding}
            style={{
              flex: 1,
              margin: 0,
              opacity: isExceeding ? 0.6 : 1,
              cursor: isExceeding ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Budget'}
          </button>
        </div>
      </form>
    </div>
  );
};
