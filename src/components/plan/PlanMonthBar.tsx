import React from 'react';

export interface PlanMonthBarProps {
  formattedPeriod: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const PlanMonthBar: React.FC<PlanMonthBarProps> = ({
  formattedPeriod,
  onPrevMonth,
  onNextMonth,
}) => {
  return (
    <div className="calm-month-bar">
      <button
        type="button"
        className="calm-month-nav-btn"
        onClick={onPrevMonth}
        aria-label="Previous month"
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </button>
      <div className="calm-month-center">
        <span className="calm-month-name">{formattedPeriod}</span>
        <span className="calm-month-subtext">Monthly Budget Planner</span>
      </div>
      <button
        type="button"
        className="calm-month-nav-btn"
        onClick={onNextMonth}
        aria-label="Next month"
      >
        <span className="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  );
};
