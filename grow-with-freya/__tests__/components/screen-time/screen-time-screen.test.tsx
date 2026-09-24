import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as RN from 'react-native';

// ScheduleWindow renders through React Native's real Modal, which throws in
// this jsdom test environment when visible (see schedule-window.test.tsx for
// the full explanation) -- patched to a plain conditional View for every test
// in this file, the same way schedule-window.test.tsx patches it in isolation.
const RealModal = RN.Modal;
const MockScheduleModal = ({ visible, testID, children }: any) =>
  visible ? <RN.View testID={testID}>{children}</RN.View> : null;

beforeAll(() => {
  (RN as any).Modal = MockScheduleModal;
});

afterAll(() => {
  (RN as any).Modal = RealModal;
});
import { ScreenTimeScreen, ScreenTimeContent } from '../../../components/screen-time/screen-time-screen';
import { ScreenTimeProvider } from '../../../components/screen-time/screen-time-provider';
import { screenToActivityType } from '../../../components/screen-time/screen-time-provider';
import { useAppStore } from '../../../store/app-store';
import ScreenTimeService from '../../../services/screen-time-service';
import NotificationService from '../../../services/notification-service';
import { ApiClient } from '../../../services/api-client';
import { backgroundSaveService } from '@/services/background-save-service';
import { reminderService } from '../../../services/reminder-service';

// Mock dependencies
jest.mock('../../../store/app-store');
jest.mock('../../../services/screen-time-service');
jest.mock('../../../services/notification-service');
jest.mock('../../../components/screen-time/screen-time-provider', () => {
  const actual = jest.requireActual('../../../components/screen-time/screen-time-provider');
  return {
    ...actual,
    ScreenTimeProvider: ({ children }: { children: React.ReactNode }) => children,
    useScreenTime: () => ({
      isTracking: false,
      currentActivity: null,
      todayUsage: 300, // 5 minutes in seconds
      startActivity: jest.fn(),
      endActivity: jest.fn(),
      showWarning: jest.fn(),
      refreshUsage: jest.fn(),
      setLastCompletedActivityId: jest.fn(),
    }),
  };
});
// react-native maps to react-native-web here, so mocking
// react-native/Libraries/Alert/Alert never applied -- Alert.alert stayed the
// real function. It is spied per-test in beforeEach instead.
jest.mock('../../../services/api-client', () => ({
  ApiClient: { isAuthenticated: jest.fn().mockResolvedValue(false) },
}));
jest.mock('@/services/background-save-service', () => ({
  backgroundSaveService: { queueProfileSave: jest.fn() },
}));
jest.mock('../../../services/reminder-service', () => ({
  ReminderService: { formatTime: (time: string) => time },
  reminderService: {
    hasUnsavedChanges: jest.fn(() => false),
    getReminderStats: jest.fn().mockResolvedValue({
      totalReminders: 0,
      activeReminders: 0,
      upcomingToday: [],
    }),
    syncToBackend: jest.fn().mockResolvedValue(undefined),
    commitChanges: jest.fn().mockResolvedValue(undefined),
    revertChanges: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));
// Override Reanimated mock so animated styles don't hide elements in tests
// (the global mock executes style functions, producing opacity:0 / translateY:off-screen)
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RN = require('react-native');
  const AnimatedView = React.forwardRef((props: any, ref: any) => {
    const { style, children, ...rest } = props;
    return React.createElement(RN.View, { ...rest, ref, style }, children);
  });
  const AnimatedText = React.forwardRef((props: any, ref: any) => {
    const { style, children, ...rest } = props;
    return React.createElement(RN.Text, { ...rest, ref, style }, children);
  });
  return {
    __esModule: true,
    default: { View: AnimatedView, Text: AnimatedText, createAnimatedComponent: (c: any) => c },
    useSharedValue: jest.fn((v: any) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    useAnimatedProps: jest.fn(() => ({})),
    useDerivedValue: jest.fn((fn: any) => ({ value: fn() })),
    // the completion callback is how the dismiss animation reaches onDismiss;
    // dropping it made the modal look like it never dismissed
    withTiming: jest.fn((v: any, _config?: any, callback?: any) => {
      if (typeof callback === 'function') callback(true);
      return v;
    }),
    withSpring: jest.fn((v: any) => v),
    withDelay: jest.fn((_: any, v: any) => v),
    withRepeat: jest.fn((a: any) => a),
    withSequence: jest.fn((...a: any[]) => a[a.length - 1]),
    Easing: { out: jest.fn((e: any) => e), in: jest.fn((e: any) => e), inOut: jest.fn((e: any) => e), cubic: jest.fn(), quad: jest.fn(), sin: jest.fn(), back: jest.fn(), linear: jest.fn(), bezier: jest.fn() },
    cancelAnimation: jest.fn(),
    runOnJS: jest.fn((fn: any) => fn),
    interpolate: jest.fn((v: any) => v),
    createAnimatedComponent: (c: any) => c,
  };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, testID, style, ...rest }: any) => <View testID={testID} style={style}>{children}</View> };
});
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: (props: any) => <View {...props} /> };
});
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../components/main-menu/animated-components', () => ({
  MoonBottomImage: 'MoonBottomImage',
}));
jest.mock('../../../components/ui/music-control', () => ({
  MusicControl: 'MusicControl',
}));
jest.mock('../../../components/reminders', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    CustomRemindersScreen: 'CustomRemindersScreen',
    CreateReminderScreen: 'CreateReminderScreen',
    CustomRemindersContent: ({ onReminderChange }: any) => (
      <View testID="reminders-list">
        <Pressable testID="list-change" onPress={onReminderChange}>
          <Text>change</Text>
        </Pressable>
      </View>
    ),
    CreateReminderContent: () => <View testID="reminders-create" />,
  };
});
jest.mock('../../../store/app-store', () => ({
  useAppStore: jest.fn(() => ({
    childAgeInMonths: 24,
    screenTimeEnabled: false,
    notificationsEnabled: false,
    hasRequestedNotificationPermission: false,
    setChildAge: jest.fn(),
    setScreenTimeEnabled: jest.fn(),
    setNotificationsEnabled: jest.fn(),
    setNotificationPermissionRequested: jest.fn(),
  })),
}));

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;
const mockScreenTimeService = ScreenTimeService as jest.MockedClass<typeof ScreenTimeService>;
const mockNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;

describe('ScreenTimeScreen', () => {
  const mockOnBack = jest.fn();
  const mockSetChildAge = jest.fn();
  const mockSetScreenTimeEnabled = jest.fn();
  const mockSetNotificationsEnabled = jest.fn();
  const mockSetNotificationPermissionRequested = jest.fn();

  const mockScreenTimeServiceInstance = {
    getTodayUsage: jest.fn().mockResolvedValue(300), // 5 minutes in seconds
    getDailyLimit: jest.fn().mockReturnValue(3600), // 60 minutes in seconds
    getScreenTimeStats: jest.fn().mockResolvedValue({
      todayUsage: 300,
      weeklyUsage: [300, 400, 200, 500, 300, 600, 450],
      dailyAverages: {
        thisWeek: 400,
        lastWeek: 350,
      },
      recommendedSchedule: [
        { time: '09:00', duration: 30, activity: 'Educational content' },
        { time: '15:00', duration: 30, activity: 'Creative play' },
      ],
    }),
    getDailyTotals: jest.fn().mockResolvedValue([]),
    scheduleRecommendedReminders: jest.fn().mockResolvedValue(undefined),
    onWarning: jest.fn(),
    removeWarningCallback: jest.fn(),
    startSession: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationServiceInstance = {
    requestPermissions: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' }),
    scheduleRecommendedReminders: jest.fn().mockResolvedValue(undefined),
    getPermissionStatus: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' }),
    cancelAllScheduledNotifications: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAppStore.mockReturnValue({
      childAgeInMonths: 24,
      screenTimeEnabled: true,
      notificationsEnabled: false,
      hasRequestedNotificationPermission: false,
      setChildAge: mockSetChildAge,
      setScreenTimeEnabled: mockSetScreenTimeEnabled,
      setNotificationsEnabled: mockSetNotificationsEnabled,
      setNotificationPermissionRequested: mockSetNotificationPermissionRequested,
    } as any);

    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // clearAllMocks wipes calls but not implementations, so restore the
    // collaborator defaults or one test's override leaks into the next
    (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(false);
    (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);
    mockScreenTimeServiceInstance.getScreenTimeStats.mockResolvedValue({
      todayUsage: 300,
      weeklyUsage: [],
      dailyAverages: {},
      recommendedSchedule: [
        { time: '09:00', duration: 30, activity: 'story' },
      ],
      heatmapData: [],
    } as never);

    (mockScreenTimeService.getInstance as jest.Mock).mockReturnValue(mockScreenTimeServiceInstance as any);
    (mockNotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationServiceInstance as any);
  });

  // testID lands as data-testid under react-native-web, so query the tree directly
  // MockScheduleModal's own fiber is excluded: it carries testID="schedule-window"
  // regardless of visible, since that prop is passed to the element itself, not
  // to what it renders -- a naive match would find the window even while closed.
  const byTestId = (tree: ReturnType<typeof render>, testID: string) =>
    tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown>; type: unknown }) =>
        n.props.testID === testID && n.type !== MockScheduleModal
    );

  const renderScreen = () =>
    render(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

  const press = (tree: ReturnType<typeof render>, testID: string) =>
    fireEvent.press(byTestId(tree, testID)[0]);

  it('renders every control on the settings page', async () => {
    const tree = renderScreen();

    await waitFor(() =>
      expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled()
    );

    for (const id of [
      'screen-time-back',
      'screen-time-toggle',
      'screen-time-notifications-toggle',
    ]) {
      expect(byTestId(tree, id).length).toBeGreaterThan(0);
    }
  });

  // the age band is set on the profile screen now, not here
  it('offers no age controls', async () => {
    const tree = renderScreen();

    await waitFor(() =>
      expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled()
    );

    for (const id of ['screen-time-age-18-24', 'screen-time-age-2-6', 'screen-time-age-6plus']) {
      expect(byTestId(tree, id)).toHaveLength(0);
    }
  });

  it('loads usage data for the current child age', async () => {
    renderScreen();

    await waitFor(() =>
      expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalledWith(24)
    );
    expect(mockScreenTimeServiceInstance.getDailyTotals).toHaveBeenCalledWith(30);
  });

  it('goes back immediately when nothing has changed', async () => {
    const tree = renderScreen();

    press(tree, 'screen-time-back');

    await waitFor(() => expect(mockOnBack).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('warns instead of leaving when there are unsaved changes', async () => {
    const tree = renderScreen();

    press(tree, 'screen-time-toggle');
    press(tree, 'screen-time-back');

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unsaved Changes',
        expect.stringContaining('unsaved changes'),
        expect.any(Array)
      )
    );
    expect(mockOnBack).not.toHaveBeenCalled();
  });

  it('never writes the age when saving', async () => {
    const tree = renderScreen();

    press(tree, 'screen-time-toggle');
    await waitFor(() =>
      expect(byTestId(tree, 'screen-time-save').length).toBeGreaterThan(0)
    );
    press(tree, 'screen-time-save');

    await waitFor(() => expect(mockSetScreenTimeEnabled).toHaveBeenCalled());
    expect(mockSetChildAge).not.toHaveBeenCalled();
  });

  it('keeps the screen time toggle local until it is saved', async () => {
    const tree = renderScreen();

    press(tree, 'screen-time-toggle');

    expect(mockSetScreenTimeEnabled).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(byTestId(tree, 'screen-time-save').length).toBeGreaterThan(0)
    );
    press(tree, 'screen-time-save');

    // the store started enabled, so saving persists the flipped value
    await waitFor(() => expect(mockSetScreenTimeEnabled).toHaveBeenCalledWith(false));
  });

  it('requests notification permission the first time reminders are enabled', async () => {
    mockNotificationServiceInstance.requestPermissions.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: 'granted',
    } as never);

    const tree = renderScreen();

    press(tree, 'screen-time-notifications-toggle');

    await waitFor(() =>
      expect(mockNotificationServiceInstance.requestPermissions).toHaveBeenCalled()
    );
    expect(mockSetNotificationPermissionRequested).toHaveBeenCalledWith(true);
  });

  it('confirms with an alert once permission is granted', async () => {
    mockNotificationServiceInstance.requestPermissions.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: 'granted',
    } as never);

    const tree = renderScreen();

    press(tree, 'screen-time-notifications-toggle');

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Notifications Enabled!',
        expect.stringContaining('save your changes')
      )
    );
  });

  it('does not enable reminders when permission is refused', async () => {
    mockNotificationServiceInstance.requestPermissions.mockResolvedValue({
      granted: false,
      canAskAgain: false,
      status: 'denied',
    } as never);

    const tree = renderScreen();

    press(tree, 'screen-time-notifications-toggle');

    await waitFor(() =>
      expect(mockNotificationServiceInstance.requestPermissions).toHaveBeenCalled()
    );
    expect(mockSetNotificationsEnabled).not.toHaveBeenCalledWith(true);
  });

  describe('notification scheduling on save', () => {
    const saveAfter = async (tree: ReturnType<typeof renderScreen>, control: string) => {
      press(tree, control);
      await waitFor(() =>
        expect(byTestId(tree, 'screen-time-save').length).toBeGreaterThan(0)
      );
      press(tree, 'screen-time-save');
    };

    it('schedules reminders when notifications are switched on', async () => {
      mockUseAppStore.mockReturnValue({
        childAgeInMonths: 24,
        screenTimeEnabled: true,
        notificationsEnabled: false,
        hasRequestedNotificationPermission: true, // skip the permission prompt
        setChildAge: mockSetChildAge,
        setScreenTimeEnabled: mockSetScreenTimeEnabled,
        setNotificationsEnabled: mockSetNotificationsEnabled,
        setNotificationPermissionRequested: mockSetNotificationPermissionRequested,
      } as never);

      const tree = renderScreen();
      await waitFor(() =>
        expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled()
      );

      await saveAfter(tree, 'screen-time-notifications-toggle');

      await waitFor(() =>
        expect(mockNotificationServiceInstance.scheduleRecommendedReminders).toHaveBeenCalled()
      );
    });

    it('cancels reminders when notifications are switched off', async () => {
      mockUseAppStore.mockReturnValue({
        childAgeInMonths: 24,
        screenTimeEnabled: true,
        notificationsEnabled: true, // already on, so the toggle turns it off
        hasRequestedNotificationPermission: true,
        setChildAge: mockSetChildAge,
        setScreenTimeEnabled: mockSetScreenTimeEnabled,
        setNotificationsEnabled: mockSetNotificationsEnabled,
        setNotificationPermissionRequested: mockSetNotificationPermissionRequested,
      } as never);

      const tree = renderScreen();
      await waitFor(() =>
        expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled()
      );

      await saveAfter(tree, 'screen-time-notifications-toggle');

      await waitFor(() =>
        expect(mockNotificationServiceInstance.cancelAllScheduledNotifications).toHaveBeenCalled()
      );
      expect(mockNotificationServiceInstance.scheduleRecommendedReminders).not.toHaveBeenCalled();
    });

    it('syncs pending reminders to the backend when signed in', async () => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(true);
      (useAppStore as unknown as jest.Mock & { getState: jest.Mock }).getState = jest
        .fn()
        .mockReturnValue({ userNickname: 'Liam', userAvatarType: 'boy', userAvatarId: 'boy-1' });

      const tree = renderScreen();
      await saveAfter(tree, 'screen-time-toggle');

      await waitFor(() => expect(reminderService.syncToBackend).toHaveBeenCalled());
    });

    it('tells the parent when saving fails', async () => {
      mockSetScreenTimeEnabled.mockImplementationOnce(() => {
        throw new Error('store unavailable');
      });

      const tree = renderScreen();
      await saveAfter(tree, 'screen-time-toggle');

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          expect.stringContaining('Save'),
          expect.any(String)
        )
      );
    });
  });

  describe('resilience and sub-pages', () => {
    it('still renders when the stats fail to load', async () => {
      mockScreenTimeServiceInstance.getScreenTimeStats.mockRejectedValue(
        new Error('storage gone')
      );

      const tree = renderScreen();

      await waitFor(() =>
        expect(byTestId(tree, 'screen-time-back').length).toBeGreaterThan(0)
      );
    });

    it("reflects the parent's real reminders in the callout, not the empty pitch", async () => {
      // proves the fetched stats actually reach the rendered card -- not just
      // that a testID for it exists
      (reminderService.getReminderStats as jest.Mock).mockResolvedValueOnce({
        totalReminders: 2,
        activeReminders: 2,
        upcomingToday: [],
      });

      const tree = renderScreen();

      await waitFor(() => {
        const body = JSON.stringify(tree.toJSON());
        expect(body).toContain('screenTime.scheduleActiveTitle');
        expect(body).toContain('count:2');
      });
    });

    it('no longer shows recommended times directly -- that moved into the schedule window', async () => {
      const tree = renderScreen();
      await waitFor(() =>
        expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled()
      );

      expect(byTestId(tree, 'recommended-times')).toHaveLength(0);
      expect(JSON.stringify(tree.toJSON())).not.toContain('screenTime.recommendedTimes');
    });

    it('opens the schedule as a window over the dashboard', async () => {
      const tree = renderScreen();
      await waitFor(() =>
        expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled()
      );

      expect(byTestId(tree, 'schedule-window')).toHaveLength(0);

      press(tree, 'schedule-callout-cta');

      await waitFor(() => expect(byTestId(tree, 'schedule-window').length).toBeGreaterThan(0));
      // the dashboard is still mounted underneath -- the parent keeps their place
      expect(byTestId(tree, 'screen-time-back').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'usage-overview').length).toBeGreaterThan(0);
    });

    it('raises the save bar when a reminder changes inside the window', async () => {
      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(false);
      const tree = renderScreen();
      await waitFor(() =>
        expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled()
      );
      expect(byTestId(tree, 'screen-time-save')).toHaveLength(0);

      press(tree, 'schedule-callout-cta');
      await waitFor(() => expect(byTestId(tree, 'schedule-window').length).toBeGreaterThan(0));

      // the service now has pending work, but only the window telling the
      // dashboard about it makes the dashboard look again
      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(true);
      expect(byTestId(tree, 'screen-time-save')).toHaveLength(0);

      press(tree, 'list-change');

      await waitFor(() => expect(byTestId(tree, 'screen-time-save').length).toBeGreaterThan(0));
    });

    it('closes the window and returns to the dashboard', async () => {
      const tree = renderScreen();
      await waitFor(() =>
        expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled()
      );

      press(tree, 'schedule-callout-cta');
      await waitFor(() => expect(byTestId(tree, 'schedule-window').length).toBeGreaterThan(0));

      press(tree, 'schedule-window-back');

      await waitFor(() => expect(byTestId(tree, 'schedule-window')).toHaveLength(0));
      expect(byTestId(tree, 'screen-time-back').length).toBeGreaterThan(0);
    });
  });

  describe('discarding unsaved changes', () => {
    // the alert's buttons are data, so drive the Leave action the way the OS
    // would rather than trying to press a rendered control
    const pressAlertButton = async (label: string) => {
      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls.at(-1) ?? [];
      const button = (buttons as { text: string; onPress?: () => void }[]).find(
        b => b.text === label
      );
      await act(async () => {
        await button?.onPress?.();
      });
    };

    it('leaves and reverts pending reminders when Leave is chosen', async () => {
      const tree = renderScreen();

      press(tree, 'screen-time-toggle');
      press(tree, 'screen-time-back');
      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      await pressAlertButton('Leave');

      expect(reminderService.revertChanges).toHaveBeenCalled();
      expect(mockOnBack).toHaveBeenCalled();
      // the edit is discarded rather than written to the store
      expect(mockSetScreenTimeEnabled).not.toHaveBeenCalled();
    });

    it('stays put when Cancel is chosen', async () => {
      const tree = renderScreen();

      press(tree, 'screen-time-toggle');
      press(tree, 'screen-time-back');
      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      await pressAlertButton('Cancel');

      expect(mockOnBack).not.toHaveBeenCalled();
      expect(reminderService.revertChanges).not.toHaveBeenCalled();
    });

    // when only a reminder changed, the local settings already match the store,
    // so resetting them changes no effect dependency and the effect never
    // re-runs -- the explicit setHasUnsavedChanges(false) is what clears it
    it('clears the unsaved flag when only a reminder changed', async () => {
      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(true);
      const tree = renderScreen();

      await waitFor(() =>
        expect(byTestId(tree, 'screen-time-save').length).toBeGreaterThan(0)
      );

      press(tree, 'screen-time-back');
      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(false);
      await pressAlertButton('Leave');

      await waitFor(() => expect(byTestId(tree, 'screen-time-save')).toHaveLength(0));
    });

    it('drops the save button once the changes are discarded', async () => {
      const tree = renderScreen();

      press(tree, 'screen-time-toggle');
      await waitFor(() =>
        expect(byTestId(tree, 'screen-time-save').length).toBeGreaterThan(0)
      );

      press(tree, 'screen-time-back');
      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
      await pressAlertButton('Leave');

      await waitFor(() => expect(byTestId(tree, 'screen-time-save')).toHaveLength(0));
    });
  });

  describe('saving to the backend', () => {
    beforeEach(() => {
      (useAppStore as unknown as jest.Mock & { getState: jest.Mock }).getState = jest
        .fn()
        .mockReturnValue({
          userNickname: 'Liam',
          userAvatarType: 'boy',
          userAvatarId: 'boy-1',
        });
    });

    // the band still reaches the backend -- it is read from the stored profile
    // now rather than chosen on this screen
    const saveWithStoredAge = async (ageInMonths: number) => {
      mockUseAppStore.mockReturnValue({
        childAgeInMonths: ageInMonths,
        screenTimeEnabled: true,
        notificationsEnabled: false,
        hasRequestedNotificationPermission: false,
        setChildAge: mockSetChildAge,
        setScreenTimeEnabled: mockSetScreenTimeEnabled,
        setNotificationsEnabled: mockSetNotificationsEnabled,
        setNotificationPermissionRequested: mockSetNotificationPermissionRequested,
      } as any);

      const tree = renderScreen();
      press(tree, 'screen-time-toggle');
      await waitFor(() =>
        expect(byTestId(tree, 'screen-time-save').length).toBeGreaterThan(0)
      );
      press(tree, 'screen-time-save');
      return tree;
    };

    it('queues a profile save with the stored age band when signed in', async () => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(true);

      await saveWithStoredAge(84);

      await waitFor(() =>
        expect(backgroundSaveService.queueProfileSave).toHaveBeenCalledWith(
          expect.objectContaining({ schedule: { childAgeRange: '6+' } })
        )
      );
    });

    it('sends only the settings it changed, never a name or avatar it did not edit', async () => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(true);

      await saveWithStoredAge(84);

      await waitFor(() => expect(backgroundSaveService.queueProfileSave).toHaveBeenCalled());
      const saved = (backgroundSaveService.queueProfileSave as jest.Mock).mock.calls[0][0];
      expect(Object.keys(saved).sort()).toEqual(['notifications', 'schedule']);
    });

    it.each([
      [20, '18-24m'],
      [36, '2-6y'],
      [84, '6+'],
    ])('maps a stored age of %i months to the %s range', async (ageInMonths, expectedRange) => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(true);

      await saveWithStoredAge(ageInMonths);

      await waitFor(() =>
        expect(backgroundSaveService.queueProfileSave).toHaveBeenCalledWith(
          expect.objectContaining({ schedule: { childAgeRange: expectedRange } })
        )
      );
    });

    it('does not queue a backend save when signed out', async () => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);
      const tree = renderScreen();

      press(tree, 'screen-time-toggle');
      await waitFor(() =>
        expect(byTestId(tree, 'screen-time-save').length).toBeGreaterThan(0)
      );
      press(tree, 'screen-time-save');

      await waitFor(() => expect(mockSetScreenTimeEnabled).toHaveBeenCalled());
      expect(backgroundSaveService.queueProfileSave).not.toHaveBeenCalled();
    });

    it('commits pending reminders locally when signed out', async () => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);
      (reminderService.hasUnsavedChanges as jest.Mock).mockReturnValue(true);
      const tree = renderScreen();

      press(tree, 'screen-time-toggle');
      await waitFor(() =>
        expect(byTestId(tree, 'screen-time-save').length).toBeGreaterThan(0)
      );
      press(tree, 'screen-time-save');

      await waitFor(() => expect(reminderService.commitChanges).toHaveBeenCalled());
      expect(reminderService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  it('handles loading states correctly', () => {
    mockScreenTimeServiceInstance.getScreenTimeStats.mockReturnValue(
      new Promise(() => {}) // Never resolves, simulating loading
    );

    const { queryByText } = renderScreen();

    // Should not show weekly overview while loading
    expect(queryByText('Weekly Overview')).toBeFalsy();
    expect(queryByText('Recommended Schedule')).toBeFalsy();
  });
});

// ─── ScreenTimeContent (the home-screen glance body) ────────────────────────
describe('ScreenTimeContent', () => {
  // MockScheduleModal's own fiber is excluded: it carries testID="schedule-window"
  // regardless of visible, since that prop is passed to the element itself, not
  // to what it renders -- a naive match would find the window even while closed.
  const byTestId = (tree: ReturnType<typeof render>, testID: string) =>
    tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown>; type: unknown }) =>
        n.props.testID === testID && n.type !== MockScheduleModal
    );

  const contentService = {
    getTodayUsage: jest.fn().mockResolvedValue(300),
    getDailyLimit: jest.fn().mockReturnValue(3600),
    getScreenTimeStats: jest.fn().mockResolvedValue({
      todayUsage: 300,
      weeklyUsage: [],
      dailyAverages: {},
      recommendedSchedule: [],
      heatmapData: [],
    }),
    getDailyTotals: jest.fn().mockResolvedValue([]),
    onWarning: jest.fn(),
    removeWarningCallback: jest.fn(),
    startSession: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  };

  const setNotificationPermissionRequested = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (ScreenTimeService.getInstance as jest.Mock).mockReturnValue(contentService as never);
    (NotificationService.getInstance as jest.Mock).mockReturnValue({
      requestPermissions: jest.fn().mockResolvedValue({
        granted: true,
        canAskAgain: true,
        status: 'granted',
      }),
      scheduleRecommendedReminders: jest.fn().mockResolvedValue(undefined),
      getPermissionStatus: jest.fn().mockResolvedValue({ granted: true }),
    } as never);

    (useAppStore as unknown as jest.Mock).mockReturnValue({
      childAgeInMonths: 24,
      screenTimeEnabled: true,
      notificationsEnabled: false,
      hasRequestedNotificationPermission: false,
      setNotificationPermissionRequested,
      userNickname: 'Liam',
      userAvatarType: 'boy',
      userAvatarId: 'boy-1',
    } as never);
  });

  it('loads its stats on mount', async () => {
    render(<ScreenTimeContent />);

    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalledWith(24));
    expect(contentService.getDailyTotals).toHaveBeenCalledWith(30);
  });

  it('no longer carries its own settings toggles -- those live on the account page', async () => {
    // they only ever set component state here, so the parent's choice was
    // dropped the moment they navigated away; the account page writes to the
    // store instead
    const tree = render(<ScreenTimeContent />);

    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    for (const id of ['content-toggle', 'content-notifications-toggle']) {
      expect(byTestId(tree, id)).toHaveLength(0);
    }
    const body = JSON.stringify(tree.toJSON());
    expect(body).not.toContain('screenTime.screenTimeControls');
    expect(body).not.toContain('screenTime.smartReminders');
  });

  it('offers no age controls', async () => {
    const tree = render(<ScreenTimeContent />);

    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    for (const id of ['content-age-18-24', 'content-age-2-6', 'content-age-6plus']) {
      expect(byTestId(tree, id)).toHaveLength(0);
    }
  });

  it('offers the schedule callout without needing a route from its host', async () => {
    const tree = render(<ScreenTimeContent />);

    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    expect(byTestId(tree, 'content-reminders').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'schedule-callout-cta').length).toBeGreaterThan(0);
  });

  it("reflects the parent's real reminders in the callout, not the empty pitch", async () => {
    (reminderService.getReminderStats as jest.Mock).mockResolvedValueOnce({
      totalReminders: 1,
      activeReminders: 1,
      upcomingToday: [],
    });

    const tree = render(<ScreenTimeContent />);

    await waitFor(() => {
      const body = JSON.stringify(tree.toJSON());
      expect(body).toContain('screenTime.scheduleActiveTitle');
      expect(body).toContain('count:1');
    });
  });

  it('no longer shows recommended times directly -- that moved into the schedule window', async () => {
    const tree = render(<ScreenTimeContent />);
    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    expect(byTestId(tree, 'recommended-times')).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).not.toContain('screenTime.recommendedTimes');
  });

  it('hides the schedule section when the host asks for usage only', async () => {
    // the home-screen glance opens straight off the ring to answer "how long
    // today?" -- building a schedule is a settings job, not a glance one
    const tree = render(<ScreenTimeContent showSchedule={false} />);

    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    expect(byTestId(tree, 'content-reminders')).toHaveLength(0);
    expect(byTestId(tree, 'schedule-callout-cta')).toHaveLength(0);
    const body = JSON.stringify(tree.toJSON());
    expect(body).not.toContain('screenTime.bedtimeGuidelines');
    // the usage it does exist to show is still there
    expect(byTestId(tree, 'usage-overview').length).toBeGreaterThan(0);
  });

  it('drops its own night backing when the host supplies a surface', async () => {
    // the glance opens onto a red surface of its own; the dashboard's opaque
    // night gradient would paint straight over it
    const tree = render(<ScreenTimeContent showBackdrop={false} />);

    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    expect(byTestId(tree, 'screen-time-backdrop')).toHaveLength(0);
    expect(byTestId(tree, 'usage-overview').length).toBeGreaterThan(0);
  });

  it('paints its own night backing by default', async () => {
    const tree = render(<ScreenTimeContent />);

    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    expect(byTestId(tree, 'screen-time-backdrop').length).toBeGreaterThan(0);
  });

  it('keeps the schedule section by default', async () => {
    const tree = render(<ScreenTimeContent />);

    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    expect(byTestId(tree, 'content-reminders').length).toBeGreaterThan(0);
    expect(JSON.stringify(tree.toJSON())).toContain('screenTime.bedtimeGuidelines');
  });

  it('opens the schedule as a window over the glance', async () => {
    const tree = render(<ScreenTimeContent />);
    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    expect(byTestId(tree, 'schedule-window')).toHaveLength(0);

    fireEvent.press(byTestId(tree, 'schedule-callout-cta')[0]);

    await waitFor(() => expect(byTestId(tree, 'schedule-window').length).toBeGreaterThan(0));
    // the glance stays mounted behind it
    expect(byTestId(tree, 'usage-overview').length).toBeGreaterThan(0);
  });

  it('closes the window back to the glance', async () => {
    const tree = render(<ScreenTimeContent />);
    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    fireEvent.press(byTestId(tree, 'schedule-callout-cta')[0]);
    await waitFor(() => expect(byTestId(tree, 'schedule-window').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'schedule-window-back')[0]);

    await waitFor(() => expect(byTestId(tree, 'schedule-window')).toHaveLength(0));
    expect(byTestId(tree, 'usage-overview').length).toBeGreaterThan(0);
  });

  it('reports a reminder change to its host', async () => {
    const onReminderChange = jest.fn();
    const tree = render(<ScreenTimeContent onReminderChange={onReminderChange} />);
    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    fireEvent.press(byTestId(tree, 'schedule-callout-cta')[0]);
    await waitFor(() => expect(byTestId(tree, 'schedule-window').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'list-change')[0]);

    expect(onReminderChange).toHaveBeenCalledTimes(1);
  });

  it('names the child in the glance without stating an age', async () => {
    const tree = render(<ScreenTimeContent />);

    await waitFor(() => expect(contentService.getScreenTimeStats).toHaveBeenCalled());

    // the chip is identity only now -- the age lives on the profile screen
    expect(byTestId(tree, 'usage-child-chip').length).toBeGreaterThan(0);

    const body = JSON.stringify(tree.toJSON());
    expect(body).not.toContain('screenTime.age18to24months');
    expect(body).not.toContain('screenTime.age2to6years');
    expect(body).not.toContain('screenTime.age6plus');
  });

  it('still renders when its stats fail to load', async () => {
    contentService.getScreenTimeStats.mockRejectedValue(new Error('storage gone'));

    const tree = render(<ScreenTimeContent />);

    await waitFor(() =>
      expect(byTestId(tree, 'usage-overview').length).toBeGreaterThan(0)
    );
  });

});

// ─── screenToActivityType unit tests ────────────────────────────────────────
describe('screenToActivityType', () => {
  it('returns "spelling" for spelling-related screens', () => {
    expect(screenToActivityType('spelling-game')).toBe('spelling');
    expect(screenToActivityType('word-builder')).toBe('spelling');
  });

  it('returns "counting" for number/counting screens', () => {
    expect(screenToActivityType('number-challenge')).toBe('counting');
    expect(screenToActivityType('counting-game')).toBe('counting');
  });

  it('returns "instruments" for music/instrument screens', () => {
    expect(screenToActivityType('practise')).toBe('instruments');
    expect(screenToActivityType('freeplay')).toBe('instruments');
    expect(screenToActivityType('instrument-select')).toBe('instruments');
    expect(screenToActivityType('music-challenge')).toBe('instruments');
  });

  it('returns "feelings" for emotion screens', () => {
    expect(screenToActivityType('feeling-cards')).toBe('feelings');
    expect(screenToActivityType('emotion-match')).toBe('feelings');
  });

  it('returns "stories" for story screens', () => {
    expect(screenToActivityType('story-reader')).toBe('stories');
  });

  it('returns "general" for unknown or null screens', () => {
    expect(screenToActivityType(null)).toBe('general');
    expect(screenToActivityType(undefined)).toBe('general');
    expect(screenToActivityType('home')).toBe('general');
    expect(screenToActivityType('settings')).toBe('general');
  });
});
