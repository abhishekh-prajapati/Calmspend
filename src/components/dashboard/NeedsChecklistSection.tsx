import React, { useState } from 'react';
import { NeedItemChecklistRow } from './NeedItemChecklistRow';
import { QuickPayModal } from './QuickPayModal';
import { toMajorUnits } from '../../utils/money';
import type { CategoryBudgetProgress } from '../../types/budget';
import type { Account, Category } from '../../types/transaction';

export interface NeedsChecklistSectionProps {
  needsProgress: CategoryBudgetProgress[];
  categories: Category[];
  accounts: Account[];
  onRecordSpend: (params: {
    categoryId: string;
    amountMinor: number;
    accountId?: string;
    date?: string;
    description?: string;
  }) => Promise<void>;
  onNavigateToPlan: () => void;
}

export const NeedsChecklistSection: React.FC<NeedsChecklistSectionProps> = ({
  needsProgress,
  categories,
  accounts = [],
  onRecordSpend,
  onNavigateToPlan,
}) => {
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [activePayItem, setActivePayItem] = useState<CategoryBudgetProgress | null>(null);

  const handleToggleCheck = (categoryId: string) => {
    setCompletedMap((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getCategoryObj = (categoryId: string) =>
    categories.find((c) => c.id === categoryId);

  const totalSpentMinor = needsProgress.reduce((sum, p) => sum + p.actualAmountMinor, 0);
  const totalPlannedMinor = needsProgress.reduce((sum, p) => sum + p.plannedAmountMinor, 0);
  const totalPercent = totalPlannedMinor > 0
    ? Math.min(100, Math.round((totalSpentMinor / totalPlannedMinor) * 100))
    : 0;

  const totalItemsCount = needsProgress.length;
  const completedItemsCount = needsProgress.filter((p) => {
    const isAutoCompleted = p.actualAmountMinor >= p.plannedAmountMinor && p.plannedAmountMinor > 0;
    return Boolean(completedMap[p.categoryId] || isAutoCompleted);
  }).length;

  const handleConfirmQuickPay = async (data: {
    amount: number;
    categoryId: string;
    accountId: string;
    date: string;
    description: string;
  }) => {
    await onRecordSpend({
      categoryId: data.categoryId,
      amountMinor: data.amount,
      accountId: data.accountId,
      date: data.date,
      description: data.description,
    });
    setActivePayItem(null);
  };

  return (
    <section className="calm-needs-section" aria-label="Essential Needs Checklist">
      {/* Header with Metrics */}
      <div className="calm-needs-section__header-block">
        <div className="calm-needs-section__header-row">
          <div className="calm-needs-header-title-wrap">
            <h2 className="calm-needs-section__title">Essential Needs</h2>
            <span className="calm-needs-count-badge">
              {completedItemsCount} of {totalItemsCount} Cleared
            </span>
          </div>
          <span className="calm-needs-section__header-val">
            ₹{toMajorUnits(totalSpentMinor).toLocaleString('en-IN')}{' '}
            <span className="calm-needs-header-total">
              / ₹{toMajorUnits(totalPlannedMinor).toLocaleString('en-IN')}
            </span>
          </span>
        </div>

        {/* Global Progress Track */}
        <div className="calm-needs-total-track">
          <div className="calm-needs-total-fill" style={{ width: `${totalPercent}%` }} />
        </div>
      </div>

      {/* Checklist of Need Cards */}
      <div className="calm-needs-list">
        {needsProgress.length > 0 ? (
          needsProgress.map((prog) => {
            const isAutoCompleted = prog.actualAmountMinor >= prog.plannedAmountMinor && prog.plannedAmountMinor > 0;
            const isChecked = Boolean(completedMap[prog.categoryId] || isAutoCompleted);

            return (
              <NeedItemChecklistRow
                key={prog.categoryId}
                progress={prog}
                category={getCategoryObj(prog.categoryId)}
                isCompleted={isChecked}
                onOpenPayModal={(item) => setActivePayItem(item)}
                onToggleCheck={handleToggleCheck}
              />
            );
          })
        ) : (
          <div className="calm-needs-empty-card">
            <div className="calm-needs-empty-icon-wrap">
              <span className="material-symbols-outlined">shield_moon</span>
            </div>
            <div className="calm-needs-empty-card__text">
              <strong>No Must-Pay Needs Configured</strong>
              <span>Add essential commitments like rent, EMIs, or groceries to track them smoothly.</span>
            </div>
            <button
              type="button"
              className="calm-needs-empty-card__action-btn"
              onClick={onNavigateToPlan}
            >
              Configure Essentials
            </button>
          </div>
        )}
      </div>

      {/* Quick Pay Modal for streamlined 1-tap payment */}
      <QuickPayModal
        isOpen={Boolean(activePayItem)}
        onClose={() => setActivePayItem(null)}
        item={activePayItem}
        category={activePayItem ? getCategoryObj(activePayItem.categoryId) : null}
        accounts={accounts}
        onConfirmPayment={handleConfirmQuickPay}
      />
    </section>
  );
};
