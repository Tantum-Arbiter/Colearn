export const AuthRequest = jest.fn().mockImplementation(() => ({
  promptAsync: jest.fn().mockResolvedValue({
    type: 'success',
    params: { code: 'mock-auth-code' },
  }),
}));

AuthRequest.createRandomCodeChallenge = jest.fn().mockResolvedValue({
  codeChallenge: 'mock-code-challenge',
  codeVerifier: 'mock-code-verifier',
});

export const exchangeCodeAsync = jest.fn().mockResolvedValue({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  idToken: 'mock-id-token',
  expiresIn: 3600,
});

export const makeRedirectUri = jest.fn().mockReturnValue('exp://localhost:19000/--/auth');

export const ResponseType = {
  Code: 'code',
};

export const CodeChallengeMethod = {
  S256: 'S256',
};

export default {
  AuthRequest,
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
  CodeChallengeMethod,
};
