import React, { useEffect } from 'react';
import type { AppNotification } from '../../types/notification';
import type { Goal } from '../../types/goal';
import { NotificationItemCard } from './NotificationItemCard';
import { osNotificationService } from '../../services/native/osNotificationService';
import './NotificationCenterModal.css';

export interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  activeGoals: Goal[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onApplyRollover: (id: string, surplusMinor: number) => void;
  onApplyToGoal: (id: string, goalId: string, surplusMinor: number) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  activeGoals,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onApplyRollover,
  onApplyToGoal,
}) => {
  useEffect(() => {
    if (isOpen && osNotificationService.isSupported()) {
      osNotificationService.checkPermission().then((perm) => {
        if (perm === 'default') {
          // Attempt automatic silent activation without banner
          osNotificationService.requestPermission().catch(() => {});
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasNotifications = notifications.length > 0;

  return (
    <div className="calm-notif-overlay" onClick={onClose}>
      <div className="calm-notif-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calm-notif-modal__handle" />

        <div className="calm-notif-modal__header">
          <div className="calm-notif-modal__title-wrap">
            <div className="calm-notif-modal__icon-badge">
              <span className="material-symbols-outlined">notifications_active</span>
            </div>
            <h2 className="calm-notif-modal__title">Notification Center</h2>
          </div>
          <button
            type="button"
            className="calm-notif-modal__close-btn"
            onClick={onClose}
            aria-label="Close notification center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {hasNotifications && (
          <div className="calm-notif-toolbar">
            <button type="button" className="calm-notif-toolbar-btn" onClick={onMarkAllRead}>
              <span className="material-symbols-outlined">done_all</span>
              <span>Mark all read</span>
            </button>
          </div>
        )}

        <div className="calm-notif-list">
          {hasNotifications ? (
            notifications.map((notif) => (
              <NotificationItemCard
                key={notif.id}
                notification={notif}
                activeGoals={activeGoals}
                onMarkRead={onMarkRead}
                onDismiss={onDismiss}
                onApplyRollover={onApplyRollover}
                onApplyToGoal={onApplyToGoal}
              />
            ))
          ) : (
            <div className="calm-notif-empty">
              <div className="calm-notif-empty__icon-wrap">
                <span className="material-symbols-outlined calm-notif-empty__icon">spa</span>
              </div>
              <h3 className="calm-notif-empty__title">All Caught Up</h3>
              <p className="calm-notif-empty__desc">
                No pending alerts. Whenever you save money from your daily allowance or reach milestones, alerts appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
