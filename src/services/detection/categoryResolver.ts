/**
 * STAGE 7.4 — DETERMINISTIC CATEGORY RESOLVER
 *
 * Resolves category IDs for notification-derived candidates using:
 * 1. User-configured MerchantCategoryRules (if available)
 * 2. Deterministic merchant keyword pattern matching
 * 3. Direction-aware system fallback categories (cat_other / cat_other_income / cat_refund)
 */

import type { Category } from '../../types/transaction';
import type { MerchantCategoryRule } from '../../types/detection';
import { DEFAULT_SYSTEM_CATEGORIES } from '../storage/categoryRegistry';

interface CategoryKeywordMap {
  categoryId: string;
  keywords: string[];
}

const EXPENSE_CATEGORY_KEYWORDS: CategoryKeywordMap[] = [
  {
    categoryId: 'cat_food',
    keywords: [
      'swiggy', 'zomato', 'starbucks', 'mcdonald', 'domino', 'kfc', 'burger king',
      'pizza hut', 'subway', 'haldiram', 'chai point', 'chaayos', 'cafe', 'restaurant',
      'bakery', 'dining', 'food', 'eatery', 'barbeque nation',
    ],
  },
  {
    categoryId: 'cat_groceries',
    keywords: [
      'blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'supermarket',
      'grocery', 'nature basket', 'spencer', 'more retail', 'jiomart', 'milkbasket',
      'country delight', 'dunzo',
    ],
  },
  {
    categoryId: 'cat_transport',
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'petrol', 'fuel', 'indian oil', 'ioc',
      'hpcl', 'bpcl', 'shell', 'parking', 'toll', 'fastag', 'auto', 'cab',
      'chalo', 'redbus', 'abhibus',
    ],
  },
  {
    categoryId: 'cat_shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'tata cliq', 'nykaa',
      'croma', 'reliance digital', 'ikea', 'zara', 'h&m', 'decathlon', 'uniqlo',
      'lenskart', 'retail', 'store', 'mall',
    ],
  },
  {
    categoryId: 'cat_bills',
    keywords: [
      'bescom', 'airtel', 'jio', 'vodafone', 'vi', 'electricity', 'broadband',
      'wifi', 'dth', 'tata power', 'billdesk', 'recharge', 'water bill', 'gas bill',
      'cylinder', 'indane', 'bharat gas', 'hp gas',
    ],
  },
  {
    categoryId: 'cat_health',
    keywords: [
      'apollo', 'pharmeasy', '1mg', 'netmeds', 'hospital', 'clinic', 'pharmacy',
      'medplus', 'dr.', 'diagnostics', 'pathology', 'practo', 'care',
    ],
  },
  {
    categoryId: 'cat_entertainment',
    keywords: [
      'netflix', 'hotstar', 'disney', 'prime video', 'pvr', 'inox', 'bookmyshow',
      'spotify', 'gaana', 'youtube', 'cinema', 'movie', 'theatre', 'gaming',
      'steam', 'playstation',
    ],
  },
  {
    categoryId: 'cat_travel',
    keywords: [
      'makemytrip', 'goibibo', 'irctc', 'cleartrip', 'indigo', 'air india',
      'spicejet', 'hotel', 'resort', 'airbnb', 'agoda', 'booking.com', 'flight',
      'yatra', 'easemytrip',
    ],
  },
  {
    categoryId: 'cat_subscriptions',
    keywords: [
      'apple.com', 'apple bill', 'google play', 'patreon', 'substack', 'github',
      'aws', 'adobe', 'canva', 'subscription',
    ],
  },
];

export interface ResolveCategoryOptions {
  merchant?: string;
  direction: 'credit' | 'debit';
  rules?: MerchantCategoryRule[];
  categories?: Category[];
}

/**
 * Deterministically resolves a Category ID for a transaction candidate.
 */
export function resolveCategory(options: ResolveCategoryOptions): string {
  const { merchant, direction, rules = [], categories = DEFAULT_SYSTEM_CATEGORIES } = options;
  const activeCategories = categories.filter((c) => c.isActive && c.type === (direction === 'debit' ? 'expense' : 'income'));
  const validCategoryIds = new Set(activeCategories.map((c) => c.id));

  const normalizedMerchant = (merchant || '').toLowerCase().trim();

  // 1. Check user-defined MerchantCategoryRules if merchant is provided
  if (normalizedMerchant && rules.length > 0) {
    for (const rule of rules) {
      const ruleMerchant = rule.normalizedMerchant.toLowerCase().trim();
      if (ruleMerchant && normalizedMerchant.includes(ruleMerchant)) {
        if (validCategoryIds.has(rule.categoryId)) {
          return rule.categoryId;
        }
      }
    }
  }

  // 2. Debit / Expense keyword matching
  if (direction === 'debit') {
    if (normalizedMerchant) {
      for (const mapping of EXPENSE_CATEGORY_KEYWORDS) {
        if (validCategoryIds.has(mapping.categoryId)) {
          for (const kw of mapping.keywords) {
            if (normalizedMerchant.includes(kw)) {
              return mapping.categoryId;
            }
          }
        }
      }
    }

    // Default Expense Category
    if (validCategoryIds.has('cat_other')) return 'cat_other';
    return activeCategories[0]?.id || 'cat_other';
  }

  // 3. Credit / Income keyword matching
  if (normalizedMerchant) {
    if (normalizedMerchant.includes('refund') || normalizedMerchant.includes('cashback') || normalizedMerchant.includes('reversal')) {
      if (validCategoryIds.has('cat_refund')) return 'cat_refund';
    }
    if (normalizedMerchant.includes('salary') || normalizedMerchant.includes('payroll') || normalizedMerchant.includes('wages')) {
      if (validCategoryIds.has('cat_salary')) return 'cat_salary';
    }
    if (normalizedMerchant.includes('interest') || normalizedMerchant.includes('dividend')) {
      if (validCategoryIds.has('cat_interest')) return 'cat_interest';
    }
  }

  // Default Income Category
  if (validCategoryIds.has('cat_other_income')) return 'cat_other_income';
  return activeCategories[0]?.id || 'cat_other_income';
}
