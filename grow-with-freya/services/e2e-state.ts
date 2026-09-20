import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUIDE_IDS, GUIDE_STORAGE_KEY } from '@/constants/owl-guide';
import ScreenTimeService from '@/services/screen-time-service';
import { SUPPORTED_LANGUAGES, setStoredLanguage, type SupportedLanguage } from '@/services/i18n';
import { useAppStore, type SubscriptionTier } from '@/store/app-store';

const TIERS: SubscriptionTier[] = ['free', 'basic', 'premium'];
const SEED_AVATAR = { type: 'girl', id: 'bear' } as const;

export interface E2eState {
  reset?: boolean;
  onboarded?: boolean;
  guest?: boolean;
  tutorials?: 'done' | 'fresh';
  screenTime?: 'reset';
  language?: SupportedLanguage;
  tier?: SubscriptionTier;
  childAgeMonths?: number;
  nickname?: string;
}

export function isE2eAllowed(isDevBuild: boolean, extra: unknown): boolean {
  if (isDevBuild) return true;

  return typeof extra === 'object' && extra !== null && (extra as { e2e?: unknown }).e2e === true;
}

function flag(value: string | null): boolean | undefined {
  if (value === null) return undefined;

  return value !== '0' && value.toLowerCase() !== 'false';
}

export function parseE2eLink(link: string): E2eState | null {
  if (!/^[a-z0-9.+-]+:\/\//i.test(link) || /^https?:/i.test(link)) return null;

  const query = link.includes('?') ? link.slice(link.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  if (flag(params.get('e2e')) !== true) return null;

  const state: E2eState = {};

  const reset = flag(params.get('reset'));
  if (reset !== undefined) state.reset = reset;

  const onboarded = flag(params.get('onboarded'));
  if (onboarded !== undefined) state.onboarded = onboarded;

  const guest = flag(params.get('guest'));
  if (guest !== undefined) state.guest = guest;

  const tutorials = params.get('tutorials');
  if (tutorials === 'done' || tutorials === 'fresh') state.tutorials = tutorials;

  if (params.get('screenTime') === 'reset') state.screenTime = 'reset';

  const language = params.get('language');
  if (SUPPORTED_LANGUAGES.some((supported) => supported.code === language)) {
    state.language = language as SupportedLanguage;
  }

  const tier = params.get('tier');
  if (TIERS.includes(tier as SubscriptionTier)) state.tier = tier as SubscriptionTier;

  const age = Number(params.get('childAgeMonths'));
  if (params.get('childAgeMonths') !== null && Number.isFinite(age) && age > 0) state.childAgeMonths = age;

  const nickname = params.get('nickname');
  if (nickname) state.nickname = nickname;

  return state;
}

export async function applyE2eState(state: E2eState, allowed: boolean): Promise<void> {
  if (!allowed) return;

  const store = useAppStore.getState();

  if (state.reset) {
    await store.clearPersistedStorage();
  }

  if (state.onboarded !== undefined) {
    store.setOnboardingComplete(state.onboarded);
    store.setLoginComplete(state.onboarded);
    store.setShowLoginAfterOnboarding(false);
  }

  if (state.guest !== undefined) {
    store.setGuestMode(state.guest);
  }

  if (state.tutorials !== undefined) {
    const completedGuides = state.tutorials === 'done' ? [...GUIDE_IDS] : [];
    await AsyncStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify({ completedGuides, lastResetTimestamp: Date.now() }));
  }

  if (state.screenTime === 'reset') {
    await ScreenTimeService.getInstance().resetTodayUsage();
  }

  if (state.language) {
    await setStoredLanguage(state.language);
  }

  if (state.tier) {
    store.setDevSubscriptionOverride(state.tier);
  }

  if (state.nickname) {
    store.setUserProfile(state.nickname, SEED_AVATAR.type, SEED_AVATAR.id);
  }

  if (state.childAgeMonths !== undefined) {
    store.setChildAge(state.childAgeMonths);
  }
}
