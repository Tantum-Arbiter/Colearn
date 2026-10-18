/**
 * After a purchase or restore, the app asks the gateway to check the
 * subscription with RevenueCat, so paid downloads open at once instead of
 * waiting for the gateway's saved answer to age out. It never blocks the
 * purchase flow: a failed refresh is simply retried at the next download.
 */

import { refreshServerEntitlement } from '@/services/entitlement-refresh';
import { ApiClient } from '@/services/api-client';

jest.mock('@/services/api-client', () => ({
  ApiClient: { request: jest.fn(), isAuthenticated: jest.fn() },
}));

const request = ApiClient.request as jest.Mock;
const isAuthenticated = ApiClient.isAuthenticated as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  isAuthenticated.mockResolvedValue(true);
});

describe('refreshServerEntitlement', () => {
  it('asks the gateway to check with RevenueCat, and reports its answer', async () => {
    request.mockResolvedValue({ tier: 'premium', source: 'revenuecat' });

    await expect(refreshServerEntitlement()).resolves.toEqual({ tier: 'premium', source: 'revenuecat' });
    expect(request).toHaveBeenCalledWith('/api/entitlements/refresh', { method: 'POST' });
  });

  it('sends nothing the gateway could mistake for proof of purchase', async () => {
    request.mockResolvedValue({ tier: 'free', source: 'revenuecat' });

    await refreshServerEntitlement();

    expect(request.mock.calls[0][1]).not.toHaveProperty('body');
  });

  it('does nothing for a family that is not signed in', async () => {
    isAuthenticated.mockResolvedValue(false);

    await expect(refreshServerEntitlement()).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('never throws when the gateway cannot be reached', async () => {
    request.mockRejectedValue(new Error('offline'));

    await expect(refreshServerEntitlement()).resolves.toBeNull();
  });

  it('never throws when the sign-in check itself fails', async () => {
    isAuthenticated.mockRejectedValue(new Error('keychain'));

    await expect(refreshServerEntitlement()).resolves.toBeNull();
  });
});
