import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import type { TransactionType } from '../../types/transaction';

interface FastLogTypeCapsuleProps {
  selectedType: TransactionType;
  onSelectType: (type: TransactionType) => void;
}

export const FastLogTypeCapsule: React.FC<FastLogTypeCapsuleProps> = ({
  selectedType,
  onSelectType,
}) => {
  const options: Array<{ type: TransactionType; label: string; icon: React.ReactNode }> = [
    { type: 'expense', label: 'Expense', icon: <ArrowDownLeft size={16} /> },
    { type: 'income', label: 'Income', icon: <ArrowUpRight size={16} /> },
    { type: 'transfer', label: 'Transfer', icon: <ArrowLeftRight size={16} /> },
  ];

  return (
    <div className="fastlog-capsule" role="tablist" aria-label="Transaction Type">
      {options.map((opt) => {
        const isSelected = selectedType === opt.type;
        return (
          <button
            key={opt.type}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`fastlog-capsule__btn ${isSelected ? `fastlog-capsule__btn--active-${opt.type}` : ''}`}
            onClick={() => onSelectType(opt.type)}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
