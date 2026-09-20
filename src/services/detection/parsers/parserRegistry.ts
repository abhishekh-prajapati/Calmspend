/**
 * STAGE 7.3 — PROVIDER PARSER REGISTRY
 *
 * Centralized mapping and registry for payment providers and their canonical parsers.
 */

import type { ProviderParser, TransactionProvider } from '../../../types/detection';
import { GooglePayParser } from './googlePayParser';
import { PhonePeParser } from './phonePeParser';
import { PaytmParser } from './paytmParser';
import { BhimParser } from './bhimParser';

export const PACKAGE_TO_PROVIDER_MAP: Record<string, TransactionProvider> = {
  'com.google.android.apps.nbu.paisa.user': 'google_pay',
  'com.phonepe.app': 'phonepe',
  'net.one97.paytm': 'paytm',
  'in.org.npci.upiapp': 'bhim',
};

// Instantiated singleton parser instances
const PARSERS: Record<TransactionProvider, ProviderParser> = {
  google_pay: new GooglePayParser(),
  phonepe: new PhonePeParser(),
  paytm: new PaytmParser(),
  bhim: new BhimParser(),
};

/**
 * Identifies the TransactionProvider for a given Android package name.
 * Returns null if the package is not recognized / whitelisted.
 */
export function getProviderFromPackage(packageName: string): TransactionProvider | null {
  if (!packageName || typeof packageName !== 'string') return null;
  return PACKAGE_TO_PROVIDER_MAP[packageName] || null;
}

/**
 * Returns the ProviderParser for a given Android package name, or null if unknown.
 */
export function getParserForPackage(packageName: string): ProviderParser | null {
  const provider = getProviderFromPackage(packageName);
  if (!provider) return null;
  return PARSERS[provider] || null;
}

/**
 * Returns the ProviderParser for a specific TransactionProvider.
 */
export function getParserForProvider(provider: TransactionProvider): ProviderParser | null {
  return PARSERS[provider] || null;
}
