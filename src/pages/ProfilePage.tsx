import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/useFinancial';
import { toMajorUnits } from '../utils/money';
import {
  getUserCurrency,
  setUserCurrency,
  getCurrencySymbol,
  SUPPORTED_CURRENCIES,
  STORAGE_KEY_USER_NAME,
} from '../services/currency';
import './ProfilePage.css';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts } = useFinancial();

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_USER_NAME) || 'User';
  });
  const [currencyCode, setCurrencyCode] = useState<string>(() => getUserCurrency());
  const [isChangingCurrency, setIsChangingCurrency] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(userName);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setUserName(trimmed);
      localStorage.setItem(STORAGE_KEY_USER_NAME, trimmed);
      setIsEditingName(false);
      showToast('Profile name updated ✨');
    }
  };

  const handleSelectCurrency = (newCode: string) => {
    setUserCurrency(newCode);
    setCurrencyCode(newCode);
    setIsChangingCurrency(false);
    showToast(`Currency updated to ${newCode} ✨`);
  };

  return (
    <div className="calm-profile-page">
      {/* 1. User Profile Hero Card */}
      <div className="calm-profile-hero">
        <div className="calm-profile-hero__top">
          <div className="calm-profile-avatar">
            <span className="calm-profile-avatar__text">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </span>
          </div>

          <div className="calm-profile-details">
            {isEditingName ? (
              <div className="calm-profile-name-edit">
                <input
                  type="text"
                  className="calm-profile-name-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                />
                <button
                  type="button"
                  className="calm-profile-save-btn"
                  onClick={handleSaveName}
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="calm-profile-name-row">
                <h1 className="calm-profile-name">{userName}</h1>
                <button
                  type="button"
                  className="calm-profile-edit-btn"
                  onClick={() => {
                    setNameInput(userName);
                    setIsEditingName(true);
                  }}
                  title="Edit name"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </div>
            )}
            <div className="calm-profile-badge-row">
              <span className="calm-profile-status-badge">
                <span className="calm-rbi-dot" />
                <span>Zero-Knowledge Profile</span>
              </span>
              <button
                type="button"
                className="calm-profile-currency-badge calm-profile-currency-badge--interactive"
                onClick={() => setIsChangingCurrency((prev) => !prev)}
                title="Change Currency"
              >
                <span>{getCurrencySymbol(currencyCode)} {currencyCode}</span>
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>
            </div>

            {isChangingCurrency && (
              <div className="calm-profile-currency-picker">
                <div className="calm-profile-currency-picker__header">
                  <span>Select Active Currency</span>
                  <button
                    type="button"
                    className="calm-profile-currency-picker__close"
                    onClick={() => setIsChangingCurrency(false)}
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                <div className="calm-profile-currency-picker__grid">
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <button
                      key={curr.code}
                      type="button"
                      className={`calm-profile-currency-option ${curr.code === currencyCode ? 'calm-profile-currency-option--active' : ''}`}
                      onClick={() => handleSelectCurrency(curr.code)}
                    >
                      <span className="font-bold text-emerald-400">{curr.symbol}</span>
                      <span>{curr.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="calm-profile-meta-grid">
          <div className="calm-profile-meta-item">
            <span className="calm-profile-meta-label">Monthly Cycle</span>
            <span className="calm-profile-meta-val">1st of Month</span>
          </div>
          <div className="calm-profile-meta-item">
            <span className="calm-profile-meta-label">Security Mode</span>
            <span className="calm-profile-meta-val">100% Offline Vault</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Link to Encrypted Vault */}
      <div
        className="calm-profile-vault-card"
        onClick={() => navigate('/vault')}
        role="button"
        tabIndex={0}
      >
        <div className="calm-profile-vault-card__left">
          <div className="calm-profile-vault-icon">
            <span className="material-symbols-outlined">shield_lock</span>
          </div>
          <div>
            <span className="calm-profile-vault-title">Encrypted Data Vault</span>
            <p className="calm-profile-vault-desc">Export backups &amp; manage offline encryption</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
      </div>

      {/* 3. Connected Financial Ledgers */}
      <div className="calm-settings-card">
        <div className="calm-settings-card__header">
          <div>
            <h2 className="calm-settings-card__title">Financial Ledgers &amp; Accounts</h2>
            <p className="calm-settings-card__sub">Balances tracked on this device</p>
          </div>
        </div>

        <div className="calm-accounts-stack">
          {accounts.map((acc, index) => (
            <div key={acc.id} className="calm-acc-row">
              <div className="calm-acc-row__left">
                <div className={`calm-acc-avatar ${index === 0 ? 'calm-acc-avatar--indigo' : 'calm-acc-avatar--emerald'}`}>
                  {acc.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="calm-acc-name-row">
                    <span className="calm-acc-name">{acc.name}</span>
                    <span className="calm-acc-type-pill">{acc.type}</span>
                  </div>
                  <span className="calm-acc-balance">₹{toMajorUnits(acc.openingBalance).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <span className="calm-acc-status-pill">Active</span>
            </div>
          ))}
        </div>
      </div>

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

export default ProfilePage;
