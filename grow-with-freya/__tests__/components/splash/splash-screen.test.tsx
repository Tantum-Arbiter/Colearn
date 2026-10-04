/**
 * The splash screen: takes over from the native launch image, grows the logo on
 * a night sky, then fades away whole over whichever page the app opens on. It must never strand a family on the
 * splash, whatever goes wrong while it prepares.
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { withDelay, withTiming } from 'react-native-reanimated';
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
const FRAMES_TO_DRAW_THE_PAGE_MS = 50;
const A_PAGE_THAT_TAKES_AGES_TO_DRAW_MS = 5000;

let fadeFinished: ((finished?: boolean) => void) | null = null;

type Rendered = ReturnType<typeof render>;

async function settle() {
  await act(async () => {
    for (let turn = 0; turn < 12; turn += 1) {
      await Promise.resolve();
    }
  });
}

async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 50) {
    const step = Math.min(50, left);
    await act(async () => {
      jest.advanceTimersByTime(step);
    });
    await settle();
  }
}

function skyOf(rendered: Rendered) {
  return rendered.UNSAFE_root.findAll(
    (node: any) => 'timeOfDay' in node.props && 'playing' in node.props
  )[0];
}

async function fadeEnds(finished = true) {
  await act(async () => {
    fadeFinished?.(finished);
  });
}

function textsOf(rendered: Rendered): string[] {
  return rendered.UNSAFE_root
    .findAll((node: any) => typeof node.props.children === 'string')
    .map((node: any) => node.props.children as string);
}

const READY_AT_MS = SPLASH_TIMELINE.exitAtMs - SPLASH_TIMELINE.mountAllowanceMs;

describe('AppSplashScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    hideAsync.mockResolvedValue(undefined);
    mockTimeOfDay.mockReturnValue('night');
    fadeFinished = null;
    (withTiming as jest.Mock).mockImplementation((value, config, callback) => {
      if (value === 0 && config?.duration === SPLASH_TIMELINE.exitMs && typeof callback === 'function') {
        fadeFinished = callback;
      }
      return value;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should hold the logo still until the native launch image has gone', () => {
    const underTest = render(<AppSplashScreen leaving={false} onGone={jest.fn()} />);

    expect(underTest.UNSAFE_getByType(AnimatedLogo).props.playing).toBe(false);
    expect(skyOf(underTest).props.playing).toBe(false);
  });

  it('should start growing the logo and waking the sky once it has', async () => {
    const underTest = render(<AppSplashScreen leaving={false} onGone={jest.fn()} />);

    await settle();

    expect(hideAsync).toHaveBeenCalledTimes(1);
    expect(underTest.UNSAFE_getByType(AnimatedLogo).props.playing).toBe(true);
    expect(skyOf(underTest).props.playing).toBe(true);
  });

  it.each(['night', 'day'])('should open under the same %s sky the home page will show', async (timeOfDay) => {
    mockTimeOfDay.mockReturnValue(timeOfDay);
    const underTest = render(<AppSplashScreen leaving={false} onGone={jest.fn()} />);

    await settle();

    expect(skyOf(underTest).props.timeOfDay).toBe(timeOfDay);
  });

  it('should say what the app is for', async () => {
    const underTest = render(<AppSplashScreen leaving={false} onGone={jest.fn()} />);

    await settle();

    expect(textsOf(underTest)).toContain('splash.tagline');
  });

  it('should open the app a little before the hold ends, so the page behind it is ready by then', async () => {
    render(<AppSplashScreen leaving={false} onGone={jest.fn()} />);
    await settle();

    await advance(READY_AT_MS - 1);
    const earlyCalls = mockSetAppReady.mock.calls.length;
    await advance(1);

    expect(earlyCalls).toBe(0);
    expect(mockSetAppReady).toHaveBeenCalledTimes(1);
    expect(mockSetAppReady).toHaveBeenCalledWith(true);
  });

  it('should show the finished logo for the whole hold even when the page is ready early', async () => {
    const onGone = jest.fn();
    const underTest = render(<AppSplashScreen leaving={false} onGone={onGone} />);
    await settle();
    await advance(READY_AT_MS);

    underTest.rerender(<AppSplashScreen leaving onGone={onGone} />);
    await settle();
    await advance(SPLASH_TIMELINE.exitAtMs - READY_AT_MS + SPLASH_TIMELINE.exitMs + FRAMES_TO_DRAW_THE_PAGE_MS);
    const earlyCalls = onGone.mock.calls.length;
    await fadeEnds();

    const fadeDelays = (withDelay as jest.Mock).mock.calls
      .filter(([, animation]) => animation === 0)
      .map(([ms]) => ms as number);
    expect(earlyCalls).toBe(0);
    expect(onGone).toHaveBeenCalledTimes(1);
    expect(fadeDelays).toHaveLength(1);
    expect(fadeDelays[0]).toBeGreaterThan(SPLASH_TIMELINE.mountAllowanceMs - FRAMES_TO_DRAW_THE_PAGE_MS - 50);
    expect(fadeDelays[0]).toBeLessThanOrEqual(SPLASH_TIMELINE.mountAllowanceMs);
  });

  it('should leave as soon as it can when the page takes longer than that to be ready', async () => {
    const onGone = jest.fn();
    const underTest = render(<AppSplashScreen leaving={false} onGone={onGone} />);
    await settle();
    await advance(SPLASH_TIMELINE.exitAtMs + 600);

    underTest.rerender(<AppSplashScreen leaving onGone={onGone} />);
    await settle();
    await advance(SPLASH_TIMELINE.handoffMs + SPLASH_TIMELINE.exitMs + FRAMES_TO_DRAW_THE_PAGE_MS);
    await fadeEnds();

    expect(withDelay).toHaveBeenCalledWith(SPLASH_TIMELINE.handoffMs, 0);
    expect(onGone).toHaveBeenCalledTimes(1);
  });

  it('should stay up, whole, until the page behind it is ready', async () => {
    const onGone = jest.fn();
    render(<AppSplashScreen leaving={false} onGone={onGone} />);
    await settle();

    await advance(SPLASH_TIMELINE.exitAtMs + SPLASH_TIMELINE.handoffMs + SPLASH_TIMELINE.exitMs + 1000);

    expect(onGone).not.toHaveBeenCalled();
    expect(withTiming).not.toHaveBeenCalledWith(0, expect.anything());
  });

  it('should fade out whole, sky and all, once the page behind it is ready', async () => {
    const onGone = jest.fn();
    const underTest = render(<AppSplashScreen leaving={false} onGone={onGone} />);
    await settle();
    await advance(SPLASH_TIMELINE.exitAtMs);

    underTest.rerender(<AppSplashScreen leaving onGone={onGone} />);
    await settle();
    await advance(SPLASH_TIMELINE.handoffMs + SPLASH_TIMELINE.exitMs + FRAMES_TO_DRAW_THE_PAGE_MS);
    const earlyCalls = onGone.mock.calls.length;
    await fadeEnds();

    expect(withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: SPLASH_TIMELINE.exitMs }), expect.any(Function));
    expect(withDelay).toHaveBeenCalledWith(SPLASH_TIMELINE.handoffMs, expect.anything());
    expect(earlyCalls).toBe(0);
    expect(onGone).toHaveBeenCalledTimes(1);
  });

  it('should hand over the moment a page is ready, even before the logo has finished', async () => {
    const onGone = jest.fn();
    render(<AppSplashScreen leaving onGone={onGone} />);
    await settle();

    await advance(SPLASH_TIMELINE.handoffMs + SPLASH_TIMELINE.exitMs + FRAMES_TO_DRAW_THE_PAGE_MS);
    await fadeEnds();

    expect(onGone).toHaveBeenCalledTimes(1);
  });

  it('should stay up until its fade has finished on screen, however long the page behind takes to draw', async () => {
    const onGone = jest.fn();
    const underTest = render(<AppSplashScreen leaving={false} onGone={onGone} />);
    await settle();
    await advance(SPLASH_TIMELINE.exitAtMs);

    underTest.rerender(<AppSplashScreen leaving onGone={onGone} />);
    await settle();
    await advance(SPLASH_TIMELINE.handoffMs + SPLASH_TIMELINE.exitMs + A_PAGE_THAT_TAKES_AGES_TO_DRAW_MS);
    const callsBeforeTheFadeEnds = onGone.mock.calls.length;
    await fadeEnds();

    expect(callsBeforeTheFadeEnds).toBe(0);
    expect(onGone).toHaveBeenCalledTimes(1);
  });

  it('should stay up when its fade is cut short', async () => {
    const onGone = jest.fn();
    render(<AppSplashScreen leaving onGone={onGone} />);
    await settle();
    await advance(SPLASH_TIMELINE.handoffMs + SPLASH_TIMELINE.exitMs + FRAMES_TO_DRAW_THE_PAGE_MS);

    await fadeEnds(false);

    expect(onGone).not.toHaveBeenCalled();
  });

  it('should still open the app when the native launch image will not hide', async () => {
    hideAsync.mockRejectedValueOnce(new Error('no native splash'));
    render(<AppSplashScreen leaving={false} onGone={jest.fn()} />);

    await settle();

    expect(mockSetAppReady).toHaveBeenCalledWith(true);
  });

  it('should not open the app after it has been torn down', async () => {
    const underTest = render(<AppSplashScreen leaving={false} onGone={jest.fn()} />);
    await settle();

    underTest.unmount();
    await advance(SPLASH_TIMELINE.exitAtMs);
    await advance(SPLASH_TIMELINE.exitMs + 50);

    expect(mockSetAppReady).not.toHaveBeenCalled();
  });

  it('should not report itself gone when torn down part way through fading', async () => {
    const onGone = jest.fn();
    const underTest = render(<AppSplashScreen leaving onGone={onGone} />);
    await settle();
    await advance(FRAMES_TO_DRAW_THE_PAGE_MS + SPLASH_TIMELINE.handoffMs);

    underTest.unmount();
    await advance(SPLASH_TIMELINE.exitMs + FRAMES_TO_DRAW_THE_PAGE_MS);
    await fadeEnds();

    expect(onGone).not.toHaveBeenCalled();
  });

  it('should not report itself gone after it has been torn down', async () => {
    const onGone = jest.fn();
    const underTest = render(<AppSplashScreen leaving onGone={onGone} />);
    await settle();

    underTest.unmount();
    await advance(SPLASH_TIMELINE.handoffMs + SPLASH_TIMELINE.exitMs + FRAMES_TO_DRAW_THE_PAGE_MS);
    await fadeEnds();

    expect(onGone).not.toHaveBeenCalled();
  });
});
