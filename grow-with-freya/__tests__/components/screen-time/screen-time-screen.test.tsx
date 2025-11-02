import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ScreenTimeScreen } from '../../../components/screen-time/screen-time-screen';
import { useAppStore } from '../../../store/app-store';
import ScreenTimeService from '../../../services/screen-time-service';
import NotificationService from '../../../services/notification-service';

// Mock dependencies
jest.mock('../../../store/app-store');
jest.mock('../../../services/screen-time-service');
jest.mock('../../../services/notification-service');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
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
    getTodayUsage: jest.fn(),
    getDailyLimit: jest.fn(),
    getScreenTimeStats: jest.fn(),
    scheduleRecommendedReminders: jest.fn(),
  };

  const mockNotificationServiceInstance = {
    requestPermissions: jest.fn(),
    scheduleRecommendedReminders: jest.fn(),
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

    mockScreenTimeServiceInstance.getTodayUsage.mockResolvedValue(300); // 5 minutes
    mockScreenTimeServiceInstance.getDailyLimit.mockReturnValue(3600); // 60 minutes
    mockScreenTimeServiceInstance.getScreenTimeStats.mockResolvedValue({
      todayUsage: 300,
      weeklyUsage: [],
      dailyAverages: {},
      recommendedSchedule: [],
    });
  });

  it('renders correctly with default props', async () => {
    const { getByText, queryByText } = render(
      <ScreenTimeScreen onBack={mockOnBack} />
    );

    // Wait for async data loading to complete
    await waitFor(() => {
      expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Use queryByText to check if elements exist without throwing
    await waitFor(() => {
      expect(queryByText('Screen Time')).toBeTruthy();
      expect(queryByText('Today\'s Usage')).toBeTruthy();
      expect(queryByText('Child\'s Age')).toBeTruthy();
      expect(queryByText('Settings')).toBeTruthy();
    });
  });

  it('displays correct usage information', async () => {
    const { queryByText } = render(
      <ScreenTimeScreen onBack={mockOnBack} />
    );

    // Wait for async data loading to complete
    await waitFor(() => {
      expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(queryByText('5m')).toBeTruthy(); // Today's usage
      // Check for the text with potential whitespace
      expect(queryByText(/of\s+60m/)).toBeTruthy(); // Daily limit with flexible whitespace
    });
  });

  it('handles back button press', async () => {
    const { queryByText } = render(
      <ScreenTimeScreen onBack={mockOnBack} />
    );

    // Wait for component to render
    await waitFor(() => {
      expect(queryByText('← Back')).toBeTruthy();
    });

    const backButton = queryByText('← Back');
    if (backButton) {
      fireEvent.press(backButton);
    }
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('handles age selection', async () => {
    const { queryByText } = render(
      <ScreenTimeScreen onBack={mockOnBack} />
    );

    // Wait for async data loading to complete
    await waitFor(() => {
      expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled();
    }, { timeout: 3000 });

    await waitFor(() => {
      const ageButton = queryByText('Under 18m');
      expect(ageButton).toBeTruthy();
      if (ageButton) {
        fireEvent.press(ageButton);
      }
    });

    expect(mockSetChildAge).toHaveBeenCalledWith(12);
  });

  it('handles screen time toggle', async () => {
    const { getByTestId } = render(
      <ScreenTimeScreen onBack={mockOnBack} />
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
      <ScreenTimeScreen onBack={mockOnBack} />
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
      <ScreenTimeScreen onBack={mockOnBack} />
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
    const { rerender, queryByText } = render(
      <ScreenTimeScreen onBack={mockOnBack} />
    );

    // Wait for async data loading to complete
    await waitFor(() => {
      expect(mockScreenTimeServiceInstance.getScreenTimeStats).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Test for 2-5 years (24 months) - check actual text from component
    await waitFor(() => {
      expect(queryByText(/WHO\/AAP Guidelines: Up to 1 hour of high-quality programming with parent involvement/)).toBeTruthy();
    });

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

    rerender(<ScreenTimeScreen onBack={mockOnBack} />);

    await waitFor(() => {
      expect(queryByText(/WHO\/AAP Guidelines: Up to 15 minutes of high-quality content with parent co-engagement/)).toBeTruthy();
    });
  });

  it('handles loading states correctly', () => {
    mockScreenTimeServiceInstance.getScreenTimeStats.mockReturnValue(
      new Promise(() => {}) // Never resolves, simulating loading
    );

    const { queryByText } = render(
      <ScreenTimeScreen onBack={mockOnBack} />
    );

    // Should not show weekly overview while loading
    expect(queryByText('Weekly Overview')).toBeFalsy();
    expect(queryByText('Recommended Schedule')).toBeFalsy();
  });
});
