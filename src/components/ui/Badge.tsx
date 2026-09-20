import React from 'react';
import './Badge.css';

export interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
}) => {
  return (
    <span className={`ui-badge ui-badge--${variant} ui-badge--${size} ${className}`}>
      {children}
    </span>
  );
};
