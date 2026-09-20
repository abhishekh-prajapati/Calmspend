import type { AccountType } from './transaction';

export type ManualAssetType =
  | 'investment'      // Mutual funds, stocks, bonds, crypto
  | 'fixed_deposit'   // Fixed deposits, recurring deposits, PF, PPF
  | 'property'        // Real estate, land, apartment
  | 'vehicle'         // Car, two-wheeler
  | 'gold'            // Gold, silver, jewellery, precious metals
  | 'other_asset';    // Other valuable personal assets

export type ManualLiabilityType =
  | 'loan'            // Personal loan, auto loan, education loan
  | 'mortgage'        // Home loan / property mortgage
  | 'personal_debt'   // Debt owed to individuals / friends / family
  | 'other_debt';     // Other debts / liabilities

export interface ManualAsset {
  id: string;
  name: string;
  type: ManualAssetType;
  valueMinor: number;          // Integer minor units (paise), >= 0
  currency: string;            // Default 'INR'
  valuationDate: string;       // YYYY-MM-DD
  institutionOrLocation?: string;
  notes?: string;
  isArchived: boolean;
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}

export interface ManualLiability {
  id: string;
  name: string;
  type: ManualLiabilityType;
  outstandingMinor: number;    // Integer minor units (paise), >= 0
  currency: string;            // Default 'INR'
  valuationDate: string;       // YYYY-MM-DD
  lenderOrInstitution?: string;
  notes?: string;
  isArchived: boolean;
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}

export interface AssetItemSummary {
  id: string;
  name: string;
  source: 'account' | 'manual';
  accountType?: AccountType;
  assetType?: ManualAssetType;
  valueMinor: number;
  percentageOfTotalAssets: number; // 0-100
  valuationDate?: string;
  isArchived?: boolean;
}

export interface LiabilityItemSummary {
  id: string;
  name: string;
  source: 'credit_card' | 'manual';
  liabilityType?: ManualLiabilityType;
  outstandingMinor: number;
  percentageOfTotalLiabilities: number; // 0-100
  valuationDate?: string;
  isArchived?: boolean;
}

export interface NetWorthSummary {
  totalAssetsMinor: number;
  totalLiabilitiesMinor: number;
  netWorthMinor: number;
  accountAssetsMinor: number;
  manualAssetsMinor: number;
  creditCardLiabilitiesMinor: number;
  manualLiabilitiesMinor: number;
  creditCardCreditMinor: number; // Positive credit card surplus
  assetItems: AssetItemSummary[];
  liabilityItems: LiabilityItemSummary[];
  assetToDebtRatio: number | null; // Total Assets / Total Liabilities (null if liabilities == 0)
}

export interface SnapshotAssetItem {
  id: string;
  name: string;
  type: string;
  source: 'account' | 'manual';
  valueMinor: number;
}

export interface SnapshotLiabilityItem {
  id: string;
  name: string;
  type: string;
  source: 'credit_card' | 'manual';
  outstandingMinor: number;
}

export interface FinancialSnapshot {
  id: string;
  snapshotDate: string;        // YYYY-MM-DD
  timestamp: string;           // ISO timestamp
  totalAssetsMinor: number;
  totalLiabilitiesMinor: number;
  netWorthMinor: number;
  notes?: string;
  assetItems: SnapshotAssetItem[];
  liabilityItems: SnapshotLiabilityItem[];
  createdAt: string;
}

export interface SnapshotComparison {
  currentSnapshot: FinancialSnapshot;
  previousSnapshot: FinancialSnapshot | null;
  netWorthDeltaMinor: number;
  assetsDeltaMinor: number;
  liabilitiesDeltaMinor: number;
  percentageChange: number | null; // null if previous net worth is 0
}
