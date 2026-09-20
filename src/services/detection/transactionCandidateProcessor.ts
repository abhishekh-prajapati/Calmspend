/**
 * STAGE 7.4 — TRANSACTION CANDIDATE PROCESSOR
 *
 * Integrates parsed notification candidates into the authoritative financial store.
 *
 * Core Guarantees:
 * 1. Validates all candidate financial and metadata invariants.
 * 2. Enforces persistent idempotency: UNIQUE(source, sourceEventId).
 * 3. Maps debit -> expense and credit -> income with exact minor units (paise).
 * 4. Resolves destination Account and Category deterministically.
 * 5. Attaches provenance metadata without raw notification text.
 * 6. Returns explicit discriminated result states.
 */

import type { Transaction, Account, Category } from '../../types/transaction';
import type { TransactionCandidate, MerchantCategoryRule } from '../../types/detection';
import {
  transactionRepository,
  DuplicateTransactionError,
  TransactionRepository,
} from '../repositories/transactionRepository';
import { resolveAccount } from './accountResolver';
import { resolveCategory } from './categoryResolver';
import { getProviderFromPackage } from './parsers/parserRegistry';

export type CandidateProcessingResult =
  | {
      status: 'created';
      transactionId: string;
      eventId: string;
      transaction: Transaction;
    }
  | {
      status: 'already_exists';
      transactionId: string;
      eventId: string;
    }
  | {
      status: 'rejected';
      eventId: string;
      reason: string;
    }
  | {
      status: 'unresolved';
      eventId: string;
      reason: string;
    }
  | {
      status: 'failed';
      eventId: string;
      reason: string;
    };

export interface ProcessCandidateOptions {
  defaultAccountId?: string;
  accounts?: Account[];
  categories?: Category[];
  rules?: MerchantCategoryRule[];
  repository?: TransactionRepository;
}

/**
 * Validates structural, financial, and provider consistency of a candidate.
 */
export function validateCandidateIntegrity(candidate: TransactionCandidate): { isValid: boolean; reason?: string } {
  if (!candidate || typeof candidate !== 'object') {
    return { isValid: false, reason: 'Candidate payload is not an object' };
  }
  if (!candidate.eventId || typeof candidate.eventId !== 'string' || candidate.eventId.trim().length === 0) {
    return { isValid: false, reason: 'Missing or empty eventId' };
  }
  if (typeof candidate.amount !== 'number' || !isFinite(candidate.amount) || candidate.amount <= 0) {
    return { isValid: false, reason: `Invalid transaction amount: ${candidate.amount}` };
  }
  if (candidate.currency !== 'INR') {
    return { isValid: false, reason: `Unsupported currency "${candidate.currency}". Expected "INR"` };
  }
  if (candidate.direction !== 'credit' && candidate.direction !== 'debit') {
    return { isValid: false, reason: `Invalid direction: ${candidate.direction}` };
  }
  if (!candidate.occurredAt || isNaN(Date.parse(candidate.occurredAt))) {
    return { isValid: false, reason: `Invalid occurredAt timestamp: ${candidate.occurredAt}` };
  }
  if (typeof candidate.confidence !== 'number' || candidate.confidence < 0.90) {
    return { isValid: false, reason: `Confidence score ${candidate.confidence} is below minimum threshold (0.90)` };
  }
  if (!candidate.parserVersion || typeof candidate.parserVersion !== 'string') {
    return { isValid: false, reason: 'Missing parserVersion' };
  }

  // Verify provider and source package match
  const matchedProvider = getProviderFromPackage(candidate.sourcePackage);
  if (!matchedProvider || matchedProvider !== candidate.provider) {
    return {
      isValid: false,
      reason: `sourcePackage "${candidate.sourcePackage}" does not match provider "${candidate.provider}"`,
    };
  }

  return { isValid: true };
}

/**
 * Processes a TransactionCandidate into an authoritative financial Transaction.
 */
export function processTransactionCandidate(
  candidate: TransactionCandidate,
  options: ProcessCandidateOptions = {},
): CandidateProcessingResult {
  const repo = options.repository ?? transactionRepository;

  // 1. Strict candidate validation
  const validation = validateCandidateIntegrity(candidate);
  if (!validation.isValid) {
    return {
      status: 'rejected',
      eventId: candidate.eventId || 'unknown',
      reason: validation.reason || 'Candidate failed validation',
    };
  }

  // 2. Pre-check persistent idempotency in store
  const existingTxn = repo.getBySourceEvent('notification', candidate.eventId);
  if (existingTxn) {
    return {
      status: 'already_exists',
      transactionId: existingTxn.id,
      eventId: candidate.eventId,
    };
  }

  // 3. Account resolution
  const accountResult = resolveAccount({
    defaultAccountId: options.defaultAccountId,
    accounts: options.accounts,
  });

  if (accountResult.status === 'unresolved') {
    return {
      status: 'unresolved',
      eventId: candidate.eventId,
      reason: accountResult.reason,
    };
  }

  // 4. Category resolution
  const categoryId = resolveCategory({
    merchant: candidate.merchant,
    direction: candidate.direction,
    rules: options.rules,
    categories: options.categories,
  });

  // 5. Monetary conversion: exact major units to integer minor units (paise)
  const amountMinor = Math.round(candidate.amount * 100);

  // 6. Map transaction attributes
  const type = candidate.direction === 'debit' ? 'expense' : 'income';
  const date = candidate.occurredAt.substring(0, 10); // YYYY-MM-DD
  const description = candidate.merchant?.trim() || undefined;

  // 7. Atomic persistence
  try {
    const created = repo.create({
      type,
      amount: amountMinor,
      accountId: accountResult.accountId,
      categoryId,
      date,
      description,
      source: 'notification',
      sourceEventId: candidate.eventId,
      sourceProvider: candidate.provider,
      parserVersion: candidate.parserVersion,
      tags: ['notification', candidate.provider],
    });

    return {
      status: 'created',
      transactionId: created.id,
      eventId: candidate.eventId,
      transaction: created,
    };
  } catch (err) {
    if (err instanceof DuplicateTransactionError) {
      return {
        status: 'already_exists',
        transactionId: err.existingTransactionId,
        eventId: candidate.eventId,
      };
    }

    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'failed',
      eventId: candidate.eventId,
      reason: message,
    };
  }
}
