import React, { useState } from 'react';
import { useFinancial } from '../../context/useFinancial';
import { FastLogTypeCapsule } from './FastLogTypeCapsule';
import { FastLogKeypad } from './FastLogKeypad';
import { toMinorUnits } from '../../utils/money';
import type { TransactionType } from '../../types/transaction';
import './FastLogModal.css';

interface FastLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const FastLogModal: React.FC<FastLogModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { accounts, categories, addTransaction } = useFinancial();
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || 'default');
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id || accounts[0]?.id || 'default');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) =>
    txType === 'expense' ? c.type === 'expense' : c.type === 'income'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const minor = toMinorUnits(amount);
      if (txType === 'transfer') {
        await addTransaction({
          type: 'transfer',
          amount: minor,
          fromAccountId: accountId,
          toAccountId,
          accountId,
          date: todayIso,
          description: description || 'Account Transfer',
        });
        onSuccess?.('Transferred funds securely ⚡');
      } else {
        const catId = categoryId || filteredCategories[0]?.id || 'cat-general';
        await addTransaction({
          type: txType,
          amount: minor,
          categoryId: catId,
          accountId,
          date: todayIso,
          description: description || `${txType === 'expense' ? 'Spend' : 'Income'} Log`,
        });
        onSuccess?.(`Logged ${txType} ✨`);
      }
      setAmount('');
      setDescription('');
      onClose();
    } catch {
      setErrorMessage('Failed to record transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fastlog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fastlog-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="fastlog-handle" />
        <div className="fastlog-header">
          <FastLogTypeCapsule selectedType={txType} onSelectType={setTxType} />
          <button type="button" className="fastlog-close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="fastlog-form">
          <FastLogKeypad amountStr={amount} onAmountChange={setAmount} />
          {errorMessage && <p className="fastlog-error">{errorMessage}</p>}
          {txType !== 'transfer' ? (
            <div className="fastlog-field">
              <label className="fastlog-label">Category</label>
              <div className="fastlog-cat-grid">
                {filteredCategories.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`fastlog-cat-btn ${(categoryId || filteredCategories[0]?.id) === c.id ? 'fastlog-cat-btn--active' : ''}`}
                    onClick={() => setCategoryId(c.id)}
                  >
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="fastlog-transfer-grid">
              <div className="fastlog-field">
                <label className="fastlog-label">From Account</label>
                <select className="fastlog-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
              </div>
              <div className="fastlog-field">
                <label className="fastlog-label">To Account</label>
                <select className="fastlog-select" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                  {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
              </div>
            </div>
          )}
          <div className="fastlog-field">
            <input
              type="text"
              className="fastlog-input"
              placeholder="Note / Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" className="fastlog-submit-btn" disabled={isSubmitting || !amount}>
            {isSubmitting ? 'Recording...' : `OK / Proceed • Save ${txType.toUpperCase()} ✨`}
          </button>
        </form>
      </div>
    </div>
  );
};
