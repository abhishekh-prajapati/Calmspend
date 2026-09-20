import React from 'react';
import { Wallet } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import './BalanceCard.css';

export interface BalanceCardProps {
  balanceMinor: number;
  isSystemEmpty: boolean;
  className?: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balanceMinor,
  isSystemEmpty,
  className = '',
}) => {
  return (
    <Card variant="default" padding="lg" radius="xl" className={`balance-card ${className}`}>
      <div className="balance-card__top">
        <div className="balance-card__label-group">
          <div className="balance-card__icon-badge">
            <Wallet size={18} />
          </div>
          <span className="balance-card__label">Total Balance</span>
        </div>
      </div>

      <div className="balance-card__amount-container">
        <span className="balance-card__amount display-financial">
          {formatCurrency(toMajorUnits(balanceMinor))}
        </span>
      </div>

      <div className="balance-card__footer">
        {isSystemEmpty ? (
          <span className="balance-card__footer-hint caption">
            No accounts or transactions connected yet
          </span>
        ) : (
          <span className="balance-card__footer-hint caption">
            Across all active accounts
          </span>
        )}
      </div>
    </Card>
  );
};
