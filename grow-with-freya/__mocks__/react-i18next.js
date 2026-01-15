/**
 * Mock for react-i18next
 * Provides a simple translation function that returns the key
 */

const React = require('react');

const useTranslation = () => ({
  t: (key, options) => {
    // If there are interpolation options, append them to the key
    if (options && typeof options === 'object') {
      const interpolated = Object.entries(options)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      return `${key} (${interpolated})`;
    }
    return key;
  },
  i18n: {
    language: 'en',
    changeLanguage: jest.fn().mockResolvedValue(undefined),
    getFixedT: jest.fn(() => (key) => key),
    hasLoadedNamespace: jest.fn().mockReturnValue(true),
    loadNamespaces: jest.fn().mockResolvedValue(undefined),
    t: (key) => key,
  },
  ready: true,
});

const Trans = ({ children, i18nKey }) => {
  if (i18nKey) {
    return React.createElement(React.Fragment, null, i18nKey);
  }
  return React.createElement(React.Fragment, null, children);
};

const I18nextProvider = ({ children }) => {
  return React.createElement(React.Fragment, null, children);
};

const initReactI18next = {
  type: '3rdParty',
  init: jest.fn(),
};

module.exports = {
  useTranslation,
  Trans,
  I18nextProvider,
  initReactI18next,
  withTranslation: () => (Component) => {
    Component.defaultProps = { ...Component.defaultProps, t: (key) => key };
    return Component;
  },
};

