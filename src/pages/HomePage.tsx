import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/useFinancial';
import { formatCurrency } from '../services/currency';
import { toMajorUnits } from '../utils/money';
import { getAccountBalanceMinor } from '../services/financialCalculations';
import type { ScheduledOccurrence } from '../types/recurring';
import { ConnectBankModal } from '../components/accounts/ConnectBankModal';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    accounts,
    summary,
    transactions,
    upcomingOccurrences,
    recordOccurrencePayment,
    getCategory,
    disconnectLinkedBank,
  } = useFinancial();

  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [isConnectBankOpen, setIsConnectBankOpen] = useState(false);
  const [paidBills, setPaidBills] = useState<Record<string, boolean>>({});

  const handleDisconnectAccount = async (e: React.MouseEvent, accountId: string, accountName: string) => {
    e.stopPropagation();
    if (window.confirm(`Disconnect "${accountName}" and remove its balance & imported bank transactions?`)) {
      await disconnectLinkedBank(accountId);
    }
  };

  // Calculations
  const safeToSpendMajor = toMajorUnits(summary.dailyAllowanceMinor || summary.availableToSpendMinor || 0);
  const availableBalanceMajor = toMajorUnits(summary.currentBalanceMinor);
  const monthlyExpensesMajor = toMajorUnits(summary.monthlyExpensesMinor);

  // Today's spending from transactions
  const todayIso = new Date().toISOString().split('T')[0];
  const todayExpensesMinor = transactions
    .filter((t) => t.type === 'expense' && t.date === todayIso)
    .reduce((sum, t) => sum + t.amount, 0);
  const todaySpentMajor = toMajorUnits(todayExpensesMinor);
  const dailyCapMajor = safeToSpendMajor + todaySpentMajor;
  const progressPercent = dailyCapMajor > 0 ? Math.min(100, Math.round((todaySpentMajor / dailyCapMajor) * 100)) : 0;

  // Filter urgent bills in next 48h or upcoming
  const urgentBills = upcomingOccurrences.slice(0, 2);

  const handleMarkBillPaid = async (occurrence: ScheduledOccurrence) => {
    try {
      const primaryAccount = accounts.find((a) => a.type === 'bank') || accounts[0];
      await recordOccurrencePayment(occurrence, {
        amountMinor: occurrence.amountMinor,
        date: todayIso,
        accountId: primaryAccount ? primaryAccount.id : 'default',
        description: `Paid ${occurrence.name}`,
      });
      setPaidBills((prev) => ({ ...prev, [occurrence.occurrenceKey]: true }));
    } catch {
      setPaidBills((prev) => ({ ...prev, [occurrence.occurrenceKey]: true }));
    }
  };

  const recentTransactions = transactions.slice(0, 5);

  const getCategoryEmoji = (categoryName?: string): string => {
    const cat = (categoryName || '').toLowerCase();
    if (cat.includes('food') || cat.includes('dining') || cat.includes('cafe')) return '☕';
    if (cat.includes('grocer') || cat.includes('market')) return '🛒';
    if (cat.includes('transit') || cat.includes('transport') || cat.includes('fuel')) return '🚌';
    if (cat.includes('health') || cat.includes('care') || cat.includes('med')) return '💊';
    if (cat.includes('bill') || cat.includes('util') || cat.includes('rent')) return '💡';
    if (cat.includes('fun') || cat.includes('gift') || cat.includes('entertain')) return '🎁';
    if (cat.includes('salary') || cat.includes('income') || cat.includes('pay')) return '💰';
    return '💳';
  };

  return (
    <div className="calm-home">
      {/* 1. Safe to Spend Hero Card */}
      <section className="calm-hero-card">
        <div className="calm-hero-card__glow"></div>
        <div className="calm-hero-card__content">
          <div className="calm-hero-card__top">
            <div className="calm-hero-card__badge">
              <span className="material-symbols-outlined calm-hero-card__badge-icon">spa</span>
              <span className="calm-hero-card__badge-text">Relax, you are on track</span>
            </div>
            <button
              type="button"
              className="calm-hero-card__help-btn"
              onClick={() => setIsExplanationOpen(true)}
              aria-label="Explanation of Safe to Spend"
            >
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>

          <div className="calm-hero-card__amount-section">
            <span className="calm-hero-card__subtitle">Safe to spend today</span>
            <div className="calm-hero-card__amount-row">
              <span className="calm-hero-card__amount">{formatCurrency(safeToSpendMajor)}</span>
              <span className="calm-hero-card__amount-unit">left</span>
            </div>
          </div>

          {/* Progress Meter */}
          <div className="calm-meter">
            <div className="calm-meter__track">
              <div
                className="calm-meter__bar"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="calm-meter__labels">
              <span>
                Spent today: <strong>{formatCurrency(todaySpentMajor)}</strong>
              </span>
              <span>Daily cap: {formatCurrency(dailyCapMajor > 0 ? dailyCapMajor : safeToSpendMajor)}</span>
            </div>
          </div>

          {/* Context Footnote */}
          <div className="calm-hero-card__footnote">
            <span className="material-symbols-outlined calm-hero-card__footnote-icon">update</span>
            <span>{formatCurrency(toMajorUnits(summary.availableToSpendMinor || 0))} available this month • Resets daily</span>
          </div>
        </div>
      </section>

      {/* 2. Liquid Funds & Cash Accounts Section */}
      <section className="calm-accounts-card">
        <div className="calm-accounts-card__header">
          <div className="calm-accounts-card__title-group">
            <span className="calm-accounts-card__subtitle">Available Cash &amp; Accounts</span>
            <span className="calm-accounts-card__total">{formatCurrency(availableBalanceMajor)}</span>
          </div>
          <button
            type="button"
            className="calm-linked-banks-connect-btn"
            style={{ minHeight: 32, fontSize: 12, padding: '0 10px' }}
            onClick={() => setIsConnectBankOpen(true)}
            title="Connect bank using Account Aggregator"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_link</span>
            <span>Link Bank</span>
          </button>
        </div>

        {/* Accounts Chips Horizontal Strip */}
        <div className="calm-accounts-strip">
          {accounts.length > 0 ? (
            accounts.map((acc) => {
              const accBalanceMinor = getAccountBalanceMinor(acc, transactions);
              return (
                <div key={acc.id} className="calm-account-chip">
                  <span className={`calm-account-chip__dot calm-account-chip__dot--${acc.type}`}></span>
                  <span className="calm-account-chip__label">
                    {acc.name}: <strong>{formatCurrency(toMajorUnits(accBalanceMinor))}</strong>
                  </span>
                  <button
                    type="button"
                    className="calm-account-chip__remove-btn"
                    onClick={(e) => handleDisconnectAccount(e, acc.id, acc.name)}
                    title={`Remove / Disconnect ${acc.name}`}
                    aria-label={`Remove ${acc.name}`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="calm-account-chip">
              <span className="calm-account-chip__dot"></span>
              <span className="calm-account-chip__label">Cash: <strong>₹0.00</strong></span>
            </div>
          )}
        </div>
      </section>

      {/* 3. High-Touch 1-Tap Quick Actions */}
      <section className="calm-quick-actions">
        <button
          type="button"
          className="calm-quick-btn"
          onClick={() => navigate('/expenses/new')}
          aria-label="Log an expense"
        >
          <div className="calm-quick-btn__icon-wrap calm-quick-btn__icon-wrap--expense">
            <span className="material-symbols-outlined">remove</span>
          </div>
          <span className="calm-quick-btn__label">Expense</span>
        </button>

        <button
          type="button"
          className="calm-quick-btn"
          onClick={() => navigate('/income/new')}
          aria-label="Add received income"
        >
          <div className="calm-quick-btn__icon-wrap calm-quick-btn__icon-wrap--income">
            <span className="material-symbols-outlined">add</span>
          </div>
          <span className="calm-quick-btn__label">Income</span>
        </button>

        <button
          type="button"
          className="calm-quick-btn"
          onClick={() => navigate('/transfers/new')}
          aria-label="Move money between accounts"
        >
          <div className="calm-quick-btn__icon-wrap calm-quick-btn__icon-wrap--move">
            <span className="material-symbols-outlined">sync_alt</span>
          </div>
          <span className="calm-quick-btn__label">Move</span>
        </button>
      </section>

      {/* 4. Urgent Bills (Next 48 Hours) */}
      <section className="calm-section">
        <div className="calm-section__header">
          <span className="calm-section__title">Upcoming in 48 Hours</span>
          <span className="calm-section__tag">
            {urgentBills.length > 0 ? `${urgentBills.length} Due Soon` : 'Clear'}
          </span>
        </div>

        {urgentBills.length > 0 ? (
          urgentBills.map((bill) => {
            const isPaid = paidBills[bill.occurrenceKey];
            return (
              <div key={bill.occurrenceKey} className="calm-bill-card">
                <div className="calm-bill-card__top">
                  <div className="calm-bill-card__left">
                    <div className="calm-bill-card__icon">
                      <span className="material-symbols-outlined">bolt</span>
                    </div>
                    <div className="calm-bill-card__info">
                      <span className="calm-bill-card__title">{bill.name || 'Scheduled Bill'}</span>
                      <span className="calm-bill-card__due">Due on {bill.dueDate}</span>
                    </div>
                  </div>
                  <span className="calm-bill-card__amount">
                    {formatCurrency(toMajorUnits(bill.amountMinor))}
                  </span>
                </div>

                <div className="calm-bill-card__actions">
                  <button
                    type="button"
                    className={`calm-bill-card__pay-btn ${isPaid ? 'calm-bill-card__pay-btn--paid' : ''}`}
                    onClick={() => !isPaid && handleMarkBillPaid(bill)}
                    disabled={isPaid}
                  >
                    <span className="material-symbols-outlined">
                      {isPaid ? 'done_all' : 'check_circle'}
                    </span>
                    <span>{isPaid ? 'Paid & Accounted For' : 'Mark as Paid'}</span>
                  </button>
                  <button
                    type="button"
                    className="calm-bill-card__snooze-btn"
                    aria-label="Snooze or review bill details"
                    onClick={() => navigate('/plan')}
                  >
                    <span className="material-symbols-outlined">schedule</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="calm-empty-bill-card">
            <span className="material-symbols-outlined calm-empty-bill-card__icon">check_circle</span>
            <div className="calm-empty-bill-card__text">
              <strong>All bills are clear</strong>
              <span>No upcoming payments due in the next 48 hours.</span>
            </div>
          </div>
        )}
      </section>

      {/* 5. Mindful Spending Visual Anchor */}
      <section className="calm-mindful-card">
        <div className="calm-mindful-card__content">
          <span className="calm-mindful-card__tag">Daily Mindful Tip</span>
          <p className="calm-mindful-card__quote">
            "Small daily pauses create long-term calm. You are well within your comfort cushion."
          </p>
        </div>
      </section>

      {/* 6. Recent Activity Section */}
      <section className="calm-section">
        <div className="calm-section__header">
          <span className="calm-section__title">Recent Activity</span>
          <button
            type="button"
            className="calm-section__link"
            onClick={() => navigate('/report')}
          >
            <span>View all</span>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div className="calm-transactions-card">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx, index) => {
              const isExpense = tx.type === 'expense';
              const isIncome = tx.type === 'income';
              const sign = isExpense ? '-' : isIncome ? '+' : '⇄';
              const colorClass = isExpense ? 'text-expense' : isIncome ? 'text-income' : 'text-move';
              const catObj = tx.categoryId ? getCategory(tx.categoryId) : undefined;
              const categoryName = catObj ? catObj.name : 'General';

              return (
                <React.Fragment key={tx.id}>
                  {index > 0 && <div className="calm-transactions-divider" />}
                  <div
                    className="calm-tx-item"
                    onClick={() => navigate(`/expenses/${tx.id}/edit`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="calm-tx-item__left">
                      <div className="calm-tx-item__icon-wrap">
                        <span className="calm-tx-item__emoji">{getCategoryEmoji(categoryName)}</span>
                      </div>
                      <div className="calm-tx-item__details">
                        <span className="calm-tx-item__title">{tx.description || categoryName}</span>
                        <span className="calm-tx-item__subtitle">
                          {tx.date} • {categoryName}
                        </span>
                      </div>
                    </div>
                    <div className="calm-tx-item__right">
                      <span className={`calm-tx-item__amount ${colorClass}`}>
                        {sign}{formatCurrency(toMajorUnits(tx.amount))}
                      </span>
                      <span className="calm-tx-item__status">Cleared</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          ) : (
            <div className="calm-tx-empty">
              <span className="material-symbols-outlined calm-tx-empty__icon">receipt_long</span>
              <span>No transactions recorded yet today.</span>
            </div>
          )}
        </div>
      </section>

      {/* 7. Accessible Explanation Bottom Sheet */}
      {isExplanationOpen && (
        <div
          className="calm-sheet-overlay"
          onClick={() => setIsExplanationOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="calm-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calm-sheet__handle"></div>
            <div className="calm-sheet__header">
              <div className="calm-sheet__icon">
                <span className="material-symbols-outlined">lightbulb</span>
              </div>
              <span className="calm-sheet__title">What is "Safe to Spend"?</span>
            </div>
            <p className="calm-sheet__body">
              This is the exact amount of money you can comfortably spend today without worrying about upcoming bills, emergency savings, or rent. It automatically recalibrates every morning to keep you on budget.
            </p>
            <div className="calm-sheet__metrics">
              <div className="calm-sheet__metric-row">
                <span>Monthly remaining budget</span>
                <strong>{formatCurrency(toMajorUnits(summary.availableToSpendMinor || 0))}</strong>
              </div>
              <div className="calm-sheet__metric-row">
                <span>Total monthly spending</span>
                <strong>{formatCurrency(monthlyExpensesMajor)}</strong>
              </div>
            </div>
            <button
              type="button"
              className="calm-sheet__close-btn"
              onClick={() => setIsExplanationOpen(false)}
            >
              <span>Understood, Keep It Calm</span>
            </button>
          </div>
        </div>
      )}

      <ConnectBankModal
        isOpen={isConnectBankOpen}
        onClose={() => setIsConnectBankOpen(false)}
      />
    </div>
  );
};
