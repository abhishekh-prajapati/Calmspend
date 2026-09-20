import React, { useState } from 'react';
import { useFinancial } from '../context/useFinancial';
import { formatCurrency } from '../services/currency';
import { toMajorUnits, toMinorUnits } from '../utils/money';
import { getAdjacentPeriod } from '../services/periodService';
import { getMonthlyExpensesMinor } from '../services/financialCalculations';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import './PlanPage.css';

export const PlanPage: React.FC = () => {
  const {
    categories,
    transactions,
    selectedPlanPeriod,
    setSelectedPlanPeriod,
    getPlanSummaryForPeriod,
    saveBudgetItem,
    deleteBudgetItem,
    savePlannedIncome,
    setPlannedSavings,
    copyPreviousMonthPlan,
    getCategory,
  } = useFinancial();

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCreatingEnvelope, setIsCreatingEnvelope] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetIncome, setTargetIncome] = useState('');
  const [targetSavings, setTargetSavings] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>(() => {
    return categories.length > 0 ? categories[0].id : '';
  });
  const [newAllocAmount, setNewAllocAmount] = useState('1000');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingEnvelope, setEditingEnvelope] = useState<{
    id: string;
    name: string;
    icon?: string;
    color?: string;
    spent: number;
    amount: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Month navigation
  const handlePrevMonth = () => {
    setSelectedPlanPeriod(getAdjacentPeriod(selectedPlanPeriod, -1));
  };

  const handleNextMonth = () => {
    setSelectedPlanPeriod(getAdjacentPeriod(selectedPlanPeriod, 1));
  };

  // Live Plan Summary for the actively selected month
  const planSummary = getPlanSummaryForPeriod(selectedPlanPeriod);
  
  // Total budget pool is either the explicit envelopes sum, or the target income minus planned savings
  const totalEnvelopesBudgetMinor = planSummary.totalPlannedExpensesMinor;
  const targetIncomeMinor = planSummary.totalPlannedIncomeMinor;
  const plannedSavingsMinor = planSummary.plannedSavingsMinor;
  
  const effectiveTotalBudgetMinor =
    totalEnvelopesBudgetMinor > 0
      ? totalEnvelopesBudgetMinor
      : Math.max(0, targetIncomeMinor - plannedSavingsMinor);

  const totalBudgeted = toMajorUnits(effectiveTotalBudgetMinor);

  // Total expenses incurred this month across all categories
  const actualMonthExpensesMinor = getMonthlyExpensesMinor(transactions, selectedPlanPeriod);
  const totalSpent = toMajorUnits(actualMonthExpensesMinor);

  // Remaining money available to spend
  const totalAvailable = effectiveTotalBudgetMinor > 0
    ? Math.max(0, totalBudgeted - totalSpent)
    : 0;

  const budgetProgressPercent =
    totalBudgeted > 0 ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0;

  const categoryProgress = planSummary.categoryProgress || [];
  // Filter active envelopes: categories with a plan OR with actual spending this month
  const activeEnvelopes = categoryProgress.filter(
    (p) => p.plannedAmountMinor > 0 || p.actualAmountMinor > 0
  );

  // Unbudgeted expense categories
  const existingCategoryIds = new Set(categoryProgress.filter((p) => p.plannedAmountMinor > 0).map((p) => p.categoryId));
  const availableExpenseCats = categories.filter((c) => c.type === 'expense');

  const handleClonePreviousMonth = async () => {
    try {
      const prevPeriod = getAdjacentPeriod(selectedPlanPeriod, -1);
      await copyPreviousMonthPlan(selectedPlanPeriod.periodKey, prevPeriod.periodKey);
      showToast('Copied envelopes from previous month 📋');
    } catch {
      showToast('Envelopes synced for this month 🌱');
    }
  };


  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (targetIncome !== '') {
        const incomeMinor = toMinorUnits(targetIncome || '0');
        await savePlannedIncome(
          selectedPlanPeriod.periodKey,
          'Expected Monthly Income / Budget',
          incomeMinor
        );
      }
      if (targetSavings !== '') {
        const savingsMinor = toMinorUnits(targetSavings || '0');
        await setPlannedSavings(
          selectedPlanPeriod.periodKey,
          savingsMinor
        );
      }
      setIsEditingTarget(false);
      showToast('Monthly target & planned income updated 🎯');
    } catch {
      showToast('Could not save budget targets.');
    }
  };

  const handleCreateEnvelope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId) return;

    try {
      const targetCat = getCategory(selectedCatId);
      const catName = targetCat ? targetCat.name : 'Category';
      const minor = toMinorUnits(newAllocAmount || '0');

      await saveBudgetItem(
        selectedPlanPeriod.periodKey,
        selectedCatId,
        minor
      );

      setIsCreatingEnvelope(false);
      setNewAllocAmount('1000');
      showToast(`Created envelope for "${catName}" ✨`);
    } catch {
      showToast('Could not save envelope.');
    }
  };

  const handleSaveEnvelopeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnvelope) return;

    try {
      const minor = toMinorUnits(editingEnvelope.amount || '0');
      await saveBudgetItem(
        selectedPlanPeriod.periodKey,
        editingEnvelope.id,
        minor
      );
      showToast(`Updated budget for ${editingEnvelope.name} 💰`);
      setEditingEnvelope(null);
    } catch {
      showToast('Could not update budget.');
    }
  };

  const handleDeleteEnvelope = async () => {
    if (!editingEnvelope) return;
    try {
      await deleteBudgetItem(editingEnvelope.id);
      showToast(`Removed envelope for ${editingEnvelope.name}`);
      setEditingEnvelope(null);
    } catch {
      showToast('Could not remove envelope.');
    }
  };

  const getPaceStatus = (spentPercent: number) => {
    if (spentPercent >= 100) {
      return {
        label: 'Budget exhausted ✓',
        badgeClass: 'calm-envelope-badge--settled',
        icon: 'check_circle',
      };
    }
    if (spentPercent >= 85) {
      return {
        label: 'Near limit — pace spending',
        badgeClass: 'calm-envelope-badge--caution',
        icon: 'pace',
      };
    }
    if (spentPercent >= 50) {
      return {
        label: 'Healthy pace • On track',
        badgeClass: 'calm-envelope-badge--safe',
        icon: 'verified',
      };
    }
    return {
      label: 'Plenty reserved 👍',
      badgeClass: 'calm-envelope-badge--safe',
      icon: 'thumb_up',
    };
  };

  return (
    <div className="calm-plan-page">
      {/* 1. Month Selector Bar */}
      <div className="calm-month-bar">
        <button
          type="button"
          className="calm-month-nav-btn"
          onClick={handlePrevMonth}
          aria-label="Previous month"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>

        <div className="calm-month-center">
          <div className="calm-month-title-row">
            <span className="material-symbols-outlined calm-month-icon">calendar_month</span>
            <span className="calm-month-name">{selectedPlanPeriod.formattedPeriod}</span>
          </div>
          <div className="calm-month-subtext">
            <span className="calm-month-dot"></span>
            <span>Flexible digital envelopes</span>
          </div>
        </div>

        <button
          type="button"
          className="calm-month-nav-btn"
          onClick={handleNextMonth}
          aria-label="Next month"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* 2. Overall Planned vs Spent Summary Card */}
      <div className="calm-budget-hero">
        <div className="calm-budget-hero__header">
          <div className="calm-budget-hero__title-group">
            <span className="calm-budget-hero__label">Total Monthly Budget</span>
            <span className="calm-budget-hero__total">{formatCurrency(totalBudgeted)}</span>
            {planSummary.totalPlannedIncomeMinor > 0 && (
              <span className="calm-budget-hero__target-subtext">
                Target Income: {formatCurrency(toMajorUnits(planSummary.totalPlannedIncomeMinor))}
                {planSummary.unallocatedMinor !== 0 && (
                  <span> • {planSummary.unallocatedMinor > 0 ? `${formatCurrency(toMajorUnits(planSummary.unallocatedMinor))} unallocated` : `${formatCurrency(Math.abs(toMajorUnits(planSummary.unallocatedMinor)))} over-allocated`}</span>
                )}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="calm-budget-hero__edit-target-btn"
              onClick={() => {
                const inc = toMajorUnits(planSummary.totalPlannedIncomeMinor);
                const sav = toMajorUnits(planSummary.plannedSavingsMinor);
                setTargetIncome(inc > 0 ? String(inc) : '');
                setTargetSavings(sav > 0 ? String(sav) : '');
                setIsEditingTarget(true);
              }}
              aria-label="Set monthly budget target and planned income"
              title="Set monthly income & savings target"
            >
              <span className="material-symbols-outlined">tune</span>
              <span>Edit Target</span>
            </button>
            <button
              type="button"
              className="calm-budget-hero__help-btn"
              onClick={() => setIsHelpOpen((prev) => !prev)}
              aria-label="What does this mean?"
            >
              <span className="material-symbols-outlined">help_outline</span>
            </button>
          </div>
        </div>

        {/* 2 Stat Pills */}
        <div className="calm-budget-hero__pills">
          <div className="calm-stat-pill">
            <div className="calm-stat-pill__header">
              <span className="material-symbols-outlined text-tertiary">shopping_bag</span>
              <span>Spent so far</span>
            </div>
            <span className="calm-stat-pill__value">{formatCurrency(totalSpent)}</span>
          </div>

          <div className="calm-stat-pill">
            <div className="calm-stat-pill__header">
              <span className="material-symbols-outlined text-primary">savings</span>
              <span>Available</span>
            </div>
            <span className="calm-stat-pill__value calm-stat-pill__value--primary">
              {formatCurrency(totalAvailable)}
            </span>
          </div>
        </div>

        {/* Segmented Progress Track */}
        <div className="calm-budget-hero__meter">
          <div className="calm-budget-hero__track">
            <div
              className="calm-budget-hero__bar"
              style={{ width: `${budgetProgressPercent}%` }}
            ></div>
          </div>
          <div className="calm-budget-hero__meter-labels">
            <div className="calm-badge-pill">
              <span className="material-symbols-outlined">eco</span>
              <span>Healthy pace • {budgetProgressPercent}% utilized</span>
            </div>
            <span className="calm-budget-hero__marker">
              {totalAvailable > 0 ? `${formatCurrency(totalAvailable)} left` : 'Budget fully utilized'}
            </span>
          </div>
        </div>

        {/* Help Explanation Toggle */}
        {isHelpOpen && (
          <div className="calm-budget-explainer">
            <div className="calm-budget-explainer__header">
              <span className="material-symbols-outlined">verified_user</span>
              <strong>Envelope System Made Simple</strong>
            </div>
            <p>
              Money you assign is safe in dedicated digital envelopes. When you log spending in a category, that envelope reduces automatically so bills and living essentials never collide.
            </p>
          </div>
        )}
      </div>

      {/* 3. 1-Click Clone / Reset Banner */}
      <div className="calm-clone-banner">
        <div className="calm-clone-banner__left">
          <div className="calm-clone-banner__icon">
            <span className="material-symbols-outlined">replay</span>
          </div>
          <div className="calm-clone-banner__text">
            <strong>Plan ahead for {selectedPlanPeriod.formattedPeriod}?</strong>
            <span>Copy envelopes from last month</span>
          </div>
        </div>
        <button
          type="button"
          className="calm-clone-banner__btn"
          onClick={handleClonePreviousMonth}
        >
          <span>Clone</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>

      {/* 4. Category Envelopes Header */}
      <div className="calm-section-row">
        <div className="calm-section-row__left">
          <span className="calm-section-row__title">Budget Envelopes</span>
          <span className="calm-section-row__count">{activeEnvelopes.length}</span>
        </div>
        <button
          type="button"
          className="calm-section-row__action"
          onClick={() => {
            const firstUnbudgeted = availableExpenseCats.find((c) => !existingCategoryIds.has(c.id));
            setSelectedCatId(firstUnbudgeted ? firstUnbudgeted.id : (categories[0]?.id || ''));
            setIsCreatingEnvelope(true);
          }}
        >
          <span>+ Add Envelope</span>
        </button>
      </div>

      {/* 5. Envelope Cards List */}
      <div className="calm-envelopes-list">
        {activeEnvelopes.length > 0 ? (
          activeEnvelopes.map((prog) => {
            const catObj = getCategory(prog.categoryId);
            const spent = toMajorUnits(prog.actualAmountMinor);
            const planned = toMajorUnits(prog.plannedAmountMinor);
            const remaining = Math.max(0, planned - spent);
            const percent = planned > 0 ? Math.min(100, Math.round((spent / planned) * 100)) : (spent > 0 ? 100 : 0);
            const pace = planned > 0 ? getPaceStatus(percent) : { label: 'Unbudgeted spending', badgeClass: 'calm-envelope-badge--caution', icon: 'info' };

            return (
              <div
                key={prog.categoryId}
                className="calm-envelope-card"
                onClick={() =>
                  setEditingEnvelope({
                    id: prog.categoryId,
                    name: prog.categoryName,
                    icon: catObj?.icon,
                    color: catObj?.color,
                    spent,
                    amount: String(planned),
                  })
                }
                style={{ cursor: 'pointer' }}
                title="Tap to adjust envelope budget"
              >
                <div className="calm-envelope-card__top">
                  <div className="calm-envelope-card__left">
                    <div
                      className="calm-envelope-card__icon"
                      style={{ color: catObj?.color || 'var(--color-primary)' }}
                    >
                      <CategoryIcon iconName={catObj?.icon || 'shopping-cart'} size={20} />
                    </div>
                    <div className="calm-envelope-card__info">
                      <span className="calm-envelope-card__name">{prog.categoryName}</span>
                      <span className="calm-envelope-card__sub">
                        {planned > 0
                          ? `${formatCurrency(spent)} spent of ${formatCurrency(planned)}`
                          : `${formatCurrency(spent)} spent (No budget assigned)`}
                      </span>
                    </div>
                  </div>
                  <div className="calm-envelope-card__right">
                    <span className="calm-envelope-card__remaining">
                      {planned > 0 ? formatCurrency(remaining) : formatCurrency(spent)}
                    </span>
                    <span className="calm-envelope-card__left-label">
                      {planned > 0 ? 'left' : 'spent'}
                    </span>
                  </div>
                </div>


                {/* Progress Track */}
                <div className="calm-envelope-track">
                  <div
                    className={`calm-envelope-bar ${percent >= 85 ? 'calm-envelope-bar--caution' : ''}`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>

                <div className="calm-envelope-card__footer">
                  <div className={`calm-envelope-badge ${pace.badgeClass}`}>
                    <span className="material-symbols-outlined">{pace.icon}</span>
                    <span>{pace.label}</span>
                  </div>
                  <span className="calm-envelope-card__percent">{percent}%</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="calm-envelope-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28 }}>mail</span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No envelopes set for {selectedPlanPeriod.formattedPeriod}</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Create envelopes for groceries, utilities, and dining, or clone from last month.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                type="button"
                className="calm-clone-banner__btn"
                onClick={handleClonePreviousMonth}
              >
                <span>Clone Previous Month</span>
              </button>
              <button
                type="button"
                className="calm-sheet__close-btn"
                style={{ minHeight: 44, padding: '0 16px', margin: 0, width: 'auto' }}
                onClick={() => setIsCreatingEnvelope(true)}
              >
                <span>+ Add Envelope</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Create New Envelope Modal */}
      {isCreatingEnvelope && (
        <div className="calm-sheet-overlay" onClick={() => setIsCreatingEnvelope(false)}>
          <form
            className="calm-sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateEnvelope}
          >
            <div className="calm-sheet__handle"></div>
            <div className="calm-sheet__header">
              <span className="calm-sheet__title">Add Digital Budget Envelope</span>
            </div>
            <div className="calm-sheet__metrics">
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Select Category
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-container-lowest)',
                  fontSize: 14,
                }}
              >
                {availableExpenseCats.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {existingCategoryIds.has(cat.id) ? '(Already budgeted)' : ''}
                  </option>
                ))}
              </select>

              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                Planned Monthly Budget (₹)
              </label>
              <input
                type="number"
                className="calm-note-input"
                placeholder="Planned Budget (₹)"
                value={newAllocAmount}
                onChange={(e) => setNewAllocAmount(e.target.value)}
                autoFocus
                required
                min="1"
              />

              {/* Quick Preset Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
                {['500', '1000', '2500', '5000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="calm-micro-btn"
                    style={{ height: 38, fontSize: 13 }}
                    onClick={() => setNewAllocAmount(amt)}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="calm-sheet__close-btn">
              Save Envelope
            </button>
          </form>
        </div>
      )}

      {/* 7. Edit Envelope Modal with Presets & Delete Option */}
      {editingEnvelope && (
        <div className="calm-sheet-overlay" onClick={() => setEditingEnvelope(null)}>
          <form
            className="calm-sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveEnvelopeEdit}
          >
            <div className="calm-sheet__handle"></div>
            <div className="calm-sheet__header">
              <span className="calm-sheet__title">Adjust {editingEnvelope.name} Envelope</span>
            </div>
            <div className="calm-sheet__metrics">
              <div className="calm-sheet__metric-row">
                <span>Spent this month</span>
                <strong>{formatCurrency(editingEnvelope.spent)}</strong>
              </div>

              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                Target Planned Budget (₹)
              </label>
              <input
                type="number"
                className="calm-note-input"
                value={editingEnvelope.amount}
                onChange={(e) =>
                  setEditingEnvelope({ ...editingEnvelope, amount: e.target.value })
                }
                autoFocus
                required
                min="0"
              />

              {/* Quick Increment/Decrement Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
                {[
                  { label: '+₹500', delta: 500 },
                  { label: '+₹1,000', delta: 1000 },
                  { label: '-₹500', delta: -500 },
                  { label: '₹2,500', setVal: 2500 },
                ].map((btn, i) => (
                  <button
                    key={i}
                    type="button"
                    className="calm-micro-btn"
                    style={{ height: 38, fontSize: 13 }}
                    onClick={() => {
                      const cur = parseFloat(editingEnvelope.amount) || 0;
                      const next = btn.setVal !== undefined ? btn.setVal : Math.max(0, cur + (btn.delta || 0));
                      setEditingEnvelope({ ...editingEnvelope, amount: String(next) });
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="calm-micro-btn"
                style={{
                  height: 48,
                  flex: '0 0 auto',
                  padding: '0 16px',
                  color: 'var(--color-terracotta)',
                  borderColor: 'var(--color-terracotta)',
                }}
                onClick={handleDeleteEnvelope}
                title="Remove envelope"
              >
                <span className="material-symbols-outlined">delete</span>
                <span>Remove</span>
              </button>
              <button type="submit" className="calm-sheet__close-btn" style={{ flex: 1, margin: 0 }}>
                Save Budget
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. Edit Overall Budget Target & Expected Income Bottom Sheet */}
      {isEditingTarget && (
        <div className="calm-sheet-overlay" onClick={() => setIsEditingTarget(false)}>
          <form
            className="calm-sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveTargets}
          >
            <div className="calm-sheet__handle"></div>
            <div className="calm-sheet__header">
              <span className="calm-sheet__title">Monthly Budget Target & Expected Income</span>
            </div>

            <div className="calm-sheet__metrics">
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Expected Monthly Income / Budget Cap (₹)
              </label>
              <input
                type="number"
                className="calm-note-input"
                placeholder="e.g. 50000"
                value={targetIncome}
                onChange={(e) => setTargetIncome(e.target.value)}
                autoFocus
                min="0"
              />

              {/* Quick Preset Buttons for Income */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
                {[
                  { label: '₹25,000', val: '25000' },
                  { label: '₹50,000', val: '50000' },
                  { label: '₹75,000', val: '75000' },
                  { label: '₹1,00,000', val: '100000' },
                ].map((btn, i) => (
                  <button
                    key={i}
                    type="button"
                    className="calm-micro-btn"
                    style={{ height: 38, fontSize: 12 }}
                    onClick={() => setTargetIncome(btn.val)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: 12 }}>
                Planned Savings Target (₹)
              </label>
              <input
                type="number"
                className="calm-note-input"
                placeholder="e.g. 10000"
                value={targetSavings}
                onChange={(e) => setTargetSavings(e.target.value)}
                min="0"
              />

              {/* Quick Preset Buttons for Savings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
                {[
                  { label: '₹5,000', val: '5000' },
                  { label: '₹10,000', val: '10000' },
                  { label: '₹20,000', val: '20000' },
                ].map((btn, i) => (
                  <button
                    key={i}
                    type="button"
                    className="calm-micro-btn"
                    style={{ height: 38, fontSize: 12 }}
                    onClick={() => setTargetSavings(btn.val)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Allocation Summary Card inside sheet */}
              <div
                style={{
                  background: 'var(--color-surface-container-low)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                  marginTop: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                  <span>Envelopes Total Budgeted:</span>
                  <strong>{formatCurrency(totalBudgeted)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                  <span>Planned Savings:</span>
                  <strong>{formatCurrency(parseFloat(targetSavings) || 0)}</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px dashed var(--color-border)',
                    paddingTop: 6,
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span>Unallocated (Target - Envelopes - Savings):</span>
                  <span
                    style={{
                      color:
                        (parseFloat(targetIncome) || 0) - totalBudgeted - (parseFloat(targetSavings) || 0) >= 0
                          ? 'var(--color-primary)'
                          : 'var(--color-terracotta)',
                    }}
                  >
                    {formatCurrency((parseFloat(targetIncome) || 0) - totalBudgeted - (parseFloat(targetSavings) || 0))}
                  </span>
                </div>
              </div>
            </div>

            <button type="submit" className="calm-sheet__close-btn" style={{ marginTop: 12 }}>
              Save Target & Planned Income
            </button>
          </form>
        </div>
      )}

      {/* 9. Toast Feedback */}
      {toastMessage && (
        <div className="calm-trends-toast">
          <span className="material-symbols-outlined">task_alt</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 10. Bottom Reassurance */}
      <div className="calm-plan-footer-note">
        <span className="material-symbols-outlined">lock</span>
        <span>Budget plans remain flexible and editable anytime</span>
      </div>
    </div>
  );
};

export default PlanPage;

