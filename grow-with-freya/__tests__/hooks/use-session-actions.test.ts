/**
 * Signing in and out, shared by the pages that offer them: a guest is sent to
 * the login page; a signed-in family is asked first, then the profile is
 * cleared and the login page shown, with the token and reminder clean-up left
 * to run behind.
 */

import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useSessionActions } from '@/hooks/use-session-actions';
import { ApiClient } from '@/services/api-client';
import { reminderService } from '@/services/reminder-service';
import { forgetAccount as forgetSubscriptionAccount } from '@/services/subscription-service';

const mockStore = {
  isGuestMode: true,
  sessionLapsed: false,
  setGuestMode: jest.fn(),
  setShowLoginAfterOnboarding: jest.fn(),
  setLoginComplete: jest.fn(),
  clearUserProfile: jest.fn(),
};

jest.mock('@/store/app-store', () => ({
  useAppStore: jest.fn((selector?: (state: typeof mockStore) => unknown) => (selector ? selector(mockStore) : mockStore)),
}));
jest.mock('@/services/api-client', () => ({ ApiClient: { logout: jest.fn(() => Promise.resolve()) } }));
jest.mock('@/services/reminder-service', () => ({ reminderService: { clearAllReminders: jest.fn(() => Promise.resolve()) } }));
jest.mock('@/services/subscription-service', () => ({ forgetAccount: jest.fn(() => Promise.resolve()) }));

function confirmButtons(): { text: string; onPress?: () => void }[] {
  return (Alert.alert as jest.Mock).mock.calls[0][2];
}

describe('useSessionActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockStore.isGuestMode = true;
    mockStore.sessionLapsed = false;
  });

  it('reports whether the family needs to sign in: a guest, or a session the app lost', () => {
    const { result, rerender } = renderHook(() => useSessionActions());

    expect(result.current.needsSignIn).toBe(true);
    mockStore.isGuestMode = false;
    rerender({});
    expect(result.current.needsSignIn).toBe(false);
    mockStore.sessionLapsed = true;
    rerender({});
    expect(result.current.needsSignIn).toBe(true);
  });

  // the login screen settles guest mode itself when the child signs in or
  // carries on as a guest; flipping it at the tap swapped the Login button for
  // the signed-in line before the login page had covered it
  it('sends a guest to the login page, leaving guest mode for the login screen to settle', () => {
    const { result } = renderHook(() => useSessionActions());

    act(() => result.current.login());

    expect(mockStore.setGuestMode).not.toHaveBeenCalled();
    expect(mockStore.setShowLoginAfterOnboarding).toHaveBeenCalledWith(true);
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it('asks before signing out, and does nothing if the answer is no', () => {
    mockStore.isGuestMode = false;
    const { result } = renderHook(() => useSessionActions());

    act(() => result.current.logout());
    act(() => confirmButtons().find((button) => button.text === 'common.cancel')?.onPress?.());

    expect(Alert.alert).toHaveBeenCalledWith('alerts.logout.title', 'alerts.logout.message', expect.any(Array));
    expect(mockStore.setShowLoginAfterOnboarding).not.toHaveBeenCalled();
    expect(mockStore.clearUserProfile).not.toHaveBeenCalled();
    expect(ApiClient.logout).not.toHaveBeenCalled();
  });

  it('clears the profile and shows the login page once the family confirms, cleaning up behind', () => {
    mockStore.isGuestMode = false;
    const { result } = renderHook(() => useSessionActions());

    act(() => result.current.logout());
    act(() => confirmButtons().find((button) => button.text === 'common.logout')?.onPress?.());

    expect(mockStore.clearUserProfile).toHaveBeenCalledTimes(1);
    expect(mockStore.setLoginComplete).toHaveBeenCalledWith(false);
    expect(mockStore.setShowLoginAfterOnboarding).toHaveBeenCalledWith(true);
    expect(ApiClient.logout).toHaveBeenCalledTimes(1);
    expect(reminderService.clearAllReminders).toHaveBeenCalledTimes(1);
    expect(forgetSubscriptionAccount).toHaveBeenCalledTimes(1);
  });
});
