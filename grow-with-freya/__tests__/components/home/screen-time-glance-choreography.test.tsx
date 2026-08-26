/**
 * The structural guarantee, checked on the real component.
 *
 * The glance carries twenty-one shared values across two pieces of
 * choreography, and the fault that kept recurring was never in the motion
 * itself: it was assigning two animations to one value in the same handler,
 * which silently discards the first. It produced four separate "the thing
 * never appeared" defects -- the orb invisible through its whole spin, the
 * spiral arm never drawn, the closing teardrop never seen, the border showing
 * a segment early -- each looking like a different bug and each needing a
 * slow-motion recording to find.
 *
 * `choreograph` makes it throw rather than happen quietly, and this asserts
 * it end to end: render the glance with a reanimated mock that records every
 * assignment, and no shared value may come out of the open or the close
 * carrying more than one animation.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import * as RN from 'react-native';

import { ScreenTimeGlance } from '@/components/home/screen-time-glance';

// jest only lets a module factory reach an out-of-scope variable whose name
// starts with "mock", hence the prefix
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
    // A recording shared value: plain numbers are snaps, objects are
    // animations, and the test can tell them apart afterwards.
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
    withTiming: (to: number, config: any, callback?: (finished: boolean) => void) => ({
      kind: 'timing',
      to,
      duration: config?.duration ?? 300,
      callback,
    }),
    withDelay: (ms: number, animation: any) => ({ kind: 'delay', ms, animation }),
    withSequence: (...animations: any[]) => ({ kind: 'sequence', animations }),
    interpolateColor: (_v: any, _r: any, colours: string[]) => colours[0],
    runOnJS: (fn: any) => fn,
    Easing: {
      out: (e: any) => e,
      in: (e: any) => e,
      inOut: (e: any) => e,
      cubic: () => {},
      quad: () => {},
      bezier: () => () => {},
    },
  };
});

jest.mock('@/components/screen-time/screen-time-screen', () => {
  const { View } = require('react-native');
  return { ScreenTimeContent: () => <View testID="screen-time-content" /> };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockReduceMotion = false;

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReduceMotion,
}));

// the real Modal throws inside this jsdom test environment when visible; the
// same patch the other glance tests use, for the same reason
const RealModal = RN.Modal;
const MockModal = ({ visible, testID, children }: any) =>
  visible ? <RN.View testID={testID}>{children}</RN.View> : null;

beforeAll(() => {
  (RN as any).Modal = MockModal;
});

afterAll(() => {
  (RN as any).Modal = RealModal;
});

beforeEach(() => {
  mockValues.length = 0;
  mockReduceMotion = false;
});

const ORIGIN = { x: 33, y: 760 };

/** How many of the recorded values carry an animation, rather than a snap. */
function animated() {
  return mockValues.filter((value) =>
    value.assignments.some((assignment) => typeof assignment === 'object')
  );
}

function animationsOn(value: { assignments: unknown[] }) {
  return value.assignments.filter((assignment) => typeof assignment === 'object').length;
}

/** Any value carrying more than one animation is the bug this rules out. */
function doubleAnimated() {
  return mockValues.filter((value) => animationsOn(value) > 1);
}

function open(props: Partial<React.ComponentProps<typeof ScreenTimeGlance>> = {}) {
  return render(
    <ScreenTimeGlance
      visible
      timeOfDay="night"
      onClose={jest.fn()}
      origin={ORIGIN}
      {...props}
    />
  );
}

describe('the glance’s choreography', () => {
  it('gives no shared value two animations when it opens', () => {
    open();

    expect(doubleAnimated()).toHaveLength(0);
  });

  it('actually animates the open, rather than passing by doing nothing', () => {
    open();

    // the open moves the orb, the morph, the travel, the border, the scrim,
    // the panel, the drawn stroke and the content, at least
    expect(animated().length).toBeGreaterThanOrEqual(8);
  });

  it('gives no shared value two animations when it closes', () => {
    const tree = open();

    // the shared values live across the close, so the open's animations are
    // counted out first rather than discarded -- clearing the recording here
    // would make this pass against an empty list
    const beforeClose = mockValues.map(animationsOn);

    act(() => {
      fireEvent.press(
        tree.UNSAFE_root.findAll(
          (node: any) => node.props.testID === 'screen-time-glance-close'
        )[0]
      );
    });

    const added = mockValues.map((value, index) => animationsOn(value) - beforeClose[index]);

    expect(added.filter((count) => count > 1)).toHaveLength(0);
    // and the close genuinely ran, rather than passing by doing nothing
    expect(added.filter((count) => count === 1).length).toBeGreaterThanOrEqual(8);
  });

  it('opens without animating anything at all under reduced motion', () => {
    mockReduceMotion = true;

    open();

    // the reduced-motion branch is a set of snaps, so nothing moves -- and
    // nothing can be double-assigned either
    expect(doubleAnimated()).toHaveLength(0);
    expect(animated()).toHaveLength(0);
    expect(mockValues.length).toBeGreaterThan(0);
  });
});
