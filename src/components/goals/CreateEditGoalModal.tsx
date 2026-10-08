import React, { useState, useEffect } from 'react';
import type { Goal, GoalColorToken } from '../../types/goal';
import { toMinorUnits, toMajorUnits } from '../../utils/money';

const ICONS = ['savings', 'flight', 'school', 'directions_car', 'home', 'laptop', 'shield', 'build'];
const COLORS: GoalColorToken[] = ['primary', 'success', 'warning', 'danger', 'purple', 'pink', 'info', 'neutral'];

export interface CreateEditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal | null;
  onSaveGoal: (data: {
    id?: string;
    name: string;
    targetAmountMinor: number;
    targetDate?: string;
    monthlyTargetMinor?: number;
    colorToken: GoalColorToken;
    icon: string;
  }) => Promise<void>;
  onDeleteGoal?: (id: string) => Promise<void>;
}

export const CreateEditGoalModal: React.FC<CreateEditGoalModalProps> = ({
  isOpen,
  onClose,
  goalToEdit,
  onSaveGoal,
  onDeleteGoal,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('10000');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [customMonthly, setCustomMonthly] = useState('');
  const [colorToken, setColorToken] = useState<GoalColorToken>('primary');
  const [icon, setIcon] = useState('savings');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (goalToEdit) {
      setName(goalToEdit.name);
      setTargetAmount(String(toMajorUnits(goalToEdit.targetAmountMinor)));
      setTargetDate(goalToEdit.targetDate || '');
      setCustomMonthly(goalToEdit.monthlyTargetMinor ? String(toMajorUnits(goalToEdit.monthlyTargetMinor)) : '');
      setColorToken(goalToEdit.colorToken || 'primary');
      setIcon(goalToEdit.icon || 'savings');
    } else {
      setName('');
      setTargetAmount('10000');
      setColorToken('primary');
      setIcon('savings');
      setCustomMonthly('');
    }
  }, [goalToEdit, isOpen]);

  if (!isOpen) return null;

  // Calculate suggested monthly savings
  const targetNum = parseFloat(targetAmount) || 0;
  const now = new Date();
  const end = targetDate ? new Date(targetDate) : new Date(now.getFullYear(), now.getMonth() + 6, 1);
  const diffMonths = Math.max(1, (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()) + 1);
  const calculatedMonthly = Math.ceil(targetNum / diffMonths);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || targetNum <= 0) return;

    setIsSaving(true);
    try {
      await onSaveGoal({
        id: goalToEdit?.id,
        name: name.trim(),
        targetAmountMinor: toMinorUnits(targetAmount),
        targetDate: targetDate || undefined,
        monthlyTargetMinor: customMonthly ? toMinorUnits(customMonthly) : toMinorUnits(String(calculatedMonthly)),
        colorToken,
        icon,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="calm-sheet-overlay" onClick={onClose}>
      <form className="calm-sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="calm-sheet__handle"></div>
        <div className="calm-sheet__header">
          <span className="calm-sheet__title">{goalToEdit ? 'Edit Savings Goal' : 'Create New Savings Target'}</span>
        </div>

        <div className="calm-sheet__metrics">
          <label className="calm-modal-label">Goal Title</label>
          <input
            type="text"
            className="calm-note-input"
            placeholder="e.g. Emergency Cushion, Vacation, Gadget"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <label className="calm-modal-label">Target Amount (₹)</label>
          <input
            type="number"
            className="calm-note-input"
            placeholder="Target Amount"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            min="100"
            required
          />

          <label className="calm-modal-label">Target Completion Date</label>
          <input
            type="date"
            className="calm-note-input"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />

          <div className="calm-goal-pace-preview">
            <span className="material-symbols-outlined text-primary">schedule</span>
            <span>
              Save approx. <strong>₹{calculatedMonthly}/month</strong> for {diffMonths} months to hit target.
            </span>
          </div>

          <label className="calm-modal-label">Choose Icon &amp; Color</label>
          <div className="calm-icon-picker">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`calm-icon-choice ${icon === ic ? 'calm-icon-choice--active' : ''}`}
                onClick={() => setIcon(ic)}
              >
                <span className="material-symbols-outlined">{ic}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {COLORS.map((col) => (
              <button
                key={col}
                type="button"
                className={`calm-color-chip ${colorToken === col ? 'calm-color-chip--active' : ''}`}
                onClick={() => setColorToken(col)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: colorToken === col ? '2px solid var(--color-primary)' : '1px solid var(--color-outline-variant)',
                  backgroundColor: `var(--color-${col === 'neutral' ? 'outline' : col})`,
                  cursor: 'pointer',
                }}
                title={col}
              />
            ))}
          </div>
        </div>

        <button type="submit" className="calm-sheet__close-btn" disabled={isSaving || !name.trim()}>
          {isSaving ? 'Saving...' : goalToEdit ? 'Update Goal' : 'Create Goal ✨'}
        </button>

        {goalToEdit && onDeleteGoal && (
          <button
            type="button"
            className="calm-sheet__delete-btn"
            onClick={() => {
              if (window.confirm(`Delete goal "${goalToEdit.name}"?`)) {
                onDeleteGoal(goalToEdit.id);
                onClose();
              }
            }}
          >
            Delete Goal
          </button>
        )}
      </form>
    </div>
  );
};
