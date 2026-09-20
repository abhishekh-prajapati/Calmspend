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
import type { Transaction } from '../types/transaction';
import { AlertCircle } from 'lucide-react';
import './AddExpensePage.css';

interface EditIncomeFormProps {
  transaction: Transaction;
}

const EditIncomeForm: React.FC<EditIncomeFormProps> = ({ transaction }) => {
  const navigate = useNavigate();
  const { accounts, categories, editTransaction } = useFinancial();

  const [amountStr, setAmountStr] = useState(() => toMajorUnits(transaction.amount).toString());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() => transaction.categoryId || null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => transaction.accountId || null);
  const [date, setDate] = useState<string>(() => transaction.date);
  const [description, setDescription] = useState(() => transaction.description || '');
  const [tagsInput, setTagsInput] = useState(() => (transaction.tags ? transaction.tags.join(', ') : ''));

  const [errors, setErrors] = useState<{
    amount?: string;
    category?: string;
    account?: string;
    date?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Income categories filter
  const incomeCategories = categories.filter((c) => c.type === 'income');

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
      newErrors.category = 'Please select an income category.';
    }

    if (!selectedAccountId) {
      newErrors.account = 'Please select or create an account.';
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
        tags: tags.length > 0 ? tags : undefined,
      });

      navigate('/home', { replace: true });
    } catch (err) {
      console.error('Failed to update income', err);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="page-container add-expense-form">
      {/* Amount Input */}
      <AmountInput
        value={amountStr}
        onChange={(val) => {
          setAmountStr(val);
          if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
        }}
        error={errors.amount}
      />

      {/* Income Category Selector */}
      <CategorySelector
        categories={incomeCategories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={(id) => {
          setSelectedCategoryId(id);
          if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
        }}
        error={errors.category}
      />

      {/* Account Selector */}
      <AccountSelector
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={(id) => {
          setSelectedAccountId(id);
          if (errors.account) setErrors((prev) => ({ ...prev, account: undefined }));
        }}
        error={errors.account}
      />

      {/* Date Input */}
      <div className="ui-input-group">
        <label htmlFor="edit-income-date" className="ui-input-label">Date *</label>
        <div className="ui-input-container">
          <input
            id="edit-income-date"
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
        placeholder="e.g. Monthly salary, Freelance design payout"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* Tags Input */}
      <Input
        label="Tags (Optional)"
        placeholder="e.g. Primary, Bonus, Client (comma separated)"
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
          {isSubmitting ? 'Updating Income...' : 'Update Income'}
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

export const EditIncomePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transactions } = useFinancial();

  const transaction = id ? transactions.find((t) => t.id === id && t.type === 'income') : undefined;

  return (
    <div className="add-expense-page">
      <PageHeader
        title="Edit Income"
        onBack={() => navigate(-1)}
      />

      {!transaction ? (
        <div className="page-container" style={{ paddingTop: 'var(--spacing-6)' }}>
          <EmptyState
            icon={<AlertCircle size={32} />}
            title="Income Record Not Found"
            description="The requested income transaction does not exist or has been deleted."
            action={
              <Button variant="primary" onClick={() => navigate('/home')}>
                Return to Dashboard
              </Button>
            }
          />
        </div>
      ) : (
        <EditIncomeForm transaction={transaction} />
      )}
    </div>
  );
};
