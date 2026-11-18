/**
 * The sun or moon asleep at the top of Grown-ups: snoring quietly, and when a
 * child taps it, one eye peeks open for a moment before it drifts off again.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { SleepingSkyFace } from '@/components/account/sleeping-sky-face';
import { SLEEPING_EYES, SLEEPING_MOUTH, SLEEP_RHYTHM, WAKE_TOTAL_MS } from '@/constants/sleeping-sky-face';

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

      expect(sourceOf(view)).toBe(require('../../../assets/images/ui-elements/home-moon-sleeping-mouthless.webp'));
      expect(byTestId(view, 'sleeping-sky-face')[0].props.accessibilityLabel).toBe('account.sleepingMoon');
    });

    it('shows the sun asleep while the moon has the night', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="night" />);

      expect(sourceOf(view)).toBe(require('../../../assets/images/ui-elements/home-sun-sleeping-mouthless.webp'));
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

    it('draws its smile over the art, where the painted one was, hinged at its corners', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="night" />);

      const mouth = StyleSheet.flatten(byTestId(view, 'sleeping-sky-face-mouth')[0].props.style);
      const spot = SLEEPING_MOUTH.sun;

      expect(mouth.left + mouth.width / 2).toBeCloseTo(spot.x * SIZE, 5);
      expect(mouth.top + (spot.stroke * SIZE) / 2).toBeCloseTo(spot.y * SIZE, 5);
      expect(mouth.width).toBeCloseTo(spot.width * SIZE, 5);
      expect(mouth.transformOrigin).toBe('top');
    });

    it('glows, so the halo can breathe with it', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      expect(byTestId(view, 'sleeping-sky-face-glow').length).toBeGreaterThan(0);
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
    it('peeks one eye open, with an iris that can look about, leaving the other shut', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));

      expect(byTestId(view, 'sleeping-sky-face-eye-open')).toHaveLength(1);
      expect(byTestId(view, 'sleeping-sky-face-iris')).toHaveLength(1);
      expect(byTestId(view, 'sleeping-sky-face-eye-shut')).toHaveLength(2);
    });

    it('opens a round eye over the art\'s right eye, its lower lid just under the shut line', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));
      const open = StyleSheet.flatten(byTestId(view, 'sleeping-sky-face-eye-open')[0].props.style);
      const eyeLine = SLEEPING_EYES.moon.right.y * SIZE;

      expect(open.left + open.width / 2).toBeCloseTo(SLEEPING_EYES.moon.right.x * SIZE, 5);
      expect(open.width).toBe(open.height);
      expect(open.top + open.height).toBeGreaterThan(eyeLine);
      expect(open.top + open.height - eyeLine).toBeLessThan(open.height / 4);
      expect(open.top).toBeLessThan(eyeLine);
    });

    it('closes the eye with a lid that comes down from the top, over an iris kept inside the white', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));
      const lid = StyleSheet.flatten(byTestId(view, 'sleeping-sky-face-lid')[0].props.style);
      const eyeball = byTestId(view, 'sleeping-sky-face-lid')[0].findAll((node: any) => {
        const style = StyleSheet.flatten(node.props.style);

        return style && style.borderRadius !== undefined && style.overflow === 'hidden';
      })[0];
      const eyeballStyle = StyleSheet.flatten(eyeball.props.style);

      expect(lid.overflow).toBe('hidden');
      expect(lid.left).toBe(0);
      expect(lid.right).toBe(0);
      expect(eyeballStyle.borderRadius).toBe(eyeballStyle.width / 2);
      expect(byTestId(view, 'sleeping-sky-face-iris')).toHaveLength(1);
    });

    it('stops snoring while it has a look', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));

      expect(byTestId(view, 'sleeping-sky-face-zzz')).toHaveLength(0);
    });

    it('drifts back off to sleep once the look about is over', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));
      act(() => {
        jest.advanceTimersByTime(WAKE_TOTAL_MS - 1);
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

    it('ignores taps while already awake, so the look about is not cut short', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));
      act(() => {
        jest.advanceTimersByTime(WAKE_TOTAL_MS / 2);
      });
      act(() => tap(view));
      act(() => {
        jest.advanceTimersByTime(WAKE_TOTAL_MS / 2);
      });

      expect(byTestId(view, 'sleeping-sky-face-eye-open')).toHaveLength(0);
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    });

    it('can be woken for another look once asleep', () => {
      const view = render(<SleepingSkyFace size={SIZE} timeOfDay="day" />);

      act(() => tap(view));
      act(() => {
        jest.advanceTimersByTime(WAKE_TOTAL_MS);
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
