import React from 'react';
import {
  CreditCard,
  Landmark,
  Home,
  UserX,
  FileText,
  ShieldCheck,
  Edit2,
  Trash2,
  Archive,
} from 'lucide-react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { LiabilityItemSummary, ManualLiability } from '../../types/netWorth';
import './LiabilityBreakdownCard.css';

export interface LiabilityBreakdownCardProps {
  liabilityItems: LiabilityItemSummary[];
  totalLiabilitiesMinor: number;
  onEditManualLiability?: (liability: ManualLiability) => void;
  onArchiveManualLiability?: (id: string) => void;
  onDeleteManualLiability?: (id: string) => void;
  manualLiabilitiesMap: Map<string, ManualLiability>;
}

export const LiabilityBreakdownCard: React.FC<LiabilityBreakdownCardProps> = ({
  liabilityItems,
  totalLiabilitiesMinor,
  onEditManualLiability,
  onArchiveManualLiability,
  onDeleteManualLiability,
  manualLiabilitiesMap,
}) => {
  const getIcon = (item: LiabilityItemSummary) => {
    if (item.source === 'credit_card') {
      return <CreditCard size={16} />;
    }
    switch (item.liabilityType) {
      case 'loan':
        return <Landmark size={16} />;
      case 'mortgage':
        return <Home size={16} />;
      case 'personal_debt':
        return <UserX size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getSourceLabel = (item: LiabilityItemSummary) => {
    if (item.source === 'credit_card') {
      return 'Credit Card • Account';
    }
    const typeNames: Record<string, string> = {
      loan: 'Loan / EMI',
      mortgage: 'Home Mortgage',
      personal_debt: 'Personal Debt',
      other_debt: 'Other Liability',
    };
    return `Manual • ${typeNames[item.liabilityType || ''] || 'Liability'}`;
  };

  if (liabilityItems.length === 0) {
    return (
      <div className="liability-breakdown-card">
        <div className="liability-breakdown-card__header">
          <h2 className="liability-breakdown-card__title">Liabilities Breakdown</h2>
          <span className="liability-breakdown-card__total">{formatCurrency(0)}</span>
        </div>
        <div className="liability-breakdown-card__empty">
          <ShieldCheck size={28} className="liability-breakdown-card__empty-icon" />
          <p>Zero Outstanding Liabilities!</p>
          <span>You currently have no credit card debt, loans, or tracked liabilities.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="liability-breakdown-card">
      <div className="liability-breakdown-card__header">
        <div>
          <h2 className="liability-breakdown-card__title">Liabilities Breakdown</h2>
          <span className="liability-breakdown-card__subtitle">{liabilityItems.length} total obligations</span>
        </div>
        <span className="liability-breakdown-card__total">{formatCurrency(toMajorUnits(totalLiabilitiesMinor))}</span>
      </div>

      <div className="liability-breakdown-card__list">
        {liabilityItems.map((item) => {
          const manualObj = item.source === 'manual' ? manualLiabilitiesMap.get(item.id) : undefined;

          return (
            <div key={`${item.source}-${item.id}`} className="liability-breakdown-item">
              <div className="liability-breakdown-item__icon-wrapper">
                {getIcon(item)}
              </div>

              <div className="liability-breakdown-item__info">
                <div className="liability-breakdown-item__name-row">
                  <span className="liability-breakdown-item__name">{item.name}</span>
                  <span className="liability-breakdown-item__amount">
                    {formatCurrency(toMajorUnits(item.outstandingMinor))}
                  </span>
                </div>

                <div className="liability-breakdown-item__meta-row">
                  <span className="liability-breakdown-item__type">{getSourceLabel(item)}</span>
                  <span className="liability-breakdown-item__percentage">
                    {item.percentageOfTotalLiabilities}% of debt
                  </span>
                </div>

                {/* Progress bar of liability contribution */}
                <div className="liability-breakdown-item__progress-track">
                  <div
                    className="liability-breakdown-item__progress-fill"
                    style={{ width: `${Math.min(100, item.percentageOfTotalLiabilities)}%` }}
                  />
                </div>

                {/* Actions for manual liabilities */}
                {item.source === 'manual' && manualObj && (
                  <div className="liability-breakdown-item__actions">
                    {onEditManualLiability && (
                      <button
                        type="button"
                        className="liability-breakdown-item__btn"
                        onClick={() => onEditManualLiability(manualObj)}
                        title="Edit liability"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                    )}
                    {onArchiveManualLiability && (
                      <button
                        type="button"
                        className="liability-breakdown-item__btn"
                        onClick={() => onArchiveManualLiability(manualObj.id)}
                        title="Archive liability"
                      >
                        <Archive size={12} />
                        <span>Archive</span>
                      </button>
                    )}
                    {onDeleteManualLiability && (
                      <button
                        type="button"
                        className="liability-breakdown-item__btn liability-breakdown-item__btn--danger"
                        onClick={() => onDeleteManualLiability(manualObj.id)}
                        title="Delete liability"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
