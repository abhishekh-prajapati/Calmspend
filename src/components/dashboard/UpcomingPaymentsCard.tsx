import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  ChevronRight,
  Tv,
  Receipt,
  Home,
  CreditCard,
  ShieldCheck,
  Briefcase,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { ScheduledOccurrence, ScheduleClassification } from '../../types/recurring';
import './UpcomingPaymentsCard.css';

export interface UpcomingPaymentsCardProps {
  occurrences?: ScheduledOccurrence[];
  className?: string;
  onRecordPayment?: (occurrence: ScheduledOccurrence) => void;
}

function getClassificationIcon(classification: ScheduleClassification, size = 18) {
  switch (classification) {
    case 'subscription':
      return <Tv size={size} />;
    case 'bill':
      return <Receipt size={size} />;
    case 'rent':
      return <Home size={size} />;
    case 'loan_emi':
      return <CreditCard size={size} />;
    case 'insurance':
      return <ShieldCheck size={size} />;
    case 'salary':
      return <Briefcase size={size} />;
    case 'investment':
      return <TrendingUp size={size} />;
    case 'other':
    default:
      return <Tag size={size} />;
  }
}

export const UpcomingPaymentsCard: React.FC<UpcomingPaymentsCardProps> = ({
  occurrences = [],
  className = '',
  onRecordPayment,
}) => {
  const navigate = useNavigate();

  // Filter for pending items (due, upcoming, overdue)
  const pendingOccurrences = occurrences.filter(
    (occ) => occ.status === 'due' || occ.status === 'upcoming' || occ.status === 'overdue',
  );

  const displayOccurrences = pendingOccurrences.slice(0, 3);
  const hasPayments = displayOccurrences.length > 0;

  const handleViewAll = () => {
    navigate('/plan?tab=recurring');
  };

  return (
    <div className={`upcoming-payments-section ${className}`}>
      <SectionHeader
        title="Upcoming Payments"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            style={{ fontSize: '13px', padding: '4px 8px' }}
          >
            View All <ChevronRight size={14} style={{ marginLeft: '2px' }} />
          </Button>
        }
      />

      <Card variant="default" padding="md" radius="xl" className="upcoming-payments-card">
        {!hasPayments ? (
          <div className="upcoming-payments-empty">
            <div className="upcoming-payments-empty__icon-wrap">
              <CalendarClock size={24} />
            </div>
            <h3 className="upcoming-payments-empty__title heading-3">No Upcoming Payments</h3>
            <p className="upcoming-payments-empty__desc body-sm">
              Scheduled bills, EMI deadlines, and active subscriptions will appear here.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewAll}
              style={{ marginTop: '12px' }}
            >
              Add Schedule or Bill
            </Button>
          </div>
        ) : (
          <div className="upcoming-payments-list">
            {displayOccurrences.map((occ) => {
              const isOverdue = occ.status === 'overdue';
              const isDueToday = occ.status === 'due';

              return (
                <div
                  key={occ.occurrenceKey}
                  className={`upcoming-payment-row ${isOverdue ? 'upcoming-payment-row--overdue' : ''}`}
                  onClick={() => onRecordPayment ? onRecordPayment(occ) : handleViewAll()}
                >
                  <div className="upcoming-payment-row__left">
                    <div
                      className={`upcoming-payment-row__icon-wrap upcoming-payment-row__icon-wrap--${occ.classification}`}
                    >
                      {getClassificationIcon(occ.classification, 18)}
                    </div>

                    <div className="upcoming-payment-row__info">
                      <div className="upcoming-payment-row__name">{occ.name}</div>
                      <div className="upcoming-payment-row__meta">
                        {isOverdue ? (
                          <span className="upcoming-payment-row__overdue-text">
                            {Math.abs(occ.daysUntilDue)}d overdue • {occ.dueDate}
                          </span>
                        ) : isDueToday ? (
                          <span className="upcoming-payment-row__due-today-text">Due today</span>
                        ) : (
                          <span>Due {occ.dueDate} ({occ.daysUntilDue}d)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="upcoming-payment-row__right">
                    <div className="upcoming-payment-row__amount">
                      {occ.type === 'income' ? '+' : ''}
                      {formatCurrency(toMajorUnits(occ.amountMinor))}
                    </div>

                    {isOverdue ? (
                      <Badge variant="danger" size="sm">Overdue</Badge>
                    ) : isDueToday ? (
                      <Badge variant="warning" size="sm">Due Today</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">Upcoming</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
