import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, PiggyBank, Target, CheckCircle2 } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Badge } from '../ui/Badge';
import './QuickActionSheet.css';

export interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActionOption {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  isAvailable?: boolean;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);

  const actions: ActionOption[] = [
    {
      id: 'expense',
      title: 'Add Expense',
      subtitle: 'Record daily spending and purchases',
      icon: <ArrowDownLeft size={22} />,
      iconBg: 'var(--color-danger-light)',
      iconColor: 'var(--color-danger)',
      isAvailable: true,
    },
    {
      id: 'income',
      title: 'Add Income',
      subtitle: 'Record salary, dividend, or deposit',
      icon: <ArrowUpRight size={22} />,
      iconBg: 'var(--color-success-light)',
      iconColor: 'var(--color-success)',
      isAvailable: true,
    },
    {
      id: 'transfer',
      title: 'Transfer',
      subtitle: 'Move funds between your accounts',
      icon: <ArrowLeftRight size={22} />,
      iconBg: 'var(--color-info-light)',
      iconColor: 'var(--color-info)',
      isAvailable: true,
    },
    {
      id: 'saving',
      title: 'Plan Monthly Budget',
      subtitle: 'Set up category envelopes & savings',
      icon: <PiggyBank size={22} />,
      iconBg: 'var(--color-primary-light)',
      iconColor: 'var(--color-primary)',
      isAvailable: true,
    },
    {
      id: 'goal',
      title: 'Goal Contribution',
      subtitle: 'Contribute toward a financial milestone',
      icon: <Target size={22} />,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      isAvailable: true,
    },
  ];

  const handleActionClick = (action: ActionOption) => {
    onClose();
    if (action.id === 'expense') {
      navigate('/expenses/new');
      return;
    }

    if (action.id === 'income') {
      navigate('/income/new');
      return;
    }

    if (action.id === 'transfer') {
      navigate('/transfers/new');
      return;
    }

    if (action.id === 'goal') {
      navigate('/plan?tab=goals');
      return;
    }

    if (action.id === 'saving') {
      navigate('/plan');
      return;
    }
  };

  const handleClose = () => {
    setSelectedNotice(null);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New"
      subtitle="Select a transaction type to record"
    >
      <div className="quick-action-sheet">
        {selectedNotice && (
          <div className="quick-action-sheet__notice">
            <CheckCircle2 size={18} className="quick-action-sheet__notice-icon" />
            <span>
              <strong>{selectedNotice}</strong> workflow will connect in a later stage.
            </span>
          </div>
        )}

        <div className="quick-action-sheet__list">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="quick-action-item"
              onClick={() => handleActionClick(action)}
            >
              <div
                className="quick-action-item__icon"
                style={{ backgroundColor: action.iconBg, color: action.iconColor }}
              >
                {action.icon}
              </div>
              <div className="quick-action-item__text">
                <span className="quick-action-item__title">{action.title}</span>
                <span className="quick-action-item__subtitle">{action.subtitle}</span>
              </div>
              {action.isAvailable ? (
                <Badge variant="primary" size="sm">Ready</Badge>
              ) : (
                <Badge variant="neutral" size="sm">Preview</Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
};
