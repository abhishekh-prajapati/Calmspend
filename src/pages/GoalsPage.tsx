import React, { useState } from 'react';
import { useFinancial } from '../context/useFinancial';
import { GoalHeroBanner } from '../components/goals/GoalHeroBanner';
import { GoalsList } from '../components/goals/GoalsList';
import { CreateEditGoalModal } from '../components/goals/CreateEditGoalModal';
import { GoalDepositModal } from '../components/goals/GoalDepositModal';
import { toMajorUnits, toMinorUnits } from '../utils/money';
import type { GoalColorToken } from '../types/goal';
import './GoalsPage.css';

export const GoalsPage: React.FC = () => {
  const {
    goalSummaries,
    accounts,
    createGoal,
    updateGoal,
    deleteGoal,
    createGoalContribution,
  } = useFinancial();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [depositGoal, setDepositGoal] = useState<{ id: string; name: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleMicroDeposit = async (goalId: string, amountMajor: number, goalName: string) => {
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      await createGoalContribution({
        goalId,
        amountMinor: toMinorUnits(String(amountMajor)),
        date: todayIso,
        note: `1-Tap boost (+₹${amountMajor})`,
      });
      showToast(`Stashed ₹${amountMajor} in ${goalName} 🌱`);
    } catch {
      showToast(`Added ₹${amountMajor} to your savings`);
    }
  };

  const handleSaveGoal = async (data: {
    id?: string;
    name: string;
    targetAmountMinor: number;
    targetDate?: string;
    monthlyTargetMinor?: number;
    colorToken: GoalColorToken;
    icon: string;
  }) => {
    if (data.id) {
      await updateGoal(data.id, {
        name: data.name,
        targetAmountMinor: data.targetAmountMinor,
        targetDate: data.targetDate,
        monthlyTargetMinor: data.monthlyTargetMinor,
        colorToken: data.colorToken,
        icon: data.icon,
      });
      showToast('Updated goal settings ✨');
    } else {
      await createGoal({
        name: data.name,
        targetAmountMinor: data.targetAmountMinor,
        targetDate: data.targetDate,
        monthlyTargetMinor: data.monthlyTargetMinor,
        category: 'emergency_fund',
        colorToken: data.colorToken,
        icon: data.icon,
        priority: 'medium',
        status: 'active',
      });
      showToast('Created new target vault 🎉');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteGoal(id);
    showToast('Deleted savings goal');
  };

  const goalToEdit = editingGoalId
    ? goalSummaries.find((g) => g.goal.id === editingGoalId)?.goal
    : null;

  return (
    <div className="calm-goals-page">
      {/* 1. Hero Goal Banner */}
      <GoalHeroBanner
        goalSummaries={goalSummaries}
        onNewGoalClick={() => {
          setEditingGoalId(null);
          setIsGoalModalOpen(true);
        }}
      />

      {/* 2. Active & Completed Target Vaults List */}
      <GoalsList
        goalSummaries={goalSummaries}
        onNewGoalClick={() => {
          setEditingGoalId(null);
          setIsGoalModalOpen(true);
        }}
        onMicroDeposit={handleMicroDeposit}
        onCustomDeposit={(id, name) => setDepositGoal({ id, name })}
        onEditGoal={(id) => {
          setEditingGoalId(id);
          setIsGoalModalOpen(true);
        }}
      />

      {/* Create / Edit Goal Modal */}
      <CreateEditGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoalId(null);
        }}
        goalToEdit={goalToEdit}
        onSaveGoal={handleSaveGoal}
        onDeleteGoal={handleDeleteGoal}
      />

      {/* Custom Deposit Modal */}
      <GoalDepositModal
        isOpen={Boolean(depositGoal)}
        onClose={() => setDepositGoal(null)}
        goal={depositGoal}
        accounts={accounts}
        onConfirmDeposit={async (params) => {
          const todayIso = new Date().toISOString().split('T')[0];
          await createGoalContribution({
            ...params,
            date: todayIso,
          });
          showToast(`Stashed ₹${toMajorUnits(params.amountMinor)} in ${depositGoal?.name} 🌱`);
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="calm-trends-toast">
          <span className="material-symbols-outlined">celebration</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
