import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, Settings } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import type { PeriodInfo } from '../../types/finance';
import './DashboardHeader.css';

export interface DashboardHeaderProps {
  period: PeriodInfo;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  period,
  onNotificationClick,
  onSettingsClick,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleSettings = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      navigate('/settings');
    }
  };

  return (
    <header className={`dashboard-header ${className}`}>
      <div className="dashboard-header__left">
        <span className="dashboard-header__app-name">Personal Budget Planner</span>
        <div className="dashboard-header__period-container">
          <Calendar size={15} className="dashboard-header__period-icon" />
          <h1 className="dashboard-header__period-title">{period.formattedPeriod}</h1>
        </div>
      </div>
      <div className="dashboard-header__right" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <IconButton
          icon={<Settings size={19} />}
          aria-label="Settings & Data"
          onClick={handleSettings}
          variant="ghost"
          size="sm"
        />
        <IconButton
          icon={<Bell size={19} />}
          aria-label="Notifications"
          onClick={onNotificationClick}
          variant="ghost"
          size="sm"
        />
      </div>
    </header>
  );
};
