/**
 * The door a UI test opens to put the app in a known state.
 *
 * It is a development-only door: in a shipped build the link is read and
 * thrown away, so nothing a child (or anyone else) taps can rewrite the state
 * of the app from outside.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUIDE_IDS } from '@/constants/owl-guide';
import { applyE2eState, isE2eAllowed, parseE2eLink } from '@/services/e2e-state';

const mockStore = {
  setOnboardingComplete: jest.fn(),
  setLoginComplete: jest.fn(),
  setGuestMode: jest.fn(),
  setShowLoginAfterOnboarding: jest.fn(),
  setDevSubscriptionOverride: jest.fn(),
  setChildAge: jest.fn(),
  setUserProfile: jest.fn(),
  clearPersistedStorage: jest.fn(),
};

jest.mock('@/store/app-store', () => ({
  useAppStore: { getState: () => mockStore },
}));

const mockResetTodayUsage = jest.fn().mockResolvedValue(undefined);
jest.mock('@/services/screen-time-service', () => ({
  __esModule: true,
  default: { getInstance: () => ({ resetTodayUsage: mockResetTodayUsage }) },
}));

const mockSetStoredLanguage = jest.fn().mockResolvedValue(undefined);
jest.mock('@/services/i18n', () => ({
  ...jest.requireActual('@/services/i18n'),
  setStoredLanguage: (language: string) => mockSetStoredLanguage(language),
}));

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
      'growwithfreya://?e2e=1&reset=1&onboarded=1&guest=1&tutorials=done&screenTime=reset&language=de&tier=premium&childAgeMonths=48&nickname=Freya'
    );

    expect(underTest).toEqual({
      reset: true,
      onboarded: true,
      guest: true,
      tutorials: 'done',
      screenTime: 'reset',
      language: 'de',
      tier: 'premium',
      childAgeMonths: 48,
      nickname: 'Freya',
    });
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
  });

  it('gives the tours back for a flow that wants to see one', async () => {
    await applyE2eState({ tutorials: 'fresh' }, true);

    const [, value] = (AsyncStorage.setItem as jest.Mock).mock.calls.find(([name]) => name === '@tutorial_state');
    expect(JSON.parse(value).completedGuides).toEqual([]);
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
});
