import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/useFinancial';
import { DashboardActionShortcuts } from '../components/dashboard/DashboardActionShortcuts';
import { DailyMonthlyUsageCard } from '../components/dashboard/DailyMonthlyUsageCard';
import { CurrentAmountCard } from '../components/dashboard/CurrentAmountCard';
import { RecentTransactionsCard } from '../components/dashboard/RecentTransactionsCard';
import { DailyQuoteCard } from '../components/dashboard/DailyQuoteCard';
import { NeedsChecklistSection } from '../components/dashboard/NeedsChecklistSection';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    accounts,
    summary,
    transactions,
    categories,
    currentPlanSummary,
    addTransaction,
    disconnectLinkedBank,
    getCategory,
  } = useFinancial();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const todayIso = new Date().toISOString().split('T')[0];

  const needsProgress = (currentPlanSummary.categoryProgress || []).filter(
    (p) => p.priority !== 'want' && p.plannedAmountMinor > 0
  );
  const needCategoryIds = new Set(needsProgress.map((p) => p.categoryId));

  // Daily spent strictly tracks flexible/discretionary daily spending, excluding pre-planned Needs
  const spentTodayMinor = transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.date === todayIso &&
        !needCategoryIds.has(t.categoryId || '')
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const dailyAllowedMinor = summary.dailyAllowanceMinor || summary.availableToSpendMinor || 0;
  const totalMonthlyUsageMinor = summary.monthlyExpensesMinor || 0;
  const totalMonthlyBudgetMinor = currentPlanSummary.totalPlannedExpensesMinor || 0;

  const handleDisconnectAccount = async (e: React.MouseEvent, accountId: string, accountName: string) => {
    e.stopPropagation();
    if (window.confirm(`Disconnect "${accountName}" and remove its balance?`)) {
      await disconnectLinkedBank(accountId);
      showToast(`Disconnected ${accountName}`);
    }
  };

  const handleRecordSpend = async ({
    categoryId,
    amountMinor,
    accountId,
    date,
    description,
  }: {
    categoryId: string;
    amountMinor: number;
    accountId?: string;
    date?: string;
    description?: string;
  }) => {
    const primaryAccount = accounts.find((a) => a.type === 'bank') || accounts[0];
    const category = getCategory(categoryId);
    const catName = category ? category.name : 'Need';

    await addTransaction({
      type: 'expense',
      amount: amountMinor,
      categoryId,
      accountId: accountId || (primaryAccount ? primaryAccount.id : 'default'),
      date: date || todayIso,
      description: description?.trim() || `Payment for ${catName}`,
    });

    showToast(`Recorded payment for ${catName} ✨`);
  };

  return (
    <div className="calm-home">
      {/* 1. Daily Allowed Usage & Monthly Usage Card */}
      <DailyMonthlyUsageCard
        dailyAllowedMinor={dailyAllowedMinor}
        spentTodayMinor={spentTodayMinor}
        totalMonthlyUsageMinor={totalMonthlyUsageMinor}
        totalMonthlyBudgetMinor={totalMonthlyBudgetMinor}
        availableMoneyMinor={summary.currentBalanceMinor}
        monthlyIncomeMinor={summary.monthlyIncomeMinor}
        onHelpClick={() => navigate('/plan')}
      />

      {/* 2. Quick Action Shortcuts (+ Income / - Log Expense) */}
      <DashboardActionShortcuts
        onAddIncome={() => navigate('/income/new')}
        onAddExpense={() => navigate('/expenses/new')}
      />

      {/* 3. Current Amount & Liquid Accounts Card */}
      <CurrentAmountCard
        currentBalanceMinor={summary.currentBalanceMinor}
        accounts={accounts}
        transactions={transactions}
        onDisconnectAccount={handleDisconnectAccount}
      />

      {/* 4. Real-time Activity / Recent Transactions (Shows Incomes & Spends) */}
      <RecentTransactionsCard />

      {/* 5. Daily Motivational Financial Wisdom Quote Card */}
      <DailyQuoteCard />

      {/* 6. Essential NEED Section Checklist */}
      <NeedsChecklistSection
        needsProgress={needsProgress}
        categories={categories}
        accounts={accounts}
        onRecordSpend={handleRecordSpend}
        onNavigateToPlan={() => navigate('/plan')}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="calm-trends-toast">
          <span className="material-symbols-outlined">task_alt</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default HomePage;
