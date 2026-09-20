import { useFinancial } from '../context/useFinancial';
import type { DashboardSummary, FinancialSystemState, PeriodInfo } from '../types/finance';

export interface UseDashboardDataResult {
  period: PeriodInfo;
  systemState: FinancialSystemState;
  summary: DashboardSummary;
}

export function useDashboardData(): UseDashboardDataResult {
  const { period, systemState, summary } = useFinancial();

  return {
    period,
    systemState,
    summary,
  };
}
