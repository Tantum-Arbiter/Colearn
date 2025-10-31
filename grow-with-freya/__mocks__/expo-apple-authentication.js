export const isAvailableAsync = jest.fn().mockResolvedValue(true);

export const signInAsync = jest.fn().mockResolvedValue({
  user: 'apple-user-123',
  email: 'test@privaterelay.appleid.com',
  fullName: {
    givenName: 'Test',
    familyName: 'User',
  },
  identityToken: 'mock-identity-token',
  authorizationCode: 'mock-auth-code',
});

export const AppleAuthenticationScope = {
  FULL_NAME: 0,
  EMAIL: 1,
};

export const AppleAuthenticationResponseType = {
  ALL: 0,
};

export default {
  isAvailableAsync,
  signInAsync,
  AppleAuthenticationScope,
  AppleAuthenticationResponseType,
};
