/**
 * Tests for the screen-time ring in the corner of the home scene.
 *
 * It should be almost invisible while there is time left, and unmistakable once
 * there is not. A child is never told off by it -it is a parent's glance.
 */

import React from 'react';
import { Pressable } from 'react-native';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { ScreenTimeRing } from '@/components/home/screen-time-ring';
import { SCREEN_TIME_RING } from '@/constants/screen-time-ring';

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderRing(props: Partial<React.ComponentProps<typeof ScreenTimeRing>> = {}) {
  const view = render(<ScreenTimeRing usageSeconds={900} limitSeconds={3600} {...props} />);

  return { view, ...view };
}

describe('ScreenTimeRing', () => {
  describe('while there is time left', () => {
    it('should render the ring', () => {
      const { view } = renderRing();

      const underTest = byTestId(view, 'screen-time-ring');

      expect(underTest.length).toBeGreaterThan(0);
    });

    it('should not fill the centre', () => {
      const { view } = renderRing();

      const underTest = byTestId(view, 'screen-time-ring-fill');

      expect(underTest.length).toBe(0);
    });

    it.each([
      ['just started', 60],
      ['halfway', 1800],
      ['nearly done', 3500],
    ])('should stay quiet when %s', (_case, usageSeconds) => {
      const { view } = renderRing({ usageSeconds });

      const underTest = byTestId(view, 'screen-time-ring-fill');

      expect(underTest.length).toBe(0);
    });
  });

  describe('once the allowance is spent', () => {
    it('should fill the circle', () => {
      const { view } = renderRing({ usageSeconds: 3600 });

      const underTest = byTestId(view, 'screen-time-ring-fill');

      expect(underTest.length).toBeGreaterThan(0);
    });

    it('should fill it in red', () => {
      const { view } = renderRing({ usageSeconds: 4000 });

      const underTest = byTestId(view, 'screen-time-ring-fill')[0];

      expect(underTest.props.fill).toBe(SCREEN_TIME_RING.exceededColour);
    });

    it('should describe itself to a screen reader', () => {
      const { view } = renderRing({ usageSeconds: 4000 });

      const underTest = byTestId(view, 'screen-time-ring')[0];

      expect(underTest.props.accessibilityLabel).toBe('home.screenTimeExceeded');
    });
  });

  describe('opening the detail', () => {
    it('should be inert unless someone asks for it to be tappable', () => {
      const { view } = renderRing();

      const underTest = view.UNSAFE_queryAllByType(Pressable);

      expect(underTest.length).toBe(0);
    });

    it('should open when tapped from a screen that allows it', () => {
      const onPress = jest.fn();
      const { view } = renderRing({ onPress });

      fireEvent.press(view.UNSAFE_queryAllByType(Pressable)[0]);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should announce itself as a button only when it can be opened', () => {
      const { view } = renderRing({ onPress: jest.fn() });

      const underTest = view.UNSAFE_queryAllByType(Pressable)[0];

      expect(underTest.props.accessibilityRole).toBe('button');
    });

    it('should still be tappable once the allowance is spent', () => {
      const onPress = jest.fn();
      const { view } = renderRing({ usageSeconds: 5000, onPress });

      fireEvent.press(view.UNSAFE_queryAllByType(Pressable)[0]);

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('when no limit applies', () => {
    it('should render nothing at all', () => {
      const { view } = renderRing({ limitSeconds: 0 });

      const underTest = byTestId(view, 'screen-time-ring');

      expect(underTest.length).toBe(0);
    });

    it('should offer nothing to tap either', () => {
      const { view } = renderRing({ limitSeconds: 0, onPress: jest.fn() });

      const underTest = view.UNSAFE_queryAllByType(Pressable);

      expect(underTest.length).toBe(0);
    });
  });
});
