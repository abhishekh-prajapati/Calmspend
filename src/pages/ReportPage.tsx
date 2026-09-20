import React, { useState } from 'react';
import { useFinancial } from '../context/useFinancial';
import { formatCurrency } from '../services/currency';
import { toMajorUnits } from '../utils/money';
import { getAdjacentPeriod, isDateInPeriod } from '../services/periodService';
import {
  getMonthlyIncomeMinor,
  getMonthlyExpensesMinor,
} from '../services/financialCalculations';
import { getExpenseCategoryBreakdown } from '../services/reportCalculations';
import type { CategoryBreakdownItem } from '../types/report';
import './ReportPage.css';

const COLOR_CLASSES = ['bg-primary', 'bg-secondary', 'bg-sage', 'bg-terracotta', 'bg-slate', 'bg-mint'];

export const ReportPage: React.FC = () => {
  const {
    period,
    categories,
    transactions,
    getCategory,
  } = useFinancial();

  const [currentPeriod, setCurrentPeriod] = useState(period);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryBreakdownItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handlePrevMonth = () => {
    setCurrentPeriod(getAdjacentPeriod(currentPeriod, -1));
  };

  const handleNextMonth = () => {
    setCurrentPeriod(getAdjacentPeriod(currentPeriod, 1));
  };

  // 1. Dynamic Period Financials
  const incomeMinor = getMonthlyIncomeMinor(transactions, currentPeriod);
  const expensesMinor = getMonthlyExpensesMinor(transactions, currentPeriod);
  const netKeptMinor = incomeMinor - expensesMinor;
  const isSurplus = netKeptMinor >= 0;

  const incomeMajor = toMajorUnits(incomeMinor);
  const expensesMajor = toMajorUnits(expensesMinor);
  const netKeptMajor = Math.abs(toMajorUnits(netKeptMinor));
  const savingsRate = incomeMinor > 0 ? Math.round((Math.max(0, netKeptMinor) / incomeMinor) * 100) : 0;

  // Max for proportional cashflow bars
  const maxCashflow = Math.max(incomeMinor, expensesMinor, 1);
  const incomeBarWidth = Math.min(100, Math.max(8, Math.round((incomeMinor / maxCashflow) * 100)));
  const expenseBarWidth = Math.min(100, Math.max(8, Math.round((expensesMinor / maxCashflow) * 100)));

  // 2. Dynamic Category Breakdown
  const categoryBreakdown = getExpenseCategoryBreakdown(transactions, categories, currentPeriod);
  const hasExpenseData = categoryBreakdown.length > 0;

  // 3. Dynamic 3-Month Trend (m-2, m-1, m-0)
  const p0 = currentPeriod;
  const p1 = getAdjacentPeriod(currentPeriod, -1);
  const p2 = getAdjacentPeriod(currentPeriod, -2);

  const exp0Minor = getMonthlyExpensesMinor(transactions, p0);
  const exp1Minor = getMonthlyExpensesMinor(transactions, p1);
  const exp2Minor = getMonthlyExpensesMinor(transactions, p2);

  const exp0Major = toMajorUnits(exp0Minor);
  const exp1Major = toMajorUnits(exp1Minor);
  const exp2Major = toMajorUnits(exp2Minor);

  const max3MonthExp = Math.max(exp0Major, exp1Major, exp2Major, 1);
  const bar0Height = Math.min(100, Math.max(14, Math.round((exp0Major / max3MonthExp) * 100)));
  const bar1Height = Math.min(100, Math.max(14, Math.round((exp1Major / max3MonthExp) * 100)));
  const bar2Height = Math.min(100, Math.max(14, Math.round((exp2Major / max3MonthExp) * 100)));

  const deltaPercent = exp1Minor > 0 ? Math.round(((exp0Minor - exp1Minor) / exp1Minor) * 100) : null;

  // Drilldown transactions for selected category
  const drilldownTxns = selectedCategory
    ? transactions.filter(
        (t) =>
          t.type === 'expense' &&
          t.categoryId === selectedCategory.categoryId &&
          isDateInPeriod(t.date, currentPeriod)
      )
    : [];

  const handleExportCsv = () => {
    const periodTxns = transactions.filter((t) => isDateInPeriod(t.date, currentPeriod));
    const header = 'Date,Type,Category,Description,Amount\n';
    const rows = periodTxns
      .map((t) => {
        const catName = t.categoryId ? getCategory(t.categoryId)?.name || '' : '';
        return `${t.date},${t.type},${catName},"${t.description || ''}",${toMajorUnits(t.amount)}`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CalmSpend_${currentPeriod.periodKey}.csv`;
    a.click();
    showToast(`Exported ${periodTxns.length} transactions for ${currentPeriod.formattedPeriod}`);
  };

  const handleLocalBackup = () => {
    const data = localStorage.getItem('pbp_local_storage_v1') || '{}';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CalmSpend_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Private backup downloaded safely to device');
  };

  return (
    <div className="calm-trends-page">
      {/* 1. Month Selector & Emotional Framing Header */}
      <div className="calm-trends-header-row">
        <div className="calm-trends-month-selector">
          <button
            type="button"
            className="calm-trends-arrow-btn"
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="calm-trends-month-badge">
            <span className="material-symbols-outlined">calendar_month</span>
            <span>{currentPeriod.formattedPeriod}</span>
          </div>
          <button
            type="button"
            className="calm-trends-arrow-btn"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <button
          type="button"
          className="calm-plain-btn"
          onClick={() => setIsGlossaryOpen(true)}
        >
          <span className="material-symbols-outlined">help</span>
          <span>Plain English</span>
        </button>
      </div>

      {/* 2. Health Summary Banner */}
      <div className="calm-assessment-banner">
        <div className="calm-assessment-banner__glow"></div>
        <div className="calm-assessment-banner__content">
          <div className="calm-assessment-banner__icon">
            <span className="material-symbols-outlined">{isSurplus ? 'spa' : 'shield'}</span>
          </div>
          <div className="calm-assessment-banner__text">
            <div className="calm-assessment-tag-row">
              <span className="calm-assessment-tag">Monthly Assessment</span>
              <span className="calm-assessment-status">
                {isSurplus ? 'Strong 🌟' : 'Breathing Room 🌱'}
              </span>
            </div>
            <h2 className="calm-assessment-title">
              {isSurplus ? (
                <>You kept <strong>{formatCurrency(netKeptMajor)}</strong> more than you spent.</>
              ) : (
                <>Spending was <strong>{formatCurrency(netKeptMajor)}</strong> higher than income.</>
              )}
            </h2>
            <p className="calm-assessment-desc">
              {isSurplus
                ? `Your daily financial rhythm remained calm with a ${savingsRate}% savings rate in ${currentPeriod.formattedPeriod}.`
                : `Stay mindful of upcoming recurring bills as you pace yourself through ${currentPeriod.formattedPeriod}.`}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Cashflow Comparison Card */}
      <div className="calm-trends-card">
        <div className="calm-trends-card__header">
          <div className="calm-trends-card__titles">
            <span className="calm-trends-card__tag">Money In vs. Money Out</span>
            <h3 className="calm-trends-card__title">Cashflow Clarity</h3>
          </div>
          <span className="material-symbols-outlined text-secondary">swap_vert</span>
        </div>

        <div className="calm-cashflow-grid">
          {/* Income */}
          <div className="calm-cashflow-col">
            <div className="calm-cashflow-col__label text-primary">
              <span className="material-symbols-outlined">arrow_downward_alt</span>
              <span>Total Income</span>
            </div>
            <span className="calm-cashflow-col__val text-primary">
              +{formatCurrency(incomeMajor)}
            </span>
            <div className="calm-cashflow-bar-track">
              <div
                className="calm-cashflow-bar calm-cashflow-bar--income"
                style={{ width: `${incomeBarWidth}%` }}
              ></div>
            </div>
            <span className="calm-cashflow-col__sub">Paychecks &amp; deposits</span>
          </div>

          {/* Spending */}
          <div className="calm-cashflow-col">
            <div className="calm-cashflow-col__label text-secondary">
              <span className="material-symbols-outlined">arrow_upward_alt</span>
              <span>Total Spent</span>
            </div>
            <span className="calm-cashflow-col__val text-on-surface">
              -{formatCurrency(expensesMajor)}
            </span>
            <div className="calm-cashflow-bar-track">
              <div
                className="calm-cashflow-bar calm-cashflow-bar--expense"
                style={{ width: `${expenseBarWidth}%` }}
              ></div>
            </div>
            <span className="calm-cashflow-col__sub">Living, bills &amp; items</span>
          </div>
        </div>

        {/* Reassuring Net Kept Banner */}
        <div className="calm-net-kept-banner">
          <div className="calm-net-kept-banner__left">
            <div className="calm-net-kept-banner__icon">
              <span className="material-symbols-outlined">savings</span>
            </div>
            <div className="calm-net-kept-banner__text">
              <strong>Net Kept in {currentPeriod.formattedPeriod}</strong>
              <span>{savingsRate}% of total cashflow retained</span>
            </div>
          </div>
          <span className="calm-net-kept-banner__amount">
            {isSurplus ? `+${formatCurrency(netKeptMajor)}` : `-${formatCurrency(netKeptMajor)}`}
          </span>
        </div>
      </div>

      {/* 4. Where Did My Money Go? Distribution */}
      <div className="calm-trends-card">
        <div className="calm-trends-card__header">
          <div className="calm-trends-card__titles">
            <span className="calm-trends-card__tag">Mindful Distribution</span>
            <h3 className="calm-trends-card__title">Where Did My Money Go?</h3>
          </div>
          <span className="calm-badge-sm">{categoryBreakdown.length} Categories</span>
        </div>

        {hasExpenseData ? (
          <>
            {/* Segmented Ribbon */}
            <div className="calm-ribbon-wrap">
              <div className="calm-ribbon-track">
                {categoryBreakdown.map((cat, idx) => {
                  const share = cat.sharePercentage || (expensesMinor > 0 ? (cat.actualAmountMinor / expensesMinor) * 100 : 0);
                  const colorClass = COLOR_CLASSES[idx % COLOR_CLASSES.length];
                  return (
                    <div
                      key={cat.categoryId}
                      className={`calm-ribbon-segment ${colorClass}`}
                      style={{ width: `${Math.max(4, share)}%` }}
                      title={`${cat.categoryName}: ${share.toFixed(0)}%`}
                    ></div>
                  );
                })}
              </div>
              <div className="calm-ribbon-legend">
                <span>● Total Spent: {formatCurrency(expensesMajor)}</span>
                <strong className="text-primary">● Retained: {formatCurrency(isSurplus ? netKeptMajor : 0)}</strong>
              </div>
            </div>

            {/* High-Contrast Category Breakdown List with Drilldown Click */}
            <div className="calm-cat-list">
              {categoryBreakdown.map((cat, i) => {
                const amountMajor = toMajorUnits(cat.actualAmountMinor);
                const percentStr = `${(cat.sharePercentage || 0).toFixed(0)}%`;

                return (
                  <div
                    key={cat.categoryId}
                    className="calm-cat-row"
                    onClick={() => setSelectedCategory(cat)}
                    style={{ cursor: 'pointer' }}
                    title="Tap to see transactions in this category"
                  >
                    <div className="calm-cat-row__left">
                      <div className="calm-cat-row__icon">
                        <span className="material-symbols-outlined">
                          {i % 4 === 0 ? 'local_grocery_store' : i % 4 === 1 ? 'roofing' : i % 4 === 2 ? 'directions_bus' : 'coffee'}
                        </span>
                      </div>
                      <div className="calm-cat-row__details">
                        <span className="calm-cat-row__name">{cat.categoryName}</span>
                        <span className="calm-cat-row__desc">
                          {cat.transactionCount} {cat.transactionCount === 1 ? 'transaction' : 'transactions'} • Tap to view
                        </span>
                      </div>
                    </div>
                    <div className="calm-cat-row__right">
                      <span className="calm-cat-row__amount">{formatCurrency(amountMajor)}</span>
                      <span className="calm-cat-row__percent">{percentStr} of spending</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-text-secondary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-primary)', marginBottom: 8 }}>
              receipt_long
            </span>
            <p style={{ fontSize: 14, fontWeight: 600 }}>No spending recorded for {currentPeriod.formattedPeriod}</p>
            <span style={{ fontSize: 12 }}>Log transactions from the center '+' button to see your live breakdown.</span>
          </div>
        )}
      </div>

      {/* 5. 3-Month Spending Trend */}
      <div className="calm-trends-card">
        <div className="calm-trends-card__header">
          <div className="calm-trends-card__titles">
            <span className="calm-trends-card__tag">Quarterly Comparison</span>
            <h3 className="calm-trends-card__title">3-Month Spending Trend</h3>
          </div>
          {deltaPercent !== null && (
            <div className="calm-trend-badge">
              <span className="material-symbols-outlined">
                {deltaPercent <= 0 ? 'trending_down' : 'trending_up'}
              </span>
              <span>{deltaPercent <= 0 ? `${Math.abs(deltaPercent)}% Eased` : `+${deltaPercent}%`}</span>
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="calm-chart-container">
          <div className="calm-chart-col">
            <span className="calm-chart-col__val">{formatCurrency(exp2Major)}</span>
            <div className="calm-chart-bar" style={{ height: `${bar2Height}%` }}></div>
            <span className="calm-chart-col__month">{p2.monthName.slice(0, 3)}</span>
          </div>
          <div className="calm-chart-col">
            <span className="calm-chart-col__val">{formatCurrency(exp1Major)}</span>
            <div className="calm-chart-bar" style={{ height: `${bar1Height}%` }}></div>
            <span className="calm-chart-col__month">{p1.monthName.slice(0, 3)}</span>
          </div>
          <div className="calm-chart-col calm-chart-col--active">
            {deltaPercent !== null && (
              <div className="calm-chart-delta-badge">
                {deltaPercent <= 0 ? `${deltaPercent}%` : `+${deltaPercent}%`}
              </div>
            )}
            <span className="calm-chart-col__val text-primary font-bold">{formatCurrency(exp0Major)}</span>
            <div className="calm-chart-bar calm-chart-bar--active" style={{ height: `${bar0Height}%` }}></div>
            <span className="calm-chart-col__month text-primary font-bold">{p0.monthName.slice(0, 3)}</span>
          </div>
        </div>

        <div className="calm-friendly-note">
          <div className="calm-friendly-note__icon">
            <span className="material-symbols-outlined">thumb_up</span>
          </div>
          <p>
            {deltaPercent !== null && deltaPercent < 0 ? (
              <>
                Spending eased by <strong className="text-primary">{Math.abs(deltaPercent)}%</strong> compared to {p1.monthName}. You kept extra financial breathing space!
              </>
            ) : deltaPercent !== null && deltaPercent > 0 ? (
              <>
                Spending increased by <strong className="text-secondary">{deltaPercent}%</strong> compared to {p1.monthName}. Check your budget envelopes to stay balanced.
              </>
            ) : (
              <>
                Your spending pace in <strong className="text-primary">{p0.monthName}</strong> is {formatCurrency(exp0Major)}.
              </>
            )}
          </p>
        </div>
      </div>

      {/* 6. 100% Offline & Private Local Backup */}
      <div className="calm-backup-card">
        <div className="calm-backup-card__header">
          <div className="calm-backup-card__icon">
            <span className="material-symbols-outlined">lock</span>
          </div>
          <div className="calm-backup-card__text">
            <div className="calm-backup-card__title-row">
              <h4>100% Offline &amp; Private</h4>
              <span className="calm-backup-dot"></span>
            </div>
            <p>
              Your financial logs reside solely on this device. No external servers, no automated trackers, and no ad profiling.
            </p>
          </div>
        </div>

        <div className="calm-backup-actions">
          <button
            type="button"
            className="calm-backup-btn"
            onClick={handleExportCsv}
          >
            <span className="material-symbols-outlined text-primary">file_download</span>
            <span>Export {currentPeriod.formattedPeriod} CSV</span>
          </button>
          <button
            type="button"
            className="calm-backup-btn calm-backup-btn--secondary"
            onClick={handleLocalBackup}
          >
            <span className="material-symbols-outlined">cloud_off</span>
            <span>Local Device Backup (.json)</span>
          </button>
        </div>
      </div>

      {/* 7. Category Detail Drilldown Bottom Sheet */}
      {selectedCategory && (
        <div className="calm-sheet-overlay" onClick={() => setSelectedCategory(null)}>
          <div className="calm-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="calm-sheet__handle"></div>
            <div className="calm-sheet__header">
              <span className="calm-sheet__title">{selectedCategory.categoryName} Details</span>
            </div>
            <div className="calm-sheet__metrics">
              <div className="calm-sheet__metric-row">
                <span>Month Total</span>
                <strong className="text-primary">{formatCurrency(toMajorUnits(selectedCategory.actualAmountMinor))}</strong>
              </div>
              <div className="calm-sheet__metric-row">
                <span>Share of Spending</span>
                <strong>{(selectedCategory.sharePercentage || 0).toFixed(1)}%</strong>
              </div>
            </div>

            <div style={{ maxHeight: 220, overflowY: 'auto', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {drilldownTxns.length > 0 ? (
                drilldownTxns.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-surface-container-low)',
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.description || selectedCategory.categoryName}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{t.date}</div>
                    </div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(toMajorUnits(t.amount))}
                    </strong>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '12px' }}>
                  No individual transactions found.
                </div>
              )}
            </div>

            <button
              type="button"
              className="calm-sheet__close-btn"
              onClick={() => setSelectedCategory(null)}
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

      {/* 8. Plain English Glossary Modal */}
      {isGlossaryOpen && (
        <div className="calm-sheet-overlay" onClick={() => setIsGlossaryOpen(false)}>
          <div className="calm-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="calm-sheet__handle"></div>
            <div className="calm-sheet__header">
              <span className="material-symbols-outlined text-primary">lightbulb</span>
              <span className="calm-sheet__title">Plain English Glossary</span>
            </div>
            <div className="calm-glossary-list">
              <div className="calm-glossary-item">
                <strong className="text-primary">Savings Rate ({savingsRate}%)</strong>
                <p>
                  Out of every ₹100 earned, you held onto ₹{savingsRate} for peace of mind, unexpected expenses, or future dreams.
                </p>
              </div>
              <div className="calm-glossary-item">
                <strong className="text-secondary">Cashflow</strong>
                <p>
                  A simple check to ensure what comes in is bigger than what goes out, preventing debt effortlessly.
                </p>
              </div>
              <div className="calm-glossary-item">
                <strong className="text-on-surface">Offline Guarantee</strong>
                <p>
                  You hold your own keys. CalmSpend works completely disconnected from the internet, protecting your privacy.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="calm-sheet__close-btn"
              onClick={() => setIsGlossaryOpen(false)}
            >
              <span>Understood, return to insights</span>
              <span className="material-symbols-outlined">check</span>
            </button>
          </div>
        </div>
      )}

      {/* 9. Toast Notification */}
      {toastMessage && (
        <div className="calm-trends-toast">
          <span className="material-symbols-outlined">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ReportPage;

