import React from 'react';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'outlined' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  radius = 'lg',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`ui-card ui-card--${variant} ui-card--pad-${padding} ui-card--rad-${radius} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
