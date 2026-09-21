/**
 * Tests for the prices shown before RevenueCat answers.
 *
 * The screen used to print "£5.99 / $5.99" and leave the parent to work out
 * which one they would be charged. One currency is shown now, chosen from the
 * device -- and the store's own localised price replaces it either way, so
 * the job here is to be plausible rather than authoritative.
 */

import * as Localization from 'expo-localization';

import {
  fallbackAnnualOriginal,
  fallbackCurrency,
  fallbackPrices,
} from '@/constants/fallback-prices';

const mockGetLocales = Localization.getLocales as jest.Mock;

function deviceCurrency(currencyCode: string | null) {
  mockGetLocales.mockReturnValue([{ languageCode: 'en', currencyCode }]);
}

describe('fallbackCurrency', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['GBP', 'GBP'],
    ['EUR', 'EUR'],
    ['USD', 'USD'],
  ])('follows the device currency %s', (code, expected) => {
    deviceCurrency(code);

    expect(fallbackCurrency()).toBe(expected);
  });

  /** The store defaults to dollars for anywhere it has no local price. */
  it.each(['JPY', 'PLN', 'AUD'])('falls back to dollars for %s', (code) => {
    deviceCurrency(code);

    expect(fallbackCurrency()).toBe('USD');
  });

  it('falls back to dollars when the device reports no currency', () => {
    deviceCurrency(null);

    expect(fallbackCurrency()).toBe('USD');
  });

  it('falls back to dollars when the platform cannot answer', () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error('no locale');
    });

    expect(fallbackCurrency()).toBe('USD');
  });
});

describe('fallbackPrices', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * One symbol per price. The negative half is the point: a price carrying
   * two currencies is the thing this replaced.
   */
  it.each([
    ['GBP', '£', ['$', '€']],
    ['EUR', '€', ['$', '£']],
    ['USD', '$', ['£', '€']],
  ])('prices every plan in %s alone', (code, symbol, others) => {
    deviceCurrency(code);

    const prices = Object.values(fallbackPrices()).concat(fallbackAnnualOriginal());

    for (const price of prices) {
      expect(price).toContain(symbol);
      for (const other of others) expect(price).not.toContain(other);
    }
  });

  it('prices all three plans', () => {
    deviceCurrency('GBP');

    expect(Object.keys(fallbackPrices()).sort()).toEqual(['monthly_basic', 'monthly_premium', 'yearly']);
  });
});
