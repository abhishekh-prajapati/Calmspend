import React from 'react';
import { CalendarClock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { RecurringCommitmentReport } from '../../types/report';
import './RecurringCommitmentsCard.css';

export interface RecurringCommitmentsCardProps {
  recurring: RecurringCommitmentReport;
}

export const RecurringCommitmentsCard: React.FC<RecurringCommitmentsCardProps> = ({
  recurring,
}) => {
  if (recurring.totalScheduledOccurrencesCount === 0) {
    return (
      <Card variant="default" padding="lg" radius="lg" className="recurring-review-card">
        <div className="card-header-simple">
          <span className="card-subtitle">Scheduled Obligations</span>
          <h3 className="card-title">Recurring Commitments</h3>
        </div>
        <div className="empty-recurring-state">
          <CalendarClock size={28} className="empty-recurring-icon" />
          <p className="empty-recurring-text">No recurring schedules or bills due in this period</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="lg" radius="lg" className="recurring-review-card">
      <div className="card-header-with-badge">
        <div className="card-title-group">
          <span className="card-subtitle">Scheduled Obligations</span>
          <h3 className="card-title">Recurring Commitments</h3>
        </div>
        <Badge variant={recurring.unpaidOccurrencesCount > 0 ? 'warning' : 'success'} size="md">
          {recurring.paidOccurrencesCount} of {recurring.totalScheduledOccurrencesCount} Paid
        </Badge>
      </div>

      <div className="recurring-stats-grid">
        <div className="recurring-stat-box">
          <span className="rec-label">Expected Recurring</span>
          <span className="rec-val">
            {formatCurrency(toMajorUnits(recurring.expectedRecurringExpensesMinor))}
          </span>
          <span className="rec-hint">Total scheduled due</span>
        </div>

        <div className="recurring-stat-box">
          <span className="rec-label">Actually Paid</span>
          <span className="rec-val rec-val-paid">
            {formatCurrency(toMajorUnits(recurring.actualRecurringExpensesPaidMinor))}
          </span>
          <span className="rec-hint">Paid via transactions</span>
        </div>

        <div className="recurring-stat-box">
          <span className="rec-label">Unpaid Balance</span>
          <span className="rec-val rec-val-unpaid">
            {formatCurrency(toMajorUnits(recurring.unpaidRecurringExpensesMinor))}
          </span>
          <span className="rec-hint">Still pending</span>
        </div>
      </div>

      <div className="recurring-disclaimer">
        <span>Unpaid scheduled commitments are forecasted obligations and are NOT counted as actual expenses until recorded as paid.</span>
      </div>
    </Card>
  );
};
