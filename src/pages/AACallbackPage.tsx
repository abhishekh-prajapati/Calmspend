import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinancial } from '../context/useFinancial';
import { aaApiClient } from '../services/aa/aaApiClient';
import { aaSyncManager } from '../services/aa/aaSyncManager';

export const AACallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { categories, refreshData } = useFinancial();

  const [statusText, setStatusText] = useState('Connecting to Account Aggregator...');
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const consentId = searchParams.get('consent_id') || searchParams.get('id');
      const status = searchParams.get('status');

      if (status === 'REJECTED' || status === 'FAILED') {
        setErrorMessage('Consent was not granted or was cancelled.');
        setIsProcessing(false);
        return;
      }

      if (!consentId) {
        setErrorMessage('Invalid return URL: missing consent identifier.');
        setIsProcessing(false);
        return;
      }

      try {
        setStatusText('Consent approved! Fetching bank accounts and transactions...');
        const { accounts: normalizedAccounts } = await aaApiClient.triggerSync(consentId);

        setStatusText('Decrypting and saving transactions into your ledger...');
        const result = await aaSyncManager.ingestNormalizedAccounts(
          consentId,
          normalizedAccounts,
          categories
        );

        refreshData();
        setStatusText(
          `Successfully connected! Imported ${result.importedCount} transactions.`
        );

        setTimeout(() => {
          navigate('/');
        }, 1500);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to finalize bank connection';
        setErrorMessage(msg);
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, categories, refreshData, navigate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          backgroundColor: errorMessage
            ? 'var(--color-terracotta-light, #fee2e2)'
            : 'var(--color-primary-container)',
          color: errorMessage ? 'var(--color-terracotta)' : 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
          {errorMessage ? 'error' : isProcessing ? 'sync' : 'task_alt'}
        </span>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
        {errorMessage ? 'Connection Incomplete' : 'Bank Account Linking'}
      </h2>

      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 360, margin: '0 0 24px' }}>
        {errorMessage || statusText}
      </p>

      {errorMessage && (
        <button
          type="button"
          className="calm-sheet__close-btn"
          style={{ width: 'auto', padding: '0 24px', minHeight: 44 }}
          onClick={() => navigate('/')}
        >
          Return to Dashboard
        </button>
      )}
    </div>
  );
};

export default AACallbackPage;
