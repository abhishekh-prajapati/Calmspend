import React from 'react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';

interface BudgetSummaryCardProps {
  incomeMinor: number;
  needsMinor: number;
  cushionMinor: number;
  goalsMinor: number;
  savingsMinor: number;
  onSetCushion: () => void;
}

export const BudgetSummaryCard: React.FC<BudgetSummaryCardProps> = ({
  incomeMinor,
  needsMinor,
  cushionMinor,
  goalsMinor,
  savingsMinor,
  onSetCushion,
}) => {
  const needsMajor = toMajorUnits(needsMinor);
  const cushionMajor = toMajorUnits(cushionMinor);
  const goalsMajor = toMajorUnits(goalsMinor);
  const savingsMajor = toMajorUnits(savingsMinor);

  // Sequential additions
  const totalCommittedMinor = needsMinor + cushionMinor + goalsMinor + savingsMinor;
  const totalCommittedMajor = toMajorUnits(totalCommittedMinor);

  const surplusAfterNeedsMinor = incomeMinor - needsMinor;
  const surplusAfterNeedsMajor = toMajorUnits(surplusAfterNeedsMinor);
  const hasSurplusAfterNeeds = incomeMinor > 0 ? surplusAfterNeedsMinor > 0 : true;

  const isOverBudget = incomeMinor > 0 && totalCommittedMinor > incomeMinor;
  const overAmountMajor = toMajorUnits(Math.max(0, totalCommittedMinor - incomeMinor));

  return (
    <div className="calm-budget-hero">
      {/* 1. Main Headline: Total Budget Planned */}
      <div className="calm-budget-hero__header">
        <div className="calm-budget-hero__title-group">
          <span className="calm-budget-hero__label">Total Budget</span>
          <span className="calm-budget-hero__total">
            {formatCurrency(totalCommittedMajor)}
          </span>
          <span className="calm-budget-hero__target-subtext">
            {isOverBudget ? (
              <strong style={{ color: 'var(--color-terracotta)' }}>
                Exceeds monthly income by {formatCurrency(overAmountMajor)}
              </strong>
            ) : (
              <span>Includes needs, unexpected cushion, goals &amp; savings</span>
            )}
          </span>
        </div>
      </div>

      {/* 2. Unexpected Expenses Cushion Prompt */}
      <div
        style={{
          background: hasSurplusAfterNeeds
            ? 'var(--color-primary-light)'
            : 'var(--color-surface-container)',
          border: hasSurplusAfterNeeds
            ? '1px solid rgba(32, 107, 72, 0.2)'
            : '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 20,
                color: hasSurplusAfterNeeds ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {hasSurplusAfterNeeds ? 'shield' : 'info'}
            </span>
            <strong style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
              Unexpected Expenses Cushion
            </strong>
          </div>
          {hasSurplusAfterNeeds && (
            <button
              type="button"
              className="calm-section-row__action"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={onSetCushion}
            >
              {cushionMinor > 0 ? 'Change Cushion' : '+ Set Cushion'}
            </button>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
          {hasSurplusAfterNeeds ? (
            cushionMinor > 0 ? (
              <>
                You reserved <strong>{formatCurrency(cushionMajor)}</strong> for unexpected expenses.
              </>
            ) : (
              <>
                You have <strong>{formatCurrency(surplusAfterNeedsMajor)}</strong> remaining after essential needs. Set an emergency amount for unexpected expenses.
              </>
            )
          ) : (
            <>
              You do not have enough income remaining after essential needs to set an unexpected expenses cushion this month.
            </>
          )}
        </p>
      </div>

      {/* 3. Sequential 4-Step Breakdown */}
      <div
        style={{
          background: 'var(--color-surface-container-low)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontSize: 13,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
          <span>1. Essential Needs:</span>
          <strong>{formatCurrency(needsMajor)}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
          <span>2. Unexpected Expenses:</span>
          <strong>{formatCurrency(cushionMajor)}</strong>
        </div>

        {goalsMinor > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
            <span>3. Active Goals:</span>
            <strong>{formatCurrency(goalsMajor)}</strong>
          </div>
        )}

        {savingsMinor > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
            <span>4. Monthly Savings:</span>
            <strong>{formatCurrency(savingsMajor)}</strong>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px dashed var(--color-border)',
            paddingTop: 8,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          <span>Total Planned:</span>
          <span style={{ color: isOverBudget ? 'var(--color-terracotta)' : 'var(--color-primary)' }}>
            {formatCurrency(totalCommittedMajor)}
          </span>
        </div>
      </div>

      {/* 4. Over Budget Guardrail Warning */}
      {isOverBudget && (
        <div className="calm-budget-warning" style={{ margin: 0 }}>
          <span className="material-symbols-outlined">warning</span>
          <span>
            Total plans exceed your income by {formatCurrency(overAmountMajor)}. Please reduce or remove items from your Needs, or reduce your savings/cushion.
          </span>
        </div>
      )}
    </div>
  );
};
