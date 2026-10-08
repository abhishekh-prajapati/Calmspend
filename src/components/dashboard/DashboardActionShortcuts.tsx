import React from 'react';
import './DashboardActionShortcuts.css';

export interface DashboardActionShortcutsProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
}

export const DashboardActionShortcuts: React.FC<DashboardActionShortcutsProps> = ({
  onAddIncome,
  onAddExpense,
}) => {
  return (
    <div className="calm-dash-shortcuts" aria-label="Transaction Quick Actions">
      <button
        type="button"
        className="calm-shortcut-btn calm-shortcut-btn--income"
        onClick={onAddIncome}
        aria-label="Add Income"
      >
        <span className="calm-shortcut-icon bg-emerald-light text-emerald">
          <span className="material-symbols-outlined text-[20px]">add</span>
        </span>
        <span className="calm-shortcut-label">Add Income</span>
      </button>

      <button
        type="button"
        className="calm-shortcut-btn calm-shortcut-btn--expense"
        onClick={onAddExpense}
        aria-label="Log Expense"
      >
        <span className="calm-shortcut-icon bg-rose-light text-rose">
          <span className="material-symbols-outlined text-[20px]">remove</span>
        </span>
        <span className="calm-shortcut-label">Log Expense</span>
      </button>
    </div>
  );
};

export default DashboardActionShortcuts;
