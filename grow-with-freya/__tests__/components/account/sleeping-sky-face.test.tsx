/**
 * The sun or moon asleep at the top of Grown-ups: snoring quietly, and when a
 * child taps it, one eye peeks open for a moment before it drifts off again.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { SleepingSkyFace } from '@/components/account/sleeping-sky-face';
import { PEEK_TOTAL_MS, SLEEPING_EYES, SLEEP_RHYTHM } from '@/constants/sleeping-sky-face';

const SIZE = 200;

function byTestId(view: ReturnType<typeof render>, testID: string) {
  return view.UNSAFE_root.findAll((node: any) => node.props.testID === testID && typeof node.type !== 'string');
}

function tap(view: ReturnType<typeof render>) {
  const face = view.UNSAFE_root.findAll((node: any) => node.props.testID === 'sleeping-sky-face' && typeof node.props.onPress === 'function');
  fireEvent.press(face[face.length - 1]);
}

function sourceOf(view: ReturnType<typeof render>): unknown {
  return byTestId(view, 'sleeping-sky-face-art')[0].props.source;
}

describe('SleepingSkyFace', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('who is asleep', () => {
    it('shows the moon asleep while the sun has the day', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      expect(sourceOf(view)).toBe(require('../../../assets/images/ui-elements/home-moon-sleeping.webp'));
      expect(byTestId(view, 'sleeping-sky-face')[0].props.accessibilityLabel).toBe('account.sleepingMoon');
    });

    it('shows the sun asleep while the moon has the night', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="night" />);

      expect(sourceOf(view)).toBe(require('../../../assets/images/ui-elements/home-sun-sleeping.webp'));
      expect(byTestId(view, 'sleeping-sky-face')[0].props.accessibilityLabel).toBe('account.sleepingSun');
    });

    it('is a button a child can press', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      expect(byTestId(view, 'sleeping-sky-face')[0].props.accessibilityRole).toBe('button');
    });

    it('is as big as it is told to be', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      const style = StyleSheet.flatten(byTestId(view, 'sleeping-sky-face-art')[0].props.style);

      expect(style.width).toBe(SIZE);
      expect(style.height).toBe(SIZE);
    });
  });

  describe('asleep', () => {
    it('keeps both eyes shut', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="night" />);

      expect(byTestId(view, 'sleeping-sky-face-eye-shut')).toHaveLength(2);
      expect(byTestId(view, 'sleeping-sky-face-eye-open')).toHaveLength(0);
    });

    it('draws the shut eyes where the art has them', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="night" />);

      const [left, right] = byTestId(view, 'sleeping-sky-face-eye-shut').map((node: any) => StyleSheet.flatten(node.props.style));
      const eyes = SLEEPING_EYES.sun;

      expect(left.left + left.width / 2).toBeCloseTo(eyes.left.x * SIZE, 5);
      expect(right.left + right.width / 2).toBeCloseTo(eyes.right.x * SIZE, 5);
      expect(left.width).toBeCloseTo(eyes.left.width * SIZE, 5);
      expect(right.width).toBeCloseTo(eyes.right.width * SIZE, 5);
    });

    it('snores', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      expect(byTestId(view, 'sleeping-sky-face-zzz')).toHaveLength(SLEEP_RHYTHM.zzzCount);
    });

    it('still shows its snores, standing still, when motion is reduced', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" animated={false} />);

      expect(byTestId(view, 'sleeping-sky-face-zzz')).toHaveLength(SLEEP_RHYTHM.zzzCount);
    });
  });

  describe('a tap', () => {
    it('peeks one eye open, leaving the other shut', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));

      expect(byTestId(view, 'sleeping-sky-face-eye-open')).toHaveLength(1);
      expect(byTestId(view, 'sleeping-sky-face-eye-shut')).toHaveLength(2);
    });

    it('opens the eye over the art\'s right eye', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));
      const open = StyleSheet.flatten(byTestId(view, 'sleeping-sky-face-eye-open')[0].props.style);

      expect(open.left + open.width / 2).toBeCloseTo(SLEEPING_EYES.moon.right.x * SIZE, 5);
    });

    it('stops snoring while it has a look', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));

      expect(byTestId(view, 'sleeping-sky-face-zzz')).toHaveLength(0);
    });

    it('drifts back off to sleep once the peek is over', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));
      act(() => {
        jest.advanceTimersByTime(PEEK_TOTAL_MS - 1);
      });
      expect(byTestId(view, 'sleeping-sky-face-eye-open')).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(byTestId(view, 'sleeping-sky-face-eye-open')).toHaveLength(0);
      expect(byTestId(view, 'sleeping-sky-face-zzz')).toHaveLength(SLEEP_RHYTHM.zzzCount);
    });

    it('gives a light tap of feedback', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('ignores taps while already peeking, so the look is not cut short', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));
      act(() => {
        jest.advanceTimersByTime(PEEK_TOTAL_MS / 2);
      });
      act(() => tap(view));
      act(() => {
        jest.advanceTimersByTime(PEEK_TOTAL_MS / 2);
      });

      expect(byTestId(view, 'sleeping-sky-face-eye-open')).toHaveLength(0);
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    });

    it('can be woken for a peek again once asleep', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));
      act(() => {
        jest.advanceTimersByTime(PEEK_TOTAL_MS);
      });
      act(() => tap(view));

      expect(byTestId(view, 'sleeping-sky-face-eye-open')).toHaveLength(1);
    });

    it('leaves no timer behind when the page goes', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));
      view.unmount();

      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
