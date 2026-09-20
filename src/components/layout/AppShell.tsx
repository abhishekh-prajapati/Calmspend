import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CalmSpendHeader } from './CalmSpendHeader';
import { BottomNavigation } from '../navigation/BottomNavigation';
import { QuickActionSheet } from '../navigation/QuickActionSheet';
import { initBackButtonService } from '../../services/mobile/backButtonService';
import type { AppShellContextType } from './AppShellContext';
import './AppShell.css';

export const AppShell: React.FC = () => {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location.pathname);

  const isDetailPage =
    location.pathname.startsWith('/expenses/') ||
    location.pathname.startsWith('/income/') ||
    location.pathname.startsWith('/transfers/') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/data-management');

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const cleanup = initBackButtonService({
      getCurrentPath: () => locationRef.current,
      navigate: (pathOrDelta) => {
        if (typeof pathOrDelta === 'number') {
          navigate(pathOrDelta);
        } else {
          navigate(pathOrDelta);
        }
      },
    });

    return () => cleanup();
  }, [navigate]);

  const handleOpenQuickAction = () => {
    setIsQuickActionOpen(true);
  };

  const handleCloseQuickAction = () => {
    setIsQuickActionOpen(false);
  };

  return (
    <div className="app-shell">
      <div className="app-shell__frame">
        {/* Sticky CalmSpend Top Bar */}
        <CalmSpendHeader showBackButton={isDetailPage} />

        {/* Main Content Area */}
        <main
          className={`app-shell__main ${isDetailPage ? 'app-shell__main--detail' : ''}`}
          id="main-content"
        >
          <Outlet
            context={{
              openQuickAction: handleOpenQuickAction,
              closeQuickAction: handleCloseQuickAction,
            } satisfies AppShellContextType}
          />
        </main>

        {/* Fixed Bottom Navigation with Central FAB - Only shown on top-level pages */}
        {!isDetailPage && (
          <BottomNavigation
            onFabClick={handleOpenQuickAction}
            isSheetOpen={isQuickActionOpen}
          />
        )}

        {/* Shared Quick Action Sheet */}
        <QuickActionSheet
          isOpen={isQuickActionOpen}
          onClose={handleCloseQuickAction}
        />
      </div>
    </div>
  );
};
