import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './CalmSpendHeader.css';

export interface CalmSpendHeaderProps {
  onNotificationClick?: () => void;
  showBackButton?: boolean;
  titleOverride?: string;
}

export const CalmSpendHeader: React.FC<CalmSpendHeaderProps> = ({
  onNotificationClick,
  showBackButton = false,
  titleOverride,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Compute subtitle tag from current path
  const getSubtitle = (): string => {
    if (titleOverride) return titleOverride;
    const path = location.pathname;
    if (path.startsWith('/home')) return 'Daily';
    if (path.startsWith('/plan')) return 'Budget';
    if (path.startsWith('/net-worth')) return 'Goals';
    if (path.startsWith('/report')) return 'Trends';
    if (path.startsWith('/expenses') || path.startsWith('/income') || path.startsWith('/transfers')) return 'Log';
    if (path.startsWith('/settings') || path.startsWith('/data-management')) return 'Settings';
    return 'Finance';
  };

  const formattedToday = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const handleProfileClick = () => {
    navigate('/settings');
  };

  const handleNotificationClick = () => {
    if (onNotificationClick) {
      onNotificationClick();
    } else {
      navigate('/report');
    }
  };

  return (
    <header className="calmspend-header">
      <div className="calmspend-header__container">
        {/* Left: Brand or Back Button */}
        <div className="calmspend-header__left">
          {showBackButton ? (
            <button
              type="button"
              className="calmspend-header__back-btn"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          ) : null}

          <div
            className="calmspend-header__brand"
            onClick={() => navigate('/home')}
            role="button"
            tabIndex={0}
          >
            <div className="calmspend-header__logo-icon">
              <span className="material-symbols-outlined">spa</span>
            </div>
            <div className="calmspend-header__titles">
              <span className="calmspend-header__title">CalmSpend</span>
              <span className="calmspend-header__subtitle">{getSubtitle()}</span>
            </div>
          </div>
        </div>

        {/* Right: Date Pill, Notification & Profile */}
        <div className="calmspend-header__right">
          <div className="calmspend-header__date-pill">
            <span className="material-symbols-outlined calmspend-header__calendar-icon">calendar_today</span>
            <span>Today, {formattedToday}</span>
          </div>

          <button
            type="button"
            className="calmspend-header__icon-btn"
            onClick={handleNotificationClick}
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>

          <button
            type="button"
            className="calmspend-header__avatar-btn"
            onClick={handleProfileClick}
            aria-label="Account Settings"
          >
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
