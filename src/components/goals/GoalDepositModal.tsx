import React, { useState } from 'react';
import type { Account } from '../../types/transaction';
import { toMinorUnits } from '../../utils/money';

export interface GoalDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: { id: string; name: string } | null;
  accounts: Account[];
  onConfirmDeposit: (params: {
    goalId: string;
    amountMinor: number;
    accountId?: string;
    note?: string;
  }) => Promise<void>;
}

export const GoalDepositModal: React.FC<GoalDepositModalProps> = ({
  isOpen,
  onClose,
  goal,
  accounts,
  onConfirmDeposit,
}) => {
  const [amount, setAmount] = useState('500');
  const [accountId, setAccountId] = useState(() =>
    accounts.length > 0 ? accounts[0].id : '',
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !goal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    setIsSubmitting(true);
    try {
      await onConfirmDeposit({
        goalId: goal.id,
        amountMinor: toMinorUnits(amount),
        accountId: accountId || undefined,
        note: note.trim() || `Stashed to ${goal.name} 🌱`,
      });
      onClose();
      setAmount('500');
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="calm-sheet-overlay" onClick={onClose}>
      <form className="calm-sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="calm-sheet__handle"></div>
        <div className="calm-sheet__header">
          <div className="calm-sheet__icon">
            <span className="material-symbols-outlined">savings</span>
          </div>
          <span className="calm-sheet__title">Stash Money in {goal.name}</span>
        </div>

        <div className="calm-sheet__metrics">
          <label className="calm-modal-label">Amount to Deposit (₹)</label>
          <input
            type="number"
            className="calm-note-input"
            placeholder="Amount (e.g. 500)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
            min="1"
          />

          <div className="calm-quick-amounts">
            {['100', '500', '1000', '2500'].map((amt) => (
              <button
                key={amt}
                type="button"
                className="calm-micro-btn"
                onClick={() => setAmount(amt)}
              >
                ₹{amt}
              </button>
            ))}
          </div>

          {accounts.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <label className="calm-modal-label">From Account</label>
              <select
                className="calm-notif-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <label className="calm-modal-label">Note (Optional)</label>
            <input
              type="text"
              className="calm-note-input"
              placeholder="e.g. Bonus, spare change, daily savings"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="calm-sheet__close-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Stashing...' : `Confirm & Stash ₹${amount || '0'} ✨`}
        </button>
      </form>
    </div>
  );
};
