export type PlanId = 'monthly_basic' | 'monthly_premium' | 'yearly';

export type FallbackCurrency = 'GBP' | 'EUR' | 'USD';

/**
 * Prices to show before RevenueCat answers, and in dev where it never does.
 *
 * The store's own localised `priceString` replaces every one of these as soon
 * as offerings load, so these exist to stop the screen flashing a price in
 * the wrong currency at a parent -- not to be authoritative. One currency is
 * shown, never a list: "£5.99 / $5.99" asks the reader to work out which of
 * the two they will actually be charged.
 */
const FALLBACK_PRICES: Record<FallbackCurrency, Record<PlanId, string>> = {
  GBP: { monthly_basic: '£5.99', monthly_premium: '£9.99', yearly: '£89.99' },
  EUR: { monthly_basic: '€5.99', monthly_premium: '€9.99', yearly: '€89.99' },
  USD: { monthly_basic: '$5.99', monthly_premium: '$9.99', yearly: '$89.99' },
};

const FALLBACK_ANNUAL_ORIGINAL: Record<FallbackCurrency, string> = {
  GBP: '£119.88',
  EUR: '€119.88',
  USD: '$119.88',
};

let Localization: { getLocales: () => { currencyCode?: string | null }[] } | null = null;
try {
  Localization = require('expo-localization');
} catch {
  // matches services/i18n.ts: the app runs without it, on the default currency
}

/**
 * The currency the device expects. Anything the app does not price in its own
 * currency falls back to dollars, which is what the store defaults to too.
 */
export function fallbackCurrency(): FallbackCurrency {
  try {
    const code = Localization?.getLocales()?.[0]?.currencyCode;
    if (code === 'GBP' || code === 'EUR') return code;
  } catch {
    // a locale the platform cannot report is not worth failing a paywall over
  }
  return 'USD';
}

export function fallbackPrices(): Record<PlanId, string> {
  return FALLBACK_PRICES[fallbackCurrency()];
}

export function fallbackAnnualOriginal(): string {
  return FALLBACK_ANNUAL_ORIGINAL[fallbackCurrency()];
}
