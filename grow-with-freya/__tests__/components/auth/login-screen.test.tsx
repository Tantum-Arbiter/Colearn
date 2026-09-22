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
import { act, render, fireEvent } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { LoginScreen, longestWord } from '@/components/auth/login-screen';

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

jest.mock('@/components/auth/login-hero', () => {
  const { View } = require('react-native');
  return { LoginHero: (props: any) => <View testID="login-hero" {...props} /> };
});

const mockUseReducedMotion = jest.fn(() => false);

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
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

let mockUserNickname: string | null = null;

jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    setGuestMode: mockSetGuestMode,
    getEffectiveTier: mockGetEffectiveTier,
    userNickname: mockUserNickname,
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

// The greeting puts the name first in some languages and last in others, so the
// token that has to fit is not at a fixed position.
describe('longestWord', () => {
  it.each([
    ['Welcome, Ava!', 'Welcome,'],
    ['Welcome, Bartholomew!', 'Bartholomew!'],
    ['Bienvenue, Bartholomew !', 'Bartholomew'],
    ['Willkommen, Bartholomew!', 'Bartholomew!'],
  ])('picks the longest token of %s', (greeting, expected) => {
    expect(longestWord(greeting)).toBe(expected);
  });

  it('handles a greeting with no spaces at all', () => {
    expect(longestWord('Ava\u3055\u3093\u3001\u3088\u3046\u3053\u305d\uff01')).toBe(
      'Ava\u3055\u3093\u3001\u3088\u3046\u3053\u305d\uff01'
    );
  });
});

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEffectiveTier.mockReturnValue('free');
    mockUseReducedMotion.mockReturnValue(false);
    mockUserNickname = null;
  });

  it('renders the hero illustration', () => {
    expect(findByTestId(renderLogin(), 'login-hero').length).toBeGreaterThan(0);
  });

  describe('the animals in the hero', () => {
    it('sway, blink and smile unless the child has asked for less motion', () => {
      expect(findByTestId(renderLogin(), 'login-hero')[0].props.animated).toBe(true);
    });

    it('hold their painted pose when motion is reduced', () => {
      mockUseReducedMotion.mockReturnValue(true);

      expect(findByTestId(renderLogin(), 'login-hero')[0].props.animated).toBe(false);
    });
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

  // The i18n mock renders keys verbatim, so these assert which key is chosen --
  // the quotes keep "login.welcomeTitle" from matching welcomeTitleNamed.
  describe('greeting', () => {
    it('greets the child by nickname once onboarding has stored one', () => {
      mockUserNickname = 'Ava';

      const body = toStr(renderLogin());

      expect(body).toContain('login.welcomeTitleNamed');
      expect(body).not.toContain('"login.welcomeTitle"');
    });

    it('falls back to the plain greeting when no nickname is stored', () => {
      const body = toStr(renderLogin());

      expect(body).toContain('"login.welcomeTitle"');
      expect(body).not.toContain('login.welcomeTitleNamed');
    });

    // the name must never wrap, on any screen width or in any language. The
    // size comes from one measurement, not a shrink-until-it-fits loop:
    // onTextLayout reports once and does not fire again after a size change,
    // so a loop stalls after a single step.
    const fontSizeOf = (node: any) => {
      const style = Array.isArray(node.props.style) ? node.props.style.flat() : [node.props.style];
      return style.reduce(
        (found: number | undefined, s: any) => (s?.fontSize ? s.fontSize : found),
        undefined
      );
    };

    const layout = (tree: ReturnType<typeof render>, testID: string, width: number) => {
      fireEvent(findByTestId(tree, testID).pop()!, 'layout', {
        nativeEvent: { layout: { width, height: 48, x: 0, y: 0 } },
      });
    };

    const measureGreeting = (slotWidth: number, nameWidth: number) => {
      mockUserNickname = 'Kkkkkkkkkkkkkk';
      const tree = renderLogin();
      layout(tree, 'login-title-slot', slotWidth);
      layout(tree, 'login-title-measure', nameWidth);
      return fontSizeOf(findByTestId(tree, 'login-title').pop()!);
    };

    it('scales the greeting down so the name fits the width available', () => {
      // half the room it needs would put it at 20pt, which the floor lifts to 22
      expect(measureGreeting(300, 600)).toBe(22);
    });

    it('scales by how much room is short, not by a fixed step', () => {
      // 300/400 of full size -- a single 2pt step could never reach this
      expect(measureGreeting(300, 400)).toBe(30);
    });

    it('leaves the greeting at full size when the name already fits', () => {
      expect(measureGreeting(300, 200)).toBe(40);
    });

    it('never shrinks past the floor, however long the name', () => {
      expect(measureGreeting(100, 5000)).toBe(22);
    });

    it('keeps full size until it has both measurements', () => {
      mockUserNickname = 'Kkkkkkkkkkkkkk';
      const tree = renderLogin();

      expect(fontSizeOf(findByTestId(tree, 'login-title').pop()!)).toBe(40);
    });

    // W4: without this, measuring the whole greeting instead of just the name
    // passes every width-based assertion while scaling far too aggressively
    it('measures the name on its own, not the whole greeting', () => {
      mockUserNickname = 'Kkkkkkkkkkkkkk';
      const tree = renderLogin();

      const greeting = findByTestId(tree, 'login-title').pop()!.props.children as string;
      const measured = findByTestId(tree, 'login-title-measure').pop()!.props.children as string;
      const tokens = greeting.split(/\s+/);
      const longest = tokens.reduce((a, b) => (b.length > a.length ? b : a), '');

      expect(tokens.length).toBeGreaterThan(1);
      expect(measured).toBe(longest);
      expect(measured).not.toBe(greeting);
    });

    it('caps the greeting at two lines so the name cannot be split', () => {
      mockUserNickname = 'Kkkkkkkkkkkkkk';
      const tree = renderLogin();

      expect(findByTestId(tree, 'login-title').pop()!.props.numberOfLines).toBe(2);
    });

    it('treats a whitespace-only nickname as no nickname', () => {
      mockUserNickname = '   ';

      const body = toStr(renderLogin());

      expect(body).toContain('"login.welcomeTitle"');
      expect(body).not.toContain('login.welcomeTitleNamed');
    });
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

  // the main menu the child is about to use is mounted beneath this whole screen
  // by the app shell; the guest card is opaque, so the sky can go the moment the
  // card starts to leave, and the slide reveals that one menu
  describe('handing over to the menu beneath', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('mounts no menu of its own', () => {
      const tree = renderLogin();

      fireEvent.press(findByTestId(tree, 'login-guest')[0]);
      fireEvent.press(findByTestId(tree, 'guest-info-continue')[0]);
      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'sky-face').length).toBe(0);
      expect(toStr(tree)).not.toContain('home-scene');
    });

    it('drops the sky under the guest card and hands over once the card has slid away', () => {
      const onSkip = jest.fn();
      const tree = renderLogin({ onSkip });

      fireEvent.press(findByTestId(tree, 'login-guest')[0]);
      fireEvent.press(findByTestId(tree, 'guest-info-continue')[0]);

      expect(onSkip).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('says the reveal has started before anything is handed over, on both paths', () => {
      const calls: string[] = [];
      const guest = renderLogin({ onSkip: () => calls.push('skip'), onRevealStart: () => calls.push('reveal') });
      fireEvent.press(findByTestId(guest, 'login-guest')[0]);
      fireEvent.press(findByTestId(guest, 'guest-info-continue')[0]);
      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(calls).toEqual(['reveal', 'skip']);

      calls.length = 0;
      mockGetEffectiveTier.mockReturnValue('premium');
      const returning = renderLogin({ onSkip: () => calls.push('skip'), onRevealStart: () => calls.push('reveal') });
      fireEvent.press(findByTestId(returning, 'login-guest')[0]);

      expect(calls).toEqual(['reveal', 'skip']);
    });

    it('hands a returning subscriber over as soon as the login has faded, with no wait', () => {
      mockGetEffectiveTier.mockReturnValue('premium');
      const onSkip = jest.fn();
      const tree = renderLogin({ onSkip });

      fireEvent.press(findByTestId(tree, 'login-guest')[0]);

      expect(findByTestId(tree, 'guest-info-overlay')).toHaveLength(0);
      expect(mockSetGuestMode).toHaveBeenCalledWith(true);
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
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
