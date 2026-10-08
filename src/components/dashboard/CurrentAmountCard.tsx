import React from 'react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import { getAccountBalanceMinor } from '../../services/financialCalculations';
import type { Account, Transaction } from '../../types/transaction';

export interface CurrentAmountCardProps {
  currentBalanceMinor: number;
  accounts: Account[];
  transactions: Transaction[];
  onDisconnectAccount?: (e: React.MouseEvent, accountId: string, accountName: string) => void;
}

export const CurrentAmountCard: React.FC<CurrentAmountCardProps> = ({
  currentBalanceMinor,
  accounts,
  transactions,
}) => {
  return (
    <section className="calm-liquid-vaults-section" aria-label="Liquid Vaults and Accounts">
      <div className="calm-liquid-vaults-header">
        <div className="flex items-center gap-2">
          <h2 className="calm-liquid-vaults-title">Available Money</h2>
          <span className="calm-live-ping-dot" />
        </div>
        <div className="calm-liquid-total-badge">
          <span className="calm-liquid-total-amount">
            {formatCurrency(toMajorUnits(currentBalanceMinor))}
          </span>
        </div>
      </div>

      <div className="calm-vaults-carousel">
        {accounts.length > 0 ? (
          accounts.map((acc) => {
            const balanceMinor = getAccountBalanceMinor(acc, transactions);
            const isBank = acc.type === 'bank';
            return (
              <div key={acc.id} className="calm-home-vault-card">
                <div className="calm-home-vault-card__top">
                  <div className={`calm-vault-icon ${isBank ? 'bg-emerald' : 'bg-indigo'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {isBank ? 'account_balance' : 'payments'}
                    </span>
                  </div>
                  <span className={`calm-vault-badge ${isBank ? 'badge-primary' : 'badge-neutral'}`}>
                    {acc.type === 'bank' ? 'Primary' : 'Offline'}
                  </span>
                </div>

                <div className="calm-home-vault-card__bottom">
                  <span className="calm-vault-name">{acc.name}</span>
                  <div className="calm-vault-balance">
                    {formatCurrency(toMajorUnits(balanceMinor))}
                  </div>
                  <div className="calm-vault-sync-status">
                    <span className="calm-sync-dot" />
                    <span>{isBank ? 'Bank Account' : 'Manual Ledger'}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="calm-home-vault-card">
            <div className="calm-home-vault-card__top">
              <div className="calm-vault-icon bg-emerald">
                <span className="material-symbols-outlined text-[20px]">account_balance</span>
              </div>
              <span className="calm-vault-badge badge-primary">Primary</span>
            </div>
            <div className="calm-home-vault-card__bottom">
              <span className="calm-vault-name">Primary Account</span>
              <div className="calm-vault-balance">
                {formatCurrency(toMajorUnits(currentBalanceMinor))}
              </div>
              <div className="calm-vault-sync-status">
                <span className="calm-sync-dot" />
                <span>Default Ledger</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
