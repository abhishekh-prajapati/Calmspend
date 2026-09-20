/**
 * STAGE 11 — BACKUP VALIDATION SERVICE
 *
 * Three-layer validation architecture:
 *   Layer 1: Envelope & structural integrity
 *   Layer 2: Field-specific monetary, date, and enum invariants
 *   Layer 3: Relational integrity (foreign key validation)
 *
 * Uses domain-correct signed/unsigned rules:
 * - Account.openingBalance: any integer (can be negative for overdrafts)
 * - Transaction.amount: > 0 integer
 * - FinancialSnapshot.netWorthMinor: any integer (can be negative)
 * - FinancialSnapshot.totalAssetsMinor: >= 0 integer
 * - FinancialSnapshot.totalLiabilitiesMinor: >= 0 integer
 * - MonthlyBudget.plannedSavingsMinor: any integer
 * - ManualAsset.valueMinor: >= 0 integer
 * - ManualLiability.outstandingMinor: >= 0 integer
 * - GoalContribution.amountMinor: > 0 integer
 * - Goal.targetAmountMinor: > 0 integer
 * - BudgetItem.plannedAmountMinor: >= 0 integer
 * - PlannedIncomeItem.plannedAmountMinor: >= 0 integer
 * - RecurringSchedule.amountMinor: > 0 integer
 */

import type { BackupEnvelope, ValidationResult, ValidationError } from '../../types/backup';
import {
  BACKUP_FORMAT_IDENTIFIER,
  CURRENT_BACKUP_FORMAT_VERSION,
} from '../../types/backup';

const ACCOUNT_TYPES = new Set(['cash', 'bank', 'savings', 'credit_card']);
const TRANSACTION_TYPES = new Set(['expense', 'income', 'transfer', 'saving', 'goal']);
const NEED_OR_WANT = new Set(['need', 'want']);
const GOAL_STATUSES = new Set(['active', 'completed', 'paused', 'archived']);
const GOAL_PRIORITIES = new Set(['high', 'medium', 'low']);
const GOAL_CATEGORIES = new Set([
  'emergency_fund', 'travel', 'education', 'electronics', 'vehicle',
  'business', 'investment', 'home', 'custom',
]);
const GOAL_COLOR_TOKENS = new Set(['primary', 'success', 'warning', 'danger', 'info', 'purple', 'pink', 'neutral']);
const RECURRENCE_FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'yearly']);
const SCHEDULE_TYPES = new Set(['expense', 'income']);
const SCHEDULE_CLASSIFICATIONS = new Set([
  'subscription', 'bill', 'rent', 'loan_emi', 'insurance', 'salary', 'investment', 'other',
]);
const OCCURRENCE_STATUSES = new Set(['upcoming', 'due', 'overdue', 'paid', 'skipped', 'cancelled']);
const OCCURRENCE_RECORD_STATUSES = new Set(['paid', 'skipped']);
const MANUAL_ASSET_TYPES = new Set([
  'investment', 'fixed_deposit', 'property', 'vehicle', 'gold', 'other_asset',
]);
const MANUAL_LIABILITY_TYPES = new Set(['loan', 'mortgage', 'personal_debt', 'other_debt']);

// ======================================================================
// PRIMITIVE VALIDATORS
// ======================================================================

function isFiniteInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v);
}

function isNonNegativeInteger(v: unknown): v is number {
  return isFiniteInteger(v) && (v as number) >= 0;
}

function isPositiveInteger(v: unknown): v is number {
  return isFiniteInteger(v) && (v as number) > 0;
}

function isValidDateString(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function isValidISOTimestamp(v: unknown): v is string {
  if (typeof v !== 'string' || v.length < 10) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

// ======================================================================
// LAYER 1: ENVELOPE & STRUCTURAL INTEGRITY
// ======================================================================

function validateEnvelope(raw: unknown, errors: ValidationError[]): raw is BackupEnvelope {
  if (!raw || typeof raw !== 'object') {
    errors.push({ field: 'root', message: 'Backup file is not a valid JSON object.' });
    return false;
  }
  const obj = raw as Record<string, unknown>;

  if (obj['format'] !== BACKUP_FORMAT_IDENTIFIER) {
    errors.push({
      field: 'format',
      message: `Unrecognized backup format: "${obj['format']}". Expected "${BACKUP_FORMAT_IDENTIFIER}".`,
    });
    return false;
  }
  if (typeof obj['formatVersion'] !== 'number') {
    errors.push({ field: 'formatVersion', message: 'Missing or invalid formatVersion.' });
    return false;
  }
  if ((obj['formatVersion'] as number) > CURRENT_BACKUP_FORMAT_VERSION) {
    errors.push({
      field: 'formatVersion',
      message: `Backup was created with a newer version (v${obj['formatVersion']}). Please update the application.`,
    });
    return false;
  }
  if (!isValidISOTimestamp(obj['exportedAt'])) {
    errors.push({ field: 'exportedAt', message: 'Invalid or missing exportedAt timestamp.' });
    return false;
  }
  if (!obj['data'] || typeof obj['data'] !== 'object') {
    errors.push({ field: 'data', message: 'Missing or invalid data section.' });
    return false;
  }

  const data = obj['data'] as Record<string, unknown>;
  const requiredCollections = [
    'accounts', 'categories', 'transactions', 'monthlyBudgets', 'budgetItems',
    'plannedIncomeItems', 'goals', 'goalContributions', 'recurringSchedules',
    'scheduledBills', 'occurrenceRecords', 'manualAssets', 'manualLiabilities', 'financialSnapshots',
  ];
  for (const col of requiredCollections) {
    if (!Array.isArray(data[col])) {
      errors.push({ field: `data.${col}`, message: `Missing or non-array collection: "${col}".` });
    }
  }

  return errors.length === 0;
}

// ======================================================================
// LAYER 2: FIELD-SPECIFIC VALIDATION
// ======================================================================

function validateNoDuplicateIds(items: { id: string }[], collectionName: string, errors: ValidationError[]): Set<string> {
  const seen = new Set<string>();
  for (const item of items) {
    if (!isNonEmptyString(item.id)) {
      errors.push({ field: `${collectionName}[].id`, message: `${collectionName}: entity missing valid id.` });
      continue;
    }
    if (seen.has(item.id)) {
      errors.push({ field: `${collectionName}[].id`, message: `${collectionName}: duplicate ID "${item.id}".` });
    }
    seen.add(item.id);
  }
  return seen;
}

function validateAccounts(data: BackupEnvelope['data'], errors: ValidationError[]): Set<string> {
  return validateNoDuplicateIds(data.accounts, 'accounts', errors);
}

function validateCategories(data: BackupEnvelope['data'], errors: ValidationError[]): Set<string> {
  return validateNoDuplicateIds(data.categories, 'categories', errors);
}

function validateTransactions(
  data: BackupEnvelope['data'],
  accountIds: Set<string>,
  categoryIds: Set<string>,
  errors: ValidationError[],
): Set<string> {
  const txnIds = validateNoDuplicateIds(data.transactions, 'transactions', errors);

  for (const txn of data.transactions) {
    if (!TRANSACTION_TYPES.has(txn.type)) {
      errors.push({ field: `transactions[${txn.id}].type`, message: `Invalid transaction type "${txn.type}".` });
    }
    if (!isPositiveInteger(txn.amount)) {
      errors.push({
        field: `transactions[${txn.id}].amount`,
        message: `Transaction amount must be a positive integer (paise). Got: ${txn.amount}.`,
      });
    }
    if (!isValidDateString(txn.date)) {
      errors.push({ field: `transactions[${txn.id}].date`, message: `Invalid date "${txn.date}".` });
    }

    if (txn.type === 'transfer') {
      if (!txn.fromAccountId || !accountIds.has(txn.fromAccountId)) {
        errors.push({
          field: `transactions[${txn.id}].fromAccountId`,
          message: `Transfer fromAccountId "${txn.fromAccountId}" not found in accounts.`,
        });
      }
      if (!txn.toAccountId || !accountIds.has(txn.toAccountId)) {
        errors.push({
          field: `transactions[${txn.id}].toAccountId`,
          message: `Transfer toAccountId "${txn.toAccountId}" not found in accounts.`,
        });
      }
      if (txn.fromAccountId && txn.toAccountId && txn.fromAccountId === txn.toAccountId) {
        errors.push({
          field: `transactions[${txn.id}]`,
          message: `Transfer fromAccountId and toAccountId must be distinct.`,
        });
      }
    } else {
      if (txn.accountId && !accountIds.has(txn.accountId)) {
        errors.push({
          field: `transactions[${txn.id}].accountId`,
          message: `accountId "${txn.accountId}" not found in accounts.`,
        });
      }
    }

    if (txn.categoryId && !categoryIds.has(txn.categoryId)) {
      errors.push({
        field: `transactions[${txn.id}].categoryId`,
        message: `categoryId "${txn.categoryId}" not found in categories.`,
      });
    }

    if (txn.needOrWant != null && !NEED_OR_WANT.has(txn.needOrWant)) {
      errors.push({
        field: `transactions[${txn.id}].needOrWant`,
        message: `Invalid needOrWant value "${txn.needOrWant}".`,
      });
    }
  }
  return txnIds;
}

function validateBudgets(
  data: BackupEnvelope['data'],
  categoryIds: Set<string>,
  errors: ValidationError[],
): Set<string> {
  const budgetIds = validateNoDuplicateIds(data.monthlyBudgets, 'monthlyBudgets', errors);
  validateNoDuplicateIds(data.budgetItems, 'budgetItems', errors);
  validateNoDuplicateIds(data.plannedIncomeItems, 'plannedIncomeItems', errors);

  for (const budget of data.monthlyBudgets) {
    if (!isNonEmptyString(budget.periodKey) || !/^\d{4}-\d{2}$/.test(budget.periodKey)) {
      errors.push({ field: `monthlyBudgets[${budget.id}].periodKey`, message: `Invalid periodKey "${budget.periodKey}".` });
    }
    // plannedSavingsMinor can be any integer (positive target or negative meaning over-allocated)
    if (!isFiniteInteger(budget.plannedSavingsMinor)) {
      errors.push({ field: `monthlyBudgets[${budget.id}].plannedSavingsMinor`, message: `plannedSavingsMinor must be an integer.` });
    }
  }

  for (const item of data.budgetItems) {
    if (!budgetIds.has(item.monthlyBudgetId)) {
      errors.push({
        field: `budgetItems[${item.id}].monthlyBudgetId`,
        message: `monthlyBudgetId "${item.monthlyBudgetId}" not found in monthlyBudgets.`,
      });
    }
    if (!categoryIds.has(item.categoryId)) {
      errors.push({
        field: `budgetItems[${item.id}].categoryId`,
        message: `categoryId "${item.categoryId}" not found in categories.`,
      });
    }
    if (!isNonNegativeInteger(item.plannedAmountMinor)) {
      errors.push({
        field: `budgetItems[${item.id}].plannedAmountMinor`,
        message: `plannedAmountMinor must be a non-negative integer.`,
      });
    }
  }

  for (const item of data.plannedIncomeItems) {
    if (!budgetIds.has(item.monthlyBudgetId)) {
      errors.push({
        field: `plannedIncomeItems[${item.id}].monthlyBudgetId`,
        message: `monthlyBudgetId "${item.monthlyBudgetId}" not found in monthlyBudgets.`,
      });
    }
    if (!isNonNegativeInteger(item.plannedAmountMinor)) {
      errors.push({
        field: `plannedIncomeItems[${item.id}].plannedAmountMinor`,
        message: `plannedAmountMinor must be a non-negative integer.`,
      });
    }
  }

  return budgetIds;
}

function validateGoals(data: BackupEnvelope['data'], errors: ValidationError[]): Set<string> {
  const goalIds = validateNoDuplicateIds(data.goals, 'goals', errors);
  validateNoDuplicateIds(data.goalContributions, 'goalContributions', errors);

  for (const goal of data.goals) {
    if (!isPositiveInteger(goal.targetAmountMinor)) {
      errors.push({
        field: `goals[${goal.id}].targetAmountMinor`,
        message: `targetAmountMinor must be a positive integer.`,
      });
    }
    if (!GOAL_STATUSES.has(goal.status)) {
      errors.push({ field: `goals[${goal.id}].status`, message: `Invalid goal status "${goal.status}".` });
    }
    if (!GOAL_PRIORITIES.has(goal.priority)) {
      errors.push({ field: `goals[${goal.id}].priority`, message: `Invalid goal priority "${goal.priority}".` });
    }
    if (goal.targetDate != null && !isValidDateString(goal.targetDate)) {
      errors.push({ field: `goals[${goal.id}].targetDate`, message: `Invalid targetDate "${goal.targetDate}".` });
    }
    if (goal.category != null && !GOAL_CATEGORIES.has(goal.category)) {
      errors.push({ field: `goals[${goal.id}].category`, message: `Invalid goal category "${goal.category}".` });
    }
    if (goal.colorToken != null && !GOAL_COLOR_TOKENS.has(goal.colorToken)) {
      errors.push({ field: `goals[${goal.id}].colorToken`, message: `Invalid colorToken "${goal.colorToken}".` });
    }
  }

  for (const gc of data.goalContributions) {
    if (!goalIds.has(gc.goalId)) {
      errors.push({
        field: `goalContributions[${gc.id}].goalId`,
        message: `goalId "${gc.goalId}" not found in goals.`,
      });
    }
    if (!isPositiveInteger(gc.amountMinor)) {
      errors.push({
        field: `goalContributions[${gc.id}].amountMinor`,
        message: `amountMinor must be a positive integer.`,
      });
    }
    if (!isValidDateString(gc.date)) {
      errors.push({ field: `goalContributions[${gc.id}].date`, message: `Invalid date "${gc.date}".` });
    }
  }

  return goalIds;
}

function validateRecurring(
  data: BackupEnvelope['data'],
  txnIds: Set<string>,
  errors: ValidationError[],
): Set<string> {
  const scheduleIds = validateNoDuplicateIds(data.recurringSchedules, 'recurringSchedules', errors);
  const billIds = validateNoDuplicateIds(data.scheduledBills, 'scheduledBills', errors);
  validateNoDuplicateIds(data.occurrenceRecords, 'occurrenceRecords', errors);

  for (const sched of data.recurringSchedules) {
    if (!SCHEDULE_TYPES.has(sched.type)) {
      errors.push({ field: `recurringSchedules[${sched.id}].type`, message: `Invalid type "${sched.type}".` });
    }
    if (!RECURRENCE_FREQUENCIES.has(sched.frequency)) {
      errors.push({ field: `recurringSchedules[${sched.id}].frequency`, message: `Invalid frequency "${sched.frequency}".` });
    }
    if (!SCHEDULE_CLASSIFICATIONS.has(sched.classification)) {
      errors.push({ field: `recurringSchedules[${sched.id}].classification`, message: `Invalid classification "${sched.classification}".` });
    }
    if (!isPositiveInteger(sched.amountMinor)) {
      errors.push({ field: `recurringSchedules[${sched.id}].amountMinor`, message: `amountMinor must be a positive integer.` });
    }
    if (!isValidDateString(sched.startDate)) {
      errors.push({ field: `recurringSchedules[${sched.id}].startDate`, message: `Invalid startDate "${sched.startDate}".` });
    }
  }

  for (const bill of data.scheduledBills) {
    if (!isPositiveInteger(bill.amountMinor)) {
      errors.push({ field: `scheduledBills[${bill.id}].amountMinor`, message: `amountMinor must be a positive integer.` });
    }
    if (!isValidDateString(bill.dueDate)) {
      errors.push({ field: `scheduledBills[${bill.id}].dueDate`, message: `Invalid dueDate "${bill.dueDate}".` });
    }
    if (!OCCURRENCE_STATUSES.has(bill.status)) {
      errors.push({ field: `scheduledBills[${bill.id}].status`, message: `Invalid status "${bill.status}".` });
    }
  }

  for (const rec of data.occurrenceRecords) {
    if (!OCCURRENCE_RECORD_STATUSES.has(rec.status)) {
      errors.push({ field: `occurrenceRecords[${rec.id}].status`, message: `Invalid status "${rec.status}".` });
    }
    if (!isValidDateString(rec.dueDate)) {
      errors.push({ field: `occurrenceRecords[${rec.id}].dueDate`, message: `Invalid dueDate "${rec.dueDate}".` });
    }
    if (rec.scheduleId != null && !scheduleIds.has(rec.scheduleId)) {
      errors.push({
        field: `occurrenceRecords[${rec.id}].scheduleId`,
        message: `scheduleId "${rec.scheduleId}" not found in recurringSchedules.`,
      });
    }
    if (rec.billId != null && !billIds.has(rec.billId)) {
      errors.push({
        field: `occurrenceRecords[${rec.id}].billId`,
        message: `billId "${rec.billId}" not found in scheduledBills.`,
      });
    }
    if (rec.transactionId != null && !txnIds.has(rec.transactionId)) {
      errors.push({
        field: `occurrenceRecords[${rec.id}].transactionId`,
        message: `transactionId "${rec.transactionId}" not found in transactions.`,
      });
    }
    if (rec.actualAmountMinor != null && !isNonNegativeInteger(rec.actualAmountMinor)) {
      errors.push({
        field: `occurrenceRecords[${rec.id}].actualAmountMinor`,
        message: `actualAmountMinor must be a non-negative integer.`,
      });
    }
  }

  return scheduleIds;
}

function validateNetWorth(data: BackupEnvelope['data'], errors: ValidationError[]): void {
  validateNoDuplicateIds(data.manualAssets, 'manualAssets', errors);
  validateNoDuplicateIds(data.manualLiabilities, 'manualLiabilities', errors);
  validateNoDuplicateIds(data.financialSnapshots, 'financialSnapshots', errors);

  for (const asset of data.manualAssets) {
    if (!MANUAL_ASSET_TYPES.has(asset.type)) {
      errors.push({ field: `manualAssets[${asset.id}].type`, message: `Invalid asset type "${asset.type}".` });
    }
    if (!isNonNegativeInteger(asset.valueMinor)) {
      errors.push({ field: `manualAssets[${asset.id}].valueMinor`, message: `valueMinor must be a non-negative integer.` });
    }
    if (!isValidDateString(asset.valuationDate)) {
      errors.push({ field: `manualAssets[${asset.id}].valuationDate`, message: `Invalid valuationDate "${asset.valuationDate}".` });
    }
  }

  for (const liab of data.manualLiabilities) {
    if (!MANUAL_LIABILITY_TYPES.has(liab.type)) {
      errors.push({ field: `manualLiabilities[${liab.id}].type`, message: `Invalid liability type "${liab.type}".` });
    }
    if (!isNonNegativeInteger(liab.outstandingMinor)) {
      errors.push({ field: `manualLiabilities[${liab.id}].outstandingMinor`, message: `outstandingMinor must be a non-negative integer.` });
    }
    if (!isValidDateString(liab.valuationDate)) {
      errors.push({ field: `manualLiabilities[${liab.id}].valuationDate`, message: `Invalid valuationDate "${liab.valuationDate}".` });
    }
  }

  for (const snap of data.financialSnapshots) {
    // totalAssetsMinor and totalLiabilitiesMinor must be >= 0
    if (!isNonNegativeInteger(snap.totalAssetsMinor)) {
      errors.push({ field: `financialSnapshots[${snap.id}].totalAssetsMinor`, message: `totalAssetsMinor must be a non-negative integer.` });
    }
    if (!isNonNegativeInteger(snap.totalLiabilitiesMinor)) {
      errors.push({ field: `financialSnapshots[${snap.id}].totalLiabilitiesMinor`, message: `totalLiabilitiesMinor must be a non-negative integer.` });
    }
    // netWorthMinor CAN be negative (when liabilities exceed assets)
    if (!isFiniteInteger(snap.netWorthMinor)) {
      errors.push({ field: `financialSnapshots[${snap.id}].netWorthMinor`, message: `netWorthMinor must be an integer.` });
    }
    if (!isValidDateString(snap.snapshotDate)) {
      errors.push({ field: `financialSnapshots[${snap.id}].snapshotDate`, message: `Invalid snapshotDate "${snap.snapshotDate}".` });
    }
    if (!isValidISOTimestamp(snap.timestamp)) {
      errors.push({ field: `financialSnapshots[${snap.id}].timestamp`, message: `Invalid timestamp.` });
    }
    if (!Array.isArray(snap.assetItems)) {
      errors.push({ field: `financialSnapshots[${snap.id}].assetItems`, message: `assetItems must be an array.` });
    }
    if (!Array.isArray(snap.liabilityItems)) {
      errors.push({ field: `financialSnapshots[${snap.id}].liabilityItems`, message: `liabilityItems must be an array.` });
    }
    // Validate frozen asset breakdown items
    if (Array.isArray(snap.assetItems)) {
      for (const item of snap.assetItems) {
        if (!isNonNegativeInteger(item.valueMinor)) {
          errors.push({
            field: `financialSnapshots[${snap.id}].assetItems[${item.id}].valueMinor`,
            message: `Snapshot asset valueMinor must be a non-negative integer.`,
          });
        }
      }
    }
    // Validate frozen liability breakdown items
    if (Array.isArray(snap.liabilityItems)) {
      for (const item of snap.liabilityItems) {
        if (!isNonNegativeInteger(item.outstandingMinor)) {
          errors.push({
            field: `financialSnapshots[${snap.id}].liabilityItems[${item.id}].outstandingMinor`,
            message: `Snapshot liability outstandingMinor must be a non-negative integer.`,
          });
        }
      }
    }
  }
}

// ======================================================================
// LAYER 2.6: DETECTED TRANSACTIONS & LEARNING RULES
// ======================================================================

function validateDetections(data: BackupEnvelope['data'], categoryIds: Set<string>, errors: ValidationError[]): void {
  if (Array.isArray(data.detectedTransactions)) {
    const seenEventIds = new Set<string>();
    for (const dtxn of data.detectedTransactions) {
      if (!isNonEmptyString(dtxn.id)) {
        errors.push({ field: 'detectedTransactions[].id', message: 'Detected transaction missing valid id.' });
      }
      if (!isNonEmptyString(dtxn.eventId)) {
        errors.push({ field: `detectedTransactions[${dtxn.id}].eventId`, message: 'Detected transaction missing valid eventId.' });
      } else {
        if (seenEventIds.has(dtxn.eventId)) {
          errors.push({ field: `detectedTransactions[${dtxn.id}].eventId`, message: `Duplicate eventId "${dtxn.eventId}" in detectedTransactions.` });
        }
        seenEventIds.add(dtxn.eventId);
      }
      if (!isNonNegativeInteger(dtxn.amountMinor)) {
        errors.push({ field: `detectedTransactions[${dtxn.id}].amountMinor`, message: 'amountMinor must be a non-negative integer.' });
      }
    }
  }

  if (Array.isArray(data.merchantCategoryRules)) {
    for (const rule of data.merchantCategoryRules) {
      if (!isNonEmptyString(rule.id)) {
        errors.push({ field: 'merchantCategoryRules[].id', message: 'Merchant rule missing valid id.' });
      }
      if (!isNonEmptyString(rule.normalizedMerchant)) {
        errors.push({ field: `merchantCategoryRules[${rule.id}].normalizedMerchant`, message: 'Merchant rule missing normalizedMerchant.' });
      }
      if (rule.categoryId && !categoryIds.has(rule.categoryId)) {
        errors.push({ field: `merchantCategoryRules[${rule.id}].categoryId`, message: `Merchant rule references non-existent categoryId "${rule.categoryId}".` });
      }
    }
  }
}

// ======================================================================
// PUBLIC ENTRY POINT
// ======================================================================

/**
 * Validates a parsed backup JSON object across all 3 layers.
 * Does NOT modify any application state.
 * Returns { isValid, errors }.
 */
export function validateBackupEnvelope(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // Layer 1: Envelope integrity
  if (!validateEnvelope(raw, errors)) {
    return { isValid: false, errors };
  }

  const envelope = raw as BackupEnvelope;
  const { data } = envelope;

  // Layer 2 & 3: Field + relational validation
  const accountIds = validateAccounts(data, errors);
  const categoryIds = validateCategories(data, errors);

  // Validate accounts field-level (openingBalance can be any integer)
  for (const acc of data.accounts) {
    if (!ACCOUNT_TYPES.has(acc.type)) {
      errors.push({ field: `accounts[${acc.id}].type`, message: `Invalid account type "${acc.type}".` });
    }
    if (!isFiniteInteger(acc.openingBalance)) {
      // openingBalance CAN be negative
      errors.push({ field: `accounts[${acc.id}].openingBalance`, message: `openingBalance must be an integer.` });
    }
  }

  const txnIds = validateTransactions(data, accountIds, categoryIds, errors);
  validateBudgets(data, categoryIds, errors);
  validateGoals(data, errors);
  validateRecurring(data, txnIds, errors);
  validateNetWorth(data, errors);
  validateDetections(data, categoryIds, errors);

  return { isValid: errors.length === 0, errors };
}
