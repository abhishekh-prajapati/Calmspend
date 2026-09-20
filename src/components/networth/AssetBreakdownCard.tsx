import React from 'react';
import {
  Landmark,
  Wallet,
  PiggyBank,
  TrendingUp,
  Building,
  Car,
  Coins,
  Gem,
  Package,
  Edit2,
  Trash2,
  Archive,
} from 'lucide-react';
import { formatCurrency } from '../../services/currency';
import { toMajorUnits } from '../../utils/money';
import type { AssetItemSummary, ManualAsset } from '../../types/netWorth';
import './AssetBreakdownCard.css';

export interface AssetBreakdownCardProps {
  assetItems: AssetItemSummary[];
  totalAssetsMinor: number;
  onEditManualAsset?: (asset: ManualAsset) => void;
  onArchiveManualAsset?: (id: string) => void;
  onDeleteManualAsset?: (id: string) => void;
  manualAssetsMap: Map<string, ManualAsset>;
}

export const AssetBreakdownCard: React.FC<AssetBreakdownCardProps> = ({
  assetItems,
  totalAssetsMinor,
  onEditManualAsset,
  onArchiveManualAsset,
  onDeleteManualAsset,
  manualAssetsMap,
}) => {
  const getIcon = (item: AssetItemSummary) => {
    if (item.source === 'account') {
      if (item.accountType === 'cash') return <Wallet size={16} />;
      if (item.accountType === 'savings') return <PiggyBank size={16} />;
      return <Landmark size={16} />;
    }
    switch (item.assetType) {
      case 'investment':
        return <TrendingUp size={16} />;
      case 'fixed_deposit':
        return <PiggyBank size={16} />;
      case 'property':
        return <Building size={16} />;
      case 'vehicle':
        return <Car size={16} />;
      case 'gold':
        return <Gem size={16} />;
      default:
        return <Coins size={16} />;
    }
  };

  const getSourceLabel = (item: AssetItemSummary) => {
    if (item.source === 'account') {
      return `Account • ${item.accountType?.toUpperCase() || 'BANK'}`;
    }
    const typeNames: Record<string, string> = {
      investment: 'Investment',
      fixed_deposit: 'Fixed Deposit',
      property: 'Property / Land',
      vehicle: 'Vehicle',
      gold: 'Gold & Metals',
      other_asset: 'Other Asset',
    };
    return `Manual • ${typeNames[item.assetType || ''] || 'Asset'}`;
  };

  if (assetItems.length === 0) {
    return (
      <div className="asset-breakdown-card">
        <div className="asset-breakdown-card__header">
          <h2 className="asset-breakdown-card__title">Assets Breakdown</h2>
          <span className="asset-breakdown-card__total">{formatCurrency(0)}</span>
        </div>
        <div className="asset-breakdown-card__empty">
          <Package size={28} className="asset-breakdown-card__empty-icon" />
          <p>No assets recorded yet.</p>
          <span>Add bank accounts or manual assets (investments, gold, property) to track your wealth.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="asset-breakdown-card">
      <div className="asset-breakdown-card__header">
        <div>
          <h2 className="asset-breakdown-card__title">Assets Breakdown</h2>
          <span className="asset-breakdown-card__subtitle">{assetItems.length} total asset items</span>
        </div>
        <span className="asset-breakdown-card__total">{formatCurrency(toMajorUnits(totalAssetsMinor))}</span>
      </div>

      <div className="asset-breakdown-card__list">
        {assetItems.map((item) => {
          const manualObj = item.source === 'manual' ? manualAssetsMap.get(item.id) : undefined;

          return (
            <div key={`${item.source}-${item.id}`} className="asset-breakdown-item">
              <div className="asset-breakdown-item__icon-wrapper">
                {getIcon(item)}
              </div>

              <div className="asset-breakdown-item__info">
                <div className="asset-breakdown-item__name-row">
                  <span className="asset-breakdown-item__name">{item.name}</span>
                  <span className="asset-breakdown-item__amount">
                    {formatCurrency(toMajorUnits(item.valueMinor))}
                  </span>
                </div>

                <div className="asset-breakdown-item__meta-row">
                  <span className="asset-breakdown-item__type">{getSourceLabel(item)}</span>
                  <span className="asset-breakdown-item__percentage">
                    {item.percentageOfTotalAssets}% of assets
                  </span>
                </div>

                {/* Progress bar of asset contribution */}
                <div className="asset-breakdown-item__progress-track">
                  <div
                    className="asset-breakdown-item__progress-fill"
                    style={{ width: `${Math.min(100, item.percentageOfTotalAssets)}%` }}
                  />
                </div>

                {/* Actions for manual assets */}
                {item.source === 'manual' && manualObj && (
                  <div className="asset-breakdown-item__actions">
                    {onEditManualAsset && (
                      <button
                        type="button"
                        className="asset-breakdown-item__btn"
                        onClick={() => onEditManualAsset(manualObj)}
                        title="Edit asset"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                    )}
                    {onArchiveManualAsset && (
                      <button
                        type="button"
                        className="asset-breakdown-item__btn"
                        onClick={() => onArchiveManualAsset(manualObj.id)}
                        title="Archive asset"
                      >
                        <Archive size={12} />
                        <span>Archive</span>
                      </button>
                    )}
                    {onDeleteManualAsset && (
                      <button
                        type="button"
                        className="asset-breakdown-item__btn asset-breakdown-item__btn--danger"
                        onClick={() => onDeleteManualAsset(manualObj.id)}
                        title="Delete asset"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
