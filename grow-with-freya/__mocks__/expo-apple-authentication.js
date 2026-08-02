module.exports = {
  signInAsync: jest.fn(() => Promise.resolve({ identityToken: 'mock-identity-token' })),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 0, WHITE: 1 },
};
