/**
 * The door a UI test opens to put the app in a known state.
 *
 * It is a development-only door: in a shipped build the link is read and
 * thrown away, so nothing a child (or anyone else) taps can rewrite the state
 * of the app from outside.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUIDE_IDS, guideRevision } from '@/constants/owl-guide';
import { localDayKey } from '@/constants/learning-plan';
import { ISLAND_WEEK } from '@/data/learning-plan';
import { applyE2eState, isE2eAllowed, parseE2eLink } from '@/services/e2e-state';

const mockStore = {
  setOnboardingComplete: jest.fn(),
  setLoginComplete: jest.fn(),
  setGuestMode: jest.fn(),
  setShowLoginAfterOnboarding: jest.fn(),
  setDevSubscriptionOverride: jest.fn(),
  setChildAge: jest.fn(),
  setUserProfile: jest.fn(),
  setLearningPlanProgress: jest.fn(),
  clearPersistedStorage: jest.fn(),
  storyProgress: { 'wombat': { pageIndex: 3, totalPages: 9, updatedAt: '2026-09-20T10:00:00Z' } },
  clearStoryProgress: jest.fn(),
};

jest.mock('@/store/app-store', () => ({
  useAppStore: { getState: () => mockStore },
}));

const mockResetTodayUsage = jest.fn().mockResolvedValue(undefined);
const mockResetWarningDate = jest.fn();
const mockStoreTokens = jest.fn().mockResolvedValue(undefined);
const mockStoreUserData = jest.fn().mockResolvedValue(undefined);
const mockClearAuthData = jest.fn().mockResolvedValue(undefined);
jest.mock('@/services/secure-storage', () => ({
  SecureStorage: {
    storeTokens: (...args: unknown[]) => mockStoreTokens(...args),
    storeUserData: (...args: unknown[]) => mockStoreUserData(...args),
    clearAuthData: () => mockClearAuthData(),
  },
}));

jest.mock('@/services/screen-time-service', () => ({
  __esModule: true,
  default: { getInstance: () => ({ resetTodayUsage: mockResetTodayUsage, getDailyLimit: () => 1800, resetWarningDate: mockResetWarningDate }) },
}));

const mockSetStoredLanguage = jest.fn().mockResolvedValue(undefined);
jest.mock('@/services/i18n', () => ({
  ...jest.requireActual('@/services/i18n'),
  setStoredLanguage: (language: string) => mockSetStoredLanguage(language),
}));

/**
 * The mock above stands in for a real class. If it grows a method the class
 * does not have, every test here passes while the app crashes on the device.
 */
describe('the storage this leans on', () => {
  it('has the methods the seeding calls', () => {
    const { SecureStorage: real } = jest.requireActual('@/services/secure-storage');

    ['storeTokens', 'storeUserData', 'clearAuthData'].forEach((method) => {
      expect(typeof real[method]).toBe('function');
    });
  });
});

describe('isE2eAllowed', () => {
  it('opens the door in a development build', () => {
    expect(isE2eAllowed(true, undefined)).toBe(true);
  });

  it('opens it in a build made for testing, which says so', () => {
    expect(isE2eAllowed(false, { e2e: true })).toBe(true);
  });

  it('keeps it shut in a shipped build', () => {
    expect(isE2eAllowed(false, undefined)).toBe(false);
    expect(isE2eAllowed(false, {})).toBe(false);
    expect(isE2eAllowed(false, { e2e: 'true' })).toBe(false);
  });
});

describe('parseE2eLink', () => {
  it('reads every part of a seeded state', () => {
    const underTest = parseE2eLink(
      'growwithfreya://?e2e=1&reset=1&onboarded=1&guest=1&signedIn=1&tutorials=done&screenTime=reset&progress=clear&language=de&tier=premium&childAgeMonths=48&nickname=Freya&planDone=3'
    );

    expect(underTest).toEqual({
      reset: true,
      onboarded: true,
      guest: true,
      signedIn: true,
      tutorials: 'done',
      screenTime: 'reset',
      progress: 'clear',
      language: 'de',
      tier: 'premium',
      childAgeMonths: 48,
      nickname: 'Freya',
      planDone: 3,
    });
  });

  it('reads how many days of the plan are done, within the week, and ignores anything else', () => {
    expect(parseE2eLink('growwithfreya://?e2e=1&planDone=0')).toEqual({ planDone: 0 });
    expect(parseE2eLink('growwithfreya://?e2e=1&planDone=7')).toEqual({ planDone: 7 });
    expect(parseE2eLink('growwithfreya://?e2e=1&planDone=8')).toEqual({});
    expect(parseE2eLink('growwithfreya://?e2e=1&planDone=-1')).toEqual({});
    expect(parseE2eLink('growwithfreya://?e2e=1&planDone=two')).toEqual({});
    expect(parseE2eLink('growwithfreya://?e2e=1&planDone=1.5')).toEqual({});
  });

  it('takes the app\'s own scheme and the development client\'s', () => {
    expect(parseE2eLink('com.growwithfreya.app://?e2e=1&onboarded=1')).toEqual({ onboarded: true });
    expect(parseE2eLink('growwithfreya://?e2e=1&onboarded=1')).toEqual({ onboarded: true });
  });

  it('is a link to the page the app already opens on, so the router has nothing to look up', () => {
    expect(parseE2eLink('growwithfreya://e2e?onboarded=1')).toBeNull();
  });

  it('is nothing at all for any other link', () => {
    ['growwithfreya://home', 'https://earlyroots.co.uk/?e2e=1&reset=1', 'growwithfreya://?e2e=0&reset=1', '', 'not a url']
      .forEach((link) => expect(parseE2eLink(link)).toBeNull());
  });

  it('leaves out what the link does not say', () => {
    expect(parseE2eLink('growwithfreya://?e2e=1&onboarded=1')).toEqual({ onboarded: true });
  });

  it('ignores a language or a plan it does not have', () => {
    expect(parseE2eLink('growwithfreya://?e2e=1&language=xx&tier=gold')).toEqual({});
  });

  it('ignores an age that is not a number', () => {
    expect(parseE2eLink('growwithfreya://?e2e=1&childAgeMonths=soon')).toEqual({});
  });

  it('reads a flag turned off as off', () => {
    expect(parseE2eLink('growwithfreya://?e2e=1&onboarded=0&guest=false')).toEqual({ onboarded: false, guest: false });
  });
});

describe('applyE2eState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });

  it('does nothing at all when the door is shut', async () => {
    await applyE2eState({ onboarded: true, tutorials: 'done' }, false);

    expect(mockStore.setOnboardingComplete).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('takes the app past onboarding as a guest', async () => {
    await applyE2eState({ onboarded: true, guest: true }, true);

    expect(mockStore.setOnboardingComplete).toHaveBeenCalledWith(true);
    expect(mockStore.setLoginComplete).toHaveBeenCalledWith(true);
    expect(mockStore.setShowLoginAfterOnboarding).toHaveBeenCalledWith(false);
    expect(mockStore.setGuestMode).toHaveBeenCalledWith(true);
  });

  it('puts the app back before onboarding when asked', async () => {
    await applyE2eState({ onboarded: false }, true);

    expect(mockStore.setOnboardingComplete).toHaveBeenCalledWith(false);
    expect(mockStore.setLoginComplete).toHaveBeenCalledWith(false);
  });

  it('marks every tour as seen, so no owl interrupts a flow', async () => {
    await applyE2eState({ tutorials: 'done' }, true);

    const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls.find(([name]) => name === '@tutorial_state');
    expect(key).toBe('@tutorial_state');
    expect(JSON.parse(value).completedGuides.sort()).toEqual([...GUIDE_IDS].sort());
    GUIDE_IDS.forEach((id) => expect(JSON.parse(value).seenRevisions[id]).toBe(guideRevision(id)));
  });

  it('gives the tours back for a flow that wants to see one', async () => {
    await applyE2eState({ tutorials: 'fresh' }, true);

    const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls.find(([name]) => name === '@tutorial_state');
    expect(JSON.parse(value).completedGuides).toEqual([]);
  });

  it('spends the whole day\'s allowance, for a flow about the limit being reached', async () => {
    await applyE2eState({ screenTime: 'spent' }, true);

    const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls.find(([name]) => name === 'screen_time_sessions');
    const sessions = JSON.parse(value);
    const today = new Date().toLocaleDateString('en-CA');

    expect(sessions).toHaveLength(1);
    expect(sessions[0].date).toBe(today);
    expect(sessions[0].duration).toBeGreaterThan(1800);
    // A filter prunes sessions that do not sit inside the day; noon always does.
    expect(new Date(sessions[0].startTime).getHours()).toBe(12);
    // The app warns once a day and remembers it while it runs; a seeded day has to clear that.
    expect(mockResetWarningDate).toHaveBeenCalledTimes(1);
  });

  it('clears the time already spent today', async () => {
    await applyE2eState({ screenTime: 'reset' }, true);

    expect(mockResetTodayUsage).toHaveBeenCalledTimes(1);
  });

  it('sets the language the flow asked for', async () => {
    await applyE2eState({ language: 'de' }, true);

    expect(mockSetStoredLanguage).toHaveBeenCalledWith('de');
  });

  it('puts the family on the plan the flow is about', async () => {
    await applyE2eState({ tier: 'premium' }, true);

    expect(mockStore.setDevSubscriptionOverride).toHaveBeenCalledWith('premium');
  });

  it('names the child and gives an age, for the pages that greet them', async () => {
    await applyE2eState({ nickname: 'Freya', childAgeMonths: 48 }, true);

    expect(mockStore.setUserProfile).toHaveBeenCalledWith('Freya', 'girl', 'bear');
    expect(mockStore.setChildAge).toHaveBeenCalledWith(48);
  });

  it('ticks off the first days of the plan as done yesterday, so the next opens today', async () => {
    await applyE2eState({ planDone: 2 }, true);

    expect(mockStore.setLearningPlanProgress).toHaveBeenCalledTimes(1);
    const progress = mockStore.setLearningPlanProgress.mock.calls[0][0] as { planId: string; completed: Record<string, string> };
    expect(progress.planId).toBe(ISLAND_WEEK.id);
    expect(Object.keys(progress.completed)).toEqual([ISLAND_WEEK.steps[0].id, ISLAND_WEEK.steps[1].id]);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    Object.values(progress.completed).forEach((stamp) => {
      expect(localDayKey(new Date(stamp))).toBe(localDayKey(yesterday));
    });
  });

  it('clears the plan when told no days are done', async () => {
    await applyE2eState({ planDone: 0 }, true);

    expect(mockStore.setLearningPlanProgress).toHaveBeenCalledWith(null);
  });

  it('wipes what was there first when asked to start clean', async () => {
    await applyE2eState({ reset: true, onboarded: true }, true);

    expect(mockStore.clearPersistedStorage).toHaveBeenCalledTimes(1);
    expect(mockStore.clearPersistedStorage.mock.invocationCallOrder[0])
      .toBeLessThan(mockStore.setOnboardingComplete.mock.invocationCallOrder[0]);
  });

  it('touches nothing the link did not mention', async () => {
    await applyE2eState({ language: 'en' }, true);

    expect(mockStore.setOnboardingComplete).not.toHaveBeenCalled();
    expect(mockStore.clearPersistedStorage).not.toHaveBeenCalled();
    expect(mockResetTodayUsage).not.toHaveBeenCalled();
    expect(mockStore.setDevSubscriptionOverride).not.toHaveBeenCalled();
  });

  it('signs a parent in without touching Google or Apple, which no stub can answer for', async () => {
    await applyE2eState({ signedIn: true, nickname: 'Freya' }, true);

    expect(mockStoreTokens).toHaveBeenCalledWith(expect.any(String), expect.any(String));
    expect(mockStoreUserData).toHaveBeenCalledWith(expect.objectContaining({ email: expect.stringContaining('@') }));
    expect(mockStore.setGuestMode).toHaveBeenCalledWith(false);
    expect(mockStore.setLoginComplete).toHaveBeenCalledWith(true);
  });

  it('signs a parent out again, taking the tokens with it', async () => {
    await applyE2eState({ signedIn: false }, true);

    expect(mockClearAuthData).toHaveBeenCalledTimes(1);
    expect(mockStoreTokens).not.toHaveBeenCalled();
    expect(mockStore.setLoginComplete).toHaveBeenCalledWith(false);
  });

  /**
   * Signing out is not the same as carrying on without an account: a flow
   * about the very first run needs neither a session nor guest mode, and used
   * to get guest mode anyway, which walks straight past onboarding.
   */
  it('leaves guest mode to the link that asks for it', async () => {
    await applyE2eState({ signedIn: false }, true);

    expect(mockStore.setGuestMode).not.toHaveBeenCalled();
  });

  it('leaves the session alone when the link says nothing about it', async () => {
    await applyE2eState({ language: 'en' }, true);

    expect(mockStoreTokens).not.toHaveBeenCalled();
    expect(mockClearAuthData).not.toHaveBeenCalled();
  });

  /**
   * The app reads the token's own expiry before every call and refreshes when
   * it is close. A token it cannot decode reads as expired, so a seeded
   * session that is not a real JWT sends the app round the refresh loop on
   * every request.
   */
  it('seeds a token the app can read an expiry from, well into the future', async () => {
    await applyE2eState({ signedIn: true }, true);

    const [accessToken] = mockStoreTokens.mock.calls[0];
    const [header, payload, signature] = accessToken.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64').toString());

    expect([header, payload, signature].every(Boolean)).toBe(true);
    expect(claims.exp * 1000).toBeGreaterThan(Date.now() + 24 * 60 * 60 * 1000);
  });

  it('puts every book back to its first page, so a flow opens a cover rather than where someone left off', async () => {
    await applyE2eState({ progress: 'clear' }, true);

    expect(mockStore.clearStoryProgress).toHaveBeenCalledWith('wombat');
  });

  it('leaves reading progress alone when the link does not mention it', async () => {
    await applyE2eState({ language: 'en' }, true);

    expect(mockStore.clearStoryProgress).not.toHaveBeenCalled();
  });
});
