/**
 * STAGE 7.3 — PARSER UTILITIES
 *
 * Deterministic helper functions for currency amount extraction,
 * reference identification, merchant normalization, and false-positive filtering.
 */

// Promotional, marketing, security, and informational keywords that indicate non-transaction notifications
const FALSE_POSITIVE_PATTERNS: { regex: RegExp; reason: string }[] = [
  { regex: /\b(?:cashback|scratch\s*card|win\s+up\s+to|flat\s+₹|get\s+₹\d+\s+(?:back|off)|rewards?|coupon|discount|deal|recharge\s+offer|earn\s+₹)\b/i, reason: 'Promotional offer or cashback notification' },
  { regex: /\b(?:otp|verification\s+code|security\s+alert|logged?\s+in|login\s+attempt|password\s+reset)\b/i, reason: 'Security or authentication notification' },
  { regex: /\b(?:bill\s+is\s+due|reminder\s+to\s+pay|due\s+date\s+is|upcoming\s+bill)\b/i, reason: 'Bill payment reminder' },
  { regex: /\b(?:low\s+balance|check\s+your\s+balance|credit\s+score|loan\s+offer|your\s+a\/c\s+balance|a\/c\s+balance\s+is|account\s+balance\s+is)\b/i, reason: 'Account or marketing alert' },
];

/**
 * Checks if notification text represents a promotional offer, security alert,
 * or non-transaction notification.
 */
export function isFalsePositive(text: string, title = ''): { isFalsePositive: boolean; reason?: string } {
  const combined = `${title} ${text}`.trim();

  for (const { regex, reason } of FALSE_POSITIVE_PATTERNS) {
    if (regex.test(combined)) {
      return { isFalsePositive: true, reason };
    }
  }

  // Pure balance inquiry without payment/receipt action
  const hasBalanceOnly = /\b(?:available\s+balance|bal(?::|\s+is)|balance\s+is|account\s+balance)\b/i.test(combined);
  const hasAction = /\b(?:paid|debited|sent|transferred|credited|received|deposit|spent|refund)\b/i.test(combined);
  if (hasBalanceOnly && !hasAction) {
    return { isFalsePositive: true, reason: 'Balance inquiry notification without transaction' };
  }

  return { isFalsePositive: false };
}

/**
 * Extracts numeric transaction amount from text.
 * Handles Indian notation (₹1,00,000 / Rs. 500 / INR 1,250.50 / ₹450).
 * Context-aware: skips balance figures (e.g. 'Avl Bal: ₹12,000').
 */
export function extractAmount(text: string): number | null {
  if (!text || typeof text !== 'string') return null;

  // Split out lines or phrases, prioritizing action clauses over balance clauses
  // Remove "Available balance: ₹..." or "Bal: ₹..." before matching to prevent picking balance numbers
  const sanitized = text
    .replace(/(?:available\s+bal(?:ance)?|avl\s+bal|bal(?:ance)?)\s*(?:is|:)?\s*(?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d{1,2})?/gi, ' ')
    .replace(/(?:a\/c\s*(?:no\.?)?\s*x*[\d]{2,6})/gi, ' '); // remove account numbers like 'A/c XX1234'

  // Pattern: (₹|Rs|Rs.|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?) OR ([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:₹|Rs|INR)
  const amountRegex = /(?:([+-])?\s*(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?))|(?:([+-])?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr))/i;
  const match = sanitized.match(amountRegex);

  if (!match) return null;

  const sign = match[1] || match[3] || '';
  if (sign === '-') return null;

  const rawNumStr = (match[2] || match[4] || '').replace(/,/g, '').trim();
  const amount = parseFloat(rawNumStr);

  if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

/**
 * Extracts UPI / Bank transaction reference (UTR / RRN / Txn ID) if available.
 */
export function extractTransactionReference(text: string): string | undefined {
  if (!text) return undefined;

  // 1. Explicit reference labels
  const labelMatch = text.match(/(?:upi\s+ref(?:erence)?(?:\s+no\.?)?|utr(?:\s+no\.?)?|rrn|txn\s*(?:id|ref)|ref(?:\s+id|\s+no\.?)?)\s*[:#-]?\s*([A-Za-z0-9]{8,24})/i);
  if (labelMatch && labelMatch[1]) {
    return labelMatch[1].trim();
  }

  // 2. Standalone 12-digit numeric RRN (common in Indian banking/UPI SMS & notifications)
  const rrnMatch = text.match(/\b(\d{12})\b/);
  if (rrnMatch && rrnMatch[1]) {
    return rrnMatch[1].trim();
  }

  return undefined;
}

/**
 * Normalizes and cleans merchant / counterparty names.
 * Strips VPA handles (@okhdfcbank, @paytm, @ybl) and punctuation.
 */
export function cleanMerchantName(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  let cleaned = raw
    .replace(/@[a-zA-Z0-9_.-]+\b/gi, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^(?:to|for|at|from)\s+/i, '')
    .replace(/\s+(?:was\s+)?successful(?:ly)?\b/gi, '')
    .replace(/\s+in\s+your\s+bank\s+account\b/gi, '')
    .replace(/["'“”‘’]/g, '')
    .replace(/[\s₹,.:;\\/-]+$/, '')
    .trim();

  if (cleaned.length === 0 || cleaned.length > 60) {
    return undefined;
  }

  // Reject generic single words that aren't merchant names
  const lower = cleaned.toLowerCase();
  if (['you', 'user', 'bank', 'account', 'merchant', 'someone', 'payment', 'successful'].includes(lower)) {
    return undefined;
  }

  return cleaned;
}
