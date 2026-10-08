import React from 'react';
import { toMajorUnits } from '../../utils/money';
import type { MonthlyPlanSummary } from '../../types/budget';
import type { Category } from '../../types/transaction';
import { FinalizedBudgetInflowPanel } from './FinalizedBudgetInflowPanel';
import { FinalizedBudgetAllocationCards } from './FinalizedBudgetAllocationCards';
import { FinalizedBudgetPaceAndLock } from './FinalizedBudgetPaceAndLock';

export interface FinalizedBudgetViewProps {
  planSummary: MonthlyPlanSummary;
  categories: Category[];
  isLocked: boolean;
  onToggleLock: () => void;
  onEditPlan: () => void;
  onOpenDailyLimitModal: () => void;
  onSetCushion: () => void;
}

export const FinalizedBudgetView: React.FC<FinalizedBudgetViewProps> = ({
  planSummary,
  categories,
  isLocked,
  onToggleLock,
  onEditPlan,
}) => {
  const categoryProgress = planSummary.categoryProgress || [];
  const needsEnvelopes = categoryProgress.filter((p) => p.priority !== 'want' && p.plannedAmountMinor > 0);
  const wantsEnvelopes = categoryProgress.filter((p) => p.priority === 'want' && p.plannedAmountMinor > 0);

  const totalIncomeMajor = toMajorUnits(planSummary.totalPlannedIncomeMinor || 0);
  const needsFromEnvelopes = needsEnvelopes.reduce((sum, p) => sum + toMajorUnits(p.plannedAmountMinor), 0);
  const emergencyCushionMajor = toMajorUnits(planSummary.emergencyCushionMinor || 0);
  const totalNeedsMajor = needsFromEnvelopes + emergencyCushionMajor;

  // Total wants is strictly what the user added to wants envelopes (0 if nothing added)
  const totalWantsMajor = wantsEnvelopes.reduce((sum, p) => sum + toMajorUnits(p.plannedAmountMinor), 0);
  const totalSavingsMajor = toMajorUnits(planSummary.plannedSavingsMinor || 0);

  const totalAllocatedMajor = totalNeedsMajor + totalWantsMajor + totalSavingsMajor;
  const unassignedSurplusMajor = Math.max(0, totalIncomeMajor - totalAllocatedMajor);

  return (
    <div className="calm-finalized-view">
      {/* 1. Monthly Inflow Overview */}
      <FinalizedBudgetInflowPanel
        totalIncomeMajor={totalIncomeMajor}
        fundedEnvelopesCount={needsEnvelopes.length + wantsEnvelopes.length}
      />

      {/* 2. 50/30/20 Allocation Envelopes Cards */}
      <FinalizedBudgetAllocationCards
        totalIncomeMajor={totalIncomeMajor}
        totalNeedsMajor={totalNeedsMajor}
        totalWantsMajor={totalWantsMajor}
        totalSavingsMajor={totalSavingsMajor}
        unassignedSurplusMajor={unassignedSurplusMajor}
        needsEnvelopes={needsEnvelopes}
        wantsEnvelopes={wantsEnvelopes}
        categories={categories}
      />

      {/* 3. Zero-Based Status, Daily Pace Engine, and Plan Controls */}
      <FinalizedBudgetPaceAndLock
        totalIncomeMajor={totalIncomeMajor}
        totalAllocatedMajor={totalAllocatedMajor}
        unassignedSurplusMajor={unassignedSurplusMajor}
        isLocked={isLocked}
        onToggleLock={onToggleLock}
        onEditPlan={onEditPlan}
      />
    </div>
  );
};
