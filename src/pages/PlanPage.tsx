import React, { useState } from 'react';
import { useFinancial } from '../context/useFinancial';
import { getAdjacentPeriod } from '../services/periodService';
import { getMonthlyIncomeMinor } from '../services/financialCalculations';
import { toMajorUnits } from '../utils/money';
import { BudgetSummaryCard } from '../components/plan/BudgetSummaryCard';
import { EmergencyCushionModal } from '../components/plan/EmergencyCushionModal';
import { EnvelopeCard } from '../components/plan/EnvelopeCard';
import { EnvelopeModal } from '../components/plan/EnvelopeModal';
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
    setEmergencyCushion,
    copyPreviousMonthPlan,
    getCategory,
    goalSummaries,
  } = useFinancial();

  const [isCreatingEnvelope, setIsCreatingEnvelope] = useState(false);
  const [isCushionModalOpen, setIsCushionModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [editingEnvelope, setEditingEnvelope] = useState<{
    id: string;
    name: string;
    spent: number;
    amount: string;
    priority: 'need' | 'want';
  } | null>(null);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const handlePrevMonth = () => {
    setSelectedPlanPeriod(getAdjacentPeriod(selectedPlanPeriod, -1));
  };

  const handleNextMonth = () => {
    setSelectedPlanPeriod(getAdjacentPeriod(selectedPlanPeriod, 1));
  };

  const planSummary = getPlanSummaryForPeriod(selectedPlanPeriod);
  const actualIncomeMinor = getMonthlyIncomeMinor(transactions, selectedPlanPeriod);
  const plannedIncomeMinor = planSummary.totalPlannedIncomeMinor;
  const effectiveIncomeMinor = actualIncomeMinor > 0 ? actualIncomeMinor : plannedIncomeMinor;

  const categoryProgress = planSummary.categoryProgress || [];
  const existingCategoryIds = new Set(categoryProgress.filter((p) => p.plannedAmountMinor > 0).map((p) => p.categoryId));
  const availableExpenseCats = categories.filter((c) => c.type === 'expense');

  // Envelopes separated into Needs and Wants
  const needsEnvelopes = categoryProgress.filter(
    (p) => p.priority !== 'want' && (p.plannedAmountMinor > 0 || p.actualAmountMinor > 0)
  );
  const wantsEnvelopes = categoryProgress.filter(
    (p) => p.priority === 'want' && (p.plannedAmountMinor > 0 || p.actualAmountMinor > 0)
  );

  const needsTotalMinor = categoryProgress
    .filter((p) => p.priority !== 'want')
    .reduce((sum, p) => sum + p.plannedAmountMinor, 0);

  const cushionMinor = planSummary.emergencyCushionMinor || 0;
  const plannedSavingsMinor = planSummary.plannedSavingsMinor || 0;
  
  // 3. Active Goals monthly required/target contribution
  const activeGoalsMonthlyTotalMinor = (goalSummaries || [])
    .filter((g) => g.goal.status === 'active')
    .reduce((sum, g) => sum + (g.monthlyTargetMinor || g.requiredMonthlyContributionMinor || 0), 0);

  // Surplus remaining after Need expenses are funded
  const surplusAfterNeedsMinor = Math.max(0, effectiveIncomeMinor - needsTotalMinor);

  // Remaining budget pool for a new or edited Need envelope
  const currentEditingProg = editingEnvelope ? categoryProgress.find((p) => p.categoryId === editingEnvelope.id) : null;
  const currentEditingMinor = currentEditingProg ? currentEditingProg.plannedAmountMinor : 0;
  const otherNeedsTotalMinor = needsTotalMinor - currentEditingMinor;
  const maxAvailableForNeedMinor = effectiveIncomeMinor > 0
    ? Math.max(0, effectiveIncomeMinor - otherNeedsTotalMinor - cushionMinor - activeGoalsMonthlyTotalMinor - plannedSavingsMinor)
    : -1;

  const handleClonePreviousMonth = async () => {
    try {
      const prevPeriod = getAdjacentPeriod(selectedPlanPeriod, -1);
      await copyPreviousMonthPlan(selectedPlanPeriod.periodKey, prevPeriod.periodKey);
      showToast('Copied envelopes from previous month 📋');
    } catch {
      showToast('Envelopes synced for this month 🌱');
    }
  };

  const handleSaveCushion = async (amountMinor: number) => {
    await setEmergencyCushion(selectedPlanPeriod.periodKey, amountMinor);
    showToast('Emergency cushion updated 🛡️');
  };

  const handleSaveEnvelope = async (categoryId: string, amountMinor: number, priority: 'need' | 'want') => {
    const targetCat = getCategory(categoryId);
    const catName = targetCat ? targetCat.name : 'Category';
    await saveBudgetItem(selectedPlanPeriod.periodKey, categoryId, amountMinor, priority);
    showToast(`Saved envelope for "${catName}" ✨`);
  };

  const handleDeleteEnvelope = async (categoryId: string) => {
    const targetCat = getCategory(categoryId);
    const catName = targetCat ? targetCat.name : 'Category';
    await deleteBudgetItem(categoryId);
    showToast(`Removed envelope for "${catName}"`);
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
            <span>Priority-First Budget Plan</span>
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

      {/* 2. Priority Budget Breakdown Summary Card */}
      <BudgetSummaryCard
        incomeMinor={effectiveIncomeMinor}
        needsMinor={needsTotalMinor}
        cushionMinor={cushionMinor}
        goalsMinor={activeGoalsMonthlyTotalMinor}
        savingsMinor={plannedSavingsMinor}
        onSetCushion={() => setIsCushionModalOpen(true)}
      />

      {/* 3. Clone Banner */}
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

      {/* 4. Priority 1: Essential Needs Envelopes */}
      <div className="calm-section-row">
        <div className="calm-section-row__left">
          <span className="calm-section-row__title">Needs (Priority 1)</span>
          <span className="calm-section-row__count">{needsEnvelopes.length}</span>
        </div>
        <button
          type="button"
          className="calm-section-row__action"
          onClick={() => setIsCreatingEnvelope(true)}
        >
          <span>+ Add Envelope</span>
        </button>
      </div>

      <div className="calm-envelopes-list">
        {needsEnvelopes.length > 0 ? (
          needsEnvelopes.map((prog) => {
            const catObj = getCategory(prog.categoryId);
            return (
              <EnvelopeCard
                key={prog.categoryId}
                progress={prog}
                category={catObj}
                onEdit={() =>
                  setEditingEnvelope({
                    id: prog.categoryId,
                    name: prog.categoryName,
                    spent: toMajorUnits(prog.actualAmountMinor),
                    amount: String(toMajorUnits(prog.plannedAmountMinor)),
                    priority: 'need',
                  })
                }
              />
            );
          })
        ) : (
          <div className="calm-envelope-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
              No essential needs added yet. Tap <strong>+ Add Envelope</strong> to allocate rent, groceries, or bills.
            </p>
          </div>
        )}
      </div>

      {/* 5. Priority 2: Wants & Wishlist Section */}
      <div className="calm-section-row" style={{ marginTop: 24 }}>
        <div className="calm-section-row__left">
          <span className="calm-section-row__title">Wants & Wishlist (Priority 2)</span>
          <span className="calm-section-row__count">{wantsEnvelopes.length}</span>
        </div>
        <span className="calm-wishlist-badge">Unlock with extra income</span>
      </div>

      <div className="calm-envelopes-list">
        {wantsEnvelopes.length > 0 ? (
          wantsEnvelopes.map((prog) => {
            const catObj = getCategory(prog.categoryId);
            return (
              <EnvelopeCard
                key={prog.categoryId}
                progress={prog}
                category={catObj}
                onEdit={() =>
                  setEditingEnvelope({
                    id: prog.categoryId,
                    name: prog.categoryName,
                    spent: toMajorUnits(prog.actualAmountMinor),
                    amount: String(toMajorUnits(prog.plannedAmountMinor)),
                    priority: 'want',
                  })
                }
              />
            );
          })
        ) : (
          <div className="calm-envelope-card" style={{ textAlign: 'center', padding: '16px' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
              No wishlist items. You can mark non-essential spending categories as &quot;Want&quot;.
            </p>
          </div>
        )}
      </div>

      {/* 6. Modals */}
      <EnvelopeModal
        isOpen={isCreatingEnvelope}
        onClose={() => setIsCreatingEnvelope(false)}
        categories={availableExpenseCats}
        existingCategoryIds={existingCategoryIds}
        maxAvailableForNeedMinor={maxAvailableForNeedMinor}
        onSave={handleSaveEnvelope}
      />

      <EnvelopeModal
        isOpen={Boolean(editingEnvelope)}
        onClose={() => setEditingEnvelope(null)}
        categories={availableExpenseCats}
        existingCategoryIds={existingCategoryIds}
        editingEnvelope={editingEnvelope}
        maxAvailableForNeedMinor={maxAvailableForNeedMinor}
        onSave={handleSaveEnvelope}
        onDelete={handleDeleteEnvelope}
      />

      <EmergencyCushionModal
        isOpen={isCushionModalOpen}
        onClose={() => setIsCushionModalOpen(false)}
        surplusAfterNeedsMinor={surplusAfterNeedsMinor}
        currentCushionMinor={cushionMinor}
        onSaveCushion={handleSaveCushion}
      />

      {/* 7. Toast Feedback */}
      {toast && (
        <div className={`calm-trends-toast ${toast.isError ? 'calm-trends-toast--error' : ''}`}>
          <span className="material-symbols-outlined">{toast.isError ? 'error_outline' : 'task_alt'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 8. Bottom Reassurance */}
      <div className="calm-plan-footer-note">
        <span className="material-symbols-outlined">lock</span>
        <span>Needs are funded first • Unexpected buffer protects your peace of mind</span>
      </div>
    </div>
  );
};

export default PlanPage;
