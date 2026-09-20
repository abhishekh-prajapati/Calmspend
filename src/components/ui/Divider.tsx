import React from 'react';
import './Divider.css';

export interface DividerProps {
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  spacing = 'md',
  className = '',
}) => {
  return <hr className={`ui-divider ui-divider--spacing-${spacing} ${className}`} />;
};
