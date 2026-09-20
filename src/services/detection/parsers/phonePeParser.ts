/**
 * STAGE 7.3 — PHONEPE NOTIFICATION PARSER
 *
 * Package: com.phonepe.app
 * Version: 1.0.0
 */

import type { ParserInput, ParserResult, ProviderParser, TransactionCandidate } from '../../../types/detection';
import { extractAmount, extractTransactionReference, cleanMerchantName, isFalsePositive } from './parserUtils';

export class PhonePeParser implements ProviderParser {
  readonly provider = 'phonepe' as const;
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
      return { status: 'unrecognized', reason: 'Could not extract valid currency amount from PhonePe notification' };
    }

    // 3. Determine direction & merchant
    let direction: 'credit' | 'debit' | null = null;
    let rawMerchant: string | undefined;

    // Pattern 1: Debit - "Paid ₹X to Merchant" or "Payment of ₹X to Merchant successful"
    const paidToMatch = combined.match(/(?:paid|payment\s+of)\s+(?:₹|rs\.?|inr)?\s*[\d,.]+\s+to\s+([^.,;]+)/i);
    if (paidToMatch) {
      direction = 'debit';
      rawMerchant = paidToMatch[1];
    }

    // Pattern 2: Debit - "Money sent to Counterparty ₹X" / "Money transferred to Counterparty"
    if (!direction) {
      const moneySentMatch = combined.match(/money\s+(?:sent|transferred)\s+to\s+([^.,;:\d]+)/i);
      if (moneySentMatch) {
        direction = 'debit';
        rawMerchant = moneySentMatch[1];
      }
    }

    // Pattern 3: Credit - "Received ₹X from Counterparty" / "₹X received from Counterparty"
    if (!direction) {
      const receivedMatch = combined.match(/(?:received|credited)\s+(?:₹|rs\.?|inr)?\s*[\d,.]+\s+from\s+([^.,;]+)/i);
      const receivedMatch2 = combined.match(/(?:₹|rs\.?|inr)?\s*[\d,.]+\s+received\s+from\s+([^.,;]+)/i);
      const match = receivedMatch || receivedMatch2;
      if (match) {
        direction = 'credit';
        rawMerchant = match[1];
      }
    }

    // Pattern 4: Fallback direction signals
    if (!direction) {
      if (/\b(?:debited|paid|sent|transferred|successful\s+payment)\b/i.test(combined)) {
        direction = 'debit';
      } else if (/\b(?:credited|received|deposit|refund)\b/i.test(combined)) {
        direction = 'credit';
      }
    }

    if (!direction) {
      return { status: 'unrecognized', reason: 'Ambiguous transaction direction in PhonePe notification' };
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
