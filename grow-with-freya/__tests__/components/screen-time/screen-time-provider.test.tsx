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

import { ScreenTimeProvider } from '../../../components/screen-time/screen-time-provider';
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

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);

    service = mockService();
    (NotificationService.getInstance as jest.Mock).mockReturnValue({
      sendScreenTimeWarning: jest.fn().mockResolvedValue(undefined),
    });

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
});
