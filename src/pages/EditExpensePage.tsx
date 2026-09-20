import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { AmountInput } from '../components/transactions/AmountInput';
import { CategorySelector } from '../components/transactions/CategorySelector';
import { AccountSelector } from '../components/accounts/AccountSelector';
import { useFinancial } from '../context/useFinancial';
import { validateMoneyInput, toMajorUnits } from '../utils/money';
import type { NeedOrWant, Transaction } from '../types/transaction';
import { AlertCircle } from 'lucide-react';
import './AddExpensePage.css';

interface EditFormProps {
  transaction: Transaction;
}

const EditExpenseForm: React.FC<EditFormProps> = ({ transaction }) => {
  const navigate = useNavigate();
  const { accounts, categories, editTransaction } = useFinancial();

  const [amountStr, setAmountStr] = useState(() => toMajorUnits(transaction.amount).toString());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() => transaction.categoryId || null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => transaction.accountId || null);
  const [date, setDate] = useState<string>(() => transaction.date);
  const [description, setDescription] = useState(() => transaction.description || '');
  const [needOrWant, setNeedOrWant] = useState<NeedOrWant | null>(() => transaction.needOrWant || null);
  const [tagsInput, setTagsInput] = useState(() => (transaction.tags ? transaction.tags.join(', ') : ''));

  const [errors, setErrors] = useState<{
    amount?: string;
    category?: string;
    account?: string;
    date?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors: {
      amount?: string;
      category?: string;
      account?: string;
      date?: string;
    } = {};

    const amountVal = validateMoneyInput(amountStr);
    if (!amountVal.isValid) {
      newErrors.amount = amountVal.error;
    }

    if (!selectedCategoryId) {
      newErrors.category = 'Please select a category.';
    }

    if (!selectedAccountId) {
      newErrors.account = 'Please select an account.';
    }

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
        accountId: selectedAccountId!,
        categoryId: selectedCategoryId!,
        date,
        description: description.trim() || undefined,
        needOrWant,
        tags: tags.length > 0 ? tags : undefined,
      });

      navigate('/home', { replace: true });
    } catch (err) {
      console.error('Failed to update expense', err);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="page-container add-expense-form">
      <AmountInput
        value={amountStr}
        onChange={(val) => {
          setAmountStr(val);
          if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
        }}
        error={errors.amount}
      />

      <CategorySelector
        categories={categories.filter((c) => c.type === 'expense')}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={(catId) => {
          setSelectedCategoryId(catId);
          if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
        }}
        error={errors.category}
      />

      <AccountSelector
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={(accId) => {
          setSelectedAccountId(accId);
          if (errors.account) setErrors((prev) => ({ ...prev, account: undefined }));
        }}
        error={errors.account}
      />

      <div className="ui-input-group">
        <label htmlFor="edit-expense-date" className="ui-input-label">Date *</label>
        <div className="ui-input-container">
          <input
            id="edit-expense-date"
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

      <Input
        label="Description (Optional)"
        placeholder="e.g. Dinner with friends, Uber ride"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="need-want-group">
        <label className="ui-input-label">Classification (Optional)</label>
        <div className="need-want-options">
          <button
            type="button"
            className={`need-want-btn ${needOrWant === null ? 'need-want-btn--active' : ''}`}
            onClick={() => setNeedOrWant(null)}
          >
            Unclassified
          </button>
          <button
            type="button"
            className={`need-want-btn ${needOrWant === 'need' ? 'need-want-btn--active-need' : ''}`}
            onClick={() => setNeedOrWant('need')}
          >
            Need
          </button>
          <button
            type="button"
            className={`need-want-btn ${needOrWant === 'want' ? 'need-want-btn--active-want' : ''}`}
            onClick={() => setNeedOrWant('want')}
          >
            Want
          </button>
        </div>
      </div>

      <Input
        label="Tags (Optional)"
        placeholder="e.g. Work, Vacation, Personal (comma separated)"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        helperText="Separate multiple tags with commas"
      />

      <div className="add-expense-actions">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
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
    </form>
  );
};

export const EditExpensePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transactions } = useFinancial();

  const transaction = transactions.find((t) => t.id === id);

  if (!transaction) {
    return (
      <div className="add-expense-page">
        <PageHeader title="Edit Expense" onBack={() => navigate('/home')} />
        <div className="page-container">
          <EmptyState
            icon={<AlertCircle size={32} />}
            title="Transaction Not Found"
            description="The requested transaction could not be located or has been deleted."
            action={
              <Button variant="primary" onClick={() => navigate('/home')}>
                Return to Dashboard
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="add-expense-page">
      <PageHeader
        title="Edit Expense"
        onBack={() => navigate(-1)}
      />
      <EditExpenseForm transaction={transaction} />
    </div>
  );
};
