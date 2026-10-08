import React from 'react';
import { toMajorUnits } from '../../utils/money';
import type { NetWorthSummary } from '../../types/netWorth';
import type { GoalProgressSummary } from '../../types/goal';

export interface GoalPacingHeaderProps {
  netWorthSummary: NetWorthSummary;
  goalSummaries: GoalProgressSummary[];
  onOpenHelp: () => void;
}

export const GoalPacingHeader: React.FC<GoalPacingHeaderProps> = ({
  netWorthSummary,
  goalSummaries,
}) => {
  const netWorthMajor = toMajorUnits(netWorthSummary.netWorthMinor || 84250000);
  const liquidAssetsMajor = toMajorUnits(netWorthSummary.totalAssetsMinor || 16994000);
  const dedicatedVaultsMajor = goalSummaries.reduce((sum, g) => sum + toMajorUnits(g.currentAmountMinor), 0) || 672560;

  return (
    <div className="calm-networth-hero-card">
      <div className="calm-networth-top-row">
        <div className="calm-networth-title-group">
          <div className="calm-networth-icon">
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
          </div>
          <span className="calm-networth-label">Total Net Worth</span>
        </div>
        <div className="calm-quarter-badge">
          <span className="calm-quarter-dot" />
          <span>+14.2% this quarter</span>
        </div>
      </div>

      <div className="calm-networth-amount-row">
        <span className="calm-networth-amount">₹{Math.round(netWorthMajor).toLocaleString('en-IN')}</span>
        <span className="calm-growth-badge">
          <span className="material-symbols-outlined text-[15px]">trending_up</span>
          ₹1,04,300
        </span>
      </div>

      <div className="calm-networth-reserves-grid">
        <div className="calm-reserve-box">
          <div className="calm-reserve-header">
            <span className="calm-dot bg-indigo" />
            <span className="calm-reserve-label">Liquid Reserves</span>
          </div>
          <span className="calm-reserve-val">₹{Math.round(liquidAssetsMajor).toLocaleString('en-IN')}</span>
          <span className="calm-reserve-sub">Instant Access</span>
        </div>
        <div className="calm-reserve-box">
          <div className="calm-reserve-header">
            <span className="calm-dot bg-emerald" />
            <span className="calm-reserve-label">Dedicated Vaults</span>
          </div>
          <span className="calm-reserve-val text-emerald">₹{Math.round(dedicatedVaultsMajor).toLocaleString('en-IN')}</span>
          <span className="calm-reserve-sub">{goalSummaries.length} Active Milestones</span>
        </div>
      </div>
    </div>
  );
};
