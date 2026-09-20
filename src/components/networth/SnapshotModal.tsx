import React, { useState, useEffect } from 'react';
import { X, Camera, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { NetWorthSummary } from '../../types/netWorth';
import { registerBackHandler } from '../../services/mobile/backButtonService';
import './ManualAssetModal.css';

export interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: NetWorthSummary;
  onSaveSnapshot: (snapshotDate: string, notes?: string) => Promise<void>;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  isOpen,
  onClose,
  summary,
  onSaveSnapshot,
}) => {
  const snapshotDate = new Date().toISOString().split('T')[0];
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const unregister = registerBackHandler(() => {
        onClose();
        return true;
      });
      return () => unregister();
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotDate) {
      setError('Please select a snapshot date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSaveSnapshot(snapshotDate, notes);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture snapshot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Capture Financial Snapshot</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="manual-asset-form">
          {error && <div className="form-error-banner">{error}</div>}

          {/* Live Preview Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
                Live Net Worth Preview
              </span>
              <ShieldCheck size={16} color="#34d399" />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              {formatCurrency(toMajorUnits(summary.netWorthMinor))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#34d399' }}>Assets: {formatCurrency(toMajorUnits(summary.totalAssetsMinor))}</span>
              <span style={{ color: '#fb7185' }}>Liabilities: {formatCurrency(toMajorUnits(summary.totalLiabilitiesMinor))}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="snap-date">Snapshot Date (Current Point in Time)</label>
            <input
              id="snap-date"
              type="date"
              className="form-input"
              value={snapshotDate}
              disabled
              style={{ opacity: 0.8, cursor: 'not-allowed' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '0.2rem' }}>
              Snapshots capture the authoritative real-time state today to prevent fabricated historical valuations.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="snap-notes">Snapshot Milestone / Notes (Optional)</label>
            <textarea
              id="snap-notes"
              className="form-textarea"
              placeholder="e.g. End of Month check, Bonus invested, Loan prepayed"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Camera size={15} />
              <span>{isSubmitting ? 'Capturing...' : 'Capture Snapshot'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
