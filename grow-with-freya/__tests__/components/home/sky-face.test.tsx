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
import { SkyFace } from '@/components/home/sky-face';

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderFace(props: Partial<React.ComponentProps<typeof SkyFace>> = {}) {
  const view = render(<SkyFace size={110} timeOfDay="night" {...props} />);

  return { view, ...view };
}

describe('SkyFace', () => {
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
});
