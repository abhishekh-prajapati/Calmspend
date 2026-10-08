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
    return accounts.length > 0 ? accounts[0].id : 'acc_primary';
  });
  const [targetAccountId, setTargetAccountId] = useState<string>(() => {
    return accounts.length > 1 ? accounts[1].id : accounts[0]?.id || 'acc_cash';
  });

  useEffect(() => {
    if (accounts.length > 0) {
      if (!selectedAccountId || selectedAccountId === 'default' || !accounts.some((a) => a.id === selectedAccountId)) {
        setSelectedAccountId(accounts[0].id);
      }
      if (!targetAccountId || targetAccountId === 'default' || !accounts.some((a) => a.id === targetAccountId)) {
        setTargetAccountId(accounts.length > 1 ? accounts[1].id : accounts[0].id);
      }
    }
  }, [accounts]);

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

  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);
  const toastTimeoutRef = React.useRef<number | null>(null);

  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const selectedAccountBalanceMinor = selectedAccount
    ? getAccountBalanceMinor(selectedAccount, transactions)
    : 0;
  const totalBalanceMinor = accounts.reduce(
    (sum, acc) => sum + getAccountBalanceMinor(acc, transactions),
    0
  );

  const handleSave = async () => {
    if (isSubmitting) return;

    const val = validateMoneyInput(amountStr || '0');
    if (!val.isValid || (val.minorUnits || 0) <= 0) {
      showError('Please enter an amount greater than ₹0.');
      return;
    }

    setIsSubmitting(true);
    const todayIso = new Date().toISOString().split('T')[0];
    const savedAmountFormatted = formatCurrency(toMajorUnits(val.minorUnits!));

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

      // Reset form fields for immediate next entry without navigating away
      setAmountStr('');
      setNote('');
      setIsSubmitting(false);

      const modeText = mode === 'expense' ? 'Expense' : mode === 'income' ? 'Income' : 'Transfer';
      setLastSavedMessage(`${modeText} of ${savedAmountFormatted} logged successfully!`);
      setShowToast(true);

      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setShowToast(false);
      }, 3500);
    } catch {
      setIsSubmitting(false);
      showError('Could not save transaction. Please try again.');
    }
  };

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard Enter shortcut to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [amountStr, mode, selectedCategoryId, selectedAccountId, targetAccountId, note, isSubmitting]);

  const displayVal = amountStr === '' ? '0.00' : amountStr;
  const modeLabel = mode === 'expense' ? 'Expense' : mode === 'income' ? 'Income' : 'Transfer';

  return (
    <div className="calm-tx-page">
      <div className="calm-tx-page__content">
        {/* Top Bar with Mode and Finish button */}
        <div className="calm-tx-top-header">
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
          <button
            type="button"
            className="calm-done-nav-btn"
            onClick={() => navigate('/home')}
            aria-label="Finished adding entries, go to home"
          >
            Done
          </button>
        </div>

        {/* Live Current Balance Badge */}
        <div className="calm-live-balance-card">
          <div className="calm-live-balance-card__account">
            <span className="material-symbols-outlined calm-live-balance-card__icon">
              {selectedAccount?.type === 'cash' ? 'payments' : 'account_balance_wallet'}
            </span>
            <div className="calm-live-balance-card__meta">
              <span className="calm-live-balance-card__label">
                {selectedAccount ? `${selectedAccount.name} Balance` : 'Current Balance'}
              </span>
              <span className="calm-live-balance-card__sublabel">
                Total Net: {formatCurrency(toMajorUnits(totalBalanceMinor))}
              </span>
            </div>
          </div>
          <div className="calm-live-balance-card__val">
            <span className="calm-live-balance-card__status-dot" />
            <span className="calm-live-balance-card__amount">
              {formatCurrency(toMajorUnits(selectedAccountBalanceMinor))}
            </span>
          </div>
        </div>

        {/* 2. Giant Tactile Currency Display */}
        <div className={`calm-amount-display-card calm-amount-display-card--${mode}`}>
          <div className="calm-amount-display-row">
            <span className="calm-amount-currency">₹</span>
            <span className="calm-amount-number">{displayVal}</span>
          </div>
          <div className="calm-amount-hint">
            <span className="material-symbols-outlined">dialpad</span>
            <span>Enter amount &bull; Tap Proceed to save &amp; keep adding</span>
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
                    className={`calm-cat-chip ${isSelected ? `calm-cat-chip--selected-${mode}` : ''}`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    <div
                      className="calm-cat-chip__icon"
                      style={{
                        color: isSelected ? 'var(--color-text-inverse, #ffffff)' : (cat.color || 'var(--color-primary)'),
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
              {mode === 'transfer' ? 'From Account' : mode === 'income' ? 'Deposit Into Account' : 'Payment Source'}
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
                    className={`calm-acc-chip ${isSelected ? `calm-acc-chip--selected-${mode}` : ''}`}
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
              <div className="calm-acc-chip calm-acc-chip--selected-expense">
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
                    className={`calm-acc-chip ${isSelected ? 'calm-acc-chip--selected-transfer' : ''}`}
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
            placeholder="e.g. Note or description (Optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            className="calm-note-mic"
            onClick={() => setNote('Sample transaction note')}
            aria-label="Voice input sample"
          >
            <span className="material-symbols-outlined">mic</span>
          </button>
        </div>
      </div>

      {/* Pinned Bottom Sheet Keypad & Action Dock */}
      <div className="calm-tx-page__bottom-dock">
        {/* 7. Senior-Friendly Ergonomic Numeric Keypad */}
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

        {/* 8. Sticky Confirmation / Proceed Bottom Button */}
        <div className="calm-save-footer">
          <button
            type="button"
            className={`calm-save-btn calm-save-btn--${mode}`}
            onClick={handleSave}
            disabled={isSubmitting}
            aria-label={`Proceed and Save ${modeLabel}`}
          >
            <span className="material-symbols-outlined">check_circle</span>
            <span>
              {isSubmitting
                ? 'Saving...'
                : `OK / Proceed &bull; Save ₹${displayVal} ${modeLabel}`}
            </span>
          </button>
        </div>
      </div>

      {/* 9. Success Toast Notification */}
      {showToast && (
        <div className="calm-toast" role="status" aria-live="polite">
          <div className="calm-toast__icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="calm-toast__text">
            <strong>{lastSavedMessage || 'Entry logged!'}</strong>
            <span>
              Current Balance: <strong>{formatCurrency(toMajorUnits(selectedAccountBalanceMinor))}</strong>
            </span>
          </div>
          <button
            type="button"
            className="calm-toast__action-btn"
            onClick={() => navigate('/home')}
            aria-label="Finish and go to home page"
          >
            Home
          </button>
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
