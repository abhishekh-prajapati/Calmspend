/**
 * STAGE 7.4 — DETERMINISTIC ACCOUNT RESOLVER
 *
 * Resolves the destination financial Account for notification-derived transactions.
 * Never guesses when ambiguous: returns an explicit 'unresolved' state if multiple
 * accounts exist and neither a default account nor an exact account hint matches.
 */

import type { Account } from '../../types/transaction';
import { accountRepository } from '../repositories/accountRepository';

export type AccountResolutionResult =
  | {
      status: 'resolved';
      accountId: string;
    }
  | {
      status: 'unresolved';
      reason: string;
    };

export interface ResolveAccountOptions {
  defaultAccountId?: string;
  accountHint?: string;
  accounts?: Account[];
}

/**
 * Deterministically resolves a valid Account ID.
 */
export function resolveAccount(options: ResolveAccountOptions = {}): AccountResolutionResult {
  const accounts = options.accounts ?? accountRepository.getAll();
  const activeAccounts = accounts.filter((a) => a.isActive);

  if (activeAccounts.length === 0) {
    return {
      status: 'unresolved',
      reason: 'No active financial accounts available in store',
    };
  }

  // 1. Explicit default account passed or configured
  if (options.defaultAccountId) {
    const matchedDefault = activeAccounts.find((a) => a.id === options.defaultAccountId);
    if (matchedDefault) {
      return {
        status: 'resolved',
        accountId: matchedDefault.id,
      };
    }
  }

  // 2. Account hint matching (e.g. 'HDFC Bank', 'ICICI')
  if (options.accountHint) {
    const hintLower = options.accountHint.toLowerCase().trim();
    const hintMatches = activeAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(hintLower) ||
        hintLower.includes(a.name.toLowerCase()) ||
        a.id.toLowerCase() === hintLower,
    );

    if (hintMatches.length === 1) {
      return {
        status: 'resolved',
        accountId: hintMatches[0].id,
      };
    }
  }

  // 3. Exactly one active account in the system
  if (activeAccounts.length === 1) {
    return {
      status: 'resolved',
      accountId: activeAccounts[0].id,
    };
  }

  // 4. Multiple active accounts exist without unambiguous resolution
  return {
    status: 'unresolved',
    reason: `Multiple active accounts (${activeAccounts.length}) exist without a configured default account`,
  };
}
