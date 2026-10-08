import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, PiggyBank, Target } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Badge } from '../ui/Badge';
import { FastLogModal } from '../transactions/FastLogModal';
import './QuickActionSheet.css';

export interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isFastLogOpen, setIsFastLogOpen] = useState(false);

  const actions = [
    {
      id: 'fast-log',
      title: 'Fast Log Transaction',
      subtitle: 'Instant expense, income, or bank transfer',
      icon: <ArrowDownLeft size={22} />,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10B981',
      badge: 'Instant ✨',
    },
    {
      id: 'saving',
      title: 'Plan Monthly Budget',
      subtitle: 'Configure needs, wants & cushions',
      icon: <PiggyBank size={22} />,
      iconBg: 'rgba(99, 102, 241, 0.15)',
      iconColor: '#6366F1',
      badge: '3-Step',
    },
    {
      id: 'goal',
      title: 'Savings & Net Worth Goals',
      subtitle: 'Contribute toward milestone targets',
      icon: <Target size={22} />,
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#F59E0B',
      badge: 'Pacing',
    },
  ];

  const handleActionClick = (id: string) => {
    onClose();
    if (id === 'fast-log') {
      setIsFastLogOpen(true);
      return;
    }
    if (id === 'goal') {
      navigate('/goals');
      return;
    }
    if (id === 'saving') {
      navigate('/plan');
      return;
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Quick Actions"
        subtitle="Record spending or review your wealth plan"
      >
        <div className="quick-action-sheet">
          <div className="quick-action-sheet__list">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="quick-action-item"
                onClick={() => handleActionClick(action.id)}
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
                <Badge variant="primary" size="sm">{action.badge}</Badge>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      <FastLogModal
        isOpen={isFastLogOpen}
        onClose={() => setIsFastLogOpen(false)}
      />
    </>
  );
};

