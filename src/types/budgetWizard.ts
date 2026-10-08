export interface WizardBudgetItem {
  id: string;
  name: string;
  amount: string; // user input string
  categoryId?: string;
  isRecurring: boolean; // Add every month
  priority: 'need' | 'want';
}

export interface BudgetWizardState {
  needs: WizardBudgetItem[];
  wants: WizardBudgetItem[];
  emergencyBuffer: string;
  plannedSavings: string;
  isBudgetLocked: boolean;
  dailyLimit: string;
}
