import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './BottomNavigation.css';

export interface BottomNavigationProps {
  onFabClick?: () => void;
  isSheetOpen?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  onFabClick,
}) => {
  const navigate = useNavigate();

  const handleLogClick = () => {
    if (onFabClick) {
      onFabClick();
    } else {
      navigate('/expenses/new');
    }
  };

  return (
    <nav className="ui-bottom-nav" aria-label="Main Navigation">
      <div className="ui-bottom-nav__container">
        {/* Daily Tab */}
        <NavLink
          to="/home"
          className={({ isActive }) =>
            `ui-bottom-nav__item ${isActive ? 'ui-bottom-nav__item--active' : ''}`
          }
        >
          <span className="material-symbols-outlined ui-bottom-nav__icon">wb_sunny</span>
          <span className="ui-bottom-nav__label">Daily</span>
        </NavLink>

        {/* Budget Tab */}
        <NavLink
          to="/plan"
          className={({ isActive }) =>
            `ui-bottom-nav__item ${isActive ? 'ui-bottom-nav__item--active' : ''}`
          }
        >
          <span className="material-symbols-outlined ui-bottom-nav__icon">pie_chart</span>
          <span className="ui-bottom-nav__label">Budget</span>
        </NavLink>

        {/* Center Log Elevated Button */}
        <div className="ui-bottom-nav__center-slot">
          <button
            type="button"
            className="ui-bottom-nav__fab-btn"
            onClick={handleLogClick}
            aria-label="Log Transaction"
          >
            <span className="material-symbols-outlined ui-bottom-nav__fab-icon">add</span>
          </button>
          <span className="ui-bottom-nav__fab-label">Log</span>
        </div>

        {/* Goals Tab */}
        <NavLink
          to="/net-worth"
          className={({ isActive }) =>
            `ui-bottom-nav__item ${isActive ? 'ui-bottom-nav__item--active' : ''}`
          }
        >
          <span className="material-symbols-outlined ui-bottom-nav__icon">track_changes</span>
          <span className="ui-bottom-nav__label">Goals</span>
        </NavLink>

        {/* Trends Tab */}
        <NavLink
          to="/report"
          className={({ isActive }) =>
            `ui-bottom-nav__item ${isActive ? 'ui-bottom-nav__item--active' : ''}`
          }
        >
          <span className="material-symbols-outlined ui-bottom-nav__icon">insights</span>
          <span className="ui-bottom-nav__label">Trends</span>
        </NavLink>
      </div>
    </nav>
  );
};
