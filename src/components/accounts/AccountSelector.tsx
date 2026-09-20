import React, { useState } from 'react';
import { Plus, Check, Landmark, Wallet, PiggyBank, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { AccountModal } from './AccountModal';
import { formatCurrency } from '../../services/currency';
import { getAccountBalance } from '../../services/financialCalculations';
import type { Account } from '../../types/transaction';
import { useFinancial } from '../../context/useFinancial';
import './AccountSelector.css';

export interface AccountSelectorProps {
  accounts: Account[];
  selectedAccountId?: string | null;
  onSelectAccount: (accountId: string) => void;
  error?: string;
  className?: string;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  error,
  className = '',
}) => {
  const { addAccount, transactions } = useFinancial();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Wallet size={16} />;
      case 'savings':
        return <PiggyBank size={16} />;
      case 'bank':
      default:
        return <Landmark size={16} />;
    }
  };

  const handleAccountCreated = (newAccount: Account) => {
    onSelectAccount(newAccount.id);
  };

  return (
    <div className={`account-selector-group ${className}`}>
      <div className="account-selector-header">
        <label className="ui-input-label">Account *</label>
        {accounts.length > 0 && (
          <button
            type="button"
            className="account-selector-add-link"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={14} />
            <span>New Account</span>
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className={`account-selector-empty ${error ? 'account-selector-empty--error' : ''}`}>
          <div className="account-selector-empty__info">
            <AlertCircle size={18} className="account-selector-empty__icon" />
            <span className="body-sm">No accounts available yet</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Account
          </Button>
        </div>
      ) : (
        <div className="account-selector-list">
          {accounts.map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            const balance = getAccountBalance(acc, transactions);

            return (
              <button
                key={acc.id}
                type="button"
                className={`account-card-option ${isSelected ? 'account-card-option--selected' : ''}`}
                onClick={() => onSelectAccount(acc.id)}
              >
                <div className="account-card-option__left">
                  <div className="account-card-option__icon">
                    {getAccountIcon(acc.type)}
                  </div>
                  <div className="account-card-option__details">
                    <span className="account-card-option__name">{acc.name}</span>
                    <span className="account-card-option__balance caption">
                      Balance: {formatCurrency(balance)}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <div className="account-card-option__check">
                    <Check size={14} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && <span className="ui-input-helper ui-input-helper--error">{error}</span>}

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={addAccount}
        onAccountCreated={handleAccountCreated}
      />
    </div>
  );
};
