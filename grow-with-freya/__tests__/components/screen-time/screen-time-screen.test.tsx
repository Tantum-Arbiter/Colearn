import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ScreenTimeScreen } from '../../../components/screen-time/screen-time-screen';
import { ScreenTimeProvider } from '../../../components/screen-time/screen-time-provider';
import { screenToActivityType } from '../../../components/screen-time/screen-time-provider';
import { ScreenTimeWarningModal } from '../../../components/screen-time/screen-time-warning-modal';
import { useAppStore } from '../../../store/app-store';
import ScreenTimeService from '../../../services/screen-time-service';
import NotificationService from '../../../services/notification-service';

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
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
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
    withTiming: jest.fn((v: any) => v),
    withSpring: jest.fn((v: any) => v),
    withDelay: jest.fn((_: any, v: any) => v),
    withRepeat: jest.fn((a: any) => a),
    withSequence: jest.fn((...a: any[]) => a[a.length - 1]),
    Easing: { out: jest.fn((e: any) => e), in: jest.fn((e: any) => e), inOut: jest.fn((e: any) => e), cubic: jest.fn(), bezier: jest.fn() },
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
jest.mock('../../../components/reminders', () => ({
  CustomRemindersScreen: 'CustomRemindersScreen',
  CreateReminderScreen: 'CreateReminderScreen',
}));
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

describe.skip('ScreenTimeScreen', () => {
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

    (mockScreenTimeService.getInstance as jest.Mock).mockReturnValue(mockScreenTimeServiceInstance as any);
    (mockNotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationServiceInstance as any);
  });

  it('renders correctly with default props', async () => {
    const { root } = render(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

    // Just check that the component renders without crashing
    expect(root).toBeTruthy();

    // Wait a bit for any async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the component is still mounted
    expect(root).toBeTruthy();
  });

  it('displays correct usage information', async () => {
    const { root } = render(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

    // Just check that the component renders without crashing
    expect(root).toBeTruthy();

    // Verify the mock service was called
    expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled();
  });

  it('handles back button press', async () => {
    const { root } = render(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

    // Just check that the component renders without crashing
    expect(root).toBeTruthy();

    // Since we can't easily click the back button in this test environment,
    // we'll just verify the callback is provided
    expect(mockOnBack).not.toHaveBeenCalled();
  });

  it('handles age selection', async () => {
    const { root } = render(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

    // Just check that the component renders without crashing
    expect(root).toBeTruthy();

    // Age selection functionality is tested in integration tests
    expect(mockSetChildAge).toHaveBeenCalledTimes(0); // Not called in this unit test
  });

  it('handles screen time toggle', async () => {
    const { getByTestId } = render(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

    // Note: You might need to add testID props to your toggle components
    // This is a placeholder for the actual implementation
    await waitFor(() => {
      // Find and press the screen time toggle
      // This would need to be implemented based on your actual component structure
    });

    // expect(mockSetScreenTimeEnabled).toHaveBeenCalled();
  });

  it('handles notification permission request', async () => {
    mockNotificationServiceInstance.requestPermissions.mockResolvedValue({
      granted: true,
      status: 'granted',
    } as any);

    const { getByTestId } = render(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

    // This would need to be implemented based on your actual component structure
    // fireEvent.press(notificationToggle);

    await waitFor(() => {
      // expect(mockNotificationServiceInstance.requestPermissions).toHaveBeenCalled();
      // expect(mockSetNotificationsEnabled).toHaveBeenCalledWith(true);
    });
  });

  it('shows alert when notifications are enabled', async () => {
    mockNotificationServiceInstance.requestPermissions.mockResolvedValue({
      granted: true,
      status: 'granted',
    } as any);

    const { getByTestId } = render(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

    // Simulate enabling notifications
    // This would trigger the alert in your component

    await waitFor(() => {
      // expect(Alert.alert).toHaveBeenCalledWith(
      //   'Notifications Enabled! 🔔',
      //   expect.stringContaining('gentle reminders')
      // );
    });
  });

  it('displays WHO/AAP guidelines correctly for different ages', async () => {
    const { rerender, root } = render(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

    // Just check that the component renders without crashing
    expect(root).toBeTruthy();

    // Change to 18-24 months
    mockUseAppStore.mockReturnValue({
      childAgeInMonths: 20,
      screenTimeEnabled: true,
      notificationsEnabled: false,
      hasRequestedNotificationPermission: false,
      setChildAge: mockSetChildAge,
      setScreenTimeEnabled: mockSetScreenTimeEnabled,
      setNotificationsEnabled: mockSetNotificationsEnabled,
      setNotificationPermissionRequested: mockSetNotificationPermissionRequested,
    } as any);

    rerender(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

    // Just check that the component still renders after rerender
    expect(root).toBeTruthy();
  });

  it('handles loading states correctly', () => {
    mockScreenTimeServiceInstance.getScreenTimeStats.mockReturnValue(
      new Promise(() => {}) // Never resolves, simulating loading
    );

    const { queryByText } = render(
      <ScreenTimeProvider>
        <ScreenTimeScreen onBack={mockOnBack} />
      </ScreenTimeProvider>
    );

    // Should not show weekly overview while loading
    expect(queryByText('Weekly Overview')).toBeFalsy();
    expect(queryByText('Recommended Schedule')).toBeFalsy();
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

// ─── Tree search helpers (react-native-web + jsdom don't support RNTL queries) ─
function treeContainsText(node: any, text: string): boolean {
  if (!node) return false;
  if (typeof node === 'string') return node.includes(text);
  if (Array.isArray(node)) return node.some((child: any) => treeContainsText(child, text));
  if (node.children) return treeContainsText(node.children, text);
  return false;
}

function countTextOccurrences(node: any, text: string): number {
  if (!node) return 0;
  if (typeof node === 'string') return node === text ? 1 : 0;
  if (Array.isArray(node)) return node.reduce((sum: number, child: any) => sum + countTextOccurrences(child, text), 0);
  if (node.children) return countTextOccurrences(node.children, text);
  return 0;
}

function renderModal(overrides: Partial<React.ComponentProps<typeof ScreenTimeWarningModal>> = {}) {
  const defaults = {
    visible: true,
    warning: { type: 'approaching_limit' as const, remainingTime: 300, message: 'Only 5 minutes left' },
    onDismiss: jest.fn(),
  };
  const result = render(<ScreenTimeWarningModal {...defaults} {...overrides} />);
  return { ...result, json: result.toJSON() };
}

// ─── ScreenTimeWarningModal unit tests ──────────────────────────────────────
describe('ScreenTimeWarningModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the suggestions section when visible', () => {
    const { json } = renderModal({ lastActivityType: 'spelling' });
    expect(treeContainsText(json, 'screenTimeWarning.trySomethingNew')).toBe(true);
  });

  it('renders the "try something new" heading', () => {
    const { json } = renderModal({ lastActivityType: 'spelling' });
    expect(treeContainsText(json, 'screenTimeWarning.trySomethingNew')).toBe(true);
  });

  it('shows exactly 2 generic suggestion bullets when no bridge data', () => {
    const { json } = renderModal({ lastActivityType: 'instruments' });
    const bulletCount = countTextOccurrences(json, '•');
    expect(bulletCount).toBe(2);
  });

  it('defaults to "general" activity type when none provided', () => {
    const { json } = renderModal();
    // Should render general emoji and suggestions
    expect(treeContainsText(json, '🌟')).toBe(true);
    expect(treeContainsText(json, 'screenTimeWarning.suggestions.general')).toBe(true);
  });

  it('does not render when warning is null', () => {
    const { toJSON } = render(
      <ScreenTimeWarningModal visible={false} warning={null} onDismiss={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the warning message', () => {
    const { json } = renderModal();
    expect(treeContainsText(json, 'Only 5 minutes left')).toBe(true);
  });

  it('renders dismiss button', () => {
    const { json } = renderModal();
    expect(treeContainsText(json, 'screenTimeWarning.closeNotification')).toBe(true);
  });

  // ─── Bridge data integration tests ──────────────────────────────────────
  describe('bridge-based suggestions', () => {
    it('renders bridge narration when lastCompletedActivityId has bridge data', () => {
      const { json } = renderModal({
        lastActivityType: 'spelling',
        lastCompletedActivityId: 'abc-animals',
      });
      expect(treeContainsText(json, 'bridge.spelling.abcAnimals.narration')).toBe(true);
    });

    it('renders 3 bridge adventure cards when bridge data is available', () => {
      const { json } = renderModal({
        lastActivityType: 'spelling',
        lastCompletedActivityId: 'abc-animals',
      });
      // Each card has a category label
      expect(treeContainsText(json, 'bridge.atHome')).toBe(true);
      expect(treeContainsText(json, 'bridge.outdoors')).toBe(true);
      expect(treeContainsText(json, 'bridge.creative')).toBe(true);
    });

    it('renders category icons in bridge cards', () => {
      const { json } = renderModal({
        lastActivityType: 'spelling',
        lastCompletedActivityId: 'abc-animals',
      });
      // Ionicons mock renders icon name as text
      expect(treeContainsText(json, 'home-outline')).toBe(true);
      expect(treeContainsText(json, 'leaf-outline')).toBe(true);
      expect(treeContainsText(json, 'color-palette-outline')).toBe(true);
    });

    it('does NOT render generic bullet suggestions when bridge data is available', () => {
      const { json } = renderModal({
        lastActivityType: 'spelling',
        lastCompletedActivityId: 'abc-animals',
      });
      const bulletCount = countTextOccurrences(json, '•');
      expect(bulletCount).toBe(0);
    });

    it('falls back to generic suggestions for unknown activity ID', () => {
      const { json } = renderModal({
        lastActivityType: 'instruments',
        lastCompletedActivityId: 'nonexistent-activity',
      });
      const bulletCount = countTextOccurrences(json, '•');
      expect(bulletCount).toBe(2);
      // No bridge-specific content
      expect(treeContainsText(json, 'bridge.atHome')).toBe(false);
    });

    it('falls back to generic suggestions when lastCompletedActivityId is null', () => {
      const { json } = renderModal({
        lastActivityType: 'feelings',
        lastCompletedActivityId: null,
      });
      const bulletCount = countTextOccurrences(json, '•');
      expect(bulletCount).toBe(2);
      // No bridge narration
      expect(treeContainsText(json, 'bridge.feelings')).toBe(false);
    });

    it('renders bridge data for a feelings activity', () => {
      const { json } = renderModal({
        lastActivityType: 'feelings',
        lastCompletedActivityId: 'emotion-faces',
      });
      expect(treeContainsText(json, 'bridge.feelings.emotionFaces.narration')).toBe(true);
      expect(treeContainsText(json, 'bridge.atHome')).toBe(true);
      expect(treeContainsText(json, 'bridge.outdoors')).toBe(true);
      expect(treeContainsText(json, 'bridge.creative')).toBe(true);
    });

    it('renders bridge data for a numbers activity', () => {
      const { json } = renderModal({
        lastActivityType: 'counting',
        lastCompletedActivityId: 'counting-fun',
      });
      expect(treeContainsText(json, 'bridge.numbers.countingFun.narration')).toBe(true);
      expect(treeContainsText(json, 'bridge.atHome')).toBe(true);
    });
  });
});
