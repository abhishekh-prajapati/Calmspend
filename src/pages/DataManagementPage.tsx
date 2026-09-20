/**
 * STAGE 11 — DATA MANAGEMENT PAGE
 *
 * Features:
 *   - Storage info (collection counts, estimated size)
 *   - Export / Download backup JSON
 *   - Import / Restore from backup (with 3-layer validation, preview, atomic write)
 *   - Reset all data (with typed confirmation)
 *   - Safety backup banner + undo last restore
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileJson,
  X,
  ChevronRight,
  Info,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useFinancial } from '../context/useFinancial';
import { localStorageAdapter } from '../services/storage/localStorageAdapter';
import {
  downloadBackupFile,
  previewBackupFile,
  performAtomicRestore,
  clearSafetyBackup,
  getSafetyBackupDate,
  undoLastRestore,
  getStorageInfo,
} from '../services/backup';
import type { RestorePreviewInfo } from '../types/backup';
import type { BackupEnvelope } from '../types/backup';
import { registerBackHandler } from '../services/mobile/backButtonService';
import './DataManagementPage.css';

// ======================================================================
// HELPERS
// ======================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

// ======================================================================
// TOAST
// ======================================================================

type ToastVariant = 'success' | 'error' | 'warning';

interface ToastState {
  message: string;
  variant: ToastVariant;
  key: number;
}

function Toast({ toast }: { toast: ToastState }) {
  return (
    <div key={toast.key} className={`dm-toast dm-toast--${toast.variant}`}>
      {toast.message}
    </div>
  );
}

// ======================================================================
// RESTORE MODAL
// ======================================================================

interface RestoreModalProps {
  onClose: () => void;
  onRestoreSuccess: () => void;
}

type RestoreStep = 'upload' | 'preview' | 'confirm' | 'processing' | 'result';

function RestoreModal({ onClose, onRestoreSuccess }: RestoreModalProps) {
  const [step, setStep] = useState<RestoreStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RestorePreviewInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultSuccess, setResultSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unregister = registerBackHandler(() => {
      onClose();
      return true;
    });
    return () => unregister();
  }, [onClose]);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setStep('preview');
    setPreview(null);
    setErrorMessage(null);

    const result = await previewBackupFile(f);
    setPreview(result);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleConfirmRestore = async () => {
    if (!preview?.envelope) return;
    setStep('processing');

    const result = await performAtomicRestore(
      preview.envelope as BackupEnvelope,
      localStorageAdapter,
    );

    setResultSuccess(result.success);
    if (!result.success) {
      setErrorMessage(result.errorMessage ?? 'Restore failed.');
    }
    setStep('result');

    if (result.success) {
      setTimeout(() => {
        onRestoreSuccess();
        onClose();
      }, 1800);
    }
  };

  const collectionCounts = preview?.collectionCounts;

  return (
    <div className="dm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dm-modal" role="dialog" aria-modal="true" aria-label="Import & Restore">
        <div className="dm-modal-handle" />
        <div className="dm-modal-header">
          <p className="dm-modal-title">Import &amp; Restore</p>
          <p className="dm-modal-subtitle">
            {step === 'upload' && 'Upload a backup file to restore your data'}
            {step === 'preview' && (preview ? (preview.isValid ? 'Backup validated — review before restoring' : 'Backup file has errors') : 'Validating backup file…')}
            {step === 'confirm' && 'This will replace ALL your current data'}
            {step === 'processing' && 'Restoring data…'}
            {step === 'result' && (resultSuccess ? 'Data restored successfully' : 'Restore failed')}
          </p>
        </div>

        <div className="dm-modal-body">
          {/* STEP: UPLOAD */}
          {step === 'upload' && (
            <>
              <div
                id="dm-dropzone"
                className={`dm-dropzone${isDragOver ? ' dm-dropzone--active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileInput}
                  aria-label="Upload backup file"
                />
                <div className="dm-dropzone-icon">
                  <FileJson size={22} />
                </div>
                <span className="dm-dropzone-title">Tap to choose file</span>
                <span className="dm-dropzone-hint">or drag &amp; drop a .json backup</span>
              </div>
              <div className="dm-modal-footer">
                <Button id="dm-restore-cancel" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
              </div>
            </>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            <>
              {!preview && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <div className="dm-spinner" />
                </div>
              )}

              {file && (
                <div className="dm-file-chip">
                  <FileJson size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <span className="dm-file-chip-name">{file.name}</span>
                  <button
                    id="dm-remove-file"
                    className="dm-file-chip-remove"
                    onClick={() => { setFile(null); setPreview(null); setStep('upload'); }}
                    aria-label="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {preview && preview.isValid && collectionCounts && (
                <div className="dm-preview-panel">
                  <div className="dm-preview-row">
                    <span className="dm-preview-label">Exported at</span>
                    <span className="dm-preview-value">{formatDate(preview.exportedAt)}</span>
                  </div>
                  <div className="dm-preview-row">
                    <span className="dm-preview-label">Format version</span>
                    <span className="dm-preview-value">v{preview.formatVersion}</span>
                  </div>
                  <div className="dm-preview-divider" />
                  <div className="dm-preview-row">
                    <span className="dm-preview-label">Accounts</span>
                    <span className="dm-preview-value">{collectionCounts.accounts}</span>
                  </div>
                  <div className="dm-preview-row">
                    <span className="dm-preview-label">Transactions</span>
                    <span className="dm-preview-value">{collectionCounts.transactions}</span>
                  </div>
                  <div className="dm-preview-row">
                    <span className="dm-preview-label">Goals</span>
                    <span className="dm-preview-value">{collectionCounts.goals}</span>
                  </div>
                  <div className="dm-preview-row">
                    <span className="dm-preview-label">Snapshots</span>
                    <span className="dm-preview-value">{collectionCounts.financialSnapshots}</span>
                  </div>
                  <div className="dm-preview-row">
                    <span className="dm-preview-label">Categories</span>
                    <span className="dm-preview-value">{collectionCounts.categories}</span>
                  </div>
                </div>
              )}

              {preview && !preview.isValid && (
                <div className="dm-errors">
                  <p className="dm-errors-title">
                    <XCircle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Validation failed ({preview.errors.length} {preview.errors.length === 1 ? 'error' : 'errors'})
                  </p>
                  {preview.errors.slice(0, 8).map((err, i) => (
                    <div key={i} className="dm-error-item">• {err.message}</div>
                  ))}
                  {preview.errors.length > 8 && (
                    <div className="dm-error-item">…and {preview.errors.length - 8} more</div>
                  )}
                </div>
              )}

              <div className="dm-modal-footer" style={{ padding: 0, marginTop: 4 }}>
                <Button id="dm-restore-back" variant="outline" fullWidth onClick={() => { setFile(null); setPreview(null); setStep('upload'); }}>
                  Back
                </Button>
                {preview?.isValid && (
                  <Button id="dm-restore-proceed" variant="primary" fullWidth onClick={() => setStep('confirm')}>
                    Restore
                  </Button>
                )}
              </div>
            </>
          )}

          {/* STEP: CONFIRM */}
          {step === 'confirm' && (
            <>
              <div className="dm-reset-warning-box">
                <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
                <div className="dm-reset-warning-text">
                  All your current transactions, accounts, goals, budgets, and settings will be permanently
                  replaced with the backup data. A safety backup will be saved automatically before the restore.
                </div>
              </div>

              <div className="dm-modal-footer" style={{ padding: 0, marginTop: 4 }}>
                <Button id="dm-restore-cancel-confirm" variant="outline" fullWidth onClick={() => setStep('preview')}>
                  Go back
                </Button>
                <Button id="dm-restore-confirm" variant="danger" fullWidth onClick={handleConfirmRestore}>
                  Yes, restore
                </Button>
              </div>
            </>
          )}

          {/* STEP: PROCESSING */}
          {step === 'processing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
              <div className="dm-spinner" />
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Writing data…</span>
            </div>
          )}

          {/* STEP: RESULT */}
          {step === 'result' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
              {resultSuccess ? (
                <>
                  <CheckCircle size={40} style={{ color: 'var(--color-success-text)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Restore complete
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Reloading your data…
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={40} style={{ color: 'var(--color-danger)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger-text)' }}>
                    Restore failed
                  </span>
                  {errorMessage && (
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      {errorMessage}
                    </span>
                  )}
                  <Button id="dm-result-close" variant="outline" onClick={onClose}>Close</Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================================================================
// RESET MODAL
// ======================================================================

interface ResetModalProps {
  onClose: () => void;
  onResetSuccess: () => void;
}

const RESET_CONFIRM_WORD = 'RESET';

function ResetModal({ onClose, onResetSuccess }: ResetModalProps) {
  const [typed, setTyped] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const unregister = registerBackHandler(() => {
      onClose();
      return true;
    });
    return () => unregister();
  }, [onClose]);

  const canReset = typed === RESET_CONFIRM_WORD;

  const handleReset = () => {
    if (!canReset) return;
    setIsResetting(true);
    try {
      localStorageAdapter.clearData();
      clearSafetyBackup();
    } finally {
      setIsResetting(false);
      onResetSuccess();
      onClose();
    }
  };

  return (
    <div className="dm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dm-modal" role="dialog" aria-modal="true" aria-label="Reset all data">
        <div className="dm-modal-handle" />
        <div className="dm-modal-header">
          <p className="dm-modal-title">Reset All Data</p>
          <p className="dm-modal-subtitle">This action is permanent and cannot be undone</p>
        </div>
        <div className="dm-modal-body">
          <div className="dm-reset-confirm">
            <div className="dm-reset-warning-box">
              <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
              <div className="dm-reset-warning-text">
                All financial data — transactions, accounts, budgets, goals, bills, and snapshots —
                will be permanently erased. This cannot be undone. Export a backup first.
              </div>
            </div>

            <div>
              <div className="dm-confirm-input-label">
                Type <strong>{RESET_CONFIRM_WORD}</strong> to confirm
              </div>
              <input
                id="dm-reset-input"
                className="ui-input"
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value.toUpperCase())}
                placeholder={RESET_CONFIRM_WORD}
                autoFocus
                aria-label={`Type ${RESET_CONFIRM_WORD} to confirm reset`}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${canReset ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  background: 'var(--color-surface)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '0.05em',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>
        <div className="dm-modal-footer">
          <Button id="dm-reset-cancel" variant="outline" fullWidth onClick={onClose} disabled={isResetting}>
            Cancel
          </Button>
          <Button
            id="dm-reset-confirm-btn"
            variant="danger"
            fullWidth
            onClick={handleReset}
            disabled={!canReset || isResetting}
          >
            {isResetting ? 'Resetting…' : 'Reset Everything'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ======================================================================
// MAIN PAGE
// ======================================================================

export const DataManagementPage: React.FC = () => {
  const { refreshData, storageHealth } = useFinancial();

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [safetyBackupDate, setSafetyBackupDate] = useState<string | null>(() => getSafetyBackupDate());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build storage info from live data (re-read on each render to stay fresh)
  const currentData = localStorageAdapter.loadData();
  const storageInfo = getStorageInfo(currentData);

  // safetyBackupDate is initialized lazily in useState above — no effect needed

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, variant, key: Date.now() });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const handleDownloadQuarantinedData = useCallback(() => {
    try {
      const raw =
        storageHealth.rawQuarantinedData ||
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('pbp_quarantine_corrupted_v1') || localStorage.getItem('pbp_financial_store_v1')
          : '') ||
        '';
      const blob = new Blob([raw], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pbp-quarantined-data-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Quarantined raw data exported for recovery', 'success');
    } catch {
      showToast('Failed to export quarantined data', 'error');
    }
  }, [storageHealth, showToast]);

  const handleExport = useCallback(() => {
    try {
      const data = localStorageAdapter.loadData();
      downloadBackupFile(data);
      showToast('Backup file downloaded successfully', 'success');
    } catch {
      showToast('Failed to create backup file', 'error');
    }
  }, [showToast]);

  const handleRestoreSuccess = useCallback(() => {
    refreshData();
    setSafetyBackupDate(getSafetyBackupDate());
    showToast('Data restored successfully', 'success');
  }, [refreshData, showToast]);

  const handleResetSuccess = useCallback(() => {
    refreshData();
    setSafetyBackupDate(null);
    showToast('All data has been reset', 'warning');
  }, [refreshData, showToast]);

  const handleUndoRestore = useCallback(() => {
    const success = undoLastRestore(localStorageAdapter);
    if (success) {
      refreshData();
      clearSafetyBackup();
      setSafetyBackupDate(null);
      showToast('Previous state restored from safety backup', 'success');
    } else {
      showToast('Could not undo — safety backup is invalid', 'error');
    }
  }, [refreshData, showToast]);

  const handleClearSafetyBackup = useCallback(() => {
    clearSafetyBackup();
    setSafetyBackupDate(null);
    showToast('Safety backup cleared', 'success');
  }, [showToast]);

  const collectionRows: { label: string; count: number }[] = [
    { label: 'Accounts', count: storageInfo.collections.accounts },
    { label: 'Transactions', count: storageInfo.collections.transactions },
    { label: 'Categories', count: storageInfo.collections.categories },
    { label: 'Goals', count: storageInfo.collections.goals },
    { label: 'Budgets', count: storageInfo.collections.monthlyBudgets },
    { label: 'Budget Items', count: storageInfo.collections.budgetItems },
    { label: 'Planned Income', count: storageInfo.collections.plannedIncomeItems },
    { label: 'Contributions', count: storageInfo.collections.goalContributions },
    { label: 'Schedules', count: storageInfo.collections.recurringSchedules },
    { label: 'Bills', count: storageInfo.collections.scheduledBills },
    { label: 'Occurrences', count: storageInfo.collections.occurrenceRecords },
    { label: 'Assets', count: storageInfo.collections.manualAssets },
    { label: 'Liabilities', count: storageInfo.collections.manualLiabilities },
    { label: 'Snapshots', count: storageInfo.collections.financialSnapshots },
  ];

  return (
    <div className="dm-page">
      <PageHeader title="Data Management" subtitle="Backup, Restore &amp; Storage" />

      <div className="page-container">
        {/* Corrupted Storage Recovery Banner */}
        {storageHealth.status === 'corrupt' && (
          <div className="dm-safety-banner" style={{ backgroundColor: 'var(--color-danger-light)', borderColor: 'var(--color-danger)' }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-danger-text)', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <span style={{ fontWeight: 600, color: 'var(--color-danger-text)' }}>
                Storage Corruption Detected
              </span>
              <span className="dm-safety-banner-text" style={{ color: 'var(--color-danger-text)' }}>
                The local database could not be parsed safely. Your original data has been quarantined and NOT overwritten.
              </span>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  id="dm-download-quarantine-btn"
                  className="dm-safety-banner-clear"
                  onClick={handleDownloadQuarantinedData}
                  style={{ textDecoration: 'underline', fontWeight: 600, color: 'var(--color-danger-text)' }}
                >
                  Download Raw Quarantined Data
                </button>
                <button
                  id="dm-restore-corrupt-btn"
                  className="dm-safety-banner-clear"
                  onClick={() => setShowRestoreModal(true)}
                  style={{ textDecoration: 'underline', fontWeight: 600, color: 'var(--color-danger-text)' }}
                >
                  Restore From Backup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Safety backup banner */}
        {safetyBackupDate && (
          <div className="dm-safety-banner">
            <ShieldCheck size={16} style={{ color: 'var(--color-warning-text)', flexShrink: 0 }} />
            <span className="dm-safety-banner-text">
              Safety backup available from {formatDate(safetyBackupDate)}.{' '}
              <button
                id="dm-undo-restore-btn"
                className="dm-safety-banner-clear"
                onClick={handleUndoRestore}
              >
                Undo restore
              </button>
            </span>
            <button
              id="dm-clear-safety-btn"
              className="dm-safety-banner-clear"
              onClick={handleClearSafetyBackup}
              style={{ marginLeft: 4 }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Storage Info */}
        <div className="dm-section">
          <SectionHeader title="Storage Overview" />
          <Card variant="default" padding="md" radius="lg">
            <div className="dm-storage-card">
              <div className="dm-storage-header">
                <span className="dm-storage-title">Local Storage</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="dm-storage-size">{formatBytes(storageInfo.estimatedSizeBytes)}</span>
                  <Badge variant="neutral" size="sm">v{storageInfo.storageVersion}</Badge>
                </div>
              </div>
              <div className="dm-collection-grid">
                {collectionRows.map((row) => (
                  <div key={row.label} className="dm-collection-row">
                    <span className="dm-collection-label">{row.label}</span>
                    <span className="dm-collection-count">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Export & Import Actions */}
        <div className="dm-section">
          <SectionHeader title="Backup &amp; Restore" />
          <div className="dm-action-list">
            <button
              id="dm-export-btn"
              className="dm-action-item"
              onClick={handleExport}
            >
              <div className="dm-action-icon dm-action-icon--primary">
                <Download size={18} />
              </div>
              <div className="dm-action-text">
                <div className="dm-action-title">Export Backup</div>
                <div className="dm-action-subtitle">Download all data as a .json file</div>
              </div>
              <ChevronRight size={16} className="dm-action-chevron" />
            </button>

            <button
              id="dm-import-btn"
              className="dm-action-item"
              onClick={() => setShowRestoreModal(true)}
            >
              <div className="dm-action-icon dm-action-icon--success">
                <Upload size={18} />
              </div>
              <div className="dm-action-text">
                <div className="dm-action-title">Import &amp; Restore</div>
                <div className="dm-action-subtitle">Restore data from a backup file</div>
              </div>
              <ChevronRight size={16} className="dm-action-chevron" />
            </button>
          </div>
        </div>

        {/* Info about backups */}
        <Card variant="subtle" padding="md" radius="lg">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Info size={15} style={{ color: 'var(--color-info-text)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 3 }}>
                About Backups
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Backups are saved locally to your device. They contain all your financial data — 
                accounts, transactions, goals, budgets, and snapshots. Store them in a safe location 
                (cloud drive, email, etc.) for recovery purposes.
              </div>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <div className="dm-section">
          <SectionHeader title="Danger Zone" />
          <div className="dm-action-list">
            <button
              id="dm-reset-btn"
              className="dm-action-item"
              onClick={() => setShowResetModal(true)}
            >
              <div className="dm-action-icon dm-action-icon--danger">
                <Trash2 size={18} />
              </div>
              <div className="dm-action-text">
                <div className="dm-action-title" style={{ color: 'var(--color-danger)' }}>Reset All Data</div>
                <div className="dm-action-subtitle">Permanently erase all financial records</div>
              </div>
              <ChevronRight size={16} className="dm-action-chevron" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <Database size={12} />
            <span>All data is stored locally — no cloud sync</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showRestoreModal && (
        <RestoreModal
          onClose={() => setShowRestoreModal(false)}
          onRestoreSuccess={handleRestoreSuccess}
        />
      )}
      {showResetModal && (
        <ResetModal
          onClose={() => setShowResetModal(false)}
          onResetSuccess={handleResetSuccess}
        />
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} />}
    </div>
  );
};
