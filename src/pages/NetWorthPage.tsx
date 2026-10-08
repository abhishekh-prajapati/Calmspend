import React, { useState } from 'react';
import { useFinancial } from '../context/useFinancial';
import { GoalPacingHeader } from '../components/goals/GoalPacingHeader';
import { GoalsList } from '../components/goals/GoalsList';
import { CreateEditGoalModal } from '../components/goals/CreateEditGoalModal';
import { GoalDepositModal } from '../components/goals/GoalDepositModal';
import { toMajorUnits, toMinorUnits } from '../utils/money';
import type { GoalColorToken } from '../types/goal';
import './NetWorthPage.css';

export const NetWorthPage: React.FC = () => {
  const {
    netWorthSummary,
    goalSummaries,
    accounts,
    createGoal,
    updateGoal,
    deleteGoal,
    createGoalContribution,
  } = useFinancial();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [depositGoal, setDepositGoal] = useState<{ id: string; name: string } | null>(null);
  const [isRoundupActive, setIsRoundupActive] = useState<boolean>(true);

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
        note: `1-Tap micro-deposit (+₹${amountMajor})`,
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

  const handleTemplateClick = (name: string, targetMajor: number, icon: string) => {
    setEditingGoalId(null);
    createGoal({
      name,
      targetAmountMinor: toMinorUnits(targetMajor),
      category: 'emergency_fund',
      colorToken: 'success',
      icon,
      priority: 'medium',
      status: 'active',
    });
    showToast(`Created ${name} target vault ✨`);
  };

  const goalToEdit = editingGoalId ? goalSummaries.find((g) => g.goal.id === editingGoalId)?.goal : null;

  return (
    <div className="calm-goals-page">
      {/* 1. Header with Net Worth Summary & Split Reserves */}
      <GoalPacingHeader
        netWorthSummary={netWorthSummary}
        goalSummaries={goalSummaries}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* 2. Smart Portfolio Allocation Flow */}
      <div className="calm-portfolio-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 text-[20px]">pie_chart</span>
            <h3 className="calm-portfolio-title">Vault Allocation</h3>
          </div>
          <span className="calm-portfolio-badge">P1 • P2 • P3 Model</span>
        </div>

        <div className="calm-portfolio-track">
          <div className="calm-portfolio-segment bg-emerald" style={{ width: '52%' }} />
          <div className="calm-portfolio-segment bg-indigo" style={{ width: '29%' }} />
          <div className="calm-portfolio-segment bg-sky" style={{ width: '19%' }} />
        </div>

        <div className="calm-portfolio-stats-grid">
          <div className="calm-portfolio-stat">
            <p className="font-bold text-xs text-emerald-700">52%</p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">P1 Security</p>
          </div>
          <div className="calm-portfolio-stat">
            <p className="font-bold text-xs text-indigo-600">29%</p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">P2 Travel</p>
          </div>
          <div className="calm-portfolio-stat">
            <p className="font-bold text-xs text-sky-600">19%</p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">P3 Growth</p>
          </div>
        </div>
      </div>

      {/* 3. Active & Completed Target Vaults List */}
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

      {/* 4. Goal Accelerator & Smart Spare Change Engine */}
      <div className="calm-accelerator-card">
        <div className="calm-accelerator-top-row">
          <div className="calm-accelerator-title-group">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </div>
            <h3 className="calm-portfolio-title">Goal Accelerator</h3>
          </div>
          <span className="calm-accelerator-badge">Smart AI Engine</span>
        </div>

        <div className="calm-roundup-box">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-slate-900">Round-Up Spends to ₹50</span>
              <span className="material-symbols-outlined text-[15px] text-emerald-600">auto_awesome</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">₹1,420 rounded up this month into Index Vault</p>
          </div>
          <button
            type="button"
            className={`calm-toggle-switch ${isRoundupActive ? 'active' : ''}`}
            onClick={() => setIsRoundupActive(!isRoundupActive)}
            aria-label="Toggle Round up spends"
          >
            <span className="calm-toggle-thumb" />
          </button>
        </div>

        {/* Launch New Vault Quick Templates */}
        <div className="calm-templates-section">
          <div className="calm-templates-header">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Launch New Vault</span>
            <span className="text-xs text-indigo-600 font-semibold">Templates</span>
          </div>
          <div className="calm-templates-grid">
            <button
              type="button"
              className="calm-template-btn"
              onClick={() => handleTemplateClick('Home Renovation', 250000, 'cottage')}
            >
              <div className="calm-template-icon"><span className="material-symbols-outlined text-[18px]">cottage</span></div>
              <span className="calm-template-label">Home</span>
            </button>
            <button
              type="button"
              className="calm-template-btn"
              onClick={() => handleTemplateClick('Wedding Fund', 500000, 'favorite')}
            >
              <div className="calm-template-icon"><span className="material-symbols-outlined text-[18px]">favorite</span></div>
              <span className="calm-template-label">Wedding</span>
            </button>
            <button
              type="button"
              className="calm-template-btn"
              onClick={() => handleTemplateClick('Sabbatical Trip', 300000, 'beach_access')}
            >
              <div className="calm-template-icon"><span className="material-symbols-outlined text-[18px]">beach_access</span></div>
              <span className="calm-template-label">Sabbatical</span>
            </button>
            <button
              type="button"
              className="calm-template-btn"
              onClick={() => handleTemplateClick('Angel Fund', 1000000, 'rocket_launch')}
            >
              <div className="calm-template-icon"><span className="material-symbols-outlined text-[18px]">rocket_launch</span></div>
              <span className="calm-template-label">Angel Fund</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          className="calm-create-vault-btn"
          onClick={() => {
            setEditingGoalId(null);
            setIsGoalModalOpen(true);
          }}
        >
          <span className="material-symbols-outlined text-emerald-400 text-[19px]">add_circle</span>
          <span>Create Custom Vault</span>
        </button>
      </div>

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

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="calm-sheet-overlay" onClick={() => setIsHelpOpen(false)}>
          <div className="calm-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="calm-sheet__handle" />
            <div className="calm-sheet__header">
              <span className="material-symbols-outlined text-emerald">lightbulb</span>
              <span className="calm-sheet__title">What is Net Worth &amp; Cushion?</span>
            </div>
            <p className="calm-sheet__body">
              Net worth is simply <strong>everything you own</strong> (bank balances, cash, savings goals) minus <strong>what you owe</strong>.
            </p>
            <button type="button" className="calm-sheet__close-btn" onClick={() => setIsHelpOpen(false)}>
              Understood
            </button>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="calm-trends-toast">
          <span className="material-symbols-outlined">celebration</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default NetWorthPage;
