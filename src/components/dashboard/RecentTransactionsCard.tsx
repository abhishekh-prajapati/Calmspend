import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
import { TransactionRow } from '../transactions/TransactionRow';
import { DeleteConfirmModal } from '../transactions/DeleteConfirmModal';
import { useFinancial } from '../../context/useFinancial';
import type { Transaction } from '../../types/transaction';
import './RecentTransactionsCard.css';

export interface RecentTransactionsCardProps {
  onOpenQuickAction?: () => void;
  className?: string;
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  className = '',
}) => {
  const navigate = useNavigate();
  const { transactions, getCategory, getAccount, deleteTransaction } = useFinancial();

  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (txn: Transaction) => {
    if (txn.type === 'income') {
      navigate(`/income/${txn.id}/edit`);
    } else if (txn.type === 'transfer') {
      navigate(`/transfers/${txn.id}/edit`);
    } else {
      navigate(`/expenses/${txn.id}/edit`);
    }
  };

  const handleDeletePrompt = (txn: Transaction) => {
    setDeletingTxn(txn);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTxn) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(deletingTxn.id);
      setDeletingTxn(null);
    } catch {
      // Error handled silently or through UI toast
    } finally {
      setIsDeleting(false);
    }
  };

  const hasTransactions = transactions.length > 0;
  // Show up to 5 most recent transactions on Home dashboard
  const displayedTransactions = transactions.slice(0, 5);

  return (
    <div className={`recent-transactions-section ${className}`}>
      <SectionHeader
        title="Recent Transactions"
        action={
          hasTransactions ? (
            <button
              type="button"
              className="budget-overview-section__see-all"
              onClick={() => navigate('/expenses/new')}
            >
              + Add
            </button>
          ) : undefined
        }
      />

      <Card variant="default" padding={hasTransactions ? 'none' : 'md'} radius="xl" className="recent-transactions-card">
        {!hasTransactions ? (
          <div className="recent-transactions-empty">
            <div className="recent-transactions-empty__icon-wrap">
              <Receipt size={24} />
            </div>
            <h3 className="recent-transactions-empty__title heading-3">No Transactions Yet</h3>
            <p className="recent-transactions-empty__desc body-sm">
              Your daily income, expenses, and savings records will be listed here.
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => navigate('/expenses/new')}
              className="recent-transactions-empty__btn"
            >
              Add Expense
            </Button>
          </div>
        ) : (
          <div className="recent-transactions-list">
            {displayedTransactions.map((txn) => {
              const category = txn.categoryId ? getCategory(txn.categoryId) : undefined;
              const account = txn.accountId ? getAccount(txn.accountId) : undefined;
              const fromAccount = txn.fromAccountId ? getAccount(txn.fromAccountId) : undefined;
              const toAccount = txn.toAccountId ? getAccount(txn.toAccountId) : undefined;

              return (
                <TransactionRow
                  key={txn.id}
                  transaction={txn}
                  category={category}
                  account={account}
                  fromAccount={fromAccount}
                  toAccount={toAccount}
                  onEdit={handleEdit}
                  onDelete={handleDeletePrompt}
                />
              );
            })}
          </div>
        )}
      </Card>

      <DeleteConfirmModal
        isOpen={Boolean(deletingTxn)}
        onClose={() => setDeletingTxn(null)}
        onConfirm={handleConfirmDelete}
        transaction={deletingTxn}
        category={deletingTxn?.categoryId ? getCategory(deletingTxn.categoryId) : null}
        fromAccount={deletingTxn?.fromAccountId ? getAccount(deletingTxn.fromAccountId) : null}
        toAccount={deletingTxn?.toAccountId ? getAccount(deletingTxn.toAccountId) : null}
        isDeleting={isDeleting}
      />
    </div>
  );
};
