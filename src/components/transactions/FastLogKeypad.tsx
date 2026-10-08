import React from 'react';

interface FastLogKeypadProps {
  amountStr: string;
  onAmountChange: (value: string) => void;
  currencySymbol?: string;
}

const QUICK_CHIPS = [100, 250, 500, 1000, 2000];

export const FastLogKeypad: React.FC<FastLogKeypadProps> = ({
  amountStr,
  onAmountChange,
  currencySymbol = '₹',
}) => {
  const handleChipClick = (val: number) => {
    const current = parseFloat(amountStr) || 0;
    const next = current + val;
    onAmountChange(String(next));
  };

  const handleClear = () => {
    onAmountChange('');
  };

  return (
    <div className="fastlog-keypad">
      <div className="fastlog-amount-display">
        <span className="fastlog-amount-currency">{currencySymbol}</span>
        <input
          type="number"
          step="any"
          inputMode="decimal"
          className="fastlog-amount-input"
          placeholder="0"
          value={amountStr}
          onChange={(e) => onAmountChange(e.target.value)}
          autoFocus
        />
        {amountStr && (
          <button
            type="button"
            className="fastlog-amount-clear"
            onClick={handleClear}
            aria-label="Clear amount"
          >
            &times;
          </button>
        )}
      </div>

      <div className="fastlog-chips">
        {QUICK_CHIPS.map((val) => (
          <button
            key={val}
            type="button"
            className="fastlog-chip"
            onClick={() => handleChipClick(val)}
          >
            +{currencySymbol}{val}
          </button>
        ))}
      </div>
    </div>
  );
};
