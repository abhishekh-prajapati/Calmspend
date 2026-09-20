import { useContext } from 'react';
import { FinancialContext, type FinancialContextType } from './financialContextDef';

export function useFinancial(): FinancialContextType {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
}
