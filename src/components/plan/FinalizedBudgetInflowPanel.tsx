import React from 'react';

export interface FinalizedBudgetInflowPanelProps {
  totalIncomeMajor: number;
  fundedEnvelopesCount: number;
}

export const FinalizedBudgetInflowPanel: React.FC<FinalizedBudgetInflowPanelProps> = ({
  totalIncomeMajor,
  fundedEnvelopesCount,
}) => {

  return (
    <div className="calm-inflow-panel">
      <div className="calm-panel-row">
        <span className="calm-inflow-label">Total Monthly Inflow</span>
        <span className="calm-inflow-status">{fundedEnvelopesCount} Envelopes Funded</span>
      </div>
      <div className="calm-panel-row calm-panel-row--baseline">
        <div className="calm-amount-group">
          <span className="calm-currency-symbol">₹</span>
          <span className="calm-inflow-amount">
            {totalIncomeMajor.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
