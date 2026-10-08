import React from 'react';
import { SUPPORTED_CURRENCIES, type CurrencyItem } from '../../services/currency';

interface OnboardingCurrencyStepProps {
  selectedCurrency: string;
  onSelectCurrency: (code: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export const OnboardingCurrencyStep: React.FC<OnboardingCurrencyStepProps> = ({
  selectedCurrency,
  onSelectCurrency,
  onBack,
  onNext,
}) => {
  return (
    <div className="calm-onboarding-step">
      <div className="calm-onboarding-step__header">
        <div className="calm-onboarding-icon-pill">
          <span className="material-symbols-outlined text-primary">payments</span>
        </div>
        <h2 className="calm-onboarding-title">Choose your currency</h2>
        <p className="calm-onboarding-desc">
          Select your primary operating currency for tracking daily expenses, budgets, and savings targets.
        </p>
      </div>

      <div className="calm-currency-grid" role="radiogroup" aria-label="Select currency">
        {SUPPORTED_CURRENCIES.map((curr: CurrencyItem) => {
          const isSelected = selectedCurrency === curr.code;
          return (
            <button
              key={curr.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`calm-currency-card ${isSelected ? 'calm-currency-card--selected' : ''}`}
              onClick={() => onSelectCurrency(curr.code)}
            >
              <div className="calm-currency-card__symbol">{curr.symbol}</div>
              <div className="calm-currency-card__info">
                <span className="calm-currency-card__code">{curr.code}</span>
                <span className="calm-currency-card__name">{curr.name}</span>
              </div>
              {isSelected && (
                <div className="calm-currency-card__check">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="calm-onboarding-actions calm-onboarding-actions--split">
        <button
          type="button"
          className="calm-onboarding-btn calm-onboarding-btn--ghost"
          onClick={onBack}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back</span>
        </button>
        <button
          type="button"
          className="calm-onboarding-btn calm-onboarding-btn--primary"
          onClick={onNext}
        >
          <span>Continue</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
