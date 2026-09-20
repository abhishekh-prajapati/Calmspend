import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { Transaction, Category, Account } from '../../types/transaction';
import './DeleteConfirmModal.css';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction?: Transaction | null;
  category?: Category | null;
  fromAccount?: Account | null;
  toAccount?: Account | null;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  category,
  fromAccount,
  toAccount,
  isDeleting = false,
}) => {
  if (!transaction) return null;

  const majorAmount = toMajorUnits(transaction.amount);

  let title = 'Delete Transaction';
  let message: React.ReactNode = null;
  let actionLabel = 'Delete';

  if (transaction.type === 'transfer') {
    title = 'Delete Transfer';
    actionLabel = 'Delete Transfer';
    message = (
      <>
        Are you sure you want to delete this transfer of{' '}
        <strong>{formatCurrency(majorAmount)}</strong> from{' '}
        <strong>{fromAccount?.name || 'Source Account'}</strong> to{' '}
        <strong>{toAccount?.name || 'Destination Account'}</strong>?
      </>
    );
  } else if (transaction.type === 'income') {
    title = 'Delete Income';
    actionLabel = 'Delete Income';
    message = (
      <>
        Are you sure you want to delete this income of{' '}
        <strong>{formatCurrency(majorAmount)}</strong> for{' '}
        <strong>{category?.name || 'Income'}</strong>?
      </>
    );
  } else {
    title = 'Delete Expense';
    actionLabel = 'Delete Expense';
    message = (
      <>
        Are you sure you want to delete this expense of{' '}
        <strong>{formatCurrency(majorAmount)}</strong> for{' '}
        <strong>{category?.name || 'Expense'}</strong>?
      </>
    );
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="delete-confirm-content">
        <div className="delete-confirm-icon-wrap">
          <AlertTriangle size={28} />
        </div>

        <p className="delete-confirm-message body-text">{message}</p>

        <p className="caption" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
          This will restore your account balances and recalculate your dashboard totals.
        </p>

        <div className="delete-confirm-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
            fullWidth
          >
            {isDeleting ? 'Deleting...' : actionLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
