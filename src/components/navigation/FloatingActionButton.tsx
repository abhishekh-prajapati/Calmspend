import React from 'react';
import { Plus } from 'lucide-react';
import './FloatingActionButton.css';

export interface FloatingActionButtonProps {
  onClick: () => void;
  isOpen?: boolean;
  'aria-label'?: string;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  isOpen = false,
  'aria-label': ariaLabel = 'Quick actions',
  className = '',
}) => {
  return (
    <button
      type="button"
      className={`ui-fab ${isOpen ? 'ui-fab--open' : ''} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
    >
      <div className="ui-fab__icon">
        <Plus size={28} strokeWidth={2.5} />
      </div>
    </button>
  );
};
