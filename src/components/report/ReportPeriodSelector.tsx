import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';
import type { PeriodInfo } from '../../types/finance';
import { isCurrentPeriod } from '../../services/periodService';
import { Card } from '../ui/Card';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import './ReportPeriodSelector.css';

export interface ReportPeriodSelectorProps {
  currentPeriod: PeriodInfo;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onResetToCurrentMonth: () => void;
}

export const ReportPeriodSelector: React.FC<ReportPeriodSelectorProps> = ({
  currentPeriod,
  onPreviousMonth,
  onNextMonth,
  onResetToCurrentMonth,
}) => {
  const isCurrent = isCurrentPeriod(currentPeriod);

  return (
    <Card variant="default" padding="sm" className="report-period-selector">
      <div className="period-selector-content">
        <div className="period-nav-group">
          <IconButton
            icon={<ChevronLeft size={18} />}
            aria-label="Previous month"
            variant="ghost"
            size="sm"
            onClick={onPreviousMonth}
          />

          <div className="period-display">
            <Calendar size={16} className="period-calendar-icon" />
            <span className="period-title">{currentPeriod.formattedPeriod}</span>
            {isCurrent && <span className="period-active-pill">Current</span>}
          </div>

          <IconButton
            icon={<ChevronRight size={18} />}
            aria-label="Next month"
            variant="ghost"
            size="sm"
            onClick={onNextMonth}
          />
        </div>

        {!isCurrent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetToCurrentMonth}
            leftIcon={<RotateCcw size={14} />}
            className="reset-period-btn"
          >
            Jump to Current
          </Button>
        )}
      </div>
    </Card>
  );
};
