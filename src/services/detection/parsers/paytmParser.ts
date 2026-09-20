/**
 * STAGE 7.3 — PAYTM NOTIFICATION PARSER
 *
 * Package: net.one97.paytm
 * Version: 1.0.0
 */

import type { ParserInput, ParserResult, ProviderParser, TransactionCandidate } from '../../../types/detection';
import { extractAmount, extractTransactionReference, cleanMerchantName, isFalsePositive } from './parserUtils';

export class PaytmParser implements ProviderParser {
  readonly provider = 'paytm' as const;
  readonly version = '1.0.0';

  parse(input: ParserInput): ParserResult {
    const { title = '', text = '', subText = '', postTime, eventId, packageName } = input;
    const combined = `${title}. ${text}. ${subText}`.trim();

    // 1. False positive check
    const fpCheck = isFalsePositive(text, title);
    if (fpCheck.isFalsePositive) {
      return { status: 'not_transaction', reason: fpCheck.reason || 'Non-transaction notification' };
    }

    // 2. Extract amount
    const amount = extractAmount(combined);
    if (!amount) {
      return { status: 'unrecognized', reason: 'Could not extract valid currency amount from Paytm notification' };
    }

    // 3. Determine direction & merchant
    let direction: 'credit' | 'debit' | null = null;
    let rawMerchant: string | undefined;

    // Pattern 1: Debit - "Paid ₹X at/to Merchant" or "Payment of ₹X at/to Merchant"
    const paidMatch = combined.match(/(?:paid|payment\s+of)\s+(?:₹|rs\.?|inr)?\s*[\d,.]+\s+(?:at|to)\s+([^.,;]+)/i);
    if (paidMatch) {
      direction = 'debit';
      rawMerchant = paidMatch[1];
    }

    // Pattern 2: Credit - "Received ₹X from Counterparty" or "Money Received: ₹X"
    if (!direction) {
      const receivedMatch = combined.match(/(?:received|credited)\s+(?:₹|rs\.?|inr)?\s*[\d,.]+\s+from\s+([^.,;]+)/i);
      const moneyReceivedMatch = combined.match(/money\s+received\s*:\s*(?:₹|rs\.?|inr)?\s*[\d,.]+(?:\s+from\s+([^.,;]+))?/i);
      if (receivedMatch) {
        direction = 'credit';
        rawMerchant = receivedMatch[1];
      } else if (moneyReceivedMatch) {
        direction = 'credit';
        rawMerchant = moneyReceivedMatch[1];
      }
    }

    // Pattern 3: Fallback direction signals
    if (!direction) {
      if (/\b(?:debited|paid|sent|transferred|successful\s+payment)\b/i.test(combined)) {
        direction = 'debit';
      } else if (/\b(?:credited|received|deposit|refund)\b/i.test(combined)) {
        direction = 'credit';
      }
    }

    if (!direction) {
      return { status: 'unrecognized', reason: 'Ambiguous transaction direction in Paytm notification' };
    }

    const merchant = cleanMerchantName(rawMerchant);
    const reference = extractTransactionReference(combined);

    let confidence = 0.80;
    if (amount > 0 && direction) confidence += 0.10;
    if (merchant) confidence += 0.05;
    if (reference) confidence += 0.05;

    const candidate: TransactionCandidate = {
      eventId,
      provider: this.provider,
      amount,
      currency: 'INR',
      direction,
      merchant,
      transactionReference: reference,
      occurredAt: new Date(postTime || Date.now()).toISOString(),
      sourcePackage: packageName,
      confidence: Math.min(confidence, 1.0),
      parserVersion: this.version,
    };

    return { status: 'transaction', candidate };
  }
}
