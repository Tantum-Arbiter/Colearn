module.exports = {
  maybeCompleteAuthSession: jest.fn(),
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
  openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
  dismissBrowser: jest.fn(),
};
