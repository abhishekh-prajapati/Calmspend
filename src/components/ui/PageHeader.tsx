import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from './IconButton';
import './PageHeader.css';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  className = '',
}) => {
  return (
    <header className={`ui-page-header ${className}`}>
      <div className="ui-page-header__left">
        {onBack && (
          <IconButton
            icon={<ArrowLeft size={20} />}
            aria-label="Go back"
            onClick={onBack}
            size="sm"
            variant="ghost"
          />
        )}
        <div className="ui-page-header__titles">
          <h1 className="ui-page-header__title">{title}</h1>
          {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
        </div>
      </div>
      {rightAction && (
        <div className="ui-page-header__right">
          {rightAction}
        </div>
      )}
    </header>
  );
};
