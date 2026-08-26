/**
 * How the ring's pulse behaves across the glance opening and closing.
 *
 * The glance's close hands the corner back at the moment its orb has reformed
 * into a dot the same size and colour as this ring, which is why the ring
 * appears instantly rather than fading -- a fade would leave a gap with
 * neither on screen. That handover only works if the ring is at rest when it
 * arrives, and the pulse used to be left free-running the whole time the ring
 * was hidden. The orb settled at exactly 1 and the ring came back at anything
 * up to `pulseScale` in the same frame.
 *
 * The global reanimated mock flattens delays, so this file records them.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

import { ScreenTimeRing } from '@/components/home/screen-time-ring';
import { SCREEN_TIME_RING } from '@/constants/screen-time-ring';

const mockValues: Array<{ assignments: unknown[] }> = [];

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RNlib = require('react-native');
  const AnimatedView = React.forwardRef((props: any, ref: any) =>
    React.createElement(RNlib.View, { ...props, ref })
  );

  return {
    __esModule: true,
    default: { View: AnimatedView, createAnimatedComponent: (c: any) => c },
    useSharedValue: (initial: any) => {
      const assignments: unknown[] = [];
      const value = {
        get value() {
          return assignments.length ? assignments[assignments.length - 1] : initial;
        },
        set value(next: unknown) {
          assignments.push(next);
        },
        assignments,
      };
      mockValues.push(value);
      return value;
    },
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: (to: number) => ({ kind: 'timing', to }),
    withDelay: (ms: number, animation: any) => ({ kind: 'delay', ms, animation }),
    withSequence: (...animations: any[]) => ({ kind: 'sequence', animations }),
    withRepeat: (animation: any, count: number) => ({ kind: 'repeat', animation, count }),
    cancelAnimation: () => {},
    interpolateColor: (_v: any, _r: any, colours: string[]) => colours[0],
    Easing: { inOut: (e: any) => e, quad: () => {} },
  };
});

jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => false }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

beforeEach(() => {
  mockValues.length = 0;
});

const EXCEEDED = { usageSeconds: 3600, limitSeconds: 1800 };

function renderRing(hidden: boolean) {
  return render(<ScreenTimeRing {...EXCEEDED} hidden={hidden} />);
}

/** Every value that was ever handed a repeating animation. */
function pulses() {
  return mockValues.filter((value) =>
    value.assignments.some(
      (a: any) => a && typeof a === 'object' && (a.kind === 'repeat' || a.animation?.kind === 'repeat')
    )
  );
}

describe('the ring’s pulse', () => {
  it('is held at rest while the ring is hidden, not left running', () => {
    renderRing(true);

    expect(pulses()).toHaveLength(0);
    // and it is parked at exactly the scale the glance's orb settles at
    const parked = mockValues.filter((v) => v.assignments.includes(1));
    expect(parked.length).toBeGreaterThan(0);
  });

  it('breathes once the ring is back', () => {
    renderRing(false);

    expect(pulses()).toHaveLength(1);
  });

  it('waits a beat before it starts, so the corner is handed back at rest', () => {
    // The defect this pins: starting the moment the ring reappears means it is
    // already growing on the frame the orb hands over, and the two do not
    // match.
    renderRing(false);

    const assigned = pulses()[0].assignments.slice(-1)[0] as any;

    expect(assigned.kind).toBe('delay');
    expect(assigned.ms).toBe(SCREEN_TIME_RING.pulseSettle);
    expect(assigned.animation.kind).toBe('repeat');
  });

});
