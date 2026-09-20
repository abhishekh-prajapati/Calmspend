/**
 * STAGE 7.4 — DETECTION SYNC & FINANCIAL STORE INTEGRATION SERVICE
 *
 * Orchestrates:
 * 1. Native queue item drain
 * 2. Provider parsing
 * 3. Candidate processing & atomic financial mutation
 * 4. Safe post-persistence queue acknowledgement
 *
 * QUEUE ACKNOWLEDGEMENT GUARANTEE:
 * Queue items are acknowledged ONLY after successful financial persistence,
 * or when confirmed to be an idempotent existing transaction, or a confirmed
 * non-transaction/rejected item.
 * Items with unexpected DB errors or unresolved states are NOT acknowledged,
 * ensuring crash-safe retry semantics.
 */

import { TransactionDetector } from '../native/transactionDetectorPlugin';
import { parseQueueItem } from './queueDrainService';
import {
  processTransactionCandidate,
  type CandidateProcessingResult,
  type ProcessCandidateOptions,
} from './transactionCandidateProcessor';
import type {
  RawNotificationPayload,
  DetectionQueueItem,
  TransactionCandidate,
} from '../../types/detection';
import type { Transaction } from '../../types/transaction';

export interface DetectionSyncResult {
  createdTransactions: Transaction[];
  existingTransactions: { transactionId: string; eventId: string }[];
  unresolvedCandidates: { candidate: TransactionCandidate; reason: string }[];
  acknowledgedQueueIds: string[];
  ignoredCount: number;
  unparsedCount: number;
  rejectedCount: number;
  failedCount: number;
}

export interface DetectionSyncOptions extends ProcessCandidateOptions {
  queueItems?: (RawNotificationPayload | DetectionQueueItem)[];
  autoAcknowledge?: boolean;
}

/**
 * Synchronizes the native Android detection queue with the authoritative financial store.
 */
export async function syncDetectionQueueToFinancialStore(
  options: DetectionSyncOptions = {},
): Promise<DetectionSyncResult> {
  const autoAck = options.autoAcknowledge ?? true;

  let queueItems: (RawNotificationPayload | DetectionQueueItem)[] = options.queueItems ?? [];
  if (!options.queueItems) {
    const pending = await TransactionDetector.getPendingQueueItems();
    queueItems = pending.candidates || [];
  }

  const createdTransactions: Transaction[] = [];
  const existingTransactions: { transactionId: string; eventId: string }[] = [];
  const unresolvedCandidates: { candidate: TransactionCandidate; reason: string }[] = [];
  const acknowledgedQueueIds: string[] = [];

  let ignoredCount = 0;
  let unparsedCount = 0;
  let rejectedCount = 0;
  let failedCount = 0;

  for (const item of queueItems) {
    try {
      const parseResult = parseQueueItem(item);

      switch (parseResult.status) {
        case 'not_transaction':
          // Confirmed non-transaction (cashback promo, OTP, etc.) — safe to acknowledge
          acknowledgedQueueIds.push(item.eventId);
          ignoredCount++;
          break;

        case 'unrecognized':
          // Unrecognized format — safe to acknowledge so queue doesn't stall
          acknowledgedQueueIds.push(item.eventId);
          unparsedCount++;
          break;

        case 'transaction': {
          const candidate = parseResult.candidate;
          const processResult: CandidateProcessingResult = processTransactionCandidate(candidate, options);

          switch (processResult.status) {
            case 'created':
              // Persisted successfully -> safe to acknowledge
              createdTransactions.push(processResult.transaction);
              acknowledgedQueueIds.push(item.eventId);
              break;

            case 'already_exists':
              // Already exists in store -> safe idempotent acknowledgement
              existingTransactions.push({
                transactionId: processResult.transactionId,
                eventId: item.eventId,
              });
              acknowledgedQueueIds.push(item.eventId);
              break;

            case 'rejected':
              // Malformed candidate (e.g. amount <= 0, package mismatch) -> safe to acknowledge
              acknowledgedQueueIds.push(item.eventId);
              rejectedCount++;
              break;

            case 'unresolved':
              // Unresolved account/category: DO NOT silently create bad data, DO NOT acknowledge
              unresolvedCandidates.push({
                candidate,
                reason: processResult.reason,
              });
              break;

            case 'failed':
              // Database or storage exception: DO NOT acknowledge, allow retry
              failedCount++;
              break;
          }
          break;
        }
      }
    } catch {
      // Unhandled runtime error: DO NOT acknowledge, allow retry
      failedCount++;
    }
  }

  // Acknowledge processed items in the native queue
  if (autoAck && acknowledgedQueueIds.length > 0) {
    await TransactionDetector.markQueueItemsProcessed({ queueIds: acknowledgedQueueIds });
  }

  return {
    createdTransactions,
    existingTransactions,
    unresolvedCandidates,
    acknowledgedQueueIds,
    ignoredCount,
    unparsedCount,
    rejectedCount,
    failedCount,
  };
}
