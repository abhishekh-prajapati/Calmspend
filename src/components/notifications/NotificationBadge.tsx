import React from 'react';

interface NotificationBadgeProps {
  count: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count }) => {
  if (count <= 0) return null;

  return (
    <span
      className="calm-notif-badge"
      style={{
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        borderRadius: 999,
        backgroundColor: '#059669',
        color: '#ffffff',
        border: '2px solid #ffffff',
        fontSize: 10,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        lineHeight: 1,
        boxShadow: '0 2px 5px rgba(5, 150, 105, 0.4)',
      }}
      aria-label={`${count} unread notifications`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
};
