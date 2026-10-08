import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNavigation.css';

export interface BottomNavigationProps {
  onFabClick?: () => void;
  isSheetOpen?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ onFabClick }) => {
  return (
    <nav className="ui-bottom-nav" aria-label="Main Navigation">
      <div className="ui-bottom-nav__container">
        {/* 1. Daily Tab */}
        <NavLink
          to="/home"
          className={({ isActive }) =>
            `ui-bottom-nav__item ${isActive ? 'ui-bottom-nav__item--active' : ''}`
          }
        >
          <span className="material-symbols-outlined ui-bottom-nav__icon">local_fire_department</span>
          <span className="ui-bottom-nav__label">Daily</span>
        </NavLink>

        {/* 2. Budget Tab */}
        <NavLink
          to="/plan"
          className={({ isActive }) =>
            `ui-bottom-nav__item ${isActive ? 'ui-bottom-nav__item--active' : ''}`
          }
        >
          <span className="material-symbols-outlined ui-bottom-nav__icon">account_balance_wallet</span>
          <span className="ui-bottom-nav__label">Budget</span>
        </NavLink>

        {/* 3. Center Elevated Fast Log FAB */}
        <div className="ui-bottom-nav__center-slot">
          <button
            type="button"
            className="ui-bottom-nav__fab-btn"
            onClick={onFabClick}
            aria-label="Log Transaction"
          >
            <span className="material-symbols-outlined ui-bottom-nav__fab-icon">add</span>
          </button>
          <span className="ui-bottom-nav__fab-label">Log</span>
        </div>

        {/* 4. Goals Tab */}
        <NavLink
          to="/goals"
          className={({ isActive }) =>
            `ui-bottom-nav__item ${isActive ? 'ui-bottom-nav__item--active' : ''}`
          }
        >
          <span className="material-symbols-outlined ui-bottom-nav__icon">adjust</span>
          <span className="ui-bottom-nav__label">Goals</span>
        </NavLink>

        {/* 5. Vault Tab */}
        <NavLink
          to="/vault"
          className={({ isActive }) =>
            `ui-bottom-nav__item ${isActive ? 'ui-bottom-nav__item--active' : ''}`
          }
        >
          <span className="material-symbols-outlined ui-bottom-nav__icon">shield</span>
          <span className="ui-bottom-nav__label">Vault</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNavigation;
