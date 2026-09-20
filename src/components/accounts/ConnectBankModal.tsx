import React, { useState } from 'react';
import { aaApiClient } from '../../services/aa/aaApiClient';
import './ConnectBankModal.css';

interface ConnectBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentCreated?: (consentId: string, redirectUrl: string) => void;
}

export const ConnectBankModal: React.FC<ConnectBankModalProps> = ({
  isOpen,
  onClose,
  onConsentCreated,
}) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber || mobileNumber.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await aaApiClient.createConsent(mobileNumber);
      if (onConsentCreated) {
        onConsentCreated(result.consent.id, result.redirectUrl);
      } else {
        // Open Setu Consent Manager / Webview
        window.location.href = result.redirectUrl;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect bank account';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="calm-sheet-overlay" onClick={onClose}>
      <form
        className="calm-sheet calm-bank-connect-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="calm-sheet__handle"></div>

        <div className="calm-sheet__header">
          <div className="calm-bank-connect-header">
            <span className="material-symbols-outlined calm-bank-connect-icon">account_balance</span>
            <div>
              <span className="calm-sheet__title">Connect Bank Account</span>
              <p className="calm-bank-connect-sub">Secure RBI-regulated Account Aggregator (Setu)</p>
            </div>
          </div>
        </div>

        <div className="calm-sheet__metrics">
          {/* Transparency Disclosures */}
          <div className="calm-aa-disclosure-box">
            <div className="calm-aa-disclosure-row">
              <span className="material-symbols-outlined text-primary">verified_user</span>
              <span><strong>Read-only:</strong> Bank statement deposit records only. No payments.</span>
            </div>
            <div className="calm-aa-disclosure-row">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <span><strong>Frequency:</strong> Periodic sync (1x daily, 1 month data life).</span>
            </div>
            <div className="calm-aa-disclosure-row">
              <span className="material-symbols-outlined text-primary">lock</span>
              <span><strong>Revocable:</strong> You can disconnect or pause sync anytime.</span>
            </div>
          </div>

          <label className="calm-bank-input-label">Linked Mobile Number</label>
          <div className="calm-bank-input-wrapper">
            <span className="calm-bank-input-prefix">+91</span>
            <input
              type="tel"
              className="calm-note-input"
              placeholder="98765 43210"
              value={mobileNumber}
              onChange={(e) => {
                setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                setErrorMessage(null);
              }}
              autoFocus
              required
              disabled={isLoading}
            />
          </div>

          {/* Quick Sandbox Phone Number Preset */}
          <div className="calm-aa-preset-row">
            <button
              type="button"
              className="calm-micro-btn"
              onClick={() => setMobileNumber('9876543210')}
              disabled={isLoading}
            >
              Use Sandbox Demo Number
            </button>
          </div>

          {errorMessage && (
            <div className="calm-bank-error">
              <span className="material-symbols-outlined">error</span>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="calm-bank-actions">
          <button
            type="button"
            className="calm-micro-btn"
            style={{ height: 48, padding: '0 16px' }}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="calm-sheet__close-btn"
            style={{ flex: 1, margin: 0 }}
            disabled={isLoading || mobileNumber.length < 10}
          >
            {isLoading ? 'Requesting Consent...' : 'Proceed to Setu AA →'}
          </button>
        </div>
      </form>
    </div>
  );
};
