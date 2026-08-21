/**
 * Lifecycle tests for ScreenTimeProvider.
 *
 * The provider owns the AppState transitions that open and close sessions, so
 * it is the mechanism that decides whether background time is ever counted --
 * the behaviour behind the inflated screen-time totals.
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';

import { ScreenTimeProvider, useScreenTime } from '../../../components/screen-time/screen-time-provider';
import { useAppStore } from '../../../store/app-store';
import ScreenTimeService from '../../../services/screen-time-service';
import NotificationService from '../../../services/notification-service';

jest.mock('../../../store/app-store');
jest.mock('../../../services/screen-time-service');
jest.mock('../../../services/notification-service');

const STORE_STATE = {
  screenTimeEnabled: true,
  childAgeInMonths: 36,
  notificationsEnabled: false,
  currentScreen: 'home',
};

function mockService() {
  const instance = {
    startSession: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
    getTodayUsage: jest.fn().mockResolvedValue(0),
    checkAndResetDailyData: jest.fn().mockResolvedValue(undefined),
    onWarning: jest.fn(),
    removeWarningCallback: jest.fn(),
  };
  (ScreenTimeService.getInstance as jest.Mock).mockReturnValue(instance);
  return instance;
}

function emitAppState(state: string) {
  const calls = (AppState.addEventListener as jest.Mock).mock.calls;
  const handlers = calls.filter(([event]) => event === 'change').map(([, handler]) => handler);
  return act(async () => {
    for (const handler of handlers) {
      await handler(state);
    }
  });
}

describe('ScreenTimeProvider lifecycle', () => {
  let service: ReturnType<typeof mockService>;
  let notifier: { sendScreenTimeWarning: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);

    service = mockService();
    notifier = { sendScreenTimeWarning: jest.fn().mockResolvedValue(undefined) };
    (NotificationService.getInstance as jest.Mock).mockReturnValue(notifier);

    (useAppStore as unknown as jest.Mock).mockImplementation(() => STORE_STATE);
    (useAppStore as unknown as jest.Mock & { getState: jest.Mock }).getState = jest
      .fn()
      .mockReturnValue(STORE_STATE);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderProvider = () =>
    render(
      <ScreenTimeProvider>
        <Text>child</Text>
      </ScreenTimeProvider>
    );

  it('opens a session on mount when screen time is enabled', async () => {
    renderProvider();

    await waitFor(() => expect(service.startSession).toHaveBeenCalled());
  });

  it('closes the session when the app goes to the background so background time is never counted', async () => {
    renderProvider();
    await waitFor(() => expect(service.startSession).toHaveBeenCalled());

    await emitAppState('background');

    expect(service.endSession).toHaveBeenCalled();
  });

  it('reopens a session when the app returns to the foreground', async () => {
    renderProvider();
    await waitFor(() => expect(service.startSession).toHaveBeenCalled());

    await emitAppState('background');
    const afterBackground = service.startSession.mock.calls.length;

    await emitAppState('active');

    expect(service.startSession.mock.calls.length).toBeGreaterThan(afterBackground);
  });

  it('does not open a session when screen time is disabled', async () => {
    const disabled = { ...STORE_STATE, screenTimeEnabled: false };
    (useAppStore as unknown as jest.Mock).mockImplementation(() => disabled);
    (useAppStore as unknown as jest.Mock & { getState: jest.Mock }).getState = jest
      .fn()
      .mockReturnValue(disabled);

    renderProvider();

    await waitFor(() => expect(service.startSession).not.toHaveBeenCalled());
  });

  // the provider only exposes startActivity/endActivity/refreshUsage through
  // context, so a consumer is needed to reach them
  let ctx: ReturnType<typeof useScreenTime> | null = null;
  function Consumer() {
    ctx = useScreenTime();
    return null;
  }

  const renderWithConsumer = () =>
    render(
      <ScreenTimeProvider>
        <Consumer />
      </ScreenTimeProvider>
    );

  // the provider hands its warning handler to the service on mount
  const emitWarning = async (warning: { type: string; remainingTime: number; message: string }) => {
    const handler = service.onWarning.mock.calls.at(-1)?.[0] as (w: unknown) => void;
    await act(async () => {
      handler(warning);
    });
  };

  const LIMIT_WARNING = {
    type: 'limit_reached',
    remainingTime: 0,
    message: 'Time is up',
  };

  describe('exempt screens', () => {
    it('does not open a session while on the sleep screen', async () => {
      const onSleep = { ...STORE_STATE, currentScreen: 'sleep' };
      (useAppStore as unknown as jest.Mock).mockImplementation(() => onSleep);
      (useAppStore as unknown as jest.Mock & { getState: jest.Mock }).getState = jest
        .fn()
        .mockReturnValue(onSleep);

      renderProvider();

      await waitFor(() => expect(service.startSession).not.toHaveBeenCalled());
    });

    it('closes the session when moving onto an exempt screen', async () => {
      const tree = renderProvider();
      await waitFor(() => expect(service.startSession).toHaveBeenCalled());

      const onSleep = { ...STORE_STATE, currentScreen: 'sleep' };
      (useAppStore as unknown as jest.Mock).mockImplementation(() => onSleep);
      (useAppStore as unknown as jest.Mock & { getState: jest.Mock }).getState = jest
        .fn()
        .mockReturnValue(onSleep);

      tree.rerender(
        <ScreenTimeProvider>
          <Text>child</Text>
        </ScreenTimeProvider>
      );

      await waitFor(() => expect(service.endSession).toHaveBeenCalled());
    });
  });

  describe('warnings', () => {
    it('shows a warning straight away on an ordinary screen', async () => {
      renderProvider();
      await waitFor(() => expect(service.onWarning).toHaveBeenCalled());

      await emitWarning(LIMIT_WARNING);

      // the modal renders the warning message once it is surfaced
      await waitFor(() => expect(service.onWarning).toHaveBeenCalled());
      expect(notifier.sendScreenTimeWarning).not.toHaveBeenCalled();
    });

    it('sends a notification when reminders are enabled', async () => {
      const withNotifications = { ...STORE_STATE, notificationsEnabled: true };
      (useAppStore as unknown as jest.Mock).mockImplementation(() => withNotifications);
      (useAppStore as unknown as jest.Mock & { getState: jest.Mock }).getState = jest
        .fn()
        .mockReturnValue(withNotifications);

      renderProvider();
      await waitFor(() => expect(service.onWarning).toHaveBeenCalled());

      await emitWarning(LIMIT_WARNING);

      expect(notifier.sendScreenTimeWarning).toHaveBeenCalledWith('Time is up', 'limit_reached');
    });

    it('holds a warning back while the child is inside a story', async () => {
      const reading = { ...STORE_STATE, currentScreen: 'story-reader', notificationsEnabled: true };
      (useAppStore as unknown as jest.Mock).mockImplementation(() => reading);
      (useAppStore as unknown as jest.Mock & { getState: jest.Mock }).getState = jest
        .fn()
        .mockReturnValue(reading);

      const tree = render(
        <ScreenTimeProvider>
          <Text>child</Text>
        </ScreenTimeProvider>
      );
      await waitFor(() => expect(service.onWarning).toHaveBeenCalled());

      await emitWarning(LIMIT_WARNING);

      // queued, not shown -- but the notification still goes out
      expect(notifier.sendScreenTimeWarning).toHaveBeenCalled();
      expect(JSON.stringify(tree.toJSON())).not.toContain('Time is up');

      // leaving the immersive screen releases it
      (useAppStore as unknown as jest.Mock).mockImplementation(() => STORE_STATE);
      tree.rerender(
        <ScreenTimeProvider>
          <Text>child</Text>
        </ScreenTimeProvider>
      );

      await waitFor(() =>
        expect(JSON.stringify(tree.toJSON())).toContain('Time is up')
      );
    });
  });

  describe('context actions', () => {
    it('starts an activity and refreshes usage', async () => {
      service.getTodayUsage.mockResolvedValue(420);
      renderWithConsumer();

      await act(async () => {
        await ctx?.startActivity('story');
      });

      expect(service.startSession).toHaveBeenCalledWith('story', 36);
      expect(ctx?.todayUsage).toBe(420);
    });

    it('ends an activity and refreshes usage', async () => {
      renderWithConsumer();
      await act(async () => {
        await ctx?.startActivity('story');
      });

      service.getTodayUsage.mockResolvedValue(900);
      await act(async () => {
        await ctx?.endActivity();
      });

      expect(service.endSession).toHaveBeenCalled();
      expect(ctx?.todayUsage).toBe(900);
    });

    it('does nothing when screen time is disabled', async () => {
      const disabled = { ...STORE_STATE, screenTimeEnabled: false };
      (useAppStore as unknown as jest.Mock).mockImplementation(() => disabled);
      (useAppStore as unknown as jest.Mock & { getState: jest.Mock }).getState = jest
        .fn()
        .mockReturnValue(disabled);

      renderWithConsumer();
      service.startSession.mockClear();

      await act(async () => {
        await ctx?.startActivity('story');
      });

      expect(service.startSession).not.toHaveBeenCalled();
    });

    it('refreshUsage pulls the latest total', async () => {
      renderWithConsumer();
      service.getTodayUsage.mockResolvedValue(1234);

      await act(async () => {
        await ctx?.refreshUsage();
      });

      expect(ctx?.todayUsage).toBe(1234);
    });
  });
});
