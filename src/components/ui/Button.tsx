import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  children,
  ...props
}) => {
  return (
    <button
      className={`ui-button ui-button--${variant} ui-button--${size} ${fullWidth ? 'ui-button--full-width' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {leftIcon && <span className="ui-button__icon-left">{leftIcon}</span>}
      <span className="ui-button__label">{children}</span>
      {rightIcon && <span className="ui-button__icon-right">{rightIcon}</span>}
    </button>
  );
};
