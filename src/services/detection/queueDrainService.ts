/**
 * STAGE 7.3 — QUEUE DRAIN SERVICE
 *
 * Drains raw notification records from the native SQLite detection queue,
 * identifies providers, runs canonical parsers, validates results,
 * deduplicates candidates, and acknowledges processed queue records.
 *
 * CRITICAL BOUNDARY:
 * This service does NOT mutate the financial ledger.
 * It produces validated TransactionCandidate objects ready for Stage 7.4.
 */

import { TransactionDetector } from '../native/transactionDetectorPlugin';
import { getParserForPackage } from './parsers/parserRegistry';
import type {
  ParserInput,
  ParserResult,
  RawNotificationPayload,
  DetectionQueueItem,
  TransactionCandidate,
} from '../../types/detection';

export interface DrainQueueResult {
  candidates: TransactionCandidate[];
  processedQueueIds: string[];
  unparsedCount: number;
  ignoredCount: number;
}

/**
 * Parses a single queue item or live notification payload into a ParserResult.
 * Pure function with zero side effects.
 */
export function parseQueueItem(item: RawNotificationPayload | DetectionQueueItem): ParserResult {
  const parser = getParserForPackage(item.packageName);
  if (!parser) {
    return {
      status: 'unrecognized',
      reason: `No parser registered for package "${item.packageName}"`,
    };
  }

  const parserInput: ParserInput = {
    eventId: item.eventId,
    packageName: item.packageName,
    title: item.title || '',
    text: item.text || '',
    subText: item.subText || '',
    postTime: item.postTime,
  };

  return parser.parse(parserInput);
}

/**
 * Validates structural and financial invariants of a TransactionCandidate.
 */
export function validateCandidate(candidate: TransactionCandidate): boolean {
  if (!candidate.eventId || typeof candidate.eventId !== 'string') return false;
  if (!candidate.amount || !isFinite(candidate.amount) || candidate.amount <= 0) return false;
  if (candidate.currency !== 'INR') return false;
  if (candidate.direction !== 'credit' && candidate.direction !== 'debit') return false;
  if (typeof candidate.confidence !== 'number' || candidate.confidence < 0 || candidate.confidence > 1) return false;
  if (!candidate.occurredAt || isNaN(Date.parse(candidate.occurredAt))) return false;
  return true;
}

/**
 * Drains all pending records from the native detection queue, executes provider parsing,
 * validates and deduplicates candidates, and acknowledges processed items.
 */
export async function drainNativeQueue(options: {
  autoAcknowledge?: boolean;
  queueItems?: (RawNotificationPayload | DetectionQueueItem)[];
} = { autoAcknowledge: true }): Promise<DrainQueueResult> {
  let queueItems: (RawNotificationPayload | DetectionQueueItem)[] = options.queueItems ?? [];
  if (!options.queueItems) {
    const pending = await TransactionDetector.getPendingQueueItems();
    queueItems = pending.candidates || [];
  }

  const candidates: TransactionCandidate[] = [];
  const processedQueueIds: string[] = [];
  const seenEventIds = new Set<string>();

  let unparsedCount = 0;
  let ignoredCount = 0;

  for (const item of queueItems) {
    try {
      const result = parseQueueItem(item);

      switch (result.status) {
        case 'not_transaction':
          // Safely acknowledge non-transaction notifications (e.g. cashback promo, security alert)
          processedQueueIds.push(item.eventId);
          ignoredCount++;
          break;

        case 'unrecognized':
          // Acknowledge unrecognized format so it does not block the queue
          processedQueueIds.push(item.eventId);
          unparsedCount++;
          break;

        case 'transaction':
          if (validateCandidate(result.candidate)) {
            // Deduplicate by eventId within the batch
            if (!seenEventIds.has(result.candidate.eventId)) {
              seenEventIds.add(result.candidate.eventId);
              candidates.push(result.candidate);
            }
            processedQueueIds.push(item.eventId);
          } else {
            // Invalid candidate structure — acknowledge to prevent infinite failure loops
            processedQueueIds.push(item.eventId);
            unparsedCount++;
          }
          break;
      }
    } catch {
      // On unexpected runtime exception: DO NOT acknowledge, allow subsequent retry
    }
  }

  // Acknowledge processed records to purge them from the native queue
  if (options.autoAcknowledge && processedQueueIds.length > 0) {
    await TransactionDetector.markQueueItemsProcessed({ queueIds: processedQueueIds });
  }

  return {
    candidates,
    processedQueueIds,
    unparsedCount,
    ignoredCount,
  };
}
