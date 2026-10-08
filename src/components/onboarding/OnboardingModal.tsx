import React, { useState } from 'react';
import { OnboardingProfileStep } from './OnboardingProfileStep';
import { OnboardingCurrencyStep } from './OnboardingCurrencyStep';
import { OnboardingPermissionsStep } from './OnboardingPermissionsStep';
import {
  setUserCurrency,
  getUserCurrency,
  STORAGE_KEY_USER_NAME,
  STORAGE_KEY_ONBOARDING_COMPLETED,
} from '../../services/currency';
import './OnboardingModal.css';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_USER_NAME) || '';
  });
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    return getUserCurrency();
  });

  if (!isOpen) return null;

  const handleFinish = () => {
    const finalName = userName.trim() || 'User';
    localStorage.setItem(STORAGE_KEY_USER_NAME, finalName);
    setUserCurrency(selectedCurrency);
    localStorage.setItem(STORAGE_KEY_ONBOARDING_COMPLETED, 'true');
    onComplete();
  };

  return (
    <div className="calm-onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome Setup">
      <div className="calm-onboarding-modal">
        {/* Step Indicator */}
        <div className="calm-onboarding-progress">
          <div className="calm-onboarding-progress__steps">
            <div className={`calm-step-indicator ${currentStep >= 1 ? 'calm-step-indicator--active' : ''}`}>
              <span className="calm-step-indicator__dot">1</span>
              <span className="calm-step-indicator__label">Profile</span>
            </div>
            <div className={`calm-step-line ${currentStep >= 2 ? 'calm-step-line--active' : ''}`} />
            <div className={`calm-step-indicator ${currentStep >= 2 ? 'calm-step-indicator--active' : ''}`}>
              <span className="calm-step-indicator__dot">2</span>
              <span className="calm-step-indicator__label">Currency</span>
            </div>
            <div className={`calm-step-line ${currentStep >= 3 ? 'calm-step-line--active' : ''}`} />
            <div className={`calm-step-indicator ${currentStep >= 3 ? 'calm-step-indicator--active' : ''}`}>
              <span className="calm-step-indicator__dot">3</span>
              <span className="calm-step-indicator__label">Permissions</span>
            </div>
          </div>
        </div>

        {/* Wizard Content */}
        <div className="calm-onboarding-body">
          {currentStep === 1 && (
            <OnboardingProfileStep
              userName={userName}
              onChangeName={setUserName}
              onNext={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 2 && (
            <OnboardingCurrencyStep
              selectedCurrency={selectedCurrency}
              onSelectCurrency={setSelectedCurrency}
              onBack={() => setCurrentStep(1)}
              onNext={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 3 && (
            <OnboardingPermissionsStep
              onBack={() => setCurrentStep(2)}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
};
