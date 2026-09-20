import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { AmountInput } from '../components/transactions/AmountInput';
import { AccountModal } from '../components/accounts/AccountModal';
import { useFinancial } from '../context/useFinancial';
import { validateMoneyInput, toMajorUnits } from '../utils/money';
import { formatCurrency } from '../services/currency';
import { getAccountBalanceMinor } from '../services/financialCalculations';
import type { Transaction } from '../types/transaction';
import { AlertCircle, Plus, ArrowRight } from 'lucide-react';
import './AddExpensePage.css';

interface EditTransferFormProps {
  transaction: Transaction;
}

const EditTransferForm: React.FC<EditTransferFormProps> = ({ transaction }) => {
  const navigate = useNavigate();
  const { accounts, transactions, editTransaction, addAccount } = useFinancial();

  const activeAccounts = accounts.filter((a) => a.isActive || a.id === transaction.fromAccountId || a.id === transaction.toAccountId);

  // Form State
  const [amountStr, setAmountStr] = useState(() => toMajorUnits(transaction.amount).toString());
  const [fromAccountId, setFromAccountId] = useState<string | null>(() => transaction.fromAccountId || null);
  const [toAccountId, setToAccountId] = useState<string | null>(() => transaction.toAccountId || null);
  const [date, setDate] = useState<string>(() => transaction.date);
  const [description, setDescription] = useState(() => transaction.description || '');
  const [tagsInput, setTagsInput] = useState(() => (transaction.tags ? transaction.tags.join(', ') : ''));

  // UI / Modal / Validation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetSelectorForModal, setTargetSelectorForModal] = useState<'from' | 'to'>('from');
  const [errors, setErrors] = useState<{
    amount?: string;
    fromAccount?: string;
    toAccount?: string;
    date?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromAccount = fromAccountId ? accounts.find((a) => a.id === fromAccountId) : undefined;
  const toAccount = toAccountId ? accounts.find((a) => a.id === toAccountId) : undefined;

  const handleOpenAccountModal = (target: 'from' | 'to') => {
    setTargetSelectorForModal(target);
    setIsModalOpen(true);
  };

  const handleAccountCreated = (newAcc: { id: string }) => {
    if (targetSelectorForModal === 'from') {
      setFromAccountId(newAcc.id);
    } else {
      setToAccountId(newAcc.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors: {
      amount?: string;
      fromAccount?: string;
      toAccount?: string;
      date?: string;
      general?: string;
    } = {};

    // 1. Validate Amount
    const amountVal = validateMoneyInput(amountStr);
    if (!amountVal.isValid) {
      newErrors.amount = amountVal.error;
    }

    // 2. Validate Source Account
    if (!fromAccountId || !fromAccount) {
      newErrors.fromAccount = 'Please select a source account.';
    } else if (!fromAccount.isActive) {
      newErrors.fromAccount = 'Source account is inactive.';
    }

    // 3. Validate Destination Account
    if (!toAccountId || !toAccount) {
      newErrors.toAccount = 'Please select a destination account.';
    } else if (!toAccount.isActive) {
      newErrors.toAccount = 'Destination account is inactive.';
    }

    // 4. Same Account Check
    if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
      newErrors.toAccount = 'Destination account must be different from source account.';
    }

    // 5. Currency Check
    if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
      newErrors.general = 'Transfers between different currencies are not supported yet.';
    }

    // 6. Insufficient Funds Check (for non-credit-card source accounts, taking into account original transfer amount)
    if (fromAccount && amountVal.isValid && fromAccount.type !== 'credit_card') {
      const currentSourceBalanceMinor = getAccountBalanceMinor(fromAccount, transactions);
      // If the source account is the same as the original, add back original amount
      const availableMinor = fromAccountId === transaction.fromAccountId
        ? currentSourceBalanceMinor + transaction.amount
        : currentSourceBalanceMinor;

      if (amountVal.minorUnits! > availableMinor) {
        newErrors.amount = `Insufficient balance in ${fromAccount.name}. Available: ${formatCurrency(toMajorUnits(availableMinor))}.`;
      }
    }

    // 7. Validate Date
    if (!date) {
      newErrors.date = 'Date is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await editTransaction(transaction.id, {
        amount: amountVal.minorUnits!,
        fromAccountId: fromAccountId!,
        toAccountId: toAccountId!,
        date,
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      navigate('/home', { replace: true });
    } catch (err) {
      console.error('Failed to update transfer', err);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="page-container add-expense-form">
      {/* General Error Banner */}
      {errors.general && (
        <div className="ui-input-helper ui-input-helper--error" style={{ marginBottom: 'var(--spacing-2)' }}>
          {errors.general}
        </div>
      )}

      {/* Amount Input */}
      <AmountInput
        value={amountStr}
        onChange={(val) => {
          setAmountStr(val);
          if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
        }}
        error={errors.amount}
      />

      {/* From Account Selector */}
      <div className="ui-input-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label htmlFor="edit-from-account-select" className="ui-input-label" style={{ marginBottom: 0 }}>From Account *</label>
          <button
            type="button"
            className="caption"
            style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            onClick={() => handleOpenAccountModal('from')}
          >
            <Plus size={14} />
            New Account
          </button>
        </div>

        <div className="ui-input-container">
          <select
            id="edit-from-account-select"
            className="ui-input"
            value={fromAccountId || ''}
            onChange={(e) => {
              setFromAccountId(e.target.value || null);
              if (errors.fromAccount) setErrors((prev) => ({ ...prev, fromAccount: undefined }));
            }}
          >
            {activeAccounts.length === 0 ? (
              <option value="">No accounts available</option>
            ) : (
              activeAccounts.map((acc) => {
                const bal = getAccountBalanceMinor(acc, transactions);
                return (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()}) — {formatCurrency(toMajorUnits(bal))}
                  </option>
                );
              })
            )}
          </select>
        </div>
        {errors.fromAccount && <span className="ui-input-helper ui-input-helper--error">{errors.fromAccount}</span>}
      </div>

      {/* Transfer Arrow Indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
          <ArrowRight size={18} />
        </div>
      </div>

      {/* To Account Selector */}
      <div className="ui-input-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label htmlFor="edit-to-account-select" className="ui-input-label" style={{ marginBottom: 0 }}>To Account *</label>
          <button
            type="button"
            className="caption"
            style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            onClick={() => handleOpenAccountModal('to')}
          >
            <Plus size={14} />
            New Account
          </button>
        </div>

        <div className="ui-input-container">
          <select
            id="edit-to-account-select"
            className="ui-input"
            value={toAccountId || ''}
            onChange={(e) => {
              setToAccountId(e.target.value || null);
              if (errors.toAccount) setErrors((prev) => ({ ...prev, toAccount: undefined }));
            }}
          >
            {activeAccounts.length === 0 ? (
              <option value="">No accounts available</option>
            ) : (
              activeAccounts.map((acc) => {
                const bal = getAccountBalanceMinor(acc, transactions);
                const isSource = acc.id === fromAccountId;
                return (
                  <option key={acc.id} value={acc.id} disabled={isSource}>
                    {acc.name} ({acc.type.toUpperCase()}) — {formatCurrency(toMajorUnits(bal))} {isSource ? '(Source)' : ''}
                  </option>
                );
              })
            )}
          </select>
        </div>
        {errors.toAccount && <span className="ui-input-helper ui-input-helper--error">{errors.toAccount}</span>}
      </div>

      {/* Date Input */}
      <div className="ui-input-group">
        <label htmlFor="edit-transfer-date" className="ui-input-label">Date *</label>
        <div className="ui-input-container">
          <input
            id="edit-transfer-date"
            type="date"
            className="ui-input"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
            }}
          />
        </div>
        {errors.date && <span className="ui-input-helper ui-input-helper--error">{errors.date}</span>}
      </div>

      {/* Description Input */}
      <Input
        label="Description (Optional)"
        placeholder="e.g. Moving salary to savings, Emergency fund"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* Tags Input */}
      <Input
        label="Tags (Optional)"
        placeholder="e.g. Savings, Internal, Buffer (comma separated)"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        helperText="Separate multiple tags with commas"
      />

      {/* Form Actions */}
      <div className="add-expense-actions">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating Transfer...' : 'Update Transfer'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => navigate(-1)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>

      {/* Inline Account Creation Modal */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={addAccount}
        onAccountCreated={handleAccountCreated}
      />
    </form>
  );
};

export const EditTransferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transactions } = useFinancial();

  const transaction = id ? transactions.find((t) => t.id === id && t.type === 'transfer') : undefined;

  return (
    <div className="add-expense-page">
      <PageHeader
        title="Edit Transfer"
        onBack={() => navigate(-1)}
      />

      {!transaction ? (
        <div className="page-container" style={{ paddingTop: 'var(--spacing-6)' }}>
          <EmptyState
            icon={<AlertCircle size={32} />}
            title="Transfer Record Not Found"
            description="The requested transfer transaction does not exist or has been deleted."
            action={
              <Button variant="primary" onClick={() => navigate('/home')}>
                Return to Dashboard
              </Button>
            }
          />
        </div>
      ) : (
        <EditTransferForm transaction={transaction} />
      )}
    </div>
  );
};
