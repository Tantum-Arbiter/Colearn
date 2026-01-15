/**
 * Mock for expo-localization
 * Returns English (US) locale by default
 */

module.exports = {
  getLocales: jest.fn(() => [
    {
      languageCode: 'en',
      languageTag: 'en-US',
      textDirection: 'ltr',
      digitGroupingSeparator: ',',
      decimalSeparator: '.',
      measurementSystem: 'us',
      currencyCode: 'USD',
      currencySymbol: '$',
      regionCode: 'US',
    },
  ]),
  getCalendars: jest.fn(() => [
    {
      calendar: 'gregorian',
      timeZone: 'America/New_York',
      uses24hourClock: false,
      firstWeekday: 1,
    },
  ]),
  locale: 'en-US',
  locales: ['en-US'],
  timezone: 'America/New_York',
  isRTL: false,
  region: 'US',
};

