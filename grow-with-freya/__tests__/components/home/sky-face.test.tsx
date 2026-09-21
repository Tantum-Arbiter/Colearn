/**
 * Tests for the face in the sky.
 *
 * Day brings the sun, night brings the moon, and both wear a resting smile with
 * a laughing frame stacked over it that fades in and out while the whole face
 * gives a small giggle.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, type RenderResult } from '@testing-library/react-native';
import { RadialGradient } from 'react-native-svg';
import { SkyFace } from '@/components/home/sky-face';
import { SKY_FACE_RHYTHM, SKY_FACE_SPARKLES } from '@/constants/sky-face';

const reanimated = jest.requireMock('react-native-reanimated');

function laughsStarted(): number {
  return reanimated.withTiming.mock.calls.filter(
    ([, config]: [unknown, { duration?: number } | undefined]) => config?.duration === SKY_FACE_RHYTHM.laughMs
  ).length;
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderFace(props: Partial<React.ComponentProps<typeof SkyFace>> = {}) {
  const view = render(<SkyFace size={110} timeOfDay="night" {...props} />);

  return { view, ...view };
}

describe('SkyFace', () => {
  beforeAll(() => {
    reanimated.useSharedValue.mockImplementation((initial: number) => React.useRef({ value: initial }).current);
  });

  describe.each([
    ['day', 'home.sun'],
    ['night', 'home.moon'],
  ] as const)('at %s', (timeOfDay, label) => {
    it('should name itself for a screen reader', () => {
      const { view } = renderFace({ timeOfDay });

      const underTest = byTestId(view, 'sky-face')[0];

      expect(underTest.props.accessibilityLabel).toBe(label);
    });

    it('should stack a resting and a laughing frame', () => {
      const { view } = renderFace({ timeOfDay });

      expect(byTestId(view, 'sky-face-resting').length).toBeGreaterThan(0);
      expect(byTestId(view, 'sky-face-laughing').length).toBeGreaterThan(0);
    });
  });

  it('should honour the size it is given', () => {
    const { view } = renderFace({ size: 96 });

    const underTest = byTestId(view, 'sky-face')[0];

    expect(StyleSheet.flatten(underTest.props.style)).toEqual(expect.objectContaining({ width: 96, height: 96 }));
  });

  it('should be a button a child can tap to make it laugh', () => {
    const { view } = renderFace();

    const underTest = byTestId(view, 'sky-face');
    const host = underTest[underTest.length - 1];

    expect(host.props.accessibilityRole).toBe('button');
    expect(() => fireEvent.press(host)).not.toThrow();
  });

  it('should carry a glow behind the face that cannot be tapped', () => {
    const { view } = renderFace();

    const underTest = byTestId(view, 'sky-face-glow');

    expect(underTest.length).toBeGreaterThan(0);
    expect(underTest[0].props.pointerEvents).toBe('none');
  });

  it('should light the glow as a soft bloom, not a flat disc', () => {
    const { view } = renderFace();

    const underTest = view.UNSAFE_queryAllByType(RadialGradient);

    expect(underTest.length).toBeGreaterThan(0);
  });

  it('should keep one sparkle per seed', () => {
    const { view } = renderFace();

    const underTest = byTestId(view, 'sky-face-sparkle').filter((node) => typeof node.props.index === 'number');

    expect(underTest).toHaveLength(SKY_FACE_SPARKLES.length);
  });

  it('should start a full laugh on every tap, not only the first', () => {
    const { view } = renderFace();
    const underTest = byTestId(view, 'sky-face');
    const host = underTest[underTest.length - 1];
    const before = laughsStarted();

    fireEvent.press(host);
    const afterOne = laughsStarted();
    fireEvent.press(host);

    expect(afterOne).toBeGreaterThan(before);
    expect(laughsStarted()).toBeGreaterThan(afterOne);
  });

  it('should not laugh merely for being rendered', () => {
    const before = laughsStarted();

    renderFace({ animated: false });

    expect(laughsStarted()).toBe(before);
  });
});
