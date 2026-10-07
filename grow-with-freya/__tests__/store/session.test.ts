/**
 * Who needs to sign in: a guest, or a family whose session the app could not
 * keep alive. The API client reports a lapse down a channel the real store
 * listens to; a completed login clears it.
 */

import { needsSignIn } from '@/store/session';
import { reportSessionLapse } from '@/services/session-lapse';

const { useAppStore } = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

describe('needsSignIn', () => {
  it.each([
    ['a guest', { isGuestMode: true, sessionLapsed: false }, true],
    ['a family whose session lapsed', { isGuestMode: false, sessionLapsed: true }, true],
    ['a signed-in family', { isGuestMode: false, sessionLapsed: false }, false],
  ])('should say whether %s needs to sign in', (_case, state, expected) => {
    expect(needsSignIn(state)).toBe(expected);
  });
});

describe('the session lapse in the store', () => {
  beforeEach(() => {
    useAppStore.setState({ isGuestMode: false, sessionLapsed: false, hasCompletedLogin: true });
  });

  it('should start with no lapse', () => {
    expect(needsSignIn(useAppStore.getState())).toBe(false);
  });

  it('should need a sign-in once the API client reports it could not refresh the session', () => {
    reportSessionLapse();

    expect(useAppStore.getState().sessionLapsed).toBe(true);
    expect(needsSignIn(useAppStore.getState())).toBe(true);
  });

  it('should stop needing one once a login completes, and not before', () => {
    useAppStore.getState().markSessionLapsed();

    useAppStore.getState().setLoginComplete(false);
    expect(useAppStore.getState().sessionLapsed).toBe(true);

    useAppStore.getState().setLoginComplete(true);
    expect(useAppStore.getState().sessionLapsed).toBe(false);
    expect(useAppStore.getState().hasCompletedLogin).toBe(true);
  });

  it.each([
    ['a guest', { isGuestMode: true, sessionLapsed: false }],
    ['a family whose session lapsed', { isGuestMode: false, sessionLapsed: true }],
  ])('should need no sign-in once %s signs in', (_case, state) => {
    useAppStore.setState({ ...state, hasCompletedLogin: false });

    useAppStore.getState().markSignedIn();

    expect(needsSignIn(useAppStore.getState())).toBe(false);
    expect(useAppStore.getState().hasCompletedLogin).toBe(true);
  });

  it('should not remember a lapse across launches: the login check on launch decides afresh', () => {
    const persisted = (useAppStore as any).persist?.getOptions?.().partialize?.({ ...useAppStore.getState(), sessionLapsed: true });

    expect(persisted?.sessionLapsed).toBeUndefined();
  });
});
