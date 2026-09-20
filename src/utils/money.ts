/**
 * Money Storage and Calculation Utilities
 * Handles exact conversions between major currency units (Rupees) and minor units (Paise)
 * with strict validation to prevent floating-point inaccuracies.
 */

export interface MoneyValidationResult {
  isValid: boolean;
  error?: string;
  minorUnits?: number;
}

/**
 * Validates user monetary string input.
 * Rules:
 * - Must be numeric and positive
 * - Cannot be 0
 * - At most 2 decimal places (₹100, ₹100.5, ₹100.50 are accepted; ₹100.555 is rejected)
 * - Safe integer boundaries
 */
export function validateMoneyInput(input: string): MoneyValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Amount is required.' };
  }

  // Check numeric format with at most 2 decimal places
  const moneyRegex = /^\d+(\.\d{1,2})?$/;
  if (!moneyRegex.test(trimmed)) {
    if (/^\d+\.\d{3,}$/.test(trimmed)) {
      return { isValid: false, error: 'Amount cannot exceed 2 decimal places.' };
    }
    return { isValid: false, error: 'Please enter a valid numeric amount.' };
  }

  const parsed = parseFloat(trimmed);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return { isValid: false, error: 'Invalid number format.' };
  }

  if (parsed <= 0) {
    return { isValid: false, error: 'Amount must be greater than zero.' };
  }

  // Convert to minor units (paise)
  const minorUnits = toMinorUnits(trimmed);

  if (!Number.isSafeInteger(minorUnits)) {
    return { isValid: false, error: 'Amount exceeds maximum allowable limit.' };
  }

  return { isValid: true, minorUnits };
}

/**
 * Convenience helper to validate if string input is a valid non-negative monetary number with <=2 decimals.
 */
export function isValidCurrencyInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const moneyRegex = /^\d+(\.\d{1,2})?$/;
  if (!moneyRegex.test(trimmed)) return false;
  const parsed = parseFloat(trimmed);
  return !isNaN(parsed) && isFinite(parsed) && parsed >= 0;
}


/**
 * Converts a valid rupees string or number into integer minor units (paise).
 * e.g. "100" -> 10000, "100.5" -> 10050, "100.50" -> 10050
 */
export function toMinorUnits(amount: string | number): number {
  if (typeof amount === 'number') {
    return Math.round(amount * 100);
  }

  const parts = amount.trim().split('.');
  const whole = parseInt(parts[0] || '0', 10);
  let fraction = 0;

  if (parts.length > 1 && parts[1]) {
    const fracStr = parts[1].padEnd(2, '0').slice(0, 2);
    fraction = parseInt(fracStr, 10);
  }

  return whole * 100 + fraction;
}

/**
 * Converts integer minor units (paise) back into major units (rupees) for display/calculations.
 * e.g. 10050 -> 100.5
 */
export function toMajorUnits(minorUnits: number): number {
  return minorUnits / 100;
}
