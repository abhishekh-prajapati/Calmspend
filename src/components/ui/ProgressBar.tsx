import React from 'react';
import './ProgressBar.css';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  return (
    <div className={`ui-progress-bar-container ${className}`}>
      <div className={`ui-progress-bar ui-progress-bar--${size}`}>
        <div
          className={`ui-progress-bar__fill ui-progress-bar__fill--${color}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      {showLabel && (
        <span className="ui-progress-bar__label caption">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};
