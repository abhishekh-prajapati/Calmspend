import type { Account, Transaction } from '../types/transaction';
import type {
  ManualAsset,
  ManualLiability,
  NetWorthSummary,
  AssetItemSummary,
  LiabilityItemSummary,
  FinancialSnapshot,
  SnapshotAssetItem,
  SnapshotLiabilityItem,
  SnapshotComparison,
} from '../types/netWorth';
import type { Goal, GoalContribution } from '../types/goal';
import { getAccountBalanceMinor } from './financialCalculations';

/**
 * Deterministically computes the full Net Worth summary from authoritative domain layers.
 * All computations use integer minor units (paise).
 */
export function calculateNetWorthSummary(
  accounts: Account[],
  transactions: Transaction[],
  manualAssets: ManualAsset[],
  manualLiabilities: ManualLiability[],
  goals: Goal[] = [],
  goalContributions: GoalContribution[] = [],
): NetWorthSummary {
  const activeAccounts = accounts.filter((a) => a.isActive);
  const activeManualAssets = manualAssets.filter((a) => !a.isArchived);
  const activeManualLiabilities = manualLiabilities.filter((l) => !l.isArchived);

  let accountAssetsMinor = 0;
  let creditCardCreditMinor = 0;
  let creditCardLiabilitiesMinor = 0;
  let manualAssetsMinor = 0;
  let manualLiabilitiesMinor = 0;
  let goalAssetsMinor = 0;

  const rawAssetItems: AssetItemSummary[] = [];
  const rawLiabilityItems: LiabilityItemSummary[] = [];

  // 1. Process Bank, Cash, and Savings Accounts (Assets)
  for (const acc of activeAccounts) {
    const bal = getAccountBalanceMinor(acc, transactions);

    if (acc.type === 'credit_card') {
      if (bal < 0) {
        // Credit card debt is positive liability
        const debt = -bal;
        creditCardLiabilitiesMinor += debt;
        rawLiabilityItems.push({
          id: acc.id,
          name: acc.name,
          source: 'credit_card',
          outstandingMinor: debt,
          percentageOfTotalLiabilities: 0,
        });
      } else if (bal > 0) {
        // Credit card overpayment / refund credit counts as an asset
        creditCardCreditMinor += bal;
        rawAssetItems.push({
          id: acc.id,
          name: `${acc.name} (Credit Surplus)`,
          source: 'account',
          accountType: 'credit_card',
          valueMinor: bal,
          percentageOfTotalAssets: 0,
        });
      } else {
        // Zero balance credit card
        rawLiabilityItems.push({
          id: acc.id,
          name: acc.name,
          source: 'credit_card',
          outstandingMinor: 0,
          percentageOfTotalLiabilities: 0,
        });
      }
    } else {
      // Standard Asset Accounts (bank, cash, savings)
      accountAssetsMinor += bal;
      rawAssetItems.push({
        id: acc.id,
        name: acc.name,
        source: 'account',
        accountType: acc.type,
        valueMinor: bal,
        percentageOfTotalAssets: 0,
      });
    }
  }

  // 2. Process Manual Assets
  for (const asset of activeManualAssets) {
    manualAssetsMinor += asset.valueMinor;
    rawAssetItems.push({
      id: asset.id,
      name: asset.name,
      source: 'manual',
      assetType: asset.type,
      valueMinor: asset.valueMinor,
      valuationDate: asset.valuationDate,
      isArchived: asset.isArchived,
      percentageOfTotalAssets: 0,
    });
  }

  // 2.5 Process Goal Savings / Reserve Assets
  const activeGoals = goals.filter((g) => g.status !== 'archived');
  for (const goal of activeGoals) {
    const goalSavedMinor = goalContributions
      .filter((c) => c.goalId === goal.id)
      .reduce((sum, c) => sum + c.amountMinor, 0);

    if (goalSavedMinor > 0) {
      goalAssetsMinor += goalSavedMinor;
      rawAssetItems.push({
        id: `goal_${goal.id}`,
        name: `${goal.name} (Goal Savings)`,
        source: 'manual',
        assetType: 'investment',
        valueMinor: goalSavedMinor,
        percentageOfTotalAssets: 0,
      });
    }
  }

  // 3. Process Manual Liabilities
  for (const liab of activeManualLiabilities) {
    manualLiabilitiesMinor += liab.outstandingMinor;
    rawLiabilityItems.push({
      id: liab.id,
      name: liab.name,
      source: 'manual',
      liabilityType: liab.type,
      outstandingMinor: liab.outstandingMinor,
      valuationDate: liab.valuationDate,
      isArchived: liab.isArchived,
      percentageOfTotalLiabilities: 0,
    });
  }

  // 4. Totals and Net Worth
  const totalAssetsMinor = accountAssetsMinor + manualAssetsMinor + creditCardCreditMinor + goalAssetsMinor;
  const totalLiabilitiesMinor = creditCardLiabilitiesMinor + manualLiabilitiesMinor;
  const netWorthMinor = totalAssetsMinor - totalLiabilitiesMinor;

  // 5. Percentages and Deterministic Sorting
  const assetItems: AssetItemSummary[] = rawAssetItems.map((item) => ({
    ...item,
    percentageOfTotalAssets:
      totalAssetsMinor > 0 && item.valueMinor > 0
        ? Math.round(((item.valueMinor / totalAssetsMinor) * 100) * 10) / 10
        : 0,
  }));

  assetItems.sort((a, b) => {
    if (b.valueMinor !== a.valueMinor) return b.valueMinor - a.valueMinor;
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    return a.id.localeCompare(b.id);
  });

  const liabilityItems: LiabilityItemSummary[] = rawLiabilityItems.map((item) => ({
    ...item,
    percentageOfTotalLiabilities:
      totalLiabilitiesMinor > 0 && item.outstandingMinor > 0
        ? Math.round(((item.outstandingMinor / totalLiabilitiesMinor) * 100) * 10) / 10
        : 0,
  }));

  liabilityItems.sort((a, b) => {
    if (b.outstandingMinor !== a.outstandingMinor) return b.outstandingMinor - a.outstandingMinor;
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    return a.id.localeCompare(b.id);
  });

  const assetToDebtRatio =
    totalLiabilitiesMinor > 0
      ? Math.round((totalAssetsMinor / totalLiabilitiesMinor) * 100) / 100
      : null;

  return {
    totalAssetsMinor,
    totalLiabilitiesMinor,
    netWorthMinor,
    accountAssetsMinor,
    manualAssetsMinor,
    creditCardLiabilitiesMinor,
    manualLiabilitiesMinor,
    creditCardCreditMinor,
    assetItems,
    liabilityItems,
    assetToDebtRatio,
  };
}

/**
 * Builds an immutable Financial Snapshot object from current live state.
 */
export function createSnapshotFromCurrentState(
  accounts: Account[],
  transactions: Transaction[],
  manualAssets: ManualAsset[],
  manualLiabilities: ManualLiability[],
  snapshotDate: string,
  notes?: string,
): Omit<FinancialSnapshot, 'id' | 'createdAt'> {
  const summary = calculateNetWorthSummary(accounts, transactions, manualAssets, manualLiabilities);

  const assetItems: SnapshotAssetItem[] = summary.assetItems.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.assetType || item.accountType || 'account',
    source: item.source,
    valueMinor: item.valueMinor,
  }));

  const liabilityItems: SnapshotLiabilityItem[] = summary.liabilityItems.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.liabilityType || 'credit_card',
    source: item.source,
    outstandingMinor: item.outstandingMinor,
  }));

  return {
    snapshotDate,
    timestamp: new Date().toISOString(),
    totalAssetsMinor: summary.totalAssetsMinor,
    totalLiabilitiesMinor: summary.totalLiabilitiesMinor,
    netWorthMinor: summary.netWorthMinor,
    notes: notes?.trim() || undefined,
    assetItems,
    liabilityItems,
  };
}

/**
 * Compares two snapshots and produces deltas and percentage change.
 */
export function compareSnapshots(
  currentSnapshot: FinancialSnapshot,
  previousSnapshot: FinancialSnapshot | null,
): SnapshotComparison {
  const prevNetWorth = previousSnapshot ? previousSnapshot.netWorthMinor : 0;
  const prevAssets = previousSnapshot ? previousSnapshot.totalAssetsMinor : 0;
  const prevLiabilities = previousSnapshot ? previousSnapshot.totalLiabilitiesMinor : 0;

  const netWorthDeltaMinor = currentSnapshot.netWorthMinor - prevNetWorth;
  const assetsDeltaMinor = currentSnapshot.totalAssetsMinor - prevAssets;
  const liabilitiesDeltaMinor = currentSnapshot.totalLiabilitiesMinor - prevLiabilities;

  let percentageChange: number | null = null;
  if (previousSnapshot && previousSnapshot.netWorthMinor !== 0) {
    percentageChange =
      Math.round(((netWorthDeltaMinor / Math.abs(previousSnapshot.netWorthMinor)) * 100) * 10) / 10;
  }

  return {
    currentSnapshot,
    previousSnapshot,
    netWorthDeltaMinor,
    assetsDeltaMinor,
    liabilitiesDeltaMinor,
    percentageChange,
  };
}
