/**
 * SubscriptionService -RevenueCat integration with dev/sandbox safeguards.
 *
 * Two modes, cleanly separated by a single gate (`isDevMode()`):
 *
 * | Environment                  | How subscriptions work                              | Real payments? |
 * |------------------------------|------------------------------------------------------|----------------|
 * | Local dev (__DEV__ / Expo Go)| Existing Zustand tier override in Developer Options  | No             |
 * | EAS build (physical device)  | RevenueCat sandbox -Apple/Google sandbox testers    | No (sandbox)   |
 *
 * Subscription management is handled by Apple Settings / Google Play Store.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  type PurchasesOfferings,
  type PurchasesPackage,
  type CustomerInfo,
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { useAppStore, type SubscriptionTier } from '@/store/app-store';
import { SecureStorage } from './secure-storage';
import { trialDaysRemaining, type TrialStatus } from '@/constants/trial-end';
import { Logger } from '@/utils/logger';

const log = Logger.create('SubscriptionService');

const ENTITLEMENT_IDS = {
  PREMIUM: 'premium_access',
  BASIC: 'basic_access',
} as const;

const PACKAGE_MAP: Record<string, string> = {
  monthly_basic: '$rc_monthly_basic',
  monthly_premium: '$rc_monthly',
  yearly: '$rc_annual',
};

export interface PurchaseResult {
  success: boolean;
  cancelled?: boolean;
  devMode?: boolean;
  error?: string;
  tier?: SubscriptionTier;
}


const NO_TRIAL: TrialStatus = { inTrial: false, daysRemaining: 0, endsAt: null, billingTier: 'free' };

let _initialized = false;
let _purchaseInFlight = false;
let _cachedOfferings: PurchasesOfferings | null = null;
let _identifiedAs: string | null = null;
let _settleConfigured: (configured: boolean) => void = () => undefined;
let _configured = new Promise<boolean>((resolve) => {
  _settleConfigured = resolve;
});

/** Single gate: true in Expo Go or local dev -RevenueCat is skipped entirely. */
export function isDevMode(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  if (Constants.appOwnership === 'expo') return true;
  return false;
}

/** Bootstrap RevenueCat SDK. Call once on app mount. No-op in dev mode. */
export async function initialize(): Promise<void> {
  if (_initialized) {
    log.debug('Already initialized, skipping');
    return;
  }
  if (isDevMode()) {
    log.info('Skipping RevenueCat -dev mode (use Developer Options to set tier)');
    _initialized = true;
    _settleConfigured(false);
    return;
  }
  const appleKey = Constants.expoConfig?.extra?.revenueCatAppleKey as string | undefined;
  const googleKey = Constants.expoConfig?.extra?.revenueCatGoogleKey as string | undefined;
  const apiKey = Platform.OS === 'ios' ? appleKey : googleKey;
  if (!apiKey) {
    log.error('RevenueCat API key not configured -subscriptions will not work');
    _initialized = true;
    _settleConfigured(false);
    return;
  }
  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    await Purchases.configure({ apiKey });
    _initialized = true;
    _settleConfigured(true);
    log.info('RevenueCat configured successfully');
    Purchases.addCustomerInfoUpdateListener(handleCustomerInfoUpdate);
    await syncEntitlements();
  } catch (err) {
    log.error('Failed to configure RevenueCat', err);
    _initialized = true;
    _settleConfigured(false);
  }
}

/**
 * Make the gateway account id RevenueCat's app user id, so purchases reach the gateway's
 * RevenueCat webhook under the account that made them. No-op in dev mode.
 */
export async function identifyAccount(userId: string): Promise<void> {
  if (isDevMode() || _identifiedAs === userId) return;
  if (!(await _configured)) return;
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    _identifiedAs = userId;
    useAppStore.getState().setSubscriptionTier(mapEntitlementsToTier(customerInfo));
  } catch (err) {
    log.warn('RevenueCat log-in failed; will try again next launch', err);
  }
}

export async function identifySignedInAccount(): Promise<void> {
  const user = await SecureStorage.getUserData();
  if (user?.id) await identifyAccount(user.id);
}

/** Return RevenueCat to an anonymous user on sign-out or account deletion. No-op in dev mode. */
export async function forgetAccount(): Promise<void> {
  if (isDevMode() || _identifiedAs === null) return;
  _identifiedAs = null;
  try {
    await Purchases.logOut();
  } catch (err) {
    log.warn('RevenueCat log-out failed', err);
  }
}

/** Fetch available subscription packages. Returns null in dev mode. */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (isDevMode()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    _cachedOfferings = offerings;
    return offerings;
  } catch (err) {
    log.error('Failed to fetch offerings', err);
    return null;
  }
}

/** Map a UI plan ID to a RevenueCat package from the current offering. */
export function mapPlanIdToPackage(planId: string): PurchasesPackage | null {
  if (!_cachedOfferings?.current) {
    log.warn('No offerings loaded -cannot map plan ID:', planId);
    return null;
  }
  const packages = _cachedOfferings.current.availablePackages;
  const rcIdentifier = PACKAGE_MAP[planId];
  if (!rcIdentifier) {
    log.warn('Unknown plan ID:', planId);
    return null;
  }
  const pkg = packages.find((p) => p.identifier === rcIdentifier);
  if (!pkg) {
    log.warn(`Package ${rcIdentifier} not found in offerings for plan: ${planId}`);
  }
  return pkg ?? null;
}


/** Execute a purchase. No-op in dev mode. Includes mutex to prevent double-tap. */
export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  if (isDevMode()) {
    log.info('Purchase skipped -dev mode');
    return { success: false, devMode: true };
  }
  if (_purchaseInFlight) {
    log.warn('Purchase already in flight -ignoring duplicate request');
    return { success: false, error: 'Purchase already in progress' };
  }
  _purchaseInFlight = true;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const tier = mapEntitlementsToTier(customerInfo);
    useAppStore.getState().setSubscriptionTier(tier);
    log.info(`Purchase successful -tier set to: ${tier}`);
    return { success: true, tier };
  } catch (err: unknown) {
    const rcError = err as { code?: string; userCancelled?: boolean };
    if (rcError.userCancelled || rcError.code === String(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)) {
      log.info('Purchase cancelled by user');
      return { success: false, cancelled: true };
    }
    const message = err instanceof Error ? err.message : 'Unknown purchase error';
    log.error('Purchase failed', err);
    return { success: false, error: message };
  } finally {
    _purchaseInFlight = false;
  }
}

/** Map RevenueCat entitlements to SubscriptionTier. Highest tier wins. */
export function mapEntitlementsToTier(customerInfo: CustomerInfo | null): SubscriptionTier {
  if (!customerInfo) return 'free';
  const entitlements = customerInfo.entitlements.active;
  if (entitlements[ENTITLEMENT_IDS.PREMIUM]?.isActive) return 'premium';
  if (entitlements[ENTITLEMENT_IDS.BASIC]?.isActive) return 'basic';
  const activeIds = Object.keys(entitlements);
  if (activeIds.length > 0) {
    log.warn('Unknown active entitlements -defaulting to free:', activeIds);
  }
  return 'free';
}

/**
 * Whether the store will still grant this plan's introductory offer.
 *
 * Answers "has this person already had their free trial?", which only the
 * store can settle -- a local flag would reset on reinstall and lie on a new
 * device. Every uncertain path returns true: while dev mode stands in for
 * RevenueCat, when the plan has no package, and when the check throws. Being
 * offered a trial the store then refuses is a recoverable disappointment;
 * being denied one you are entitled to is a lost customer.
 */
export async function isTrialAvailable(planId: string = 'monthly_basic'): Promise<boolean> {
  if (isDevMode()) return true;
  try {
    const pkg = mapPlanIdToPackage(planId);
    const productId = pkg?.product?.identifier;
    if (!productId) return true;

    const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
    const status = eligibility?.[productId]?.status;
    if (status === undefined) return true;

    return status !== INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE;
  } catch (err) {
    log.error('Failed to check trial eligibility', err);
    return true;
  }
}

/**
 * Where this person stands in a free trial, if they are in one.
 *
 * Only the store knows: a trial that started on another device, or before a
 * reinstall, leaves nothing behind locally. `periodType` is the honest signal
 * -- an entitlement is active during the trial exactly as it is after the
 * charge, and only the period says which of the two you are looking at.
 *
 * Dev mode has no RevenueCat to ask, so the Developer Options tier override
 * stands in: choosing Basic there converts the trial at the end of today,
 * which is the one state the trial-end screen is built to catch.
 */
export async function getTrialStatus(now: Date = new Date()): Promise<TrialStatus> {
  if (isDevMode()) {
    const override = useAppStore.getState()._devSubscriptionOverride;
    if (override !== 'basic') return NO_TRIAL;
    const endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
    return {
      inTrial: true,
      daysRemaining: trialDaysRemaining(endsAt, now),
      endsAt,
      billingTier: 'basic',
    };
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlements = customerInfo?.entitlements?.active;
    if (!entitlements) return NO_TRIAL;

    const trial = Object.values(entitlements).find(
      (entitlement) => entitlement?.isActive && entitlement.periodType === 'TRIAL',
    );
    if (!trial?.expirationDate) return NO_TRIAL;

    const endsAt = new Date(trial.expirationDate);
    if (Number.isNaN(endsAt.getTime())) return NO_TRIAL;

    return {
      inTrial: true,
      daysRemaining: trialDaysRemaining(endsAt, now),
      endsAt,
      billingTier: mapEntitlementsToTier(customerInfo),
    };
  } catch (err) {
    log.error('Failed to read trial status', err);
    return NO_TRIAL;
  }
}

/** Sync RevenueCat entitlements to Zustand store. No-op in dev mode. */
export async function syncEntitlements(): Promise<void> {
  if (isDevMode()) return;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const tier = mapEntitlementsToTier(customerInfo);
    useAppStore.getState().setSubscriptionTier(tier);
    log.debug(`Entitlements synced -tier: ${tier}`);
  } catch (err) {
    log.error('Failed to sync entitlements', err);
  }
}

/** Restore previous purchases. Apple requires this button for App Store approval. */
export async function restorePurchases(): Promise<PurchaseResult> {
  if (isDevMode()) {
    log.info('Restore skipped -dev mode');
    return { success: false, devMode: true };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    const tier = mapEntitlementsToTier(customerInfo);
    useAppStore.getState().setSubscriptionTier(tier);
    log.info(`Restore successful -tier: ${tier}`);
    return { success: true, tier };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown restore error';
    log.error('Restore failed', err);
    return { success: false, error: message };
  }
}

/** Handles subscription changes (renewals, expirations, upgrades/downgrades). */
function handleCustomerInfoUpdate(customerInfo: CustomerInfo): void {
  if (!customerInfo) {
    log.warn('Received null CustomerInfo update');
    return;
  }
  const tier = mapEntitlementsToTier(customerInfo);
  useAppStore.getState().setSubscriptionTier(tier);
  log.info(`CustomerInfo updated -tier: ${tier}`);
}

/** Price info for a single plan, pulled from RevenueCat offerings. */
export interface PlanPricing {
  priceString: string;          // e.g. "$9.99"
  introPrice?: string | null;   // e.g. "$0.99" for trial period
}

/**
 * Get live pricing from cached RC offerings for each plan.
 * Returns null per plan if no package found (or offerings not yet loaded).
 * The overlay uses this to replace hardcoded prices with store-localised ones.
 */
export function getOfferingPrices(): Record<string, PlanPricing | null> {
  const result: Record<string, PlanPricing | null> = {};
  const packages = _cachedOfferings?.current?.availablePackages;
  for (const [planId, rcId] of Object.entries(PACKAGE_MAP)) {
    const pkg = packages?.find((p) => p.identifier === rcId);
    if (pkg) {
      result[planId] = {
        priceString: pkg.product.priceString,
        introPrice: pkg.product.introPrice?.priceString ?? null,
      };
    } else {
      result[planId] = null;
    }
  }
  return result;
}

/** Reset internal state for testing. Do NOT use in production code. */
export function _resetForTesting(): void {
  _initialized = false;
  _purchaseInFlight = false;
  _cachedOfferings = null;
  _identifiedAs = null;
  _configured = new Promise<boolean>((resolve) => {
    _settleConfigured = resolve;
  });
}