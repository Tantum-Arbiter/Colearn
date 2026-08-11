/**
 * Tests for the redesigned login screen.
 *
 * Key behaviors tested:
 * 1. The screen renders every element of the design: hero art, the three
 *    sign-in options, the guest note and the privacy promise panel
 * 2. Copy comes from translation keys, not hardcoded English
 * 3. The guest button starts the guest flow rather than a sign-in
 * 4. The legal footer opens the terms and privacy screens
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { LoginScreen } from '@/components/auth/login-screen';

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [null, null, jest.fn()],
}));

jest.mock('@/services/auth-service', () => ({
  AuthService: {
    getGoogleConfig: () => ({}),
    isGoogleAuthConfigured: () => true,
    isNativeGoogleSignInAvailable: () => false,
    configureNativeGoogleSignIn: jest.fn(),
    isAppleSignInAvailable: jest.fn().mockResolvedValue(true),
    signInWithApple: jest.fn(),
    signInWithGoogleNative: jest.fn(),
    completeGoogleSignIn: jest.fn(),
  },
}));

jest.mock('@/components/main-menu', () => ({
  MainMenu: () => null,
}));

jest.mock('@/components/account/terms-conditions-screen', () => {
  const { Text } = require('react-native');
  return { TermsConditionsScreen: () => <Text testID="terms-screen">terms</Text> };
});

jest.mock('@/components/account/privacy-policy-screen', () => {
  const { Text } = require('react-native');
  return { PrivacyPolicyScreen: () => <Text testID="privacy-screen">privacy</Text> };
});

const mockSetGuestMode = jest.fn();
const mockGetEffectiveTier = jest.fn(() => 'free');

jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    setGuestMode: mockSetGuestMode,
    getEffectiveTier: mockGetEffectiveTier,
  }),
}));

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function toStr(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

function renderLogin(props: Partial<React.ComponentProps<typeof LoginScreen>> = {}) {
  return render(<LoginScreen onSuccess={jest.fn()} {...props} />);
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEffectiveTier.mockReturnValue('free');
  });

  it('renders the hero illustration', () => {
    expect(findByTestId(renderLogin(), 'login-hero').length).toBeGreaterThan(0);
  });

  it('renders the Google and guest options', () => {
    const tree = renderLogin();

    expect(findByTestId(tree, 'login-google').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'login-guest').length).toBeGreaterThan(0);
  });

  it('renders the Apple option on iOS only', () => {
    const original = Platform.OS;

    Platform.OS = 'ios';
    expect(findByTestId(renderLogin(), 'login-apple').length).toBeGreaterThan(0);

    Platform.OS = 'android';
    expect(findByTestId(renderLogin(), 'login-apple')).toHaveLength(0);

    Platform.OS = original;
  });

  it('renders the guest note beside its cloud badge', () => {
    const tree = renderLogin();

    expect(findByTestId(tree, 'login-guest-note')).toHaveLength(1);
    expect(findByTestId(tree, 'login-cloud-badge').length).toBeGreaterThan(0);
  });

  it('renders the privacy promise panel with both promises', () => {
    const tree = renderLogin();

    expect(findByTestId(tree, 'login-privacy-panel')).toHaveLength(1);
    expect(findByTestId(tree, 'login-shield-badge').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'login-promise-noAdverts')).toHaveLength(1);
    expect(findByTestId(tree, 'login-promise-noTracking')).toHaveLength(1);
  });

  it('renders the guest badge art rather than an icon-font glyph', () => {
    expect(findByTestId(renderLogin(), 'login-guest-avatar').length).toBeGreaterThan(0);
  });

  it('renders the four-colour Google mark', () => {
    expect(findByTestId(renderLogin(), 'google-glyph')).toHaveLength(1);
  });

  it('takes its copy from translation keys', () => {
    const body = toStr(renderLogin());

    expect(body).toContain('login.welcomeTitle');
    expect(body).toContain('login.subtitle');
    expect(body).toContain('login.continueAsGuest');
    expect(body).toContain('login.safePrivateTitle');
    expect(body).toContain('login.guestNote');
  });

  it('starts the guest flow without signing in', () => {
    const onSuccess = jest.fn();
    const tree = renderLogin({ onSuccess });

    fireEvent.press(findByTestId(tree, 'login-guest')[0]);

    // free-tier users see the guest info overlay first, so onSuccess must wait
    expect(onSuccess).not.toHaveBeenCalled();
    expect(findByTestId(tree, 'guest-info-overlay')).toHaveLength(1);
    expect(findByTestId(tree, 'guest-info-card')).toHaveLength(1);
  });

  it('shows the guest overlay in the redesigned treatment', () => {
    const tree = renderLogin();

    fireEvent.press(findByTestId(tree, 'login-guest')[0]);

    // no legacy logo, but the card wears the subscription page's story-art
    const body = toStr(tree);
    expect(body).not.toContain('earlyroots-logo');
    expect(findByTestId(tree, 'guest-info-art').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'guest-info-badge').length).toBeGreaterThan(0);
  });

  it('carries every guest-mode caveat into the new overlay', () => {
    const tree = renderLogin();

    fireEvent.press(findByTestId(tree, 'login-guest')[0]);

    for (const key of ['syncProgress', 'multiDevice', 'cloudBackup', 'personalised']) {
      expect(findByTestId(tree, `guest-info-missing-${key}`)).toHaveLength(1);
    }
    expect(findByTestId(tree, 'guest-info-subscription')).toHaveLength(1);
  });

  it('gives the subscription blurb height to render in', () => {
    const tree = renderLogin();

    fireEvent.press(findByTestId(tree, 'login-guest')[0]);
    const body = findByTestId(tree, 'guest-info-subscription-body')[0];
    const style = StyleSheet.flatten(body.props.style);

    // flex:1 on a direct child of the column panel collapses it to zero height,
    // which silently blanked the blurb
    expect(style.flex).toBeUndefined();
    expect(toStr(tree)).toContain('guestInfo.subscriptionDescription');
  });

  it('enters guest mode from the overlay button', () => {
    const tree = renderLogin();

    fireEvent.press(findByTestId(tree, 'login-guest')[0]);
    fireEvent.press(findByTestId(tree, 'guest-info-continue')[0]);

    expect(mockSetGuestMode).toHaveBeenCalledWith(true);
  });

  it('offers a way back from the guest overlay', () => {
    const tree = renderLogin();

    fireEvent.press(findByTestId(tree, 'login-guest')[0]);

    expect(findByTestId(tree, 'guest-info-back').length).toBeGreaterThan(0);
  });

  it('returns to the login screen from the guest overlay without entering guest mode', () => {
    const onSuccess = jest.fn();
    const tree = renderLogin({ onSuccess });

    fireEvent.press(findByTestId(tree, 'login-guest')[0]);
    fireEvent.press(findByTestId(tree, 'guest-info-back')[0]);

    // the mocked withTiming completes synchronously, so the overlay unmounts
    expect(findByTestId(tree, 'guest-info-overlay')).toHaveLength(0);
    expect(mockSetGuestMode).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    // the login options are still there to use
    expect(findByTestId(tree, 'login-google').length).toBeGreaterThan(0);
  });

  it('can reopen the guest overlay after going back', () => {
    const tree = renderLogin();

    fireEvent.press(findByTestId(tree, 'login-guest')[0]);
    fireEvent.press(findByTestId(tree, 'guest-info-back')[0]);
    fireEvent.press(findByTestId(tree, 'login-guest')[0]);

    expect(findByTestId(tree, 'guest-info-overlay')).toHaveLength(1);
  });

  it('skips the guest overlay for a returning subscriber', () => {
    mockGetEffectiveTier.mockReturnValue('premium');
    const tree = renderLogin();

    fireEvent.press(findByTestId(tree, 'login-guest')[0]);

    expect(mockSetGuestMode).toHaveBeenCalledWith(true);
    expect(findByTestId(tree, 'guest-info-overlay')).toHaveLength(0);
  });

  it('opens the terms screen from the legal footer', () => {
    const tree = renderLogin();
    const footer = findByTestId(tree, 'login-legal-footer')[0];
    const links = footer.findAll((n: any) => typeof n.props.onPress === 'function');

    fireEvent.press(links[0]);

    expect(findByTestId(tree, 'terms-screen')).toHaveLength(1);
  });

  it('opens the privacy screen from the legal footer', () => {
    const tree = renderLogin();
    const footer = findByTestId(tree, 'login-legal-footer')[0];
    const links = footer.findAll((n: any) => typeof n.props.onPress === 'function');

    fireEvent.press(links[links.length - 1]);

    expect(findByTestId(tree, 'privacy-screen')).toHaveLength(1);
  });
});
