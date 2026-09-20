import React from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`ui-empty-state ${className}`}>
      <div className="ui-empty-state__icon-wrapper">
        {icon}
      </div>
      <h3 className="ui-empty-state__title">{title}</h3>
      <p className="ui-empty-state__description">{description}</p>
      {action && <div className="ui-empty-state__action">{action}</div>}
    </div>
  );
};
