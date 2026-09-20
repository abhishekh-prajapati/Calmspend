import React from 'react';
import { Tag } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { NeedWantBreakdown } from '../../types/report';
import './NeedWantCard.css';

export interface NeedWantCardProps {
  breakdown: NeedWantBreakdown;
}

export const NeedWantCard: React.FC<NeedWantCardProps> = ({ breakdown }) => {
  if (breakdown.totalExpensesMinor === 0) {
    return (
      <Card variant="default" padding="lg" radius="lg" className="need-want-card">
        <div className="card-header-simple">
          <span className="card-subtitle">Lifestyle Classification</span>
          <h3 className="card-title">Needs vs. Wants</h3>
        </div>
        <div className="empty-needwant-state">
          <Tag size={28} className="empty-needwant-icon" />
          <p className="empty-needwant-text">No expense transactions to classify for this period</p>
        </div>
      </Card>
    );
  }

  const needsPct = breakdown.needsPercentage || 0;
  const wantsPct = breakdown.wantsPercentage || 0;
  const unclassifiedPct = breakdown.unclassifiedPercentage || 0;

  return (
    <Card variant="default" padding="lg" radius="lg" className="need-want-card">
      <div className="card-header-simple">
        <span className="card-subtitle">Lifestyle Classification</span>
        <h3 className="card-title">Needs vs. Wants Analysis</h3>
      </div>

      {/* Multi-segment Proportion Bar */}
      <div className="needwant-bar-wrapper">
        <div className="needwant-bar-track">
          {needsPct > 0 && (
            <div
              className="bar-segment segment-needs"
              style={{ width: `${needsPct}%` }}
              title={`Needs: ${needsPct.toFixed(1)}%`}
            />
          )}
          {wantsPct > 0 && (
            <div
              className="bar-segment segment-wants"
              style={{ width: `${wantsPct}%` }}
              title={`Wants: ${wantsPct.toFixed(1)}%`}
            />
          )}
          {unclassifiedPct > 0 && (
            <div
              className="bar-segment segment-unclassified"
              style={{ width: `${unclassifiedPct}%` }}
              title={`Unclassified: ${unclassifiedPct.toFixed(1)}%`}
            />
          )}
        </div>
      </div>

      {/* 3 Metrics Row */}
      <div className="needwant-stats-row">
        {/* Needs */}
        <div className="needwant-stat-item">
          <div className="stat-indicator indicator-needs" />
          <div className="stat-text-group">
            <span className="nw-label">Needs</span>
            <span className="nw-value">{formatCurrency(toMajorUnits(breakdown.needsMinor))}</span>
            <span className="nw-pct">{needsPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Wants */}
        <div className="needwant-stat-item">
          <div className="stat-indicator indicator-wants" />
          <div className="stat-text-group">
            <span className="nw-label">Wants</span>
            <span className="nw-value">{formatCurrency(toMajorUnits(breakdown.wantsMinor))}</span>
            <span className="nw-pct">{wantsPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Unclassified */}
        <div className="needwant-stat-item">
          <div className="stat-indicator indicator-unclassified" />
          <div className="stat-text-group">
            <span className="nw-label">Unclassified</span>
            <span className="nw-value">{formatCurrency(toMajorUnits(breakdown.unclassifiedMinor))}</span>
            <span className="nw-pct">{unclassifiedPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="needwant-footer-note">
        <span>Classifications are derived from the Need/Want toggle on each expense transaction.</span>
      </div>
    </Card>
  );
};
