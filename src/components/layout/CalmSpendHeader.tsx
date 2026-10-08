import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../../context/useFinancial';
import { NotificationBadge } from '../notifications/NotificationBadge';
import './CalmSpendHeader.css';

export interface CalmSpendHeaderProps {
  onNotificationClick?: () => void;
  showBackButton?: boolean;
  titleOverride?: string;
}

export const CalmSpendHeader: React.FC<CalmSpendHeaderProps> = ({
  onNotificationClick,
  showBackButton = false,
}) => {
  const navigate = useNavigate();
  const { unreadNotificationCount } = useFinancial();

  return (
    <header className="calmspend-header">
      <div className="calmspend-header__container">
        {/* Left: Logo & AA Linked status */}
        <div className="calmspend-header__left">
          {showBackButton && (
            <button
              type="button"
              className="calmspend-header__back-btn"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}

          <div
            className="calmspend-header__brand"
            onClick={() => navigate('/home')}
            role="button"
            tabIndex={0}
          >
            <div className="calmspend-header__logo-icon">
              <span className="material-symbols-outlined">spa</span>
            </div>
            <span className="calmspend-header__title">CalmSpend</span>
          </div>
        </div>

        {/* Right: Notification & Profile */}
        <div className="calmspend-header__right">
          <button
            type="button"
            className="calmspend-header__icon-btn"
            onClick={onNotificationClick}
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadNotificationCount > 0 && <NotificationBadge count={unreadNotificationCount} />}
          </button>

          <button
            type="button"
            className="calmspend-header__avatar-btn"
            onClick={() => navigate('/profile')}
            aria-label="User Profile"
          >
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
