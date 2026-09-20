import React from 'react';
import { Landmark, ArrowLeftRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { AccountReportItem, TransferSummary } from '../../types/report';
import './AccountFlowCard.css';

export interface AccountFlowCardProps {
  accounts: AccountReportItem[];
  transfers: TransferSummary;
}

export const AccountFlowCard: React.FC<AccountFlowCardProps> = ({ accounts, transfers }) => {
  return (
    <Card variant="default" padding="lg" radius="lg" className="account-flow-card">
      <div className="card-header-simple">
        <span className="card-subtitle">Liquidity & Movement</span>
        <h3 className="card-title">Accounts & Transfer Flow</h3>
      </div>

      {/* Account Inflow/Outflow Grid */}
      <div className="account-flow-grid">
        {accounts.map((acc) => {
          const isNetPositive = acc.netFlowMinor >= 0;
          return (
            <div key={acc.accountId} className="account-flow-item">
              <div className="acc-flow-header">
                <div className="acc-name-group">
                  <Landmark size={16} className="acc-icon" />
                  <span className="acc-name">{acc.accountName}</span>
                </div>
                <span className="acc-balance-badge">
                  Bal: {formatCurrency(toMajorUnits(acc.currentBalanceMinor))}
                </span>
              </div>

              <div className="acc-flow-breakdown">
                <div className="flow-metric">
                  <span className="flow-lbl">Inflows</span>
                  <span className="flow-val val-green">
                    +{formatCurrency(toMajorUnits(acc.periodIncomeMinor + acc.periodTransfersInMinor))}
                  </span>
                </div>
                <div className="flow-metric">
                  <span className="flow-lbl">Outflows</span>
                  <span className="flow-val val-red">
                    -{formatCurrency(toMajorUnits(acc.periodExpensesMinor + acc.periodTransfersOutMinor))}
                  </span>
                </div>
                <div className="flow-metric">
                  <span className="flow-lbl">Net Flow</span>
                  <span className={`flow-val ${isNetPositive ? 'val-cyan' : 'val-amber'}`}>
                    {isNetPositive ? '+' : ''}{formatCurrency(toMajorUnits(acc.netFlowMinor))}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transfer Movement Section */}
      {transfers.transferCount > 0 && (
        <div className="transfers-section">
          <h4 className="transfers-title">
            <ArrowLeftRight size={14} /> Inter-Account Transfers ({transfers.transferCount})
          </h4>
          <div className="transfers-list">
            {transfers.transfers.map((t) => (
              <div key={t.id} className="transfer-row">
                <div className="transfer-accounts">
                  <span className="transfer-from">{t.fromAccountName}</span>
                  <span className="transfer-arrow">➔</span>
                  <span className="transfer-to">{t.toAccountName}</span>
                </div>
                <div className="transfer-right">
                  <span className="transfer-amount">{formatCurrency(toMajorUnits(t.amountMinor))}</span>
                  <span className="transfer-date">{t.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="account-flow-disclaimer">
        <span>
          <strong>Note:</strong> Account Net Flow measures account-specific cash movement (including transfers) and is distinct from overall Net Savings.
        </span>
      </div>
    </Card>
  );
};
