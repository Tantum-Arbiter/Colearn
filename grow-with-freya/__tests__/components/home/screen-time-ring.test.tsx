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

  describe('stepping aside for the glance', () => {
    // while the glance is open its orb rises exactly where the ring sits;
    // the ring hides so one control becomes the orb rather than a second
    // red dot lingering beneath the choreography
    it('disables its press target while hidden', () => {
      const onPress = jest.fn();
      const { view } = renderRing({ usageSeconds: 3600, onPress, hidden: true });

      // asserted as a prop: the web-rendered Pressable under this test
      // harness fires onPress regardless of disabled, so behaviour here
      // would pass even without the guard
      expect(byTestId(view, 'screen-time-ring')[0].props.disabled).toBe(true);
    });

    it('still accepts presses when visible', () => {
      const onPress = jest.fn();
      const { view } = renderRing({ usageSeconds: 3600, onPress });

      fireEvent.press(byTestId(view, 'screen-time-ring')[0]);

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * On the home scene the ring sits on the globe, where a thin white dial over
 * lime continents and blue sea all but vanished. A dark disc behind it gives
 * it something of its own to sit on. Only the home asks for it; the bar has
 * its own dark surface already -- and only while the dial is still counting,
 * since the spent state is solid red and needs no backing.
 */
describe('the backplate', () => {
  function plate(tree: ReturnType<typeof render>) {
    return tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'screen-time-ring-backplate');
  }

  it('is not drawn unless asked for', () => {
    const tree = render(<ScreenTimeRing usageSeconds={600} limitSeconds={3600} />);

    expect(plate(tree)).toHaveLength(0);
  });

  it('sits behind the dial, a little wider than it', () => {
    const tree = render(<ScreenTimeRing usageSeconds={600} limitSeconds={3600} size={40} backplate />);

    const style = [plate(tree)[0].props.style].flat(Infinity).reduce((a: any, b: any) => ({ ...a, ...b }), {});

    expect(style.width).toBeGreaterThan(40);
    expect(style.borderRadius).toBe(style.width / 2);
  });

  // Once the limit is spent the ring is a solid red circle with its own halo.
  // It needs no dark disc to stand off the globe, and one behind it only muddies
  // the glow.
  it('is frosted glass like the rest of the home chrome, not a dark ink disc, so it sits lightly on the bright globe', () => {
    const tree = render(<ScreenTimeRing usageSeconds={600} limitSeconds={3600} backplate />);

    const style = [plate(tree)[0].props.style].flat(Infinity).reduce((a: any, b: any) => ({ ...a, ...b }), {});
    const [r, g, b, alpha] = String(style.backgroundColor).match(/[\d.]+/g)!.map(Number);

    expect(Math.min(r, g, b)).toBeGreaterThanOrEqual(200);
    expect(alpha).toBeGreaterThanOrEqual(0.12);
    expect(alpha).toBeLessThanOrEqual(0.35);
  });

  it('is dropped once the limit is spent', () => {
    const tree = render(<ScreenTimeRing usageSeconds={4000} limitSeconds={3600} backplate />);

    expect(plate(tree)).toHaveLength(0);
  });

  it('is still drawn right up to the limit', () => {
    const tree = render(<ScreenTimeRing usageSeconds={3599} limitSeconds={3600} backplate />);

    expect(plate(tree).length).toBeGreaterThan(0);
  });
});
