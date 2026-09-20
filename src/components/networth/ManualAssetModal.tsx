import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Building, Car, Gem, PiggyBank, Coins } from 'lucide-react';
import type { ManualAsset, ManualAssetType } from '../../types/netWorth';
import { toMinorUnits, isValidCurrencyInput } from '../../utils/money';
import { registerBackHandler } from '../../services/mobile/backButtonService';
import './ManualAssetModal.css';

export interface ManualAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<ManualAsset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialAsset?: ManualAsset | null;
  existingAccountNames: string[];
}

const ASSET_TYPE_OPTIONS: { type: ManualAssetType; label: string; icon: React.ReactNode }[] = [
  { type: 'investment', label: 'Investment (Mutual Funds, Stocks)', icon: <TrendingUp size={16} /> },
  { type: 'fixed_deposit', label: 'Fixed Deposit / PF / PPF', icon: <PiggyBank size={16} /> },
  { type: 'property', label: 'Real Estate / Land', icon: <Building size={16} /> },
  { type: 'vehicle', label: 'Vehicle (Car, Bike)', icon: <Car size={16} /> },
  { type: 'gold', label: 'Gold & Precious Metals', icon: <Gem size={16} /> },
  { type: 'other_asset', label: 'Other Valued Asset', icon: <Coins size={16} /> },
];

interface FormProps {
  initialAsset?: ManualAsset | null;
  existingAccountNames: string[];
  onClose: () => void;
  onSave: (data: Omit<ManualAsset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const ManualAssetForm: React.FC<FormProps> = ({
  initialAsset,
  existingAccountNames,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialAsset?.name || '');
  const [type, setType] = useState<ManualAssetType>(initialAsset?.type || 'investment');
  const [amountRupees, setAmountRupees] = useState(
    initialAsset ? (initialAsset.valueMinor / 100).toString() : '',
  );
  const [valuationDate, setValuationDate] = useState(
    initialAsset?.valuationDate || new Date().toISOString().split('T')[0],
  );
  const [institutionOrLocation, setInstitutionOrLocation] = useState(
    initialAsset?.institutionOrLocation || '',
  );
  const [notes, setNotes] = useState(initialAsset?.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDuplicateAccountName = existingAccountNames.some(
    (accName) => accName.trim().toLowerCase() === name.trim().toLowerCase(),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter an asset name.');
      return;
    }

    if (!isValidCurrencyInput(amountRupees)) {
      setError('Please enter a valid asset valuation amount (0 or greater).');
      return;
    }

    if (!valuationDate) {
      setError('Please specify a valuation date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const valueMinor = toMinorUnits(amountRupees);
      await onSave({
        name: trimmedName,
        type,
        valueMinor,
        currency: 'INR',
        valuationDate,
        institutionOrLocation: institutionOrLocation.trim() || undefined,
        notes: notes.trim() || undefined,
        isArchived: initialAsset ? initialAsset.isArchived : false,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="manual-asset-form">
      {error && <div className="form-error-banner">{error}</div>}

      {isDuplicateAccountName && (
        <div className="form-warning-banner">
          <strong>Notice:</strong> An account with this name already exists. Make sure you are not double-counting an account-backed asset.
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="asset-name">Asset Name *</label>
        <input
          id="asset-name"
          type="text"
          className="form-input"
          placeholder="e.g. Zerodha Portfolio, Ancestral Land, Car"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="asset-type">Asset Type *</label>
        <select
          id="asset-type"
          className="form-select"
          value={type}
          onChange={(e) => setType(e.target.value as ManualAssetType)}
        >
          {ASSET_TYPE_OPTIONS.map((opt) => (
            <option key={opt.type} value={opt.type}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group form-group--half">
          <label className="form-label" htmlFor="asset-value">Current Value (₹) *</label>
          <input
            id="asset-value"
            type="number"
            step="any"
            min="0"
            className="form-input"
            placeholder="0.00"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            required
          />
        </div>

        <div className="form-group form-group--half">
          <label className="form-label" htmlFor="asset-date">Valuation Date *</label>
          <input
            id="asset-date"
            type="date"
            className="form-input"
            value={valuationDate}
            onChange={(e) => setValuationDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="asset-inst">Institution / Location (Optional)</label>
        <input
          id="asset-inst"
          type="text"
          className="form-input"
          placeholder="e.g. Groww, SBI, Mumbai Property"
          value={institutionOrLocation}
          onChange={(e) => setInstitutionOrLocation(e.target.value)}
          maxLength={60}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="asset-notes">Notes (Optional)</label>
        <textarea
          id="asset-notes"
          className="form-textarea"
          placeholder="Add details, purchase price, or folio numbers"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={250}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialAsset ? 'Update Asset' : 'Save Asset'}
        </button>
      </div>
    </form>
  );
};

export const ManualAssetModal: React.FC<ManualAssetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAsset,
  existingAccountNames,
}) => {
  useEffect(() => {
    if (isOpen) {
      const unregister = registerBackHandler(() => {
        onClose();
        return true;
      });
      return () => unregister();
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{initialAsset ? 'Edit Asset' : 'Add Manual Asset'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <ManualAssetForm
          key={initialAsset?.id || 'new_asset'}
          initialAsset={initialAsset}
          existingAccountNames={existingAccountNames}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
};
