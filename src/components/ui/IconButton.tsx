import React from 'react';
import './IconButton.css';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: 'ghost' | 'subtle' | 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  'aria-label': ariaLabel,
  variant = 'ghost',
  size = 'md',
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      type="button"
      className={`ui-icon-button ui-icon-button--${variant} ui-icon-button--${size} ${className}`}
      aria-label={ariaLabel}
      disabled={disabled}
      {...props}
    >
      <span className="ui-icon-button__inner">{icon}</span>
    </button>
  );
};
