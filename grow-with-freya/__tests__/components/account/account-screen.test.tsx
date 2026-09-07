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
import { Alert } from 'react-native';

import { AccountScreen } from '@/components/account/account-screen';
import { reminderService } from '@/services/reminder-service';
import { ApiClient } from '@/services/api-client';

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
    default: { View: AnimatedView, createAnimatedComponent: (c: any) => c },
    useSharedValue: jest.fn((v: any) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((v: any) => v),
    withRepeat: jest.fn((a: any) => a),
    cancelAnimation: jest.fn(),
    Easing: { out: jest.fn((e: any) => e), in: jest.fn((e: any) => e), cubic: jest.fn() },
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
jest.mock('@/components/account/edit-profile-screen', () => ({ EditProfileContent: () => null }));
jest.mock('@/components/owl-guide', () => ({ OwlGuide: () => null }));
jest.mock('@/components/main-menu/animated-components', () => ({ MoonBottomImage: () => null }));
jest.mock('@/components/main-menu/styles', () => ({ mainMenuStyles: { bearContainer: {} } }));

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
  SUPPORTED_LANGUAGES: [{ code: 'en', flag: '🇬🇧', name: 'English' }],
  setStoredLanguage: jest.fn().mockResolvedValue(undefined),
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

  it('opens Screen Time from the account list', () => {
    const { tree } = renderAccount();

    press(tree, 'account-screen-time');

    expect(title(tree)).toBe('account.screenTime');
  });

  it('returns to the account list from Screen Time', () => {
    const { tree, onBack } = renderAccount();
    press(tree, 'account-screen-time');

    press(tree, 'header-back');
    settleSlide();

    expect(title(tree)).toBe('account.title');
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

      press(tree, 'account-screen-time');

      expect(byTestId(tree, 'header-right')).toHaveLength(0);
    });

    it('never titles itself with a reminders page', () => {
      const { tree } = renderAccount();

      press(tree, 'account-screen-time');
      press(tree, 'content-change');

      expect(title(tree)).toBe('account.screenTime');
    });
  });

  describe('unsaved reminder changes', () => {
    it('re-checks the live service rather than trusting the cached state it captured', () => {
      // the outer gate is a snapshot taken when the counter last bumped; the
      // actual commit re-reads the service fresh -- if that live read has
      // since gone back to false, nothing should be committed even though
      // the cached snapshot still says there was a change
      const { tree, onBack } = renderAccount();
      press(tree, 'account-screen-time');

      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(true);
      press(tree, 'content-change'); // snapshot captured as true

      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(false); // live state now false

      press(tree, 'header-back');
      settleSlide();
      press(tree, 'header-back');

      expect(reminderService.commitChanges).not.toHaveBeenCalled();
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('syncs to the backend when the parent is signed in', async () => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(true);
      const { tree, onBack } = renderAccount();
      press(tree, 'account-screen-time');

      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(true);
      press(tree, 'content-change');

      press(tree, 'header-back');
      settleSlide();
      press(tree, 'header-back');

      // the sync is a fire-and-forget async IIFE -- fake timers don't advance
      // its microtask chain on their own, so flush it by hand
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(reminderService.syncToBackend).toHaveBeenCalledTimes(1);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('does not sync to the backend when the parent is not signed in', async () => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);
      const { tree } = renderAccount();
      press(tree, 'account-screen-time');

      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(true);
      press(tree, 'content-change');

      press(tree, 'header-back');
      settleSlide();
      press(tree, 'header-back');

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(ApiClient.isAuthenticated).toHaveBeenCalled();
      expect(reminderService.syncToBackend).not.toHaveBeenCalled();
    });

    it('commits them when the parent leaves', () => {
      const { tree, onBack } = renderAccount();
      press(tree, 'account-screen-time');

      // a reminder was changed inside the schedule window
      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(true);
      press(tree, 'content-change');

      press(tree, 'header-back');
      settleSlide();
      press(tree, 'header-back');

      // the commit is fired synchronously on the way out, before onBack
      expect(reminderService.commitChanges).toHaveBeenCalledTimes(1);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('commits nothing when no reminder was touched', () => {
      const { tree, onBack } = renderAccount();
      press(tree, 'account-screen-time');
      press(tree, 'content-change');

      press(tree, 'header-back');
      settleSlide();
      press(tree, 'header-back');

      expect(reminderService.commitChanges).not.toHaveBeenCalled();
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });
});
