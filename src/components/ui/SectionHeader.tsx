import React from 'react';
import './SectionHeader.css';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`ui-section-header ${className}`}>
      <div className="ui-section-header__titles">
        <h2 className="ui-section-header__title">{title}</h2>
        {subtitle && <span className="ui-section-header__subtitle">{subtitle}</span>}
      </div>
      {action && <div className="ui-section-header__action">{action}</div>}
    </div>
  );
};
