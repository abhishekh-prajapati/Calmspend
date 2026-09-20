import React, { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { validateMoneyInput } from '../../utils/money';
import type { Account, AccountType } from '../../types/transaction';
import './AccountModal.css';

export interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Account>;
  onAccountCreated?: (account: Account) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onAccountCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balanceInput, setBalanceInput] = useState('0');
  const [errors, setErrors] = useState<{ name?: string; balance?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accountTypes: { value: AccountType; label: string }[] = [
    { value: 'bank', label: 'Bank Account' },
    { value: 'cash', label: 'Cash' },
    { value: 'savings', label: 'Savings' },
  ];

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSubmitting) return;

    const newErrors: { name?: string; balance?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Account name is required.';
    }

    // Opening balance can be 0 or positive
    let minorUnits = 0;
    const trimmedBal = balanceInput.trim();
    if (trimmedBal !== '0' && trimmedBal !== '') {
      const valResult = validateMoneyInput(trimmedBal);
      if (!valResult.isValid) {
        newErrors.balance = valResult.error;
      } else {
        minorUnits = valResult.minorUnits || 0;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const created = await onSave({
        name: name.trim(),
        type,
        openingBalance: minorUnits,
        currency: 'INR',
        isActive: true,
      });

      setName('');
      setType('bank');
      setBalanceInput('0');
      setIsSubmitting(false);

      if (onAccountCreated) {
        onAccountCreated(created);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create account', err);
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Create Account" subtitle="Add an account to record your finances">
      <div className="account-modal-form" onKeyDown={handleKeyDown}>
        <Input
          label="Account Name"
          placeholder="e.g. HDFC Bank, Cash Wallet"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
          autoFocus
        />

        <div className="account-modal-type-group">
          <label className="ui-input-label">Account Type</label>
          <div className="account-modal-type-options">
            {accountTypes.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`account-type-btn ${type === opt.value ? 'account-type-btn--active' : ''}`}
                onClick={() => setType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Opening Balance"
          placeholder="0.00"
          value={balanceInput}
          onChange={(e) => {
            setBalanceInput(e.target.value);
            if (errors.balance) setErrors((prev) => ({ ...prev, balance: undefined }));
          }}
          error={errors.balance}
          prefix={<span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>₹</span>}
          inputMode="decimal"
          helperText="Your starting account balance"
        />

        <div className="account-modal-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Account'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
