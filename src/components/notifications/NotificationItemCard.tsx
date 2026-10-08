import React, { useState } from 'react';
import type { AppNotification } from '../../types/notification';
import type { Goal } from '../../types/goal';
import { toMajorUnits } from '../../utils/money';

export interface NotificationItemCardProps {
  notification: AppNotification;
  activeGoals: Goal[];
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onApplyRollover: (id: string, surplusMinor: number) => void;
  onApplyToGoal: (id: string, goalId: string, surplusMinor: number) => void;
}

export const NotificationItemCard: React.FC<NotificationItemCardProps> = ({
  notification,
  activeGoals,
  onMarkRead,
  onDismiss,
  onApplyRollover,
  onApplyToGoal,
}) => {
  const [selectedGoalId, setSelectedGoalId] = useState<string>(() =>
    activeGoals.length > 0 ? activeGoals[0].id : '',
  );

  const isSweep = notification.type === 'daily_sweep';
  const surplusMinor = notification.metadata?.surplusMinor || 0;
  const surplusMajor = toMajorUnits(surplusMinor);

  const handleCardClick = () => {
    if (!notification.isRead) {
      onMarkRead(notification.id);
    }
  };

  return (
    <div
      className={`calm-notif-card ${!notification.isRead ? 'calm-notif-card--unread' : ''}`}
      onClick={handleCardClick}
    >
      <div className="calm-notif-card__top">
        <div className="calm-notif-card__header-left">
          <div className="calm-notif-card__icon-wrap">
            <span className="material-symbols-outlined calm-notif-card__icon">
              {isSweep ? 'savings' : notification.type === 'goal_milestone' ? 'celebration' : 'flag'}
            </span>
          </div>
          <span className="calm-notif-card__title">{notification.title}</span>
        </div>
        <button
          type="button"
          className="calm-notif-card__dismiss-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
          aria-label="Dismiss notification"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <p className="calm-notif-card__message">{notification.message}</p>

      {/* Action Area for Daily Sweep */}
      {isSweep && !notification.actionTaken && (
        <div className="calm-notif-card__actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="calm-notif-action-btn calm-notif-action-btn--primary"
            onClick={() => onApplyRollover(notification.id, surplusMinor)}
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>Add ₹{surplusMajor} to Tomorrow's Budget</span>
          </button>

          {activeGoals.length > 0 && (
            <div className="calm-notif-goal-action">
              <select
                className="calm-notif-select"
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                aria-label="Choose goal for savings sweep"
              >
                {activeGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    Stash in: {g.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="calm-notif-action-btn calm-notif-action-btn--secondary"
                onClick={() => onApplyToGoal(notification.id, selectedGoalId, surplusMinor)}
                disabled={!selectedGoalId}
              >
                <span className="material-symbols-outlined">savings</span>
                <span>Stash ₹{surplusMajor} in Goal</span>
              </button>
            </div>
          )}
        </div>
      )}

      {notification.actionTaken && (
        <div className="calm-notif-card__done">
          <span className="material-symbols-outlined">check_circle</span>
          <span>Action completed ✨</span>
        </div>
      )}
    </div>
  );
};
