import React, { useState, useEffect } from 'react';
import { X, Landmark, Home, UserX, FileText } from 'lucide-react';
import type { ManualLiability, ManualLiabilityType } from '../../types/netWorth';
import { toMinorUnits, isValidCurrencyInput } from '../../utils/money';
import { registerBackHandler } from '../../services/mobile/backButtonService';
import './ManualAssetModal.css';

export interface ManualLiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<ManualLiability, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialLiability?: ManualLiability | null;
  existingAccountNames: string[];
}

const LIABILITY_TYPE_OPTIONS: { type: ManualLiabilityType; label: string; icon: React.ReactNode }[] = [
  { type: 'loan', label: 'Loan / EMI (Personal, Auto, Student)', icon: <Landmark size={16} /> },
  { type: 'mortgage', label: 'Home Mortgage / Property Loan', icon: <Home size={16} /> },
  { type: 'personal_debt', label: 'Personal Debt (Family, Friends)', icon: <UserX size={16} /> },
  { type: 'other_debt', label: 'Other Debt / Obligation', icon: <FileText size={16} /> },
];

interface FormProps {
  initialLiability?: ManualLiability | null;
  existingAccountNames: string[];
  onClose: () => void;
  onSave: (data: Omit<ManualLiability, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const ManualLiabilityForm: React.FC<FormProps> = ({
  initialLiability,
  existingAccountNames,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialLiability?.name || '');
  const [type, setType] = useState<ManualLiabilityType>(initialLiability?.type || 'loan');
  const [amountRupees, setAmountRupees] = useState(
    initialLiability ? (initialLiability.outstandingMinor / 100).toString() : '',
  );
  const [valuationDate, setValuationDate] = useState(
    initialLiability?.valuationDate || new Date().toISOString().split('T')[0],
  );
  const [lenderOrInstitution, setLenderOrInstitution] = useState(
    initialLiability?.lenderOrInstitution || '',
  );
  const [notes, setNotes] = useState(initialLiability?.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDuplicateAccountName = existingAccountNames.some(
    (accName) => accName.trim().toLowerCase() === name.trim().toLowerCase(),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a liability name.');
      return;
    }

    if (!isValidCurrencyInput(amountRupees)) {
      setError('Please enter a valid outstanding liability amount (0 or greater).');
      return;
    }

    if (!valuationDate) {
      setError('Please specify a date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const outstandingMinor = toMinorUnits(amountRupees);
      await onSave({
        name: trimmedName,
        type,
        outstandingMinor,
        currency: 'INR',
        valuationDate,
        lenderOrInstitution: lenderOrInstitution.trim() || undefined,
        notes: notes.trim() || undefined,
        isArchived: initialLiability ? initialLiability.isArchived : false,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save liability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="manual-asset-form">
      {error && <div className="form-error-banner">{error}</div>}

      {isDuplicateAccountName && (
        <div className="form-warning-banner">
          <strong>Notice:</strong> An account with this name already exists. If this is a credit card, track it through Accounts rather than a manual liability.
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="liab-name">Liability Name *</label>
        <input
          id="liab-name"
          type="text"
          className="form-input"
          placeholder="e.g. HDFC Home Loan, Car EMI, Friend Loan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="liab-type">Liability Type *</label>
        <select
          id="liab-type"
          className="form-select"
          value={type}
          onChange={(e) => setType(e.target.value as ManualLiabilityType)}
        >
          {LIABILITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.type} value={opt.type}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group form-group--half">
          <label className="form-label" htmlFor="liab-amount">Outstanding Debt (₹) *</label>
          <input
            id="liab-amount"
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
          <label className="form-label" htmlFor="liab-date">Valuation / As of Date *</label>
          <input
            id="liab-date"
            type="date"
            className="form-input"
            value={valuationDate}
            onChange={(e) => setValuationDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="liab-lender">Lender / Institution (Optional)</label>
        <input
          id="liab-lender"
          type="text"
          className="form-input"
          placeholder="e.g. HDFC Bank, SBI, John"
          value={lenderOrInstitution}
          onChange={(e) => setLenderOrInstitution(e.target.value)}
          maxLength={60}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="liab-notes">Notes (Optional)</label>
        <textarea
          id="liab-notes"
          className="form-textarea"
          placeholder="Add details, loan account number, or tenure"
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
          {isSubmitting ? 'Saving...' : initialLiability ? 'Update Liability' : 'Save Liability'}
        </button>
      </div>
    </form>
  );
};

export const ManualLiabilityModal: React.FC<ManualLiabilityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLiability,
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
          <h3 className="modal-title">{initialLiability ? 'Edit Liability' : 'Add Liability / Loan'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <ManualLiabilityForm
          key={initialLiability?.id || 'new_liability'}
          initialLiability={initialLiability}
          existingAccountNames={existingAccountNames}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
};
