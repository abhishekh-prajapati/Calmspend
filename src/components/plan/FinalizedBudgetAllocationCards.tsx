import React from 'react';
import { toMajorUnits } from '../../utils/money';
import type { CategoryBudgetProgress } from '../../types/budget';
import type { Category } from '../../types/transaction';

export interface FinalizedBudgetAllocationCardsProps {
  totalIncomeMajor: number;
  totalNeedsMajor: number;
  totalWantsMajor: number;
  totalSavingsMajor: number;
  unassignedSurplusMajor: number;
  needsEnvelopes: CategoryBudgetProgress[];
  wantsEnvelopes: CategoryBudgetProgress[];
  categories: Category[];
}

export const FinalizedBudgetAllocationCards: React.FC<FinalizedBudgetAllocationCardsProps> = ({
  totalIncomeMajor,
  totalNeedsMajor,
  totalWantsMajor,
  totalSavingsMajor,
  unassignedSurplusMajor,
  needsEnvelopes,
  wantsEnvelopes,
  categories,
}) => {
  const getCategoryName = (categoryId: string, fallbackName?: string) => {
    return fallbackName || categories.find((c) => c.id === categoryId)?.name || 'Category';
  };

  const needsPct = totalIncomeMajor > 0 ? Math.min(100, Math.round((totalNeedsMajor / totalIncomeMajor) * 100)) : 0;
  const wantsPct = totalIncomeMajor > 0 ? Math.min(100, Math.round((totalWantsMajor / totalIncomeMajor) * 100)) : 0;
  const savingsPct = totalIncomeMajor > 0 ? Math.min(100, Math.round((totalSavingsMajor / totalIncomeMajor) * 100)) : 0;
  const surplusPct = totalIncomeMajor > 0 ? Math.min(100, Math.round((unassignedSurplusMajor / totalIncomeMajor) * 100)) : 0;

  return (
    <div className="calm-allocation-cards-list">
      {/* Card 1: Needs */}
      <div className="calm-alloc-card">
        <div className="calm-alloc-header">
          <div className="calm-alloc-title-group">
            <div className="calm-alloc-icon calm-alloc-icon--emerald">
              <span className="material-symbols-outlined calm-icon-md">roofing</span>
            </div>
            <div>
              <div className="calm-alloc-title">Essential Needs</div>
              <div className="calm-alloc-desc">Core living &amp; safety cushion</div>
            </div>
          </div>
          <span className="calm-funded-tag">🔒 Funded</span>
        </div>

        <div className="calm-alloc-slider-row">
          <div className="calm-alloc-slider-header">
            <span className="calm-alloc-slider-label">{needsPct}% of Income</span>
            <span className="calm-alloc-slider-val calm-text-emerald">₹{totalNeedsMajor.toLocaleString()}</span>
          </div>
          <div className="calm-alloc-slider-track">
            <div className="calm-alloc-slider-fill calm-bg-emerald" style={{ width: `${needsPct}%` }} />
          </div>
        </div>

        {needsEnvelopes.length > 0 && (
          <div className="calm-sub-envelopes-grid">
            {needsEnvelopes.map((p) => (
              <div key={p.categoryId} className="calm-sub-envelope-item">
                <span className="calm-sub-envelope-name">{getCategoryName(p.categoryId, p.categoryName)}</span>
                <span className="calm-sub-envelope-val">₹{toMajorUnits(p.plannedAmountMinor).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card 2: Wants & Discretionary */}
      <div className="calm-alloc-card">
        <div className="calm-alloc-header">
          <div className="calm-alloc-title-group">
            <div className="calm-alloc-icon calm-alloc-icon--purple">
              <span className="material-symbols-outlined calm-icon-md">celebration</span>
            </div>
            <div>
              <div className="calm-alloc-title">Wants &amp; Discretionary</div>
              <div className="calm-alloc-desc">Lifestyle &amp; daily leisure</div>
            </div>
          </div>
          <span className={totalWantsMajor > 0 ? 'calm-limit-tag' : 'calm-funded-tag'}>
            {totalWantsMajor > 0 ? 'Limit Enforced' : '₹0 Configured'}
          </span>
        </div>

        <div className="calm-alloc-slider-row">
          <div className="calm-alloc-slider-header">
            <span className="calm-alloc-slider-label">{wantsPct}% of Income</span>
            <span className="calm-alloc-slider-val calm-text-purple">₹{totalWantsMajor.toLocaleString()}</span>
          </div>
          <div className="calm-alloc-slider-track">
            <div className="calm-alloc-slider-fill calm-bg-purple" style={{ width: `${wantsPct}%` }} />
          </div>
        </div>

        {wantsEnvelopes.length > 0 ? (
          <div className="calm-sub-envelopes-grid">
            {wantsEnvelopes.map((p) => (
              <div key={p.categoryId} className="calm-sub-envelope-item">
                <span className="calm-sub-envelope-name">{getCategoryName(p.categoryId, p.categoryName)}</span>
                <span className="calm-sub-envelope-val">₹{toMajorUnits(p.plannedAmountMinor).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, #64748b)', padding: '4px 0 2px' }}>
            No discretionary envelopes added (₹0 planned).
          </div>
        )}
      </div>

      {/* Card 3: Goals & Wealth */}
      <div className="calm-alloc-card">
        <div className="calm-alloc-header">
          <div className="calm-alloc-title-group">
            <div className="calm-alloc-icon calm-alloc-icon--indigo">
              <span className="material-symbols-outlined calm-icon-md">trending_up</span>
            </div>
            <div>
              <div className="calm-alloc-title">Goals &amp; Wealth</div>
              <div className="calm-alloc-desc">Step 3 • Future preservation</div>
            </div>
          </div>
          <span className="calm-autodebit-tag">Auto-Debit Ready</span>
        </div>

        <div className="calm-alloc-slider-row">
          <div className="calm-alloc-slider-header">
            <span className="calm-alloc-slider-label">{savingsPct}% of Income</span>
            <span className="calm-alloc-slider-val calm-text-indigo">₹{totalSavingsMajor.toLocaleString()}</span>
          </div>
          <div className="calm-alloc-slider-track">
            <div className="calm-alloc-slider-fill calm-bg-indigo" style={{ width: `${savingsPct}%` }} />
          </div>
        </div>
      </div>

      {/* Card 4: Unassigned Surplus / Buffer (If any) */}
      {unassignedSurplusMajor > 0 && (
        <div className="calm-alloc-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div className="calm-alloc-header">
            <div className="calm-alloc-title-group">
              <div className="calm-alloc-icon calm-alloc-icon--emerald" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
                <span className="material-symbols-outlined calm-icon-md">savings</span>
              </div>
              <div>
                <div className="calm-alloc-title">Unassigned Safe Surplus</div>
                <div className="calm-alloc-desc">Unallocated buffer remaining</div>
              </div>
            </div>
            <span className="calm-funded-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
              Safe Buffer
            </span>
          </div>

          <div className="calm-alloc-slider-row">
            <div className="calm-alloc-slider-header">
              <span className="calm-alloc-slider-label">{surplusPct}% Unassigned</span>
              <span className="calm-alloc-slider-val calm-text-emerald">₹{unassignedSurplusMajor.toLocaleString()}</span>
            </div>
            <div className="calm-alloc-slider-track">
              <div className="calm-alloc-slider-fill calm-bg-emerald" style={{ width: `${surplusPct}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
