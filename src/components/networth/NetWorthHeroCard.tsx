import React from 'react';
import { TrendingUp, ShieldCheck, AlertCircle, Camera, Plus } from 'lucide-react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { NetWorthSummary } from '../../types/netWorth';
import './NetWorthHeroCard.css';

export interface NetWorthHeroCardProps {
  summary: NetWorthSummary;
  onOpenSnapshotModal: () => void;
  onOpenAddAssetModal: () => void;
  onOpenAddLiabilityModal: () => void;
}

export const NetWorthHeroCard: React.FC<NetWorthHeroCardProps> = ({
  summary,
  onOpenSnapshotModal,
  onOpenAddAssetModal,
  onOpenAddLiabilityModal,
}) => {
  const isPositive = summary.netWorthMinor >= 0;

  return (
    <div className="net-worth-hero-card">
      <div className="net-worth-hero-card__header">
        <div className="net-worth-hero-card__badge">
          <ShieldCheck size={14} />
          <span>Total Net Worth</span>
        </div>
        <button
          type="button"
          className="net-worth-hero-card__snapshot-btn"
          onClick={onOpenSnapshotModal}
          title="Capture current financial position snapshot"
        >
          <Camera size={15} />
          <span>Snapshot</span>
        </button>
      </div>

      <div className="net-worth-hero-card__value-container">
        <h1
          className={`net-worth-hero-card__amount ${
            isPositive ? 'net-worth-hero-card__amount--positive' : 'net-worth-hero-card__amount--negative'
          }`}
        >
          {formatCurrency(toMajorUnits(summary.netWorthMinor))}
        </h1>
        <p className="net-worth-hero-card__subtitle">
          {isPositive ? 'Positive Net Worth Position' : 'Total Liabilities Exceed Total Assets'}
        </p>
      </div>

      {/* Grid for Total Assets, Total Liabilities, and Debt Ratio */}
      <div className="net-worth-hero-card__metrics-grid">
        <div className="net-worth-hero-card__metric net-worth-hero-card__metric--assets">
          <div className="net-worth-hero-card__metric-label">
            <TrendingUp size={13} />
            <span>Total Assets</span>
          </div>
          <div className="net-worth-hero-card__metric-value">
            {formatCurrency(toMajorUnits(summary.totalAssetsMinor))}
          </div>
        </div>

        <div className="net-worth-hero-card__metric net-worth-hero-card__metric--liabilities">
          <div className="net-worth-hero-card__metric-label">
            <AlertCircle size={13} />
            <span>Total Liabilities</span>
          </div>
          <div className="net-worth-hero-card__metric-value">
            {formatCurrency(toMajorUnits(summary.totalLiabilitiesMinor))}
          </div>
        </div>

        <div className="net-worth-hero-card__metric net-worth-hero-card__metric--ratio">
          <div className="net-worth-hero-card__metric-label">
            <span>Asset / Debt Ratio</span>
          </div>
          <div className="net-worth-hero-card__metric-value">
            {summary.assetToDebtRatio !== null ? `${summary.assetToDebtRatio}x` : 'Debt-Free'}
          </div>
        </div>
      </div>

      {/* Quick Action buttons */}
      <div className="net-worth-hero-card__actions">
        <button
          type="button"
          className="net-worth-hero-card__action-btn net-worth-hero-card__action-btn--asset"
          onClick={onOpenAddAssetModal}
        >
          <Plus size={15} />
          <span>Add Asset</span>
        </button>
        <button
          type="button"
          className="net-worth-hero-card__action-btn net-worth-hero-card__action-btn--liability"
          onClick={onOpenAddLiabilityModal}
        >
          <Plus size={15} />
          <span>Add Liability</span>
        </button>
      </div>
    </div>
  );
};
