import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, ArrowLeftRight } from 'lucide-react';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { Transaction, Category, Account } from '../../types/transaction';
import './TransactionRow.css';

export interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  fromAccount?: Account;
  toAccount?: Account;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  className?: string;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  category,
  account,
  fromAccount,
  toAccount,
  onEdit,
  onDelete,
  className = '',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const isTransfer = transaction.type === 'transfer';
  const isSaving = transaction.type === 'saving' || transaction.type === 'goal';
  const categoryName = isTransfer
    ? 'Transfer'
    : isSaving
    ? (transaction.description || 'Goal Savings')
    : (category?.name || 'Uncategorized');
  const categoryIcon = isTransfer ? 'arrow-left-right' : isSaving ? 'PiggyBank' : (category?.icon || 'tag');
  const categoryColor = isTransfer
    ? 'var(--color-info)'
    : isSaving
    ? '#D97706'
    : (category?.color || '#64748B');
  const majorAmount = toMajorUnits(transaction.amount);

  // Format date display (e.g. Sep 16, 2026)
  const formatDateDisplay = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Format account string
  const accountMeta = isTransfer
    ? `${fromAccount?.name || 'Source Account'} → ${toAccount?.name || 'Destination Account'}`
    : (account?.name || 'Account');

  return (
    <div className={`transaction-row ${className}`}>
      <div className="transaction-row__left">
        <div
          className="transaction-row__icon-wrap"
          style={{
            backgroundColor: isTransfer ? 'var(--color-info-light)' : isSaving ? '#FEF3C7' : `${categoryColor}15`,
            color: categoryColor,
          }}
        >
          {isTransfer ? (
            <ArrowLeftRight size={20} />
          ) : (
            <CategoryIcon iconName={categoryIcon} size={20} />
          )}
        </div>

        <div className="transaction-row__info">
          <div className="transaction-row__title-group">
            <span className="transaction-row__category body-medium">{categoryName}</span>
            {transaction.type === 'expense' && transaction.needOrWant && (
              <Badge variant={transaction.needOrWant === 'need' ? 'info' : 'neutral'} size="sm">
                {transaction.needOrWant.toUpperCase()}
              </Badge>
            )}
            {isSaving && (
              <Badge variant="warning" size="sm">
                SAVINGS
              </Badge>
            )}
          </div>
          <div className="transaction-row__meta">
            {transaction.description && (
              <span className="transaction-row__desc caption">{transaction.description} &bull; </span>
            )}
            <span className="transaction-row__account caption">{accountMeta}</span>
            <span className="transaction-row__date caption"> &bull; {formatDateDisplay(transaction.date)}</span>
          </div>
        </div>
      </div>

      <div className="transaction-row__right">
        <div className="transaction-row__amount-group">
          {transaction.type === 'income' && (
            <span className="transaction-row__amount transaction-row__amount--income">
              + {formatCurrency(majorAmount)}
            </span>
          )}
          {transaction.type === 'expense' && (
            <span className="transaction-row__amount transaction-row__amount--expense">
              - {formatCurrency(majorAmount)}
            </span>
          )}
          {isSaving && (
            <span className="transaction-row__amount" style={{ color: '#D97706', fontWeight: 700 }}>
              - {formatCurrency(majorAmount)}
            </span>
          )}
          {transaction.type === 'transfer' && (
            <span className="transaction-row__amount transaction-row__amount--transfer">
              {formatCurrency(majorAmount)}
            </span>
          )}
        </div>

        <div className="transaction-row__menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="transaction-row__menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Transaction options"
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <div className="transaction-row__dropdown">
              <button
                type="button"
                className="transaction-row__dropdown-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  onEdit(transaction);
                }}
              >
                <Edit2 size={14} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                className="transaction-row__dropdown-item transaction-row__dropdown-item--delete"
                onClick={() => {
                  setIsMenuOpen(false);
                  onDelete(transaction);
                }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
