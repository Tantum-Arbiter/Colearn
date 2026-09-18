/**
 * Tests for CustomRemindersContent's `footer` prop -- the one seam the
 * schedule window uses to place RecommendedTimes after the reminders content
 * (after the "Create First Reminder" button when the list is empty, after the
 * grouped list when it isn't), without either component knowing about the
 * other's internals.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { CustomRemindersContent } from '@/components/reminders/custom-reminders-screen';
import { reminderService } from '@/services/reminder-service';
import NotificationService from '@/services/notification-service';

jest.mock('@/services/reminder-service', () => ({
  ReminderService: { formatTime: (t: string) => t },
  reminderService: {
    getAllReminders: jest.fn().mockResolvedValue([]),
    getReminderStats: jest.fn().mockResolvedValue({ totalReminders: 0, activeReminders: 0, upcomingToday: [] }),
    deleteReminder: jest.fn(),
    toggleReminder: jest.fn(),
  },
}));

jest.mock('@/services/notification-service', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getPermissionStatus: jest.fn().mockResolvedValue({ granted: true }),
      requestPermissions: jest.fn().mockResolvedValue({ granted: true }),
    }),
  },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text: RNText } = require('react-native');
  return { Ionicons: (props: any) => <RNText>{props.name}</RNText> };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, style }: any) => <View style={style}>{children}</View> };
});

jest.mock('@/components/ui/star-background', () => ({ StarBackground: () => null }));

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('CustomRemindersContent footer', () => {
  it('renders nothing extra when no footer is given', async () => {
    const tree = render(<CustomRemindersContent onCreateNew={jest.fn()} isActive />);

    await waitFor(() => expect(reminderService.getAllReminders).toHaveBeenCalled());

    expect(findByTestId(tree, 'my-footer')).toHaveLength(0);
  });

  it('renders the given footer after the empty-state content', async () => {
    const tree = render(
      <CustomRemindersContent
        onCreateNew={jest.fn()}
        isActive
        footer={<Text testID="my-footer">footer content</Text>}
      />
    );

    await waitFor(() => expect(reminderService.getAllReminders).toHaveBeenCalled());

    expect(findByTestId(tree, 'my-footer').length).toBeGreaterThan(0);
  });

  it('still renders the footer when the list is populated', async () => {
    (reminderService.getAllReminders as jest.Mock).mockResolvedValueOnce([
      {
        id: 'r1',
        title: 'Story time',
        message: 'msg',
        dayOfWeek: 1,
        time: '09:00',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const tree = render(
      <CustomRemindersContent
        onCreateNew={jest.fn()}
        isActive
        footer={<Text testID="my-footer">footer content</Text>}
      />
    );

    await waitFor(() => expect(reminderService.getAllReminders).toHaveBeenCalled());
    await waitFor(() => expect(findByTestId(tree, 'my-footer').length).toBeGreaterThan(0));
  });
});
