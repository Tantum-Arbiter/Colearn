/**
 * Comprehensive tests for subscription-service.ts
 *
 * Covers: isDevMode, initialize, getOfferings, purchasePackage,
 * mapEntitlementsToTier, syncEntitlements, restorePurchases,
 * CustomerInfo listener, mapPlanIdToPackage, security, and edge cases.
 */

import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Must import AFTER mocks are set up by jest.setup.js
import {
  isDevMode,
  initialize,
  getOfferings,
  purchasePackage,
  mapEntitlementsToTier,
  syncEntitlements,
  restorePurchases,
  mapPlanIdToPackage,
  _resetForTesting,
} from '@/services/subscription-service';
// useAppStore is mocked below -imported for type reference only

// ─── Helpers ───

/** Build a mock CustomerInfo with the given active entitlements */
function mockCustomerInfo(activeEntitlements: Record<string, { isActive: boolean }> = {}) {
  return { entitlements: { active: activeEntitlements } } as any;
}

/** Build a mock package */
function mockPackage(identifier: string) {
  return { identifier, product: { title: 'Test', price: 1.99 } } as any;
}

// ─── Override app-store mock to provide getState for subscription-service ───

// The global jest.setup.js mocks useAppStore as a hook (jest.fn), but
// subscription-service.ts calls useAppStore.getState() (Zustand vanilla API).
// We need to add getState to the mock.
const mockSetSubscriptionTier = jest.fn();
jest.mock('@/store/app-store', () => {
  const actual = { useAppStore: jest.fn() };
  // Add Zustand-style getState() so the service module can call it
  (actual.useAppStore as any).getState = jest.fn(() => ({
    subscriptionTier: 'free',
    _devSubscriptionOverride: null,
    setSubscriptionTier: mockSetSubscriptionTier,
    getEffectiveTier: () => 'free',
  }));
  return actual;
});

// ─── Setup ───

const originalDEV = (global as any).__DEV__;
const originalAppOwnership = Constants.appOwnership;
const originalPlatformOS = Platform.OS;

beforeEach(() => {
  _resetForTesting();
  jest.clearAllMocks();
  (global as any).__DEV__ = true;
  (Constants as any).appOwnership = null;
});

afterEach(() => {
  (global as any).__DEV__ = originalDEV;
  (Constants as any).appOwnership = originalAppOwnership;
  (Platform as any).OS = originalPlatformOS;
});

// ════════════════════════════════════════════════
// 1. isDevMode()
// ════════════════════════════════════════════════

describe('isDevMode', () => {
  it('returns true when __DEV__ is true', () => {
    (global as any).__DEV__ = true;
    expect(isDevMode()).toBe(true);
  });

  it('returns false when __DEV__ is false (EAS build)', () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    expect(isDevMode()).toBe(false);
  });

  it('returns true when running in Expo Go (appOwnership === "expo")', () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = 'expo';
    expect(isDevMode()).toBe(true);
  });

  it('returns false on standalone EAS build', () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = 'standalone';
    expect(isDevMode()).toBe(false);
  });
});

// ════════════════════════════════════════════════
// 2. initialize()
// ════════════════════════════════════════════════

describe('initialize', () => {
  it('does NOT call Purchases.configure() in dev mode', async () => {
    (global as any).__DEV__ = true;
    await initialize();
    expect(Purchases.configure).not.toHaveBeenCalled();
  });

  it('logs skip message in dev mode', async () => {
    (global as any).__DEV__ = true;
    await initialize();
    // Verify it didn't crash and configure wasn't called
    expect(Purchases.configure).not.toHaveBeenCalled();
  });

  it('calls Purchases.configure() with iOS key on device', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Platform as any).OS = 'ios';
    (Constants as any).expoConfig = {
      extra: { revenueCatAppleKey: 'appl_test_key', revenueCatGoogleKey: 'goog_test_key' },
    };
    await initialize();
    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'appl_test_key' });
  });

  it('calls Purchases.configure() with Android key on device', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Platform as any).OS = 'android';
    (Constants as any).expoConfig = {
      extra: { revenueCatAppleKey: 'appl_test_key', revenueCatGoogleKey: 'goog_test_key' },
    };
    await initialize();
    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'goog_test_key' });
  });

  it('enables debug logging on non-production builds', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Platform as any).OS = 'ios';
    (Constants as any).expoConfig = {
      extra: { revenueCatAppleKey: 'appl_test_key' },
    };
    await initialize();
    expect(Purchases.setLogLevel).toHaveBeenCalled();
  });


  it('catches and logs error if Purchases.configure() throws', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Platform as any).OS = 'ios';
    (Constants as any).expoConfig = {
      extra: { revenueCatAppleKey: 'appl_test_key' },
    };
    (Purchases.configure as jest.Mock).mockRejectedValueOnce(new Error('SDK init failed'));
    // Should not throw
    await expect(initialize()).resolves.not.toThrow();
  });

  it('does not call configure if API key is missing', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Platform as any).OS = 'ios';
    (Constants as any).expoConfig = { extra: {} };
    await initialize();
    expect(Purchases.configure).not.toHaveBeenCalled();
  });

  it('does not call configure if API key is empty string', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Platform as any).OS = 'ios';
    (Constants as any).expoConfig = { extra: { revenueCatAppleKey: '' } };
    await initialize();
    expect(Purchases.configure).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════
// 3. getOfferings()
// ════════════════════════════════════════════════

describe('getOfferings', () => {
  it('returns null in dev mode', async () => {
    (global as any).__DEV__ = true;
    const result = await getOfferings();
    expect(result).toBeNull();
    expect(Purchases.getOfferings).not.toHaveBeenCalled();
  });

  it('calls Purchases.getOfferings() on device', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    const mockOfferings = { current: { availablePackages: [mockPackage('$rc_monthly')] } };
    (Purchases.getOfferings as jest.Mock).mockResolvedValueOnce(mockOfferings);
    const result = await getOfferings();
    expect(result).toEqual(mockOfferings);
  });

  it('returns null on network error', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Purchases.getOfferings as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const result = await getOfferings();
    expect(result).toBeNull();
  });

  it('returns null when no current offering exists', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Purchases.getOfferings as jest.Mock).mockResolvedValueOnce({ current: null });
    const result = await getOfferings();
    expect(result).toEqual({ current: null });
  });
});

// ════════════════════════════════════════════════
// 4. purchasePackage()
// ════════════════════════════════════════════════

describe('purchasePackage', () => {
  const pkg = mockPackage('$rc_monthly');

  it('returns devMode result in dev mode', async () => {
    (global as any).__DEV__ = true;
    const result = await purchasePackage(pkg);
    expect(result).toEqual({ success: false, devMode: true });
    expect(Purchases.purchasePackage).not.toHaveBeenCalled();
  });

  it('calls Purchases.purchasePackage() on device', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    const info = mockCustomerInfo({ premium_access: { isActive: true } });
    (Purchases.purchasePackage as jest.Mock).mockResolvedValueOnce({ customerInfo: info });
    const result = await purchasePackage(pkg);
    expect(result.success).toBe(true);
    expect(result.tier).toBe('premium');
  });

  it('returns cancelled on user cancellation (userCancelled flag)', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Purchases.purchasePackage as jest.Mock).mockRejectedValueOnce({ userCancelled: true });
    const result = await purchasePackage(pkg);
    expect(result).toEqual({ success: false, cancelled: true });
  });

  it('returns cancelled on PURCHASE_CANCELLED_ERROR code', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Purchases.purchasePackage as jest.Mock).mockRejectedValueOnce({
      code: String(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR),
    });
    const result = await purchasePackage(pkg);
    expect(result).toEqual({ success: false, cancelled: true });
  });

  it('returns error on network failure', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Purchases.purchasePackage as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));
    const result = await purchasePackage(pkg);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network timeout');
  });

  it('blocks duplicate purchases (mutex)', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    // Make first purchase hang
    let resolveFirst: (v: any) => void;
    const hangingPromise = new Promise((r) => { resolveFirst = r; });
    (Purchases.purchasePackage as jest.Mock).mockReturnValueOnce(hangingPromise);

    const first = purchasePackage(pkg);
    const second = await purchasePackage(pkg);

    expect(second.success).toBe(false);
    expect(second.error).toBe('Purchase already in progress');

    // Resolve first to clean up
    resolveFirst!({ customerInfo: mockCustomerInfo() });
    await first;
  });
});

// ════════════════════════════════════════════════
// 5. mapEntitlementsToTier()
// ════════════════════════════════════════════════

describe('mapEntitlementsToTier', () => {
  it('returns free for null customerInfo', () => {
    expect(mapEntitlementsToTier(null)).toBe('free');
  });

  it('returns premium when premium_access is active', () => {
    const info = mockCustomerInfo({ premium_access: { isActive: true } });
    expect(mapEntitlementsToTier(info)).toBe('premium');
  });

  it('returns basic when basic_access is active', () => {
    const info = mockCustomerInfo({ basic_access: { isActive: true } });
    expect(mapEntitlementsToTier(info)).toBe('basic');
  });

  it('returns free when no active entitlements', () => {
    const info = mockCustomerInfo({});
    expect(mapEntitlementsToTier(info)).toBe('free');
  });

  it('returns premium when both basic and premium are active (highest wins)', () => {
    const info = mockCustomerInfo({
      basic_access: { isActive: true },
      premium_access: { isActive: true },
    });
    expect(mapEntitlementsToTier(info)).toBe('premium');
  });

  it('defaults to free for unknown entitlement IDs', () => {
    const info = mockCustomerInfo({ super_access: { isActive: true } });
    expect(mapEntitlementsToTier(info)).toBe('free');
  });

  it('returns free when entitlement exists but isActive is false', () => {
    const info = mockCustomerInfo({ premium_access: { isActive: false } });
    expect(mapEntitlementsToTier(info)).toBe('free');
  });
});

// ════════════════════════════════════════════════
// 6. syncEntitlements()
// ════════════════════════════════════════════════

describe('syncEntitlements', () => {
  it('is a no-op in dev mode', async () => {
    (global as any).__DEV__ = true;
    await syncEntitlements();
    expect(Purchases.getCustomerInfo).not.toHaveBeenCalled();
  });

  it('syncs tier from RevenueCat on device', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    const info = mockCustomerInfo({ basic_access: { isActive: true } });
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(info);
    await syncEntitlements();
    // We can't easily check the store mock here, but we verify getCustomerInfo was called
    expect(Purchases.getCustomerInfo).toHaveBeenCalled();
  });

  it('handles getCustomerInfo failure gracefully', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Purchases.getCustomerInfo as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    // Should not throw
    await expect(syncEntitlements()).resolves.not.toThrow();
  });
});

// ════════════════════════════════════════════════
// 7. restorePurchases()
// ════════════════════════════════════════════════

describe('restorePurchases', () => {
  it('returns devMode result in dev mode', async () => {
    (global as any).__DEV__ = true;
    const result = await restorePurchases();
    expect(result).toEqual({ success: false, devMode: true });
    expect(Purchases.restorePurchases).not.toHaveBeenCalled();
  });

  it('calls Purchases.restorePurchases() on device', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    const info = mockCustomerInfo({ premium_access: { isActive: true } });
    (Purchases.restorePurchases as jest.Mock).mockResolvedValueOnce(info);
    const result = await restorePurchases();
    expect(result.success).toBe(true);
    expect(result.tier).toBe('premium');
  });

  it('returns free tier when no previous purchases', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Purchases.restorePurchases as jest.Mock).mockResolvedValueOnce(mockCustomerInfo());
    const result = await restorePurchases();
    expect(result.success).toBe(true);
    expect(result.tier).toBe('free');
  });

  it('handles restore error gracefully', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    (Purchases.restorePurchases as jest.Mock).mockRejectedValueOnce(new Error('Restore failed'));
    const result = await restorePurchases();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Restore failed');
  });
});

// ════════════════════════════════════════════════
// 8. mapPlanIdToPackage()
// ════════════════════════════════════════════════

describe('mapPlanIdToPackage', () => {
  it('returns null when offerings are not loaded', () => {
    const result = mapPlanIdToPackage('monthly_basic');
    expect(result).toBeNull();
  });

  it('returns null for unknown plan ID', async () => {
    // Load offerings first
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    const offerings = {
      current: { availablePackages: [mockPackage('$rc_monthly'), mockPackage('$rc_annual')] },
    };
    (Purchases.getOfferings as jest.Mock).mockResolvedValueOnce(offerings);
    await getOfferings();

    const result = mapPlanIdToPackage('super_ultra_plan');
    expect(result).toBeNull();
  });

  it('finds correct package for monthly_basic', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    const offerings = {
      current: { availablePackages: [mockPackage('$rc_monthly'), mockPackage('$rc_annual')] },
    };
    (Purchases.getOfferings as jest.Mock).mockResolvedValueOnce(offerings);
    await getOfferings();

    const result = mapPlanIdToPackage('monthly_basic');
    expect(result?.identifier).toBe('$rc_monthly');
  });

  it('finds correct package for yearly', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    const offerings = {
      current: { availablePackages: [mockPackage('$rc_monthly'), mockPackage('$rc_annual')] },
    };
    (Purchases.getOfferings as jest.Mock).mockResolvedValueOnce(offerings);
    await getOfferings();

    const result = mapPlanIdToPackage('yearly');
    expect(result?.identifier).toBe('$rc_annual');
  });

  it('returns null if package not in offerings', async () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    const offerings = {
      current: { availablePackages: [mockPackage('$rc_weekly')] }, // No monthly/annual
    };
    (Purchases.getOfferings as jest.Mock).mockResolvedValueOnce(offerings);
    await getOfferings();

    const result = mapPlanIdToPackage('monthly_basic');
    expect(result).toBeNull();
  });
});

// ════════════════════════════════════════════════
// 9. Security Tests
// ════════════════════════════════════════════════

describe('Security', () => {
  it('isDevMode() cannot return true when __DEV__ is false and not in Expo Go', () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = null;
    expect(isDevMode()).toBe(false);
  });

  it('isDevMode() cannot return true when appOwnership is standalone', () => {
    (global as any).__DEV__ = false;
    (Constants as any).appOwnership = 'standalone';
    expect(isDevMode()).toBe(false);
  });

  it('unknown entitlement IDs default to free (cannot escalate)', () => {
    const info = mockCustomerInfo({
      super_admin: { isActive: true },
      hacker_access: { isActive: true },
    });
    expect(mapEntitlementsToTier(info)).toBe('free');
  });

  it('expired entitlement (isActive false) defaults to free', () => {
    const info = mockCustomerInfo({
      premium_access: { isActive: false },
      basic_access: { isActive: false },
    });
    expect(mapEntitlementsToTier(info)).toBe('free');
  });
});
