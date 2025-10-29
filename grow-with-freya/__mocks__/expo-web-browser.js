export const openBrowserAsync = jest.fn().mockResolvedValue({
  type: 'cancel',
});

export const dismissBrowser = jest.fn().mockResolvedValue();

export const openAuthSessionAsync = jest.fn().mockResolvedValue({
  type: 'success',
  url: 'exp://localhost:19000/--/auth?code=mock-auth-code',
});

export const WebBrowserResultType = {
  CANCEL: 'cancel',
  DISMISS: 'dismiss',
  OPENED: 'opened',
  LOCKED: 'locked',
};

export default {
  openBrowserAsync,
  dismissBrowser,
  openAuthSessionAsync,
  WebBrowserResultType,
};
