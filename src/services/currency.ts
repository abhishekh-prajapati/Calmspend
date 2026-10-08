/**
 * Currency Formatting Service
 * Centralized formatter for all financial figures across the application.
 */

export interface CurrencyItem {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyItem[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'en-AE' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
];

export const STORAGE_KEY_CURRENCY = 'calmspend_currency';
export const STORAGE_KEY_LOCALE = 'calmspend_locale';
export const STORAGE_KEY_USER_NAME = 'calmspend_user_name';
export const STORAGE_KEY_ONBOARDING_COMPLETED = 'calmspend_onboarding_completed';

export function getUserCurrency(): string {
  if (typeof window === 'undefined') return 'INR';
  return localStorage.getItem(STORAGE_KEY_CURRENCY) || 'INR';
}

export function getUserLocale(): string {
  if (typeof window === 'undefined') return 'en-IN';
  const storedLocale = localStorage.getItem(STORAGE_KEY_LOCALE);
  if (storedLocale) return storedLocale;
  const currentCode = getUserCurrency();
  const matched = SUPPORTED_CURRENCIES.find((c) => c.code === currentCode);
  return matched ? matched.locale : 'en-IN';
}

export function setUserCurrency(currencyCode: string): void {
  if (typeof window === 'undefined') return;
  const matched = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  localStorage.setItem(STORAGE_KEY_CURRENCY, currencyCode);
  if (matched) {
    localStorage.setItem(STORAGE_KEY_LOCALE, matched.locale);
  }
}

export interface CurrencyFormatOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
}

/**
 * Format an amount to a standardized currency string (e.g. ₹0.00, $1,250.00).
 */
export function formatCurrency(
  amount: number,
  options?: CurrencyFormatOptions,
): string {
  const currency = options?.currency || getUserCurrency();
  const locale = options?.locale || getUserLocale();
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
    const symbol = getCurrencySymbol(currency, locale);
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Get active currency symbol (e.g. '₹', '$', '€')
 */
export function getCurrencySymbol(
  currency?: string,
  locale?: string,
): string {
  const activeCurrency = currency || getUserCurrency();
  const activeLocale = locale || getUserLocale();

  try {
    const parts = new Intl.NumberFormat(activeLocale, {
      style: 'currency',
      currency: activeCurrency,
    }).formatToParts(0);
    const symbolPart = parts.find((p) => p.type === 'currency');
    if (symbolPart) return symbolPart.value;
  } catch {
    // fallback below
  }

  const matched = SUPPORTED_CURRENCIES.find((c) => c.code === activeCurrency);
  return matched ? matched.symbol : '₹';
}
