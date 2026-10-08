import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useFinancial } from '../../context/useFinancial';
import { CalmSpendHeader } from './CalmSpendHeader';
import { BottomNavigation } from '../navigation/BottomNavigation';
import { QuickActionSheet } from '../navigation/QuickActionSheet';
import { NotificationCenterModal } from '../notifications/NotificationCenterModal';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import { STORAGE_KEY_ONBOARDING_COMPLETED } from '../../services/currency';
import { initBackButtonService } from '../../services/mobile/backButtonService';
import type { AppShellContextType } from './AppShellContext';
import './AppShell.css';

export const AppShell: React.FC = () => {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_ONBOARDING_COMPLETED) !== 'true';
  });
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location.pathname);

  const {
    notifications,
    goals,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    dismissNotification,
    applyDailySweepRollover,
    applyDailySweepToGoal,
  } = useFinancial();

  const activeGoals = goals.filter((g) => g.status === 'active');

  const isDetailPage =
    location.pathname.startsWith('/expenses/') ||
    location.pathname.startsWith('/income/') ||
    location.pathname.startsWith('/transfers/') ||
    location.pathname.startsWith('/data-management') ||
    location.pathname.startsWith('/aa/');

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
        <CalmSpendHeader
          showBackButton={isDetailPage}
          onNotificationClick={() => setIsNotificationOpen(true)}
        />

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

        {/* In-App Notification Center Modal */}
        <NotificationCenterModal
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          notifications={notifications}
          activeGoals={activeGoals}
          onMarkRead={markNotificationAsRead}
          onMarkAllRead={markAllNotificationsAsRead}
          onDismiss={dismissNotification}
          onApplyRollover={applyDailySweepRollover}
          onApplyToGoal={applyDailySweepToGoal}
        />

        {/* First-Time Setup Wizard Modal */}
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onComplete={() => setIsOnboardingOpen(false)}
        />
      </div>
    </div>
  );
};
