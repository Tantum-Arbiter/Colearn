/**
 * Tests for the account screen's navigation, focused on what changed when the
 * reminders flow moved into the Screen Time window.
 *
 * The account screen no longer routes to reminders at all: it opens Screen
 * Time, and the schedule window lives inside that. What it must still do is
 * notice a reminder change reported from in there and commit it on the way out.
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert, Dimensions, ScrollView, StyleSheet } from 'react-native';

import { AccountScreen } from '@/components/account/account-screen';
import { navClearance } from '@/components/child-ui/child-bottom-navigation';
import { SleepingSkyFace } from '@/components/account/sleeping-sky-face';
import { heroContentTop, heroSunFrame } from '@/constants/home-sky';
import { reminderService } from '@/services/reminder-service';
import { GUIDE_STEPS } from '@/constants/owl-guide';
import { ApiClient } from '@/services/api-client';

const mockTimeOfDay = jest.fn(() => 'night');

jest.mock('@/hooks/use-time-of-day', () => ({
  useTimeOfDay: () => mockTimeOfDay(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RN = require('react-native');
  const AnimatedView = React.forwardRef((props: any, ref: any) =>
    React.createElement(RN.View, { ...props, ref })
  );
  return {
    __esModule: true,
    default: { View: AnimatedView, Text: RN.Text, createAnimatedComponent: (c: any) => c },
    useSharedValue: jest.fn((v: any) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((v: any) => v),
    withSpring: jest.fn((v: any) => v),
    withSequence: jest.fn((...steps: any[]) => steps[steps.length - 1]),
    withDelay: jest.fn((_ms: number, a: any) => a),
    interpolate: jest.fn((v: any) => v),
    useAnimatedProps: jest.fn(() => ({})),
    useDerivedValue: jest.fn((fn: any) => ({ value: fn() })),
    withRepeat: jest.fn((a: any) => a),
    cancelAnimation: jest.fn(),
    Easing: { out: jest.fn((e: any) => e), in: jest.fn((e: any) => e), inOut: jest.fn((e: any) => e), cubic: jest.fn(), sin: jest.fn(), linear: jest.fn() },
    runOnJS: jest.fn((fn: any) => fn),
  };
});

// the header is the only place the current view is observable from outside
jest.mock('@/components/ui/page-header', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    PageHeader: ({ title, onBack, rightActionIcon, onRightAction }: any) => (
      <View testID="page-header">
        <Text testID="page-title">{title}</Text>
        <Pressable testID="header-back" onPress={onBack} />
        {rightActionIcon ? <Pressable testID="header-right" onPress={onRightAction} /> : null}
      </View>
    ),
  };
});

// the schedule now lives inside Screen Time; this stub is how a change from in
// there reaches the account screen
jest.mock('@/components/screen-time/screen-time-screen', () => {
  const { View, Pressable } = require('react-native');
  return {
    ScreenTimeContent: ({ onReminderChange }: any) => (
      <View testID="screen-time-content">
        <Pressable testID="content-change" onPress={onReminderChange} />
      </View>
    ),
  };
});

// if either of these ever renders again, the account screen has grown its own
// reminders route back
jest.mock('@/components/reminders', () => {
  const { View } = require('react-native');
  return {
    CustomRemindersContent: () => <View testID="account-reminders-list" />,
    CreateReminderContent: () => <View testID="account-reminders-create" />,
  };
});

jest.mock('@/components/account/terms-conditions-screen', () => ({ TermsConditionsContent: () => null }));
jest.mock('@/components/account/privacy-policy-screen', () => ({ PrivacyPolicyContent: () => null }));
jest.mock('@/components/account/edit-profile-screen', () => {
  const { View } = require('react-native');
  return { EditProfileContent: () => <View testID="edit-profile-content" /> };
});
const mockOwlGuide: { props: any } = { props: null };
jest.mock('@/components/owl-guide', () => ({
  OwlGuide: (props: any) => {
    mockOwlGuide.props = props;
    return null;
  },
}));
jest.mock('@/components/main-menu/animated-components', () => ({ MoonBottomImage: () => null }));

jest.mock('@/services/subscription-service', () => ({
  restorePurchases: jest.fn().mockResolvedValue({ success: true }),
  isDevMode: () => true,
  forgetAccount: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/screen-time-service', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getScreenTimeStats: jest.fn().mockResolvedValue({ todayUsage: 0, dailyLimit: 3600 }),
      getDailyLimit: jest.fn(() => 3600),
      clearAllData: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
jest.mock('@/components/screen-time/screen-time-provider', () => ({
  useScreenTime: () => ({ todayUsage: 0, refreshUsage: jest.fn() }),
}));
jest.mock('@/services/api-client', () => ({
  ApiClient: { isAuthenticated: jest.fn().mockResolvedValue(false) },
}));
jest.mock('@/services/secure-storage', () => ({ SecureStorage: { clearAll: jest.fn() } }));
jest.mock('@/services/reminder-service', () => ({
  reminderService: {
    hasUnsavedChanges: jest.fn(() => false),
    commitChanges: jest.fn().mockResolvedValue(undefined),
    revertChanges: jest.fn().mockResolvedValue(undefined),
    syncToBackend: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/services/story-sync-service', () => ({ StorySyncService: { getInstance: () => ({}) } }));
jest.mock('@/services/version-manager', () => ({ VersionManager: { getInstance: () => ({}) } }));
jest.mock('@/services/device-info-service', () => ({ DeviceInfoService: { getAppVersion: () => '1.2.0', getVersionLabel: () => '1.2.0 (42)' } }));
jest.mock('@/services/cache-manager', () => ({ CacheManager: { getInstance: () => ({ clearAll: jest.fn() }) } }));
jest.mock('@/services/story-loader', () => ({ StoryLoader: { getInstance: () => ({}) } }));
jest.mock('@/contexts/owl-guide-context', () => ({
  useOwlGuide: () => ({ resetGuides: jest.fn(() => Promise.resolve()), lastResetTimestamp: 0 }),
}));
jest.mock('@/services/notification-service', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockNotificationService,
  },
}));
jest.mock('@/services/i18n', () => ({
  SUPPORTED_LANGUAGES: [{ code: 'en', flag: '🇬🇧', name: 'English', nativeName: 'English' }],
  setStoredLanguage: jest.fn().mockResolvedValue(undefined),
  languageFlag: () => '🇬🇧',
  baseLanguage: (code: string) => code?.split('-')[0],
}));

const mockVoiceSync = {
  isAvailable: jest.fn(() => true),
  enable: jest.fn().mockResolvedValue(true),
  disable: jest.fn().mockResolvedValue(true),
};
jest.mock('@/services/voice-sync-service', () => ({
  get VoiceSyncService() {
    return mockVoiceSync;
  },
}));

const mockNotificationService = {
  requestPermissions: jest.fn().mockResolvedValue({ granted: true }),
};

// reset in beforeEach: several tests need to drive the component from a
// different starting state (permission already asked for, reminders already
// on, guest mode) and the store mock is a plain object, not a hook -- without
// the reset those mutations leak into whatever runs next
const MUTABLE_STORE_DEFAULTS = {
  isGuestMode: false,
  screenTimeEnabled: true,
  notificationsEnabled: false,
  hasRequestedNotificationPermission: false,
  voiceSyncEnabled: false,
};

const mockStore = {
  userNickname: 'Liam',
  userAvatarType: 'boy',
  textSizeScale: 1,
  crashReportingEnabled: false,
  ...MUTABLE_STORE_DEFAULTS,
  setScreenTimeEnabled: jest.fn(),
  setNotificationsEnabled: jest.fn(),
  setNotificationPermissionRequested: jest.fn(),
  setTextSizeScale: jest.fn(),
  setCrashReportingEnabled: jest.fn(),
  setOnboardingComplete: jest.fn(),
  setLoginComplete: jest.fn(),
  setAppReady: jest.fn(),
  setShowLoginAfterOnboarding: jest.fn(),
  setGuestMode: jest.fn(),
  clearPersistedStorage: jest.fn(),
  clearUserProfile: jest.fn(),
  getEffectiveTier: () => 'free',
  _devSubscriptionOverride: null,
  setDevSubscriptionOverride: jest.fn(),
};
jest.mock('@/store/app-store', () => ({
  useAppStore: () => mockStore,
}));

const mockResetApp = jest.fn(() => Promise.resolve());
jest.mock('@/services/app-reset', () => ({ resetApp: () => mockResetApp() }));

const mockSession = { needsSignIn: false, login: jest.fn(), logout: jest.fn() };
jest.mock('@/hooks/use-session-actions', () => ({
  useSessionActions: () => mockSession,
}));

function byTestId(tree: ReturnType<typeof render>, testID: string): any[] {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function title(tree: ReturnType<typeof render>) {
  return byTestId(tree, 'page-title')[0].props.children;
}

function press(tree: ReturnType<typeof render>, testID: string) {
  fireEvent.press(byTestId(tree, testID)[0]);
}

/**
 * The smart-reminders handler awaits the permission request before it writes
 * anything. Under fake timers waitFor never advances, so its microtask chain
 * has to be flushed by hand.
 */
async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** The slide-out sets the new view on a timer, so tests have to let it land. */
function settleSlide() {
  act(() => {
    jest.advanceTimersByTime(400);
  });
}

function renderAccount(onBack = jest.fn()) {
  return { tree: render(<AccountScreen onBack={onBack} />), onBack };
}

describe('AccountScreen navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    Object.assign(mockStore, MUTABLE_STORE_DEFAULTS);
    mockNotificationService.requestPermissions.mockResolvedValue({ granted: true });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(false);
    (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens the terms from the foot of the account list', () => {
    const { tree } = renderAccount();

    press(tree, 'account-terms');

    expect(title(tree)).toBe('account.termsAndConditions');
  });

  it('opens the privacy policy from the foot of the account list', () => {
    const { tree } = renderAccount();

    press(tree, 'account-privacy');

    expect(title(tree)).toBe('account.privacyPolicy');
  });

  it('returns to the account list from the terms', () => {
    const { tree, onBack } = renderAccount();
    press(tree, 'account-terms');

    press(tree, 'header-back');
    settleSlide();

    expect(title(tree)).toBe('');
    expect(byTestId(tree, 'account-heading').length).toBeGreaterThan(0);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('leaves the account screen from the list', () => {
    const { tree, onBack } = renderAccount();

    press(tree, 'header-back');

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  describe('screen time controls on the main settings page', () => {
    /** Render order, so "below"/"above" are real position checks. */
    function orderOf(tree: ReturnType<typeof render>, ids: string[]) {
      const hits = tree.UNSAFE_root.findAll((n: any) => ids.includes(n.props.testID));
      return hits.map((n: any) => n.props.testID);
    }

    it('shows both toggles', () => {
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-screen-time-toggle').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'account-smart-reminders-toggle').length).toBeGreaterThan(0);
    });

    it('places them below the accessibility options', () => {
      const { tree } = renderAccount();

      const order = orderOf(tree, [
        'account-text-size',
        'account-screen-time-toggle',
        'account-smart-reminders-toggle',
      ]);

      expect(order.indexOf('account-screen-time-toggle')).toBeGreaterThan(
        order.lastIndexOf('account-text-size')
      );
      expect(order.indexOf('account-smart-reminders-toggle')).toBeGreaterThan(
        order.lastIndexOf('account-screen-time-toggle')
      );
    });

    it('writes the screen time toggle straight to the store', () => {
      // the old copy inside ScreenTimeContent only ever set component state,
      // so the parent's choice was dropped on the way out -- here it persists
      const { tree } = renderAccount();

      press(tree, 'account-screen-time-toggle');

      expect(mockStore.setScreenTimeEnabled).toHaveBeenCalledWith(false);
    });

    it('writes it back on again', () => {
      mockStore.screenTimeEnabled = false;
      const { tree } = renderAccount();

      press(tree, 'account-screen-time-toggle');

      expect(mockStore.setScreenTimeEnabled).toHaveBeenCalledWith(true);
    });

    describe('smart reminders', () => {
      it('asks the OS the first time it is switched on, and enables on a grant', async () => {
        const { tree } = renderAccount();

        press(tree, 'account-smart-reminders-toggle');
        await flushAsync();

        expect(mockNotificationService.requestPermissions).toHaveBeenCalled();
        expect(mockStore.setNotificationPermissionRequested).toHaveBeenCalledWith(true);
        expect(mockStore.setNotificationsEnabled).toHaveBeenCalledWith(true);
      });

      it('stays off when the parent refuses permission', async () => {
        mockNotificationService.requestPermissions.mockResolvedValue({ granted: false });
        const { tree } = renderAccount();

        press(tree, 'account-smart-reminders-toggle');
        await flushAsync();

        expect(mockStore.setNotificationPermissionRequested).toHaveBeenCalledWith(true);
        expect(mockStore.setNotificationsEnabled).not.toHaveBeenCalled();
      });

      it('does not ask again once permission has been requested', async () => {
        mockStore.hasRequestedNotificationPermission = true;
        const { tree } = renderAccount();

        press(tree, 'account-smart-reminders-toggle');
        await flushAsync();

        expect(mockStore.setNotificationsEnabled).toHaveBeenCalledWith(true);
        expect(mockNotificationService.requestPermissions).not.toHaveBeenCalled();
      });

      it('switches off without asking for permission', async () => {
        mockStore.notificationsEnabled = true;
        const { tree } = renderAccount();

        press(tree, 'account-smart-reminders-toggle');
        await flushAsync();

        expect(mockStore.setNotificationsEnabled).toHaveBeenCalledWith(false);
        expect(mockNotificationService.requestPermissions).not.toHaveBeenCalled();
      });
    });
  });

  describe('keeping recordings on every device', () => {
    const buttons = () => (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; onPress?: () => void }[];

    it('is offered to a signed-in family, off until a grown-up turns it on', () => {
      const { tree } = renderAccount();

      const toggle = byTestId(tree, 'account-voice-sync-toggle')[0];
      expect(toggle).toBeTruthy();
      expect(toggle.props.accessibilityState).toEqual({ checked: false });
    });

    it('shows when it is on', () => {
      mockStore.voiceSyncEnabled = true;
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-voice-sync-toggle')[0].props.accessibilityState).toEqual({ checked: true });
    });

    it('is not offered to a guest, whose recordings have no account to go to', () => {
      mockStore.isGuestMode = true;
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-voice-sync-toggle')).toHaveLength(0);
    });

    it('is not offered in a build without it', () => {
      mockVoiceSync.isAvailable.mockReturnValueOnce(false);
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-voice-sync-toggle')).toHaveLength(0);
    });

    it('explains what is kept, and where, before turning it on', async () => {
      const { tree } = renderAccount();

      press(tree, 'account-voice-sync-toggle');

      expect(Alert.alert).toHaveBeenCalledWith('account.voiceSync.enableTitle', 'account.voiceSync.enableMessage', expect.any(Array));
      expect(mockVoiceSync.enable).not.toHaveBeenCalled();
      await act(async () => {
        buttons().find((b) => b.text === 'account.voiceSync.enable')?.onPress?.();
      });
      expect(mockVoiceSync.enable).toHaveBeenCalledTimes(1);
    });

    it('says so when it could not be turned on', async () => {
      mockVoiceSync.enable.mockResolvedValueOnce(false);
      const { tree } = renderAccount();

      press(tree, 'account-voice-sync-toggle');
      await act(async () => {
        await buttons().find((b) => b.text === 'account.voiceSync.enable')?.onPress?.();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('account.voiceSync.failed');
    });

    it.each([
      ['account.voiceSync.keepCopies', false],
      ['account.voiceSync.removeCopies', true],
    ])('turns off with "%s", removing the online copies: %s', async (choice, removeOnlineCopies) => {
      mockStore.voiceSyncEnabled = true;
      const { tree } = renderAccount();

      press(tree, 'account-voice-sync-toggle');
      expect(Alert.alert).toHaveBeenCalledWith('account.voiceSync.disableTitle', 'account.voiceSync.disableMessage', expect.any(Array));
      await act(async () => {
        await buttons().find((b) => b.text === choice)?.onPress?.();
      });

      expect(mockVoiceSync.disable).toHaveBeenCalledWith({ removeOnlineCopies });
    });
  });

  describe('signing out', () => {
    afterEach(() => {
      mockSession.needsSignIn = false;
    });

    it('offers a signed-in family Log out here, behind the question that guards the page', () => {
      const { tree } = renderAccount();

      const logout = byTestId(tree, 'account-logout').find((n: any) => n.props.accessibilityRole === 'button');
      expect(logout.props.accessibilityLabel).toBe('common.logout');
      fireEvent.press(logout);

      expect(mockSession.logout).toHaveBeenCalledTimes(1);
      expect(mockSession.login).not.toHaveBeenCalled();
    });

    it('offers whoever needs to sign in no Log out, and no Login either: that is on the Profile page', () => {
      mockSession.needsSignIn = true;
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-logout')).toHaveLength(0);
      expect(byTestId(tree, 'account-login')).toHaveLength(0);
    });
  });

  it('shows the version, with the store build beside it, at the foot of the page', () => {
    const { tree } = renderAccount();

    const line = byTestId(tree, 'account-version').find((n: any) => typeof n.type === 'string' || n.props.children);
    expect([line.props.children].flat().join('')).toBe('common.version 1.2.0 (42)');
  });

  describe('resetting the app', () => {
    function confirmReset() {
      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[(Alert.alert as jest.Mock).mock.calls.length - 1];

      return buttons.find((button: { style?: string }) => button.style === 'destructive').onPress();
    }

    it('asks before it resets anything', () => {
      const { tree } = renderAccount();

      press(tree, 'account-reset-app');

      expect(Alert.alert).toHaveBeenCalled();
      expect(mockResetApp).not.toHaveBeenCalled();
    });

    it('resets to a fresh install once confirmed, so the journey starts again at the splash', async () => {
      const { tree } = renderAccount();
      press(tree, 'account-reset-app');

      await act(async () => {
        await confirmReset();
      });

      expect(mockResetApp).toHaveBeenCalledTimes(1);
    });
  });

  describe('reminders no longer have pages here', () => {
    it('renders neither reminders page', () => {
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-reminders-list')).toHaveLength(0);
      expect(byTestId(tree, 'account-reminders-create')).toHaveLength(0);
    });

    it('offers no add action in the header, on either view', () => {
      const { tree } = renderAccount();
      expect(byTestId(tree, 'header-right')).toHaveLength(0);

      press(tree, 'account-terms');

      expect(byTestId(tree, 'header-right')).toHaveLength(0);
    });
  });

  describe('what Grown-ups leaves to other pages', () => {
    it('has no Screen Time button: the ring on home opens that', () => {
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-screen-time')).toHaveLength(0);
      expect(byTestId(tree, 'screen-time-content')).toHaveLength(0);
    });

    it('has no Edit Profile button: the Profile page edits the profile', () => {
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-edit-profile')).toHaveLength(0);
      expect(byTestId(tree, 'edit-profile-content')).toHaveLength(0);
      expect(tree.UNSAFE_root.findAll((node: any) => node.props.children === 'common.editProfile')).toHaveLength(0);
    });

    it('has no language button: the flag on home picks the language', () => {
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-language')).toHaveLength(0);
      expect(byTestId(tree, 'language-picker')).toHaveLength(0);
    });

    it('keeps the screen time switches on the page itself', () => {
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-screen-time-toggle').length).toBeGreaterThan(0);
    });

    it('leaves straight away, with nothing of the removed pages left to save', () => {
      const { tree, onBack } = renderAccount();

      press(tree, 'header-back');

      expect(onBack).toHaveBeenCalledTimes(1);
      expect(reminderService.commitChanges).not.toHaveBeenCalled();
    });
  });
});

describe('AccountScreen background', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    Object.assign(mockStore, MUTABLE_STORE_DEFAULTS);
    (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);
    mockTimeOfDay.mockReturnValue('day');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('carries on the journey pages\' night, with no band of another colour behind the header', () => {
    const { tree } = renderAccount();

    const header = tree.UNSAFE_root.findAll((node: any) => 'onBack' in node.props && 'title' in node.props)[0];

    expect(byTestId(tree, 'settings-sky-backdrop').length).toBeGreaterThan(0);
    expect(header.props.headerBackgroundColor).toBeUndefined();
  });

  it('has no moon at the foot of the page', () => {
    const { MoonBottomImage } = jest.requireMock('@/components/main-menu/animated-components');
    const { tree } = renderAccount();

    expect(tree.UNSAFE_queryAllByType(MoonBottomImage)).toHaveLength(0);
  });
});

describe('AccountScreen sleeping sky', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    Object.assign(mockStore, MUTABLE_STORE_DEFAULTS);
    (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function face(tree: ReturnType<typeof render>) {
    return tree.UNSAFE_root.findAll((node: any) => node.type === SleepingSkyFace || node.type === (SleepingSkyFace as any).type)[0];
  }

  it.each(['day', 'night'] as const)('hands the sleeping face home\'s time of day (%s), so it sleeps the other one', (timeOfDay) => {
    mockTimeOfDay.mockReturnValue(timeOfDay);

    const { tree } = renderAccount();

    expect(face(tree).props.timeOfDay).toBe(timeOfDay);
  });

  it('hangs it exactly where home hangs its sun', () => {
    const { width, height } = Dimensions.get('window');
    const sun = heroSunFrame(width, height, 0);

    const { tree } = renderAccount();
    const sky = StyleSheet.flatten(byTestId(tree, 'account-sky')[0].props.style);

    expect(face(tree).props.size).toBe(sun.size);
    expect(sky.paddingTop).toBe(sun.top);
    expect(sky.alignItems).toBe('center');
  });

  it('starts the page below it, as home starts its welcome below the sun', () => {
    const { width, height } = Dimensions.get('window');
    const sun = heroSunFrame(width, height, 0);

    const { tree } = renderAccount();
    const sky = StyleSheet.flatten(byTestId(tree, 'account-sky')[0].props.style);

    expect(sky.height).toBe(heroContentTop(0, sun.size));
  });

  it('scrolls it away with the rest of the page', () => {
    const { tree } = renderAccount();

    const scroll = tree.UNSAFE_root.findAll((node: any) => node.type === ScrollView)[0];

    expect(scroll.findAll((node: any) => node.type === (SleepingSkyFace as any).type)).toHaveLength(1);
  });

  it('titles the page under it, leaving the top of the header clear for it', () => {
    const { tree } = renderAccount();

    const heading = byTestId(tree, 'account-heading')[0];

    expect(heading.props.children).toBe('account.title');
    expect(title(tree)).toBe('');
  });

  it('still titles each page inside Grown-ups in the header', () => {
    const { tree } = renderAccount();

    press(tree, 'account-privacy');

    expect(title(tree)).toBe('account.privacyPolicy');
  });

  it('offers a way back up rather than a way home, since it leads back to where it was opened', () => {
    const { tree } = renderAccount();

    const header = tree.UNSAFE_root.findAll((node: any) => 'onBack' in node.props && 'title' in node.props)[0];

    expect(header.props.useBackArrow).toBe(true);
    expect(header.props.useHomeIcon).toBeFalsy();
  });
});

/**
 * The walkthrough lights each control it talks about, so the page hands it a
 * ref for every one and lets it move the page to bring a low one clear of the
 * bubble. Refs never fill under this renderer, so the hand-over is asserted.
 */
describe('AccountScreen walkthrough', () => {
  beforeEach(() => {
    mockOwlGuide.props = null;
    Object.assign(mockStore, MUTABLE_STORE_DEFAULTS);
  });

  it('runs the Grown-ups walkthrough', () => {
    render(<AccountScreen onBack={jest.fn()} />);

    expect(mockOwlGuide.props.id).toBe('settings_walkthrough');
  });

  it('hands over a target for every control the walkthrough points at', () => {
    render(<AccountScreen onBack={jest.fn()} />);

    const wanted = GUIDE_STEPS.settings_walkthrough.flatMap((step) => (step.target ? [step.target] : []));

    expect(Object.keys(mockOwlGuide.props.targets ?? {}).sort()).toEqual([...wanted].sort());
  });

  it('lets the walkthrough move the page, so a low control is not hidden behind the owl', () => {
    const tree = render(<AccountScreen onBack={jest.fn()} />);

    expect(typeof mockOwlGuide.props.scroller?.reveal).toBe('function');
    expect(typeof mockOwlGuide.props.scroller?.release).toBe('function');
    expect(typeof tree.UNSAFE_getByType(ScrollView).props.onScroll).toBe('function');
  });
});

/**
 * The page padded a fifth of the screen under its last row and bounced: a
 * swipe threw every row up under the header and left the lower third of the
 * screen empty. It now scrolls only as far as its content actually runs past
 * the screen, plus the journey bar's clearance, and stops there.
 */
describe('AccountScreen scrolling', () => {
  function scrollOf(tree: ReturnType<typeof render>) {
    return tree.UNSAFE_getByType(ScrollView);
  }

  it('leaves the journey bar its clearance under the last row, not a fifth of the screen', () => {
    const tree = render(<AccountScreen onBack={jest.fn()} />);

    const padding = StyleSheet.flatten(scrollOf(tree).props.contentContainerStyle).paddingBottom as number;

    // the test window has no height, so the old fifth-of-the-screen would
    // read as nothing here: the bound is fixed instead
    expect(padding).toBe(navClearance(0));
  });

  it('does not bounce past its ends, so the rows stay in place', () => {
    const tree = render(<AccountScreen onBack={jest.fn()} />);

    expect(scrollOf(tree).props.bounces).toBe(false);
    expect(scrollOf(tree).props.overScrollMode).toBe('never');
  });
});

/**
 * Grown-ups is a journey page like the rest, so the bar stays at its foot
 * (operator report 2026-09-22: it hid there). The Profile lamp stays lit,
 * since Grown-ups lies below the Profile page, and every other item is a page
 * the main menu can send to; Screensafe is this page's own screen-time card.
 */
describe('AccountScreen journey bar', () => {
  function navItem(tree: ReturnType<typeof render>, id: string) {
    return tree.UNSAFE_root.findAll((n: any) => n.props.testID === `navigation-item-${id}` && n.props.accessibilityRole === 'tab')[0];
  }

  it('keeps the journey bar at its foot, for the account page, with Profile lit', () => {
    const tree = render(<AccountScreen onBack={jest.fn()} />);

    const bar = tree.UNSAFE_root.findAll((n: any) => n.props.slotKey === 'account')[0];
    expect(bar).toBeDefined();
    expect(bar.props.selected).toBe('profile');
  });

  it.each([
    ['home', 'stories'],
    ['progress', 'progress'],
    ['search', 'search'],
    ['profile', 'profile'],
  ])('sends a tap on %s to the %s page', (id, destination) => {
    const onNavigate = jest.fn();
    const tree = render(<AccountScreen onBack={jest.fn()} onNavigate={onNavigate} />);

    fireEvent.press(navItem(tree, id));

    expect(onNavigate).toHaveBeenCalledWith(destination);
  });

  it('keeps Screensafe on this page rather than leaving it', () => {
    const onNavigate = jest.fn();
    const tree = render(<AccountScreen onBack={jest.fn()} onNavigate={onNavigate} />);

    fireEvent.press(navItem(tree, 'screensafe'));

    expect(onNavigate).not.toHaveBeenCalled();
  });
});
