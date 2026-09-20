import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFinancial } from '../context/useFinancial';
import { formatCurrency } from '../services/currency';
import { validateMoneyInput, toMajorUnits } from '../utils/money';
import { getAccountBalanceMinor } from '../services/financialCalculations';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import './AddExpensePage.css';

export interface AddExpensePageProps {
  initialMode?: 'expense' | 'income' | 'transfer';
}

export const AddExpensePage: React.FC<AddExpensePageProps> = ({ initialMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accounts, categories, transactions, addTransaction } = useFinancial();

  const getStartingMode = (): 'expense' | 'income' | 'transfer' => {
    if (initialMode) return initialMode;
    if (location.pathname.startsWith('/income')) return 'income';
    if (location.pathname.startsWith('/transfer')) return 'transfer';
    return 'expense';
  };

  const [mode, setMode] = useState<'expense' | 'income' | 'transfer'>(getStartingMode);
  const [amountStr, setAmountStr] = useState<string>('');

  // Update mode if URL or initialMode changes
  useEffect(() => {
    const nextMode = getStartingMode();
    setMode(nextMode);
    if (nextMode !== 'transfer') {
      const cats = categories.filter((c) =>
        nextMode === 'income' ? c.type === 'income' : c.type === 'expense'
      );
      if (cats.length > 0) {
        setSelectedCategoryId(cats[0].id);
      }
    }
  }, [location.pathname, initialMode]);

  const availableCategories = categories.filter((c) =>
    mode === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    const startingMode = getStartingMode();
    const startingCats = categories.filter((c) =>
      startingMode === 'income' ? c.type === 'income' : c.type === 'expense'
    );
    return startingCats[0]?.id || (categories.length > 0 ? categories[0].id : 'cat_groceries');
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return accounts.length > 0 ? accounts[0].id : 'default';
  });
  const [targetAccountId, setTargetAccountId] = useState<string>(() => {
    return accounts.length > 1 ? accounts[1].id : accounts[0]?.id || 'default';
  });
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleModeChange = (newMode: 'expense' | 'income' | 'transfer') => {
    setMode(newMode);
    if (newMode !== 'transfer') {
      const cats = categories.filter((c) =>
        newMode === 'income' ? c.type === 'income' : c.type === 'expense'
      );
      if (cats.length > 0) {
        setSelectedCategoryId(cats[0].id);
      }
    }
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorMessage(null);
    }, 3000);
  };

  // Ergonomic Keypad handler
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setAmountStr((prev) => (prev.length > 0 ? prev.slice(0, -1) : ''));
      return;
    }

    if (key === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr((prev) => (prev === '' ? '0.' : prev + '.'));
      }
      return;
    }

    // Numerical
    if (amountStr.includes('.')) {
      const parts = amountStr.split('.');
      if (parts[1] && parts[1].length >= 2) return; // Max 2 decimal digits
    }

    setAmountStr((prev) => (prev === '0' ? key : prev + key));
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    const val = validateMoneyInput(amountStr || '0');
    if (!val.isValid || (val.minorUnits || 0) <= 0) {
      showError('Please enter an amount greater than ₹0.');
      return;
    }

    setIsSubmitting(true);
    const todayIso = new Date().toISOString().split('T')[0];

    try {
      const activeCat =
        categories.find((c) => c.id === selectedCategoryId) || availableCategories[0] || categories[0];
      const catName = activeCat ? activeCat.name : 'General';

      if (mode === 'expense') {
        await addTransaction({
          type: 'expense',
          amount: val.minorUnits!,
          accountId: selectedAccountId,
          categoryId: activeCat ? activeCat.id : 'cat_general',
          date: todayIso,
          description: note.trim() || catName,
        });
      } else if (mode === 'income') {
        await addTransaction({
          type: 'income',
          amount: val.minorUnits!,
          accountId: selectedAccountId,
          categoryId: activeCat ? activeCat.id : 'cat_income',
          date: todayIso,
          description: note.trim() || catName,
        });
      } else {
        await addTransaction({
          type: 'transfer',
          amount: val.minorUnits!,
          fromAccountId: selectedAccountId,
          toAccountId: targetAccountId,
          date: todayIso,
          description: note.trim() || 'Account Transfer',
        });
      }

      setShowToast(true);
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 900);
    } catch {
      setIsSubmitting(false);
      showError('Could not save transaction. Please try again.');
    }
  };

  const displayVal = amountStr === '' ? '0.00' : amountStr;

  return (
    <div className="calm-tx-page">
      {/* 1. Mode Selector Pills */}
      <div className="calm-mode-pill-bar">
        <button
          type="button"
          className={`calm-mode-pill ${mode === 'expense' ? 'calm-mode-pill--active-expense' : ''}`}
          onClick={() => handleModeChange('expense')}
        >
          <span className="material-symbols-outlined">shopping_bag</span>
          <span>Expense</span>
        </button>

        <button
          type="button"
          className={`calm-mode-pill ${mode === 'income' ? 'calm-mode-pill--active-income' : ''}`}
          onClick={() => handleModeChange('income')}
        >
          <span className="material-symbols-outlined">savings</span>
          <span>Income</span>
        </button>

        <button
          type="button"
          className={`calm-mode-pill ${mode === 'transfer' ? 'calm-mode-pill--active-transfer' : ''}`}
          onClick={() => handleModeChange('transfer')}
        >
          <span className="material-symbols-outlined">swap_horiz</span>
          <span>Transfer</span>
        </button>
      </div>

      {/* 2. Giant Tactile Currency Display */}
      <div className="calm-amount-display-card">
        <div className="calm-amount-display-row">
          <span className="calm-amount-currency">₹</span>
          <span className="calm-amount-number">{displayVal}</span>
        </div>
        <div className="calm-amount-hint">
          <span className="material-symbols-outlined">dialpad</span>
          <span>Tap keypad below to change amount</span>
        </div>
      </div>

      {/* 3. Category Choice Grid with Real SVG Icons */}
      {mode !== 'transfer' && (
        <div className="calm-section-block">
          <div className="calm-section-block__header">
            <span className="calm-section-block__title">Select Category</span>
            <span className="calm-section-block__subtitle">
              {availableCategories.length} Available
            </span>
          </div>

          <div className="calm-cat-grid">
            {availableCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`calm-cat-chip ${isSelected ? 'calm-cat-chip--selected' : ''}`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  <div
                    className="calm-cat-chip__icon"
                    style={{
                      color: isSelected ? 'var(--color-text-inverse)' : (cat.color || 'var(--color-primary)'),
                    }}
                  >
                    <CategoryIcon iconName={cat.icon} size={20} />
                  </div>
                  <span className="calm-cat-chip__name">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Payment Source Selector */}
      <div className="calm-section-block">
        <div className="calm-section-block__header">
          <span className="calm-section-block__title">
            {mode === 'transfer' ? 'From Account' : 'Payment Source'}
          </span>
          <span className="calm-section-block__subtitle">Tap to pick</span>
        </div>

        <div className="calm-acc-grid">
          {accounts.length > 0 ? (
            accounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              const balanceMinor = getAccountBalanceMinor(acc, transactions);
              return (
                <button
                  key={acc.id}
                  type="button"
                  className={`calm-acc-chip ${isSelected ? 'calm-acc-chip--selected' : ''}`}
                  onClick={() => setSelectedAccountId(acc.id)}
                >
                  <div className="calm-acc-chip__top">
                    <span className="material-symbols-outlined">
                      {acc.type === 'cash' ? 'payments' : acc.type === 'credit_card' ? 'credit_card' : 'account_balance'}
                    </span>
                    {isSelected && (
                      <span className="material-symbols-outlined calm-acc-chip__check">check_circle</span>
                    )}
                  </div>
                  <span className="calm-acc-chip__name">{acc.name}</span>
                  <span className="calm-acc-chip__balance">
                    {formatCurrency(toMajorUnits(balanceMinor))}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="calm-acc-chip calm-acc-chip--selected">
              <span className="calm-acc-chip__name">Checking</span>
              <span className="calm-acc-chip__balance">₹0.00</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Destination Account (If Transfer Mode) */}
      {mode === 'transfer' && (
        <div className="calm-section-block">
          <div className="calm-section-block__header">
            <span className="calm-section-block__title">To Destination Account</span>
          </div>
          <div className="calm-acc-grid">
            {accounts.map((acc) => {
              const isSelected = targetAccountId === acc.id;
              return (
                <button
                  key={`dest-${acc.id}`}
                  type="button"
                  className={`calm-acc-chip ${isSelected ? 'calm-acc-chip--selected' : ''}`}
                  onClick={() => setTargetAccountId(acc.id)}
                >
                  <div className="calm-acc-chip__top">
                    <span className="material-symbols-outlined">account_balance</span>
                    {isSelected && (
                      <span className="material-symbols-outlined calm-acc-chip__check">check_circle</span>
                    )}
                  </div>
                  <span className="calm-acc-chip__name">{acc.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Quick Note Input */}
      <div className="calm-note-card">
        <span className="material-symbols-outlined calm-note-icon">edit_note</span>
        <input
          type="text"
          className="calm-note-input"
          placeholder="e.g. Trader Joe's fruit &amp; milk (Optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          className="calm-note-mic"
          onClick={() => setNote('Groceries & morning breakfast')}
          aria-label="Voice input sample"
        >
          <span className="material-symbols-outlined">mic</span>
        </button>
      </div>

      {/* 7. Senior-Friendly Ergonomic Numeric Keypad (54px touch targets) */}
      <div className="calm-keypad-card">
        <div className="calm-keypad-row">
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('1')}>1</button>
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('2')}>2</button>
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('3')}>3</button>
        </div>
        <div className="calm-keypad-row">
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('4')}>4</button>
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('5')}>5</button>
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('6')}>6</button>
        </div>
        <div className="calm-keypad-row">
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('7')}>7</button>
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('8')}>8</button>
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('9')}>9</button>
        </div>
        <div className="calm-keypad-row">
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('.')}>.</button>
          <button type="button" className="calm-key-btn" onClick={() => handleKeyPress('0')}>0</button>
          <button
            type="button"
            className="calm-key-btn"
            onClick={() => handleKeyPress('backspace')}
            aria-label="Delete last digit"
          >
            <span className="material-symbols-outlined">backspace</span>
          </button>
        </div>
      </div>

      {/* 8. Sticky Confirmation Bottom Button */}
      <div className="calm-save-footer">
        <button
          type="button"
          className="calm-save-btn"
          onClick={handleSave}
          disabled={isSubmitting}
        >
          <span className="material-symbols-outlined">check</span>
          <span>
            {isSubmitting
              ? 'Saving...'
              : `Save ₹${displayVal} ${mode === 'expense' ? 'Expense' : mode === 'income' ? 'Income' : 'Transfer'}`}
          </span>
        </button>
      </div>

      {/* 9. Success Toast Notification */}
      {showToast && (
        <div className="calm-toast">
          <div className="calm-toast__icon">
            <span className="material-symbols-outlined">done_all</span>
          </div>
          <div className="calm-toast__text">
            <strong>Successfully logged!</strong>
            <span>Your spend balances are safely updated.</span>
          </div>
        </div>
      )}

      {/* 10. Error Toast Notification */}
      {errorMessage && (
        <div className="calm-toast" style={{ borderColor: 'var(--color-terracotta)' }}>
          <div className="calm-toast__icon" style={{ background: 'var(--color-terracotta-container)', color: 'var(--color-terracotta)' }}>
            <span className="material-symbols-outlined">error_outline</span>
          </div>
          <div className="calm-toast__text">
            <strong style={{ color: 'var(--color-terracotta)' }}>Notice</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
