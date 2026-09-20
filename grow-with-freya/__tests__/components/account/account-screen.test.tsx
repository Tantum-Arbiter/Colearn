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
import { SleepingSkyFace } from '@/components/account/sleeping-sky-face';
import { heroContentTop, heroSunFrame } from '@/constants/home-sky';
import { reminderService } from '@/services/reminder-service';
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
jest.mock('@/components/owl-guide', () => ({ OwlGuide: () => null }));
jest.mock('@/components/main-menu/animated-components', () => ({ MoonBottomImage: () => null }));

jest.mock('@/services/subscription-service', () => ({
  restorePurchases: jest.fn().mockResolvedValue({ success: true }),
  isDevMode: () => true,
}));
jest.mock('@/services/screen-time-service', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getScreenTimeStats: jest.fn().mockResolvedValue({ todayUsage: 0, dailyLimit: 3600 }),
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
jest.mock('@/services/device-info-service', () => ({ DeviceInfoService: { getAppVersion: () => '1.0.0' } }));
jest.mock('@/services/cache-manager', () => ({ CacheManager: { getInstance: () => ({ clearAll: jest.fn() }) } }));
jest.mock('@/services/story-loader', () => ({ StoryLoader: { getInstance: () => ({}) } }));
jest.mock('@/contexts/owl-guide-context', () => ({
  useOwlGuide: () => ({ resetGuides: jest.fn(), lastResetTimestamp: 0 }),
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

function byTestId(tree: ReturnType<typeof render>, testID: string) {
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

  describe('the login button', () => {
    it('sits above the language strip', () => {
      mockStore.isGuestMode = true;
      const { tree } = renderAccount();

      const hits = tree.UNSAFE_root.findAll((n: any) =>
        ['account-login', 'account-language'].includes(n.props.testID)
      );
      const order = hits.map((n: any) => n.props.testID);

      expect(order.indexOf('account-login')).toBeGreaterThanOrEqual(0);
      expect(order.indexOf('account-language')).toBeGreaterThan(
        order.lastIndexOf('account-login')
      );
    });

    it('still reaches the login flow from its new home', () => {
      mockStore.isGuestMode = true;
      const { tree } = renderAccount();

      press(tree, 'account-login');

      expect(mockStore.setShowLoginAfterOnboarding).toHaveBeenCalledWith(true);
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

    it('keeps the language button', () => {
      const { tree } = renderAccount();

      expect(byTestId(tree, 'account-language').length).toBeGreaterThan(0);
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
