import React, { useState } from 'react';
import { PieChart, Plus, ChevronRight, CheckCircle2, CreditCard } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { SectionHeader } from '../ui/SectionHeader';
import { CategoryIcon } from '../ui/CategoryIcon';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import { useFinancial } from '../../context/useFinancial';
import { QuickPayModal } from './QuickPayModal';
import type { CategoryBudgetProgress } from '../../types/budget';
import './BudgetOverviewCard.css';

export interface BudgetOverviewCardProps {
  categoryProgress?: CategoryBudgetProgress[];
  onNavigateToPlan: () => void;
  className?: string;
}

export const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({
  categoryProgress = [],
  onNavigateToPlan,
  className = '',
}) => {
  const { accounts, categories, addTransaction } = useFinancial();
  const [selectedPayItem, setSelectedPayItem] = useState<CategoryBudgetProgress | null>(null);
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);

  const budgetedCategories = categoryProgress.filter((c) => c.plannedAmountMinor > 0);
  const hasBudgets = budgetedCategories.length > 0;

  const handleOpenPay = (item: CategoryBudgetProgress, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPayItem(item);
    setIsQuickPayOpen(true);
  };

  const handleConfirmPayment = async (data: {
    amount: number;
    categoryId: string;
    accountId: string;
    date: string;
    description: string;
  }) => {
    await addTransaction({
      type: 'expense',
      amount: data.amount,
      categoryId: data.categoryId,
      accountId: data.accountId,
      date: data.date,
      description: data.description,
      source: 'manual',
    });
  };

  const selectedCategoryObj = selectedPayItem
    ? categories.find((c) => c.id === selectedPayItem.categoryId)
    : null;

  return (
    <div className={`budget-overview-section ${className}`}>
      <SectionHeader
        title="Budget Overview"
        action={
          <button
            type="button"
            className="budget-overview-section__see-all"
            onClick={onNavigateToPlan}
          >
            Manage Plan
          </button>
        }
      />

      <Card variant="default" padding="md" radius="xl" className="budget-overview-card">
        {!hasBudgets ? (
          <div className="budget-overview-empty">
            <div className="budget-overview-empty__icon-wrap">
              <PieChart size={24} />
            </div>
            <h3 className="budget-overview-empty__title heading-3">No Budget Planned</h3>
            <p className="budget-overview-empty__desc body-sm">
              Create category envelopes to manage spending and keep your finances on track.
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={onNavigateToPlan}
              className="budget-overview-empty__btn"
            >
              Create Budget
            </Button>
          </div>
        ) : (
          <div className="budget-overview-list">
            {budgetedCategories.slice(0, 4).map((item) => {
              let progressColor: 'primary' | 'success' | 'warning' | 'danger' = 'primary';
              if (item.isOverspent) {
                progressColor = 'danger';
              } else if (item.spentPercentage > 85) {
                progressColor = 'warning';
              } else {
                progressColor = 'success';
              }

              const isPaid = item.actualAmountMinor >= item.plannedAmountMinor && item.plannedAmountMinor > 0;

              return (
                <div
                  key={item.categoryId}
                  className="budget-overview-item"
                  onClick={onNavigateToPlan}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onNavigateToPlan();
                  }}
                >
                  <div className="budget-overview-item__top">
                    <div className="budget-overview-item__left">
                      <CategoryIcon
                        iconName={item.categoryIcon || 'Tag'}
                        size={16}
                      />
                      <span className="budget-overview-item__name body-sm">{item.categoryName}</span>
                    </div>

                    <div className="budget-overview-item__right">
                      <span className="budget-overview-item__spent body-sm" style={{ fontWeight: 600 }}>
                        {formatCurrency(toMajorUnits(item.actualAmountMinor))}
                      </span>
                      <span className="budget-overview-item__planned caption" style={{ color: 'var(--color-text-muted)' }}>
                        {' '}/ {formatCurrency(toMajorUnits(item.plannedAmountMinor))}
                      </span>
                    </div>
                  </div>

                  <ProgressBar
                    value={item.actualAmountMinor}
                    max={Math.max(item.plannedAmountMinor, item.actualAmountMinor, 1)}
                    color={progressColor}
                    size="sm"
                  />

                  <div className="budget-overview-item__bottom">
                    <span
                      className={`caption ${
                        item.isOverspent ? 'budget-overview-item__overspent' : ''
                      }`}
                      style={{ color: item.isOverspent ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}
                    >
                      {item.isOverspent
                        ? `Overspent by ${formatCurrency(toMajorUnits(Math.abs(item.remainingAmountMinor)))}`
                        : `${formatCurrency(toMajorUnits(item.remainingAmountMinor))} remaining`}
                    </span>

                    <div className="budget-overview-item__action-group">
                      {isPaid && !item.isOverspent ? (
                        <div className="budget-overview-item__paid-pill">
                          <CheckCircle2 size={12} />
                          <span>Paid</span>
                        </div>
                      ) : null}

                      {item.isOverspent ? (
                        <Badge variant="danger" size="sm">Overspent</Badge>
                      ) : null}

                      <button
                        type="button"
                        className={`budget-overview-item__pay-btn ${isPaid ? 'budget-overview-item__pay-btn--more' : ''}`}
                        onClick={(e) => handleOpenPay(item, e)}
                        title={`Record payment for ${item.categoryName}`}
                      >
                        {isPaid ? (
                          <>
                            <Plus size={12} />
                            <span>Add</span>
                          </>
                        ) : (
                          <>
                            <CreditCard size={12} />
                            <span>Pay</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {budgetedCategories.length > 4 && (
              <button
                type="button"
                className="budget-overview-more-btn"
                onClick={onNavigateToPlan}
              >
                <span>+{budgetedCategories.length - 4} more categories</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </Card>

      <QuickPayModal
        isOpen={isQuickPayOpen}
        onClose={() => setIsQuickPayOpen(false)}
        item={selectedPayItem}
        category={selectedCategoryObj}
        accounts={accounts}
        onConfirmPayment={handleConfirmPayment}
      />
    </div>
  );
};


