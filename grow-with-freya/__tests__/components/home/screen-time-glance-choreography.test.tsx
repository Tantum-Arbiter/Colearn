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

import { Easing } from 'react-native-reanimated';

import { ScreenTimeGlance } from '@/components/home/screen-time-glance';
import { type Track } from '@/utils/choreograph';

// jest only lets a module factory reach an out-of-scope variable whose name
// starts with "mock", hence the prefix
const mockValues: Array<{ assignments: unknown[] }> = [];
const mockTracks: Track[] = [];

jest.mock('@/utils/choreograph', () => {
  const actual = jest.requireActual('@/utils/choreograph');
  return {
    ...actual,
    choreograph: (tracks: any[], options: any) => {
      mockTracks.push(...tracks);
      return actual.choreograph(tracks, options);
    },
  };
});

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
      // distinct identities, so a test can tell linear from anything else
      linear: function linear(v: number) { return v; },
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
  mockTracks.length = 0;
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

  it('cuts the window out under reduced motion, rather than holding it for a dissolve', () => {
    mockReduceMotion = true;
    const props = { timeOfDay: 'night' as const, onClose: jest.fn(), origin: ORIGIN };
    const tree = render(<ScreenTimeGlance visible {...props} />);

    tree.rerender(<ScreenTimeGlance visible={false} {...props} />);

    expect(
      tree.UNSAFE_root.findAll(
        (node: any) => node.props.testID === 'screen-time-glance-spinner'
      )
    ).toHaveLength(0);
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

  describe('values that feed a hand-written curve', () => {
    // `orbSquash` and `splashPath` are not plain interpolations: the first
    // carries its own ease plus an anticipation bump, the second is ballistic
    // -- droplets easing outward under a gravity term that grows with the
    // square of the progress. Both are written against real elapsed time, so
    // the value driving them has to be linear. Ease it as well and the two
    // curves compose: the middle is crushed, the bump lands at the wrong
    // moment, and the droplets stutter.
    //
    // This is invisible to `expectSmooth`, which samples those functions over
    // uniform progress -- it tests the curve, not the curve composed with
    // whatever drives it. Hence a test on the driving easing itself.
    //
    // Note that omitting `easing` does NOT mean linear: Reanimated defaults to
    // an in-out quad, which is how the splash came to be eased twice without
    // anyone writing an easing down.
    const DERIVED = ['morph', 'splash'];

    function beatsFor(name: string) {
      return mockTracks.filter((track) => track.name === name).flatMap((t) => t.beats);
    }

    it.each(DERIVED)('drives "%s" linearly wherever it is animated', (name) => {
      // the splash only animates on the close, the morph on both, so the two
      // phases are collected together and every beat found must be linear
      const tree = open();

      act(() => {
        fireEvent.press(
          tree.UNSAFE_root.findAll(
            (node: any) => node.props.testID === 'screen-time-glance-close'
          )[0]
        );
      });

      const beats = beatsFor(name);
      expect(beats.length).toBeGreaterThan(0);
      beats.forEach((beat) => expect(beat.easing).toBe(Easing.linear));
    });

  });

  describe('the halo the orb hands over', () => {
    // The ring wears a halo while it is over its limit -- a disc nearly twice
    // the dial's width. The close hands the corner back the instant the orb
    // has reformed, deliberately without a fade, so anything the ring has and
    // the orb does not simply appears out of nowhere in that frame. The orb
    // has to be wearing it, at full strength, before the handover.
    function closeAndCollect(name: string) {
      const tree = open({ exceeded: true });
      mockTracks.length = 0;

      act(() => {
        fireEvent.press(
          tree.UNSAFE_root.findAll(
            (node: any) => node.props.testID === 'screen-time-glance-close'
          )[0]
        );
      });

      return mockTracks.filter((track) => track.name === name);
    }

    it('is at full strength by the time the close finishes', () => {
      const beats = closeAndCollect('halo').flatMap((t) => t.beats);

      expect(beats.length).toBeGreaterThan(0);
      expect(beats[beats.length - 1].to).toBe(1);
    });

    it('grows in on the same beat as the colour, and finishes with it', () => {
      const halo = closeAndCollect('halo').flatMap((t) => t.beats);
      const colour = closeAndCollect('orb colour').flatMap((t) => t.beats);

      const end = (b: any) => b.at + (b.over ?? 0);
      expect(halo[0].at).toBe(colour[0].at);
      expect(end(halo[halo.length - 1])).toBe(end(colour[colour.length - 1]));
    });

    it('is shed again on the way out, so a re-open starts from the ring', () => {
      open({ exceeded: true });

      const beats = mockTracks.filter((t) => t.name === 'halo').flatMap((t) => t.beats);

      expect(mockTracks.find((t) => t.name === 'halo')?.from).toBe(1);
      expect(beats[beats.length - 1].to).toBe(0);
    });
  });

  describe('what the orb is made of at the handover', () => {
    const RING_IS = [
      ['calm, an outlined dial', false, 1, 0],
      ['over its limit, a solid disc', true, 0, 1],
    ] as const;

    function tracksNamed(name: string) {
      return mockTracks.filter((track) => track.name === name);
    }

    function closeFrom(exceeded: boolean) {
      const tree = open({ exceeded });
      mockTracks.length = 0;

      act(() => {
        fireEvent.press(
          tree.UNSAFE_root.findAll(
            (node: any) => node.props.testID === 'screen-time-glance-close'
          )[0]
        );
      });
    }

    const lastBeat = (name: string) => {
      const beats = tracksNamed(name).flatMap((track) => track.beats);
      expect(beats.length).toBeGreaterThan(0);
      return beats[beats.length - 1];
    };

    it.each(RING_IS)('rises out of a ring that is %s', (_case, exceeded, dial, core) => {
      open({ exceeded });

      expect(tracksNamed('ring dial')[0].from).toBe(dial);
      expect(tracksNamed('orb core')[0].from).toBe(core);
    });

    it.each(RING_IS)('hands the corner back to a ring that is %s', (_case, exceeded, dial, core) => {
      closeFrom(exceeded);

      expect(lastBeat('ring dial').to).toBe(dial);
      expect(lastBeat('orb core').to).toBe(core);
    });

    it('takes the dial back on the same beat the core gives way', () => {
      closeFrom(false);

      const dial = lastBeat('ring dial');
      const core = lastBeat('orb core');

      expect(dial.at).toBe(core.at);
      expect(dial.over).toBe(core.over);
    });

    it.each([
      ['an outline', 'orb outline'],
      ['a turn', 'orb turn'],
    ])('never gives the reforming orb %s to shed again', (_case, name) => {
      closeFrom(true);

      expect(tracksNamed(name).flatMap((track) => track.beats)).toHaveLength(0);
    });
  });

});