import React, { useState } from 'react';
import { useFinancial } from '../../context/useFinancial';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import { aaApiClient } from '../../services/aa/aaApiClient';
import { aaSyncManager } from '../../services/aa/aaSyncManager';
import { ConnectBankModal } from './ConnectBankModal';
import './LinkedBankAccountsSection.css';

export const LinkedBankAccountsSection: React.FC = () => {
  const { accounts, categories, refreshData } = useFinancial();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const linkedAccounts = accounts.filter((a) => a.bankConnectionId);

  const handleManualSync = async (connectionId: string, fipName?: string) => {
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const { accounts: normalizedAccounts } = await aaApiClient.triggerSync(
        connectionId,
        fipName
      );

      const result = await aaSyncManager.ingestNormalizedAccounts(
        connectionId,
        normalizedAccounts,
        categories
      );

      refreshData();
      setSyncFeedback(
        `Synced: ${result.importedCount} new transactions (${result.skippedCount} skipped)`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setSyncFeedback(`Error: ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="calm-linked-banks-container">
      <div className="calm-linked-banks-header">
        <div className="calm-linked-banks-title-group">
          <span className="calm-linked-banks-title">Linked Bank Accounts</span>
          <span className="calm-linked-banks-badge">Account Aggregator</span>
        </div>
        <button
          type="button"
          className="calm-linked-banks-connect-btn"
          onClick={() => setIsConnectModalOpen(true)}
        >
          <span className="material-symbols-outlined">add_link</span>
          <span>Connect Bank</span>
        </button>
      </div>

      {syncFeedback && (
        <div className="calm-sync-feedback">
          <span className="material-symbols-outlined">info</span>
          <span>{syncFeedback}</span>
        </div>
      )}

      {linkedAccounts.length > 0 ? (
        <div className="calm-linked-banks-list">
          {linkedAccounts.map((acc) => {
            const balance = toMajorUnits(acc.openingBalance);
            return (
              <div key={acc.id} className="calm-linked-bank-card">
                <div className="calm-linked-bank-card__left">
                  <div className="calm-linked-bank-icon">
                    <span className="material-symbols-outlined">account_balance</span>
                  </div>
                  <div className="calm-linked-bank-info">
                    <div className="calm-linked-bank-name-row">
                      <span className="calm-linked-bank-name">{acc.name}</span>
                      <span className="calm-linked-bank-type-pill">
                        {acc.accountCategory || 'SAVINGS'}
                      </span>
                    </div>
                    <span className="calm-linked-bank-sub">
                      {acc.maskedAccountNumber || 'XXXX-XXXX-0000'} • Last sync: {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                </div>

                <div className="calm-linked-bank-card__right">
                  <span className="calm-linked-bank-balance">{formatCurrency(balance)}</span>
                  <button
                    type="button"
                    className="calm-sync-now-btn"
                    onClick={() => acc.bankConnectionId && handleManualSync(acc.bankConnectionId, acc.fipName)}
                    disabled={isSyncing}
                    title="Fetch latest bank statement"
                  >
                    <span className={`material-symbols-outlined ${isSyncing ? 'calm-spin' : ''}`}>
                      sync
                    </span>
                    <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="calm-linked-banks-empty">
          <span className="material-symbols-outlined calm-empty-icon">account_balance</span>
          <p className="calm-empty-title">No bank accounts linked via AA</p>
          <p className="calm-empty-desc">
            Connect your bank using Setu Account Aggregator to automatically import deposits and expenses.
          </p>
          <button
            type="button"
            className="calm-sheet__close-btn"
            style={{ width: 'auto', padding: '0 20px', minHeight: 44 }}
            onClick={() => setIsConnectModalOpen(true)}
          >
            Connect Bank Account
          </button>
        </div>
      )}

      <ConnectBankModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />
    </div>
  );
};
