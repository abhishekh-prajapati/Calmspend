import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/useFinancial';
import {
  downloadBackupFile,
  previewBackupFile,
  performAtomicRestore,
} from '../services/backup';
import { localStorageAdapter } from '../services/storage/storageAdapter';
import './VaultPage.css';

export const VaultPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    accounts,
    transactions,
    goals,
    refreshData,
  } = useFinancial();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const handleExportData = () => {
    try {
      const currentData = localStorageAdapter.loadData();
      downloadBackupFile(currentData);
      showToast('Encrypted JSON backup exported to downloads 💾');
    } catch {
      showToast('Failed to export backup file');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const preview = await previewBackupFile(file);
      if (!preview.isValid || !preview.envelope) {
        const firstErr = preview.errors?.[0]?.message || 'Invalid backup file format';
        showToast(firstErr);
        setIsRestoring(false);
        return;
      }

      const result = await performAtomicRestore(preview.envelope, localStorageAdapter);
      if (result.success) {
        refreshData();
        showToast('Vault successfully restored from backup ✨');
      } else {
        showToast(result.errorMessage || 'Restore failed');
      }
    } catch {
      showToast('Failed to parse or restore backup');
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFactoryReset = () => {
    localStorageAdapter.clearData();
    refreshData();
    setIsResetModalOpen(false);
    showToast('Vault cleared and reset to fresh defaults');
  };

  return (
    <div className="calm-vault-page">
      {/* 1. Encrypted Data & Security Vault Card */}
      <div className="calm-encrypted-vault-card">
        <div className="calm-encrypted-vault-card__header">
          <div className="calm-encrypted-vault-card__title-group">
            <div className="calm-vault-shield-icon">
              <span className="material-symbols-outlined">shield_lock</span>
            </div>
            <div>
              <h1 className="calm-encrypted-vault-card__title">Encrypted Data Vault</h1>
              <p className="calm-encrypted-vault-card__sub">
                100% private, client-side AES-256 storage
              </p>
            </div>
          </div>
          <span className="calm-aes-badge">AES-256</span>
        </div>

        {/* Live Vault Metrics */}
        <div className="calm-vault-metrics-grid">
          <div className="calm-vault-metric-box">
            <span className="calm-vault-metric-val">{transactions.length}</span>
            <span className="calm-vault-metric-lbl">Transactions</span>
          </div>
          <div className="calm-vault-metric-box">
            <span className="calm-vault-metric-val">{goals.length}</span>
            <span className="calm-vault-metric-lbl">Goals</span>
          </div>
          <div className="calm-vault-metric-box">
            <span className="calm-vault-metric-val">{accounts.length}</span>
            <span className="calm-vault-metric-lbl">Accounts</span>
          </div>
        </div>

        {/* Primary Vault Actions */}
        <div className="calm-vault-actions">
          <button
            type="button"
            className="calm-vault-export-btn"
            onClick={handleExportData}
          >
            <span className="material-symbols-outlined">download</span>
            <span>Export Encrypted Backup (.json)</span>
          </button>

          <label className="calm-vault-restore-btn">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.enc"
              onChange={handleFileChange}
              disabled={isRestoring}
            />
            <span className="material-symbols-outlined">
              {isRestoring ? 'hourglass_top' : 'upload_file'}
            </span>
            <span>{isRestoring ? 'Validating & Restoring...' : 'Restore Backup File'}</span>
          </label>

          <button
            type="button"
            className="calm-vault-deep-mgmt-btn"
            onClick={() => navigate('/data-management')}
          >
            <span className="material-symbols-outlined">database</span>
            <span>Advanced Storage &amp; Schema Inspector</span>
          </button>
        </div>

        {/* Dedicated Danger Zone */}
        <div className="calm-vault-danger-zone">
          <div className="calm-vault-danger-zone__info">
            <span className="calm-vault-danger-zone__title">Danger Zone</span>
            <span className="calm-vault-danger-zone__desc">
              Permanently erase all local ledger data on this device
            </span>
          </div>
          <button
            type="button"
            className="calm-vault-wipe-btn"
            onClick={() => setIsResetModalOpen(true)}
          >
            <span className="material-symbols-outlined">delete_forever</span>
            <span>Wipe Local Data Vault</span>
          </button>
        </div>
      </div>

      {/* 2. Danger Zone Confirmation Modal */}
      {isResetModalOpen && (
        <div className="calm-sheet-overlay" onClick={() => setIsResetModalOpen(false)}>
          <div className="calm-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="calm-sheet__handle" />
            
            <div className="calm-sheet__header">
              <div className="calm-reset-warning-icon">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h3 className="calm-sheet__title">Permanently Wipe Data Vault?</h3>
                <span className="calm-sheet__subtitle">Irreversible action</span>
              </div>
            </div>

            <div className="calm-reset-warning-box">
              <span className="material-symbols-outlined calm-reset-warning-box__icon">report</span>
              <p className="calm-reset-warning-text">
                <strong>Warning:</strong> This will permanently erase all <strong>{transactions.length} transactions</strong>, <strong>{accounts.length} accounts</strong>, envelopes, and active goals from this browser. You cannot undo this.
              </p>
            </div>

            <div className="calm-reset-safeguard">
              <span className="calm-reset-safeguard__label">Recommended safety step:</span>
              <button
                type="button"
                className="calm-reset-backup-btn"
                onClick={handleExportData}
              >
                <span className="material-symbols-outlined">download</span>
                <span>Export Encrypted Backup First</span>
              </button>
            </div>

            <div className="calm-reset-modal-actions">
              <button
                type="button"
                className="calm-reset-confirm-btn"
                onClick={handleFactoryReset}
              >
                <span className="material-symbols-outlined">delete_forever</span>
                <span>Yes, Permanently Erase Vault</span>
              </button>
              <button
                type="button"
                className="calm-reset-cancel-btn"
                onClick={() => setIsResetModalOpen(false)}
              >
                Cancel &amp; Keep Vault Safe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="calm-trends-toast">
          <span className="material-symbols-outlined">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default VaultPage;
