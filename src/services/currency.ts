/**
 * Currency Formatting Service
 * Centralized formatter for all financial figures across the application.
 */

export interface CurrencyFormatOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
}

const DEFAULT_CURRENCY = 'INR';
const DEFAULT_LOCALE = 'en-IN';

/**
 * Format an amount to a standardized currency string (e.g. ₹0.00 or ₹1,25,000.00).
 */
export function formatCurrency(
  amount: number,
  options?: CurrencyFormatOptions,
): string {
  const currency = options?.currency || DEFAULT_CURRENCY;
  const locale = options?.locale || DEFAULT_LOCALE;
  const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options?.maximumFractionDigits ?? 2;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    // Fallback for safety in case of unsupported locale/currency combination
    return `₹${amount.toFixed(2)}`;
  }
}

/**
 * Get active currency symbol (e.g. '₹')
 */
export function getCurrencySymbol(
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).formatToParts(0);
    const symbolPart = parts.find((p) => p.type === 'currency');
    return symbolPart ? symbolPart.value : '₹';
  } catch {
    return '₹';
  }
}
