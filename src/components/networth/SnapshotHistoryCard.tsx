import React, { useState } from 'react';
import {
  Camera,
  Calendar,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import { compareSnapshots } from '../../services/netWorthCalculations';
import type { FinancialSnapshot } from '../../types/netWorth';
import './SnapshotHistoryCard.css';

export interface SnapshotHistoryCardProps {
  snapshots: FinancialSnapshot[];
  onDeleteSnapshot: (id: string) => void;
  onOpenSnapshotModal: () => void;
}

export const SnapshotHistoryCard: React.FC<SnapshotHistoryCardProps> = ({
  snapshots,
  onDeleteSnapshot,
  onOpenSnapshotModal,
}) => {
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedSnapshotId((prev) => (prev === id ? null : id));
  };

  // Compare latest two snapshots if at least 2 exist
  const comparison =
    snapshots.length >= 2
      ? compareSnapshots(snapshots[0], snapshots[1])
      : null;

  if (snapshots.length === 0) {
    return (
      <div className="snapshot-history-card">
        <div className="snapshot-history-card__header">
          <h2 className="snapshot-history-card__title">Financial Snapshots & History</h2>
        </div>
        <div className="snapshot-history-card__empty">
          <History size={28} className="snapshot-history-card__empty-icon" />
          <p>No Financial Snapshots Yet</p>
          <span>
            Snapshots freeze and preserve your exact Net Worth, Assets, and Liabilities at a specific milestone date for truthful historical tracking.
          </span>
          <button
            type="button"
            className="snapshot-history-card__cta-btn"
            onClick={onOpenSnapshotModal}
          >
            <Camera size={15} />
            <span>Capture First Snapshot</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="snapshot-history-card">
      <div className="snapshot-history-card__header">
        <div>
          <h2 className="snapshot-history-card__title">Financial Snapshots & History</h2>
          <span className="snapshot-history-card__subtitle">
            {snapshots.length} frozen {snapshots.length === 1 ? 'record' : 'records'} captured
          </span>
        </div>
        <button
          type="button"
          className="snapshot-history-card__new-btn"
          onClick={onOpenSnapshotModal}
        >
          <Camera size={14} />
          <span>New Snapshot</span>
        </button>
      </div>

      {/* Snapshot Comparison Delta Widget if >= 2 snapshots */}
      {comparison && (
        <div className="snapshot-comparison-widget">
          <div className="snapshot-comparison-widget__header">
            <span className="snapshot-comparison-widget__title">Recent Milestone Progress</span>
            <span className="snapshot-comparison-widget__dates">
              {comparison.previousSnapshot?.snapshotDate} $\rightarrow$ {comparison.currentSnapshot.snapshotDate}
            </span>
          </div>

          <div className="snapshot-comparison-widget__grid">
            <div className="snapshot-comparison-widget__item">
              <span className="snapshot-comparison-widget__label">Net Worth Delta</span>
              <span
                className={`snapshot-comparison-widget__val ${
                  comparison.netWorthDeltaMinor >= 0
                    ? 'snapshot-comparison-widget__val--positive'
                    : 'snapshot-comparison-widget__val--negative'
                }`}
              >
                {comparison.netWorthDeltaMinor >= 0 ? '+' : ''}
                {formatCurrency(toMajorUnits(comparison.netWorthDeltaMinor))}
                {comparison.percentageChange !== null && (
                  <span className="snapshot-comparison-widget__pct">
                    ({comparison.percentageChange >= 0 ? '+' : ''}
                    {comparison.percentageChange}%)
                  </span>
                )}
              </span>
            </div>

            <div className="snapshot-comparison-widget__item">
              <span className="snapshot-comparison-widget__label">Assets Delta</span>
              <span
                className={`snapshot-comparison-widget__val ${
                  comparison.assetsDeltaMinor >= 0
                    ? 'snapshot-comparison-widget__val--positive'
                    : 'snapshot-comparison-widget__val--negative'
                }`}
              >
                {comparison.assetsDeltaMinor >= 0 ? '+' : ''}
                {formatCurrency(toMajorUnits(comparison.assetsDeltaMinor))}
              </span>
            </div>

            <div className="snapshot-comparison-widget__item">
              <span className="snapshot-comparison-widget__label">Debt Delta</span>
              <span
                className={`snapshot-comparison-widget__val ${
                  comparison.liabilitiesDeltaMinor <= 0
                    ? 'snapshot-comparison-widget__val--positive'
                    : 'snapshot-comparison-widget__val--negative'
                }`}
              >
                {comparison.liabilitiesDeltaMinor >= 0 ? '+' : ''}
                {formatCurrency(toMajorUnits(comparison.liabilitiesDeltaMinor))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Timeline List */}
      <div className="snapshot-timeline-list">
        {snapshots.map((snap) => {
          const isExpanded = expandedSnapshotId === snap.id;

          return (
            <div key={snap.id} className="snapshot-item">
              <div className="snapshot-item__summary" onClick={() => toggleExpand(snap.id)}>
                <div className="snapshot-item__date-col">
                  <div className="snapshot-item__date-row">
                    <Calendar size={14} />
                    <span className="snapshot-item__date">{snap.snapshotDate}</span>
                  </div>
                  {snap.notes && <span className="snapshot-item__notes">{snap.notes}</span>}
                </div>

                <div className="snapshot-item__amounts-col">
                  <span className="snapshot-item__net-worth">
                    {formatCurrency(toMajorUnits(snap.netWorthMinor))}
                  </span>
                  <div className="snapshot-item__breakdown-pills">
                    <span className="snapshot-item__pill snapshot-item__pill--assets">
                      A: {formatCurrency(toMajorUnits(snap.totalAssetsMinor))}
                    </span>
                    <span className="snapshot-item__pill snapshot-item__pill--liab">
                      L: {formatCurrency(toMajorUnits(snap.totalLiabilitiesMinor))}
                    </span>
                  </div>
                </div>

                <div className="snapshot-item__chevron">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expanded Breakdown */}
              {isExpanded && (
                <div className="snapshot-item__details">
                  {snap.assetItems && snap.assetItems.length > 0 && (
                    <div className="snapshot-item__detail-group">
                      <span className="snapshot-item__group-title">Frozen Assets</span>
                      <div className="snapshot-item__table">
                        {snap.assetItems.map((ai, idx) => (
                          <div key={idx} className="snapshot-item__table-row">
                            <span>{ai.name}</span>
                            <span style={{ color: '#34d399', fontWeight: 600 }}>
                              {formatCurrency(toMajorUnits(ai.valueMinor))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {snap.liabilityItems && snap.liabilityItems.length > 0 && (
                    <div className="snapshot-item__detail-group">
                      <span className="snapshot-item__group-title">Frozen Liabilities</span>
                      <div className="snapshot-item__table">
                        {snap.liabilityItems.map((li, idx) => (
                          <div key={idx} className="snapshot-item__table-row">
                            <span>{li.name}</span>
                            <span style={{ color: '#fb7185', fontWeight: 600 }}>
                              {formatCurrency(toMajorUnits(li.outstandingMinor))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="snapshot-item__footer">
                    <button
                      type="button"
                      className="snapshot-item__delete-btn"
                      onClick={() => onDeleteSnapshot(snap.id)}
                    >
                      <Trash2 size={13} />
                      <span>Delete Snapshot</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
