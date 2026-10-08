import React, { useState } from 'react';
import { useFinancial } from '../context/useFinancial';
import { getAdjacentPeriod, getRemainingDaysInMonth } from '../services/periodService';
import { toMajorUnits } from '../utils/money';
import { PlanMonthBar } from '../components/plan/PlanMonthBar';
import { StepNeedsAndBuffer } from '../components/plan/steps/StepNeedsAndBuffer';
import { StepWantsAndWishlist } from '../components/plan/steps/StepWantsAndWishlist';
import { StepGoalsAndBalanceCheck } from '../components/plan/steps/StepGoalsAndBalanceCheck';
import { FinalizedBudgetView } from '../components/plan/FinalizedBudgetView';
import { DailyLimitAdjusterModal } from '../components/plan/DailyLimitAdjusterModal';
import { EmergencyCushionModal } from '../components/plan/EmergencyCushionModal';
import { persistWizardBudget } from '../services/budgetWizardHelper';
import type { WizardBudgetItem } from '../types/budgetWizard';
import './PlanPage.css';

export const PlanPage: React.FC = () => {
  const {
    categories,
    selectedPlanPeriod,
    setSelectedPlanPeriod,
    getPlanSummaryForPeriod,
    saveBudgetItem,
    setEmergencyCushion,
    setPlannedSavings,
    setCustomDailyAllowance,
    goalSummaries,
    summary,
  } = useFinancial();

  const planSummary = getPlanSummaryForPeriod(selectedPlanPeriod);
  const hasExistingBudget = (planSummary.budgetItems || []).length > 0;

  const [isWizardMode, setIsWizardMode] = useState<boolean>(!hasExistingBudget);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isDailyLimitOpen, setIsDailyLimitOpen] = useState<boolean>(false);
  const [isCushionModalOpen, setIsCushionModalOpen] = useState<boolean>(false);

  const [needs, setNeeds] = useState<WizardBudgetItem[]>(() =>
    (planSummary.categoryProgress || [])
      .filter((p) => p.priority !== 'want' && p.plannedAmountMinor > 0)
      .map((p) => ({
        id: p.categoryId,
        name: p.categoryName,
        amount: String(toMajorUnits(p.plannedAmountMinor)),
        isRecurring: true,
        priority: 'need' as const,
      }))
  );

  const [wants, setWants] = useState<WizardBudgetItem[]>(() =>
    (planSummary.categoryProgress || [])
      .filter((p) => p.priority === 'want' && p.plannedAmountMinor > 0)
      .map((p) => ({
        id: p.categoryId,
        name: p.categoryName,
        amount: String(toMajorUnits(p.plannedAmountMinor)),
        isRecurring: false,
        priority: 'want' as const,
      }))
  );

  const [emergencyBuffer, setEmergencyBuffer] = useState<string>(() =>
    String(toMajorUnits(planSummary.emergencyCushionMinor || 0))
  );
  const [plannedSavings, setPlannedSavingsInput] = useState<string>(() =>
    String(toMajorUnits(planSummary.plannedSavingsMinor || 0))
  );

  const goalsMonthlyTotal = (goalSummaries || [])
    .filter((g) => g.goal.status === 'active')
    .reduce((sum, g) => sum + toMajorUnits(g.monthlyTargetMinor || g.requiredMonthlyContributionMinor || 0), 0);

  const incomeMajor = toMajorUnits(planSummary.totalPlannedIncomeMinor || summary.monthlyIncomeMinor || 0);

  const handleFinalizeBudget = async () => {
    await persistWizardBudget(
      selectedPlanPeriod.periodKey,
      needs,
      wants,
      emergencyBuffer,
      plannedSavings,
      categories,
      saveBudgetItem,
      setEmergencyCushion,
      setPlannedSavings
    );
    setIsWizardMode(false);
  };

  return (
    <div className="calm-plan-page">
      <PlanMonthBar
        formattedPeriod={selectedPlanPeriod.formattedPeriod}
        onPrevMonth={() => setSelectedPlanPeriod(getAdjacentPeriod(selectedPlanPeriod, -1))}
        onNextMonth={() => setSelectedPlanPeriod(getAdjacentPeriod(selectedPlanPeriod, 1))}
      />

      {isWizardMode ? (
        <div className="calm-wizard-container">
          {wizardStep === 1 && (
            <StepNeedsAndBuffer
              needs={needs}
              emergencyBuffer={emergencyBuffer}
              onUpdateNeeds={setNeeds}
              onUpdateBuffer={setEmergencyBuffer}
              onNext={() => setWizardStep(2)}
            />
          )}
          {wizardStep === 2 && (
            <StepWantsAndWishlist
              needs={needs}
              wants={wants}
              onUpdateNeeds={setNeeds}
              onUpdateWants={setWants}
              onBack={() => setWizardStep(1)}
              onNext={() => setWizardStep(3)}
            />
          )}
          {wizardStep === 3 && (
            <StepGoalsAndBalanceCheck
              income={incomeMajor}
              needs={needs}
              wants={wants}
              emergencyBuffer={emergencyBuffer}
              plannedSavings={plannedSavings}
              goalsMonthlyTotal={goalsMonthlyTotal}
              onUpdateNeeds={setNeeds}
              onUpdateBuffer={setEmergencyBuffer}
              onUpdateSavings={setPlannedSavingsInput}
              onBack={() => setWizardStep(2)}
              onFinalize={handleFinalizeBudget}
            />
          )}
        </div>
      ) : (
        <FinalizedBudgetView
          planSummary={planSummary}
          categories={categories}
          isLocked={isLocked}
          onToggleLock={() => setIsLocked(!isLocked)}
          onEditPlan={() => {
            setWizardStep(1);
            setIsWizardMode(true);
          }}
          onOpenDailyLimitModal={() => setIsDailyLimitOpen(true)}
          onSetCushion={() => setIsCushionModalOpen(true)}
        />
      )}

      <DailyLimitAdjusterModal
        isOpen={isDailyLimitOpen}
        onClose={() => setIsDailyLimitOpen(false)}
        currentDailyMinor={planSummary.customDailyAllowanceMinor}
        autoDailyMinor={planSummary.dailyAllowanceMinor}
        remainingDays={getRemainingDaysInMonth()}
        onSaveDailyLimit={async (limitMinor) => {
          await setCustomDailyAllowance(selectedPlanPeriod.periodKey, limitMinor);
        }}
      />

      <EmergencyCushionModal
        isOpen={isCushionModalOpen}
        onClose={() => setIsCushionModalOpen(false)}
        surplusAfterNeedsMinor={planSummary.unallocatedMinor || 0}
        currentCushionMinor={planSummary.emergencyCushionMinor || 0}
        onSaveCushion={async (minor) => {
          await setEmergencyCushion(selectedPlanPeriod.periodKey, minor);
        }}
      />
    </div>
  );
};

export default PlanPage;
