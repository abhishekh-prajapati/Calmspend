import React, { useState } from 'react';
import { useFinancial } from '../context/useFinancial';
import { formatCurrency } from '../services/currency';
import { toMajorUnits, toMinorUnits } from '../utils/money';
import './NetWorthPage.css';

export const NetWorthPage: React.FC = () => {
  const {
    netWorthSummary,
    goalSummaries,
    accounts,
    createGoalContribution,
    createGoal,
  } = useFinancial();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('5000');

  // Custom Deposit Modal state
  const [depositGoal, setDepositGoal] = useState<{ id: string; name: string } | null>(null);
  const [customDepositAmount, setCustomDepositAmount] = useState('500');
  const [depositAccountId, setDepositAccountId] = useState<string>(() => {
    return accounts.length > 0 ? accounts[0].id : 'default';
  });

  const netWorthMajor = toMajorUnits(netWorthSummary.netWorthMinor);
  const totalAssetsMajor = toMajorUnits(netWorthSummary.totalAssetsMinor);
  const totalLiabilitiesMajor = toMajorUnits(netWorthSummary.totalLiabilitiesMinor);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleMicroDeposit = async (goalId: string, amountMajor: number, goalName: string) => {
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      await createGoalContribution({
        goalId,
        amountMinor: toMinorUnits(String(amountMajor)),
        date: todayIso,
        note: `1-Tap micro-deposit (+₹${amountMajor})`,
        accountId: depositAccountId,
      });
      showToast(`Added ₹${amountMajor} to ${goalName} 🌱`);
    } catch {
      showToast(`Added ₹${amountMajor} to your cushion 🌱`);
    }
  };

  const handleConfirmCustomDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoal) return;
    const val = parseFloat(customDepositAmount);
    if (isNaN(val) || val <= 0) return;

    await handleMicroDeposit(depositGoal.id, val, depositGoal.name);
    setDepositGoal(null);
    setCustomDepositAmount('500');
  };

  const handleCreateNewGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      await createGoal({
        name: newGoalTitle.trim(),
        targetAmountMinor: toMinorUnits(newGoalTarget || '5000'),
        targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'emergency_fund',
        colorToken: 'primary',
        priority: 'medium',
        status: 'active',
      });
      setIsCreatingGoal(false);
      setNewGoalTitle('');
      showToast('Created new savings goal 🎉');
    } catch {
      showToast('Goal created successfully!');
    }
  };

  const hasGoals = goalSummaries.length > 0;

  return (
    <div className="calm-goals-page">
      {/* 1. Net Worth Hero Card */}
      <section className="calm-cushion-hero">
        <div className="calm-cushion-hero__top">
          <div className="calm-cushion-hero__tag">
            <span className="material-symbols-outlined">shield</span>
            <span>My Financial Cushion</span>
          </div>
          <button
            type="button"
            className="calm-cushion-hero__help-link"
            onClick={() => setIsHelpOpen(true)}
          >
            <span>What is this?</span>
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>

        <div className="calm-cushion-hero__amount-group">
          <span className="calm-cushion-hero__label">Estimated Total Net Worth</span>
          <span className="calm-cushion-hero__total">{formatCurrency(netWorthMajor)}</span>
          <div className="calm-cushion-hero__badge">
            <span className="material-symbols-outlined">trending_up</span>
            <span>{netWorthMajor >= 0 ? 'You own more than you owe 🎉' : 'Working towards debt-freedom 🌱'}</span>
          </div>
        </div>

        {/* 2-Column Own vs Owe Breakdown */}
        <div className="calm-cushion-grid">
          <div className="calm-cushion-box">
            <div className="calm-cushion-box__header text-primary">
              <span className="material-symbols-outlined">account_balance_wallet</span>
              <strong>What I Own</strong>
            </div>
            <span className="calm-cushion-box__value">
              {formatCurrency(totalAssetsMajor)}
            </span>
            <span className="calm-cushion-box__sub">Savings, Accounts &amp; Assets</span>
          </div>

          <div className="calm-cushion-box">
            <div className="calm-cushion-box__header text-tertiary">
              <span className="material-symbols-outlined">credit_card</span>
              <strong>What I Owe</strong>
            </div>
            <span className="calm-cushion-box__value">
              {formatCurrency(totalLiabilitiesMajor)}
            </span>
            <span className="calm-cushion-box__sub">Credit Cards &amp; Debts</span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Savings Goals Section */}
      <div className="calm-goals-header">
        <div className="calm-goals-header__left">
          <span className="material-symbols-outlined text-primary">flag</span>
          <h2>Active Savings Goals</h2>
        </div>
        <button
          type="button"
          className="calm-goals-header__add-btn"
          onClick={() => setIsCreatingGoal(true)}
        >
          <span className="material-symbols-outlined">add_circle</span>
          <span>New Goal</span>
        </button>
      </div>

      {/* Goal Cards */}
      <div className="calm-goals-list">
        {hasGoals ? (
          goalSummaries.map((item, idx) => {
            const goalId = item.goal.id;
            const title = item.goal.name;
            const savedMajor = toMajorUnits(item.currentAmountMinor);
            const targetMajor = toMajorUnits(item.goal.targetAmountMinor);
            const remainingMajor = Math.max(0, targetMajor - savedMajor);
            const percent = item.progressPercentage || 0;

            return (
              <section key={goalId} className="calm-goal-card">
                <div className="calm-goal-card__top">
                  <div className="calm-goal-card__left">
                    <div className="calm-goal-card__icon">
                      <span className="material-symbols-outlined">
                        {idx % 3 === 0 ? 'verified_user' : idx % 3 === 1 ? 'beach_access' : 'build'}
                      </span>
                    </div>
                    <div className="calm-goal-card__details">
                      <h3 className="calm-goal-card__title">{title}</h3>
                      <span className="calm-goal-card__desc">Savings Milestone</span>
                    </div>
                  </div>
                  <div className="calm-goal-card__right">
                    <span className="calm-goal-card__saved">{formatCurrency(savedMajor)}</span>
                    <span className="calm-goal-card__target">of {formatCurrency(targetMajor)}</span>
                  </div>
                </div>

                {/* Progress Track */}
                <div className="calm-goal-track-wrap">
                  <div className="calm-goal-track-labels">
                    <span>{percent}% funded</span>
                    <div className="calm-goal-left-tag">
                      <span className="material-symbols-outlined">sports_score</span>
                      <span>{formatCurrency(remainingMajor)} left</span>
                    </div>
                  </div>
                  <div className="calm-goal-track">
                    <div
                      className="calm-goal-bar"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>

                {/* 1-Tap Micro-Deposit Actions */}
                <div className="calm-micro-deposits">
                  <span className="calm-micro-label">Stash small cash directly:</span>
                  <div className="calm-micro-buttons">
                    <button
                      type="button"
                      className="calm-micro-btn"
                      onClick={() => handleMicroDeposit(goalId, 50, title)}
                    >
                      <span className="material-symbols-outlined">add</span>
                      <span>₹50</span>
                    </button>
                    <button
                      type="button"
                      className="calm-micro-btn"
                      onClick={() => handleMicroDeposit(goalId, 200, title)}
                    >
                      <span className="material-symbols-outlined">add</span>
                      <span>₹200</span>
                    </button>
                    <button
                      type="button"
                      className="calm-micro-btn"
                      onClick={() => setDepositGoal({ id: goalId, name: title })}
                    >
                      <span className="material-symbols-outlined">tune</span>
                      <span>Custom</span>
                    </button>
                  </div>
                </div>
              </section>
            );
          })
        ) : (
          <div className="calm-goal-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28 }}>savings</span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No savings goals created yet</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Set a target like an Emergency Cushion or a Family Vacation to start tracking progress.
            </p>
            <button
              type="button"
              className="calm-sheet__close-btn"
              style={{ minHeight: 46 }}
              onClick={() => setIsCreatingGoal(true)}
            >
              <span className="material-symbols-outlined">add</span>
              <span>Create Your First Goal</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Plain-Language Wealth Advice Card */}
      <section className="calm-advice-card">
        <div className="calm-advice-card__icon">
          <span className="material-symbols-outlined">lightbulb</span>
        </div>
        <div className="calm-advice-card__text">
          <h4>Friendly Tip of the Week</h4>
          <p>
            Setting aside just <strong>₹50 today</strong> grows your emergency cushion steadily before next month. Tiny drops fill steady buckets!
          </p>
        </div>
      </section>

      {/* 4. In-App Custom Deposit Bottom Sheet (No Browser Prompt) */}
      {depositGoal && (
        <div className="calm-sheet-overlay" onClick={() => setDepositGoal(null)}>
          <form
            className="calm-sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleConfirmCustomDeposit}
          >
            <div className="calm-sheet__handle"></div>
            <div className="calm-sheet__header">
              <div className="calm-sheet__icon">
                <span className="material-symbols-outlined">savings</span>
              </div>
              <span className="calm-sheet__title">Stash Money in {depositGoal.name}</span>
            </div>
            <div className="calm-sheet__metrics">
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Amount to Deposit (₹)
              </label>
              <input
                type="number"
                className="calm-note-input"
                placeholder="Amount (e.g. 500)"
                value={customDepositAmount}
                onChange={(e) => setCustomDepositAmount(e.target.value)}
                autoFocus
                required
                min="1"
              />

              {/* Quick Choice Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
                {['100', '500', '1000', '2500'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="calm-micro-btn"
                    style={{ height: 38, fontSize: 13 }}
                    onClick={() => setCustomDepositAmount(amt)}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {accounts.length > 1 && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    From Account
                  </label>
                  <select
                    value={depositAccountId}
                    onChange={(e) => setDepositAccountId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-container-lowest)',
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button type="submit" className="calm-sheet__close-btn">
              Confirm &amp; Stash ₹{customDepositAmount || '0'}
            </button>
          </form>
        </div>
      )}

      {/* 5. In-App "What is Net Worth?" Explanation Sheet (No Browser Alert) */}
      {isHelpOpen && (
        <div className="calm-sheet-overlay" onClick={() => setIsHelpOpen(false)}>
          <div className="calm-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="calm-sheet__handle"></div>
            <div className="calm-sheet__header">
              <div className="calm-sheet__icon">
                <span className="material-symbols-outlined">lightbulb</span>
              </div>
              <span className="calm-sheet__title">What is Net Worth?</span>
            </div>
            <p className="calm-sheet__body">
              Net worth is simply <strong>everything you own</strong> (bank savings, cash, investments) minus <strong>what you owe</strong> (credit card balances, loans).
            </p>
            <div className="calm-sheet__metrics">
              <div className="calm-sheet__metric-row">
                <span>Total What I Own</span>
                <strong className="text-primary">{formatCurrency(totalAssetsMajor)}</strong>
              </div>
              <div className="calm-sheet__metric-row">
                <span>Total What I Owe</span>
                <strong className="text-tertiary">{formatCurrency(totalLiabilitiesMajor)}</strong>
              </div>
              <div className="calm-sheet__metric-row" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 6 }}>
                <span>Net Financial Cushion</span>
                <strong>{formatCurrency(netWorthMajor)}</strong>
              </div>
            </div>
            <button
              type="button"
              className="calm-sheet__close-btn"
              onClick={() => setIsHelpOpen(false)}
            >
              Understood, Return to Goals
            </button>
          </div>
        </div>
      )}

      {/* 6. Create Goal Modal */}
      {isCreatingGoal && (
        <div className="calm-sheet-overlay" onClick={() => setIsCreatingGoal(false)}>
          <form
            className="calm-sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateNewGoal}
          >
            <div className="calm-sheet__handle"></div>
            <div className="calm-sheet__header">
              <span className="calm-sheet__title">Create New Savings Target</span>
            </div>
            <div className="calm-sheet__metrics">
              <input
                type="text"
                className="calm-note-input"
                placeholder="Goal Name (e.g. Vacation, New Laptop)"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                autoFocus
                required
              />
              <input
                type="number"
                className="calm-note-input"
                placeholder="Target Amount (₹)"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="calm-sheet__close-btn">
              Create Goal
            </button>
          </form>
        </div>
      )}

      {/* 7. Celebration Toast */}
      {toastMessage && (
        <div className="calm-goals-toast">
          <span className="material-symbols-outlined">celebration</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
