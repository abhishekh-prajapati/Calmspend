import React from 'react';

interface OnboardingProfileStepProps {
  userName: string;
  onChangeName: (name: string) => void;
  onNext: () => void;
}

export const OnboardingProfileStep: React.FC<OnboardingProfileStepProps> = ({
  userName,
  onChangeName,
  onNext,
}) => {
  const isNameValid = userName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNameValid) {
      onNext();
    }
  };

  const initialLetter = userName.trim() ? userName.trim().charAt(0).toUpperCase() : '✦';

  return (
    <form className="calm-onboarding-step" onSubmit={handleSubmit}>
      <div className="calm-onboarding-step__header">
        <div className="calm-onboarding-avatar-preview">
          <span className="calm-onboarding-avatar-preview__letter">{initialLetter}</span>
        </div>
        <h2 className="calm-onboarding-title">Welcome to CalmSpend</h2>
        <p className="calm-onboarding-desc">
          Take control of your money with calm, zero-knowledge budgeting. Let&apos;s start by setting up your profile.
        </p>
      </div>

      <div className="calm-onboarding-field">
        <label htmlFor="onboarding-user-name" className="calm-onboarding-label">
          What should we call you?
        </label>
        <input
          id="onboarding-user-name"
          type="text"
          className="calm-onboarding-input"
          placeholder="e.g. Alex, Rahul, Sarah"
          value={userName}
          onChange={(e) => onChangeName(e.target.value)}
          autoFocus
          maxLength={40}
        />
        <span className="calm-onboarding-hint">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          Stored locally on this device. Never sent to any cloud server.
        </span>
      </div>

      <div className="calm-onboarding-actions">
        <button
          type="submit"
          className="calm-onboarding-btn calm-onboarding-btn--primary"
          disabled={!isNameValid}
        >
          <span>Continue</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </form>
  );
};
