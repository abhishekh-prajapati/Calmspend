import React from 'react';
import './AmountInput.css';

export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  className?: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  error,
  autoFocus = true,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits and at most one decimal point
    if (/^[0-9]*\.?[0-9]*$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className={`amount-input-group ${error ? 'amount-input-group--error' : ''} ${className}`}>
      <label className="amount-input-label caption">Amount *</label>
      <div className="amount-input-container">
        <span className="amount-input-currency">₹</span>
        <input
          type="text"
          inputMode="decimal"
          className="amount-input-field"
          placeholder="0.00"
          value={value}
          onChange={handleChange}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </div>
      {error && <span className="ui-input-helper ui-input-helper--error">{error}</span>}
    </div>
  );
};
