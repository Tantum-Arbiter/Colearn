/**
 * The splash screen: takes over from the native launch image, grows the logo on
 * a night sky, then hands the app on. It must never strand a family on the
 * splash, whatever goes wrong while it prepares.
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AppSplashScreen } from '@/components/splash-screen';
import { AnimatedLogo } from '@/components/splash/animated-logo';
import { SPLASH_TIMELINE } from '@/constants/splash-logo';

jest.mock('@/components/splash/splash-logo-art', () => ({
  SPLASH_LOGO_ART: {
    bookLeft: { uri: 'test://bookLeft' },
    bookRight: { uri: 'test://bookRight' },
    roots: { uri: 'test://roots' },
    stem: { uri: 'test://stem' },
    leafLeft: { uri: 'test://leafLeft' },
    leafRight: { uri: 'test://leafRight' },
    leafTop: { uri: 'test://leafTop' },
    wordmark: { uri: 'test://wordmark' },
  },
}));

const mockSetAppReady = jest.fn();
const mockTimeOfDay = jest.fn(() => 'night');

jest.mock('@/hooks/use-time-of-day', () => ({
  useTimeOfDay: () => mockTimeOfDay(),
}));

jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({ setAppReady: mockSetAppReady }),
}));

const hideAsync = SplashScreen.hideAsync as jest.Mock;

type Rendered = ReturnType<typeof render>;

async function settle() {
  await act(async () => {
    for (let turn = 0; turn < 12; turn += 1) {
      await Promise.resolve();
    }
  });
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await settle();
}

function skyOf(rendered: Rendered) {
  return rendered.UNSAFE_root.findAll(
    (node: any) => 'timeOfDay' in node.props && 'playing' in node.props
  )[0];
}

function auraOf(rendered: Rendered) {
  return rendered.UNSAFE_root.findAll((node: any) => 'logoSize' in node.props && 'logoLeft' in node.props)[0];
}

function isInside(node: any, testID: string): boolean {
  let current = node.parent;

  while (current) {
    if (current.props.testID === testID) {
      return true;
    }
    current = current.parent;
  }

  return false;
}

function textsOf(rendered: Rendered): string[] {
  return rendered.UNSAFE_root
    .findAll((node: any) => typeof node.props.children === 'string')
    .map((node: any) => node.props.children as string);
}

describe('AppSplashScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    hideAsync.mockResolvedValue(undefined);
    mockTimeOfDay.mockReturnValue('night');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should hold the logo still until the native launch image has gone', () => {
    const underTest = render(<AppSplashScreen />);

    expect(underTest.UNSAFE_getByType(AnimatedLogo).props.playing).toBe(false);
    expect(skyOf(underTest).props.playing).toBe(false);
  });

  it('should start growing the logo and waking the sky once it has', async () => {
    const underTest = render(<AppSplashScreen />);

    await settle();

    expect(hideAsync).toHaveBeenCalledTimes(1);
    expect(underTest.UNSAFE_getByType(AnimatedLogo).props.playing).toBe(true);
    expect(skyOf(underTest).props.playing).toBe(true);
  });

  it('should leave the sky standing while the logo fades, so home arrives without a flash', async () => {
    const underTest = render(<AppSplashScreen />);

    await settle();

    expect(isInside(skyOf(underTest), 'splash-content')).toBe(false);
    expect(isInside(underTest.UNSAFE_getByType(AnimatedLogo), 'splash-content')).toBe(true);
    expect(isInside(auraOf(underTest), 'splash-content')).toBe(true);
  });

  it.each(['night', 'day'])('should open under the same %s sky the home page will show', async (timeOfDay) => {
    mockTimeOfDay.mockReturnValue(timeOfDay);
    const underTest = render(<AppSplashScreen />);

    await settle();

    expect(skyOf(underTest).props.timeOfDay).toBe(timeOfDay);
  });

  it('should say what the app is for', async () => {
    const underTest = render(<AppSplashScreen />);

    await settle();

    expect(textsOf(underTest)).toContain('splash.tagline');
  });

  it('should keep the app waiting until the logo has grown and the screen has left', async () => {
    render(<AppSplashScreen />);
    await settle();

    await advance(SPLASH_TIMELINE.exitAtMs);
    await advance(SPLASH_TIMELINE.exitMs - 1);
    const earlyCalls = mockSetAppReady.mock.calls.length;
    await advance(1);

    expect(earlyCalls).toBe(0);
    expect(mockSetAppReady).toHaveBeenCalledTimes(1);
    expect(mockSetAppReady).toHaveBeenCalledWith(true);
  });

  it('should still open the app when the native launch image will not hide', async () => {
    hideAsync.mockRejectedValueOnce(new Error('no native splash'));
    render(<AppSplashScreen />);

    await settle();

    expect(mockSetAppReady).toHaveBeenCalledWith(true);
  });

  it('should not open the app after it has been torn down', async () => {
    const underTest = render(<AppSplashScreen />);
    await settle();

    underTest.unmount();
    await advance(SPLASH_TIMELINE.exitAtMs);
    await advance(SPLASH_TIMELINE.exitMs + 50);

    expect(mockSetAppReady).not.toHaveBeenCalled();
  });
});
