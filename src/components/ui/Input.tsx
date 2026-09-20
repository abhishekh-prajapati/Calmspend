import React from 'react';
import './Input.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  helperText?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  prefix,
  suffix,
  id,
  className = '',
  disabled,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`ui-input-group ${error ? 'ui-input-group--error' : ''} ${disabled ? 'ui-input-group--disabled' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="ui-input-label">
          {label}
        </label>
      )}
      <div className="ui-input-container">
        {prefix && <div className="ui-input-prefix">{prefix}</div>}
        <input
          id={inputId}
          className="ui-input"
          disabled={disabled}
          {...props}
        />
        {suffix && <div className="ui-input-suffix">{suffix}</div>}
      </div>
      {error ? (
        <span className="ui-input-helper ui-input-helper--error">{error}</span>
      ) : helperText ? (
        <span className="ui-input-helper">{helperText}</span>
      ) : null}
    </div>
  );
};
