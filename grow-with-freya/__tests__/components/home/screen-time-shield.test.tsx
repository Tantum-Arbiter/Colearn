/**
 * Tests for the guard mark inside the screen-time ring.
 *
 * A shield holding a clock: the ring says how much time is left, the mark
 * says what the ring is for. It belongs to the ring rather than to the dial,
 * because the dial is also what the glance's orb is drawn from -- a mark on
 * the dial would ride up the screen inside the orb every time the ring was
 * pressed, which is the one moment it is supposed to be gone.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { ScreenTimeRing } from '@/components/home/screen-time-ring';
import { ScreenTimeDial } from '@/components/home/screen-time-dial';
import { SCREEN_TIME_RING, screenTimeGuardSize } from '@/constants/screen-time-ring';

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function renderRing(props: Partial<React.ComponentProps<typeof ScreenTimeRing>> = {}) {
  return render(<ScreenTimeRing usageSeconds={900} limitSeconds={3600} {...props} />);
}

describe('the guard mark', () => {
  it('should sit inside the ring', () => {
    const view = renderRing();

    const underTest = byTestId(view, 'screen-time-guard');

    expect(underTest.length).toBeGreaterThan(0);
  });

  it('should be the shield-and-clock artwork, tinted to the state it is given', () => {
    const view = renderRing({ tint: '#C6DBFA' });

    const underTest = byTestId(view, 'screen-time-guard-glyph')[0];

    expect(underTest.props.source).toBe(require('../../../assets/images/ui-elements/screensafe-shield.png'));
    expect(underTest.props.style.tintColor).toBe('#C6DBFA');
    expect(underTest.props.style.opacity).toBe(SCREEN_TIME_RING.arcOpacity);
  });

  it('should fit inside the track without touching it', () => {
    const inner = SCREEN_TIME_RING.size - SCREEN_TIME_RING.strokeWidth * 2;

    const underTest = screenTimeGuardSize(SCREEN_TIME_RING.size);

    expect(underTest).toBeLessThan(inner);
    expect(underTest).toBeGreaterThan(0);
  });

  describe('while there is time left', () => {
    it('should be drawn in the tint the arc is drawn in', () => {
      const view = renderRing({ tint: '#C6DBFA' });

      const underTest = byTestId(view, 'screen-time-guard')[0];

      expect(underTest.props.colour).toBe('#C6DBFA');
    });

    it('should carry the same opacity the arc carries', () => {
      const view = renderRing();

      const underTest = byTestId(view, 'screen-time-guard')[0];

      expect(underTest.props.opacity).toBe(SCREEN_TIME_RING.arcOpacity);
    });
  });

  describe('once the allowance is spent', () => {
    it('should turn a lighter red than the circle it sits on', () => {
      const view = renderRing({ usageSeconds: 4000 });

      const underTest = byTestId(view, 'screen-time-guard')[0];

      expect(underTest.props.colour).toBe(SCREEN_TIME_RING.exceededGuard);
      expect(underTest.props.colour).not.toBe(SCREEN_TIME_RING.exceededColour);
    });

    it('should be fully opaque, so it reads against the solid fill', () => {
      const view = renderRing({ usageSeconds: 4000 });

      const underTest = byTestId(view, 'screen-time-guard')[0];

      expect(underTest.props.opacity).toBe(1);
    });
  });

  describe('the orb that rises when the ring is pressed', () => {
    it('should not carry the mark, so it leaves with the ring', () => {
      const view = render(
        <ScreenTimeDial cx={15} cy={15} tint="#FFFFFF" progress={0.5} testID="orb" />
      );

      const underTest = byTestId(view, 'screen-time-guard');

      expect(underTest.length).toBe(0);
    });
  });
});
