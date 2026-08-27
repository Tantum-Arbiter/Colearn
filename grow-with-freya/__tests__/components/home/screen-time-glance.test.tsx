/**
 * Tests for the screen-time glance -- the window that opens out of the ring
 * in the home screen's bottom-left corner.
 *
 * It exists to answer one question ("how long today?"), so it deliberately
 * carries the usage dashboard and nothing else: no schedule callout, no
 * bedtime guidance, no route into building reminders. Those live in settings.
 *
 * The open is a piece of choreography: an echo of the ring spins up at the
 * ring's own centre, travels to the panel's nearest corner and draws the
 * border, and only then does the fill fade in. The one invariant worth
 * guarding here is containment -- the alarm colour lives inside the panel it
 * drew, and everything outside it is a dim night scrim, never red.
 *
 * The alert header and the tips action belong to the over-limit state only.
 * A full alert treatment for a child who has used fourteen of sixty minutes
 * would contradict the encouragement banner on the same page, so the calm
 * state keeps the dashboard greeting and offers no alert at all.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as RN from 'react-native';

import { ScreenTimeGlance } from '@/components/home/screen-time-glance';
import { ScreenTimeRing } from '@/components/home/screen-time-ring';
import { HOME_THEMES } from '@/constants/home-scene';
import {
  SCREEN_TIME_GLANCE,
  SCREEN_TIME_RING,
  panelBorderPath,
  glancePanelBounds,
  DROP_PATH,
} from '@/constants/screen-time-ring';

// the real Modal throws inside this jsdom test environment when visible; the
// same patch the schedule-window tests use, for the same reason
const RealModal = RN.Modal;
const MockModal = ({ visible, testID, onRequestClose, children }: any) =>
  visible ? (
    <RN.View testID={testID} {...{ onRequestCloseForTest: onRequestClose }}>
      {children}
    </RN.View>
  ) : null;

beforeAll(() => {
  (RN as any).Modal = MockModal;
});

afterAll(() => {
  (RN as any).Modal = RealModal;
});

jest.mock('@/components/screen-time/screen-time-screen', () => {
  const { View } = require('react-native');
  return {
    ScreenTimeContent: ({ showSchedule, showGreeting }: any) => (
      <View
        testID="screen-time-content"
        {...{ showScheduleForTest: showSchedule, showGreetingForTest: showGreeting }}
      />
    ),
  };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

// jest only lets a module factory reach an out-of-scope variable whose name
// starts with "mock", hence the prefix
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

afterEach(() => {
  mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
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
    useSharedValue: jest.fn((v: any) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((v: any, _config?: any, callback?: any) => {
      if (typeof callback === 'function') callback(true);
      return v;
    }),
    withDelay: jest.fn((_: any, v: any) => v),
    withRepeat: jest.fn((v: any) => v),
    withSequence: jest.fn((...values: any[]) => values[values.length - 1]),
    cancelAnimation: jest.fn(),
    useAnimatedProps: jest.fn(() => ({})),
    interpolateColor: jest.fn((_v: any, _r: any, colours: string[]) => colours[0]),
    Easing: {
      out: jest.fn((e: any) => e),
      in: jest.fn((e: any) => e),
      inOut: jest.fn((e: any) => e),
      cubic: jest.fn(),
      quad: jest.fn(),
      bezier: jest.fn(() => jest.fn()),
    },
    runOnJS: jest.fn((fn: any) => fn),
  };
});

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

const ORIGIN = { x: 33, y: 760 };

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll(
    (n: any) => n.props.testID === testID && n.type !== MockModal
  );
}

function renderGlance(props: Partial<React.ComponentProps<typeof ScreenTimeGlance>> = {}) {
  return render(
    <ScreenTimeGlance
      visible
      timeOfDay="day"
      onClose={jest.fn()}
      origin={ORIGIN}
      exceeded={false}
      {...props}
    />
  );
}

describe('ScreenTimeGlance', () => {
  it('renders nothing while closed', () => {
    const tree = renderGlance({ visible: false });

    expect(findByTestId(tree, 'screen-time-glance')).toHaveLength(0);
  });

  it('shows the usage dashboard', () => {
    const tree = renderGlance();

    expect(findByTestId(tree, 'screen-time-content').length).toBeGreaterThan(0);
  });

  it('asks the dashboard for usage only, without the schedule parts', () => {
    const tree = renderGlance();

    const content = findByTestId(tree, 'screen-time-content')[0];

    expect(content.props.showScheduleForTest).toBe(false);
  });

  it('closes from the close button', () => {
    const onClose = jest.fn();
    const tree = renderGlance({ onClose });

    fireEvent.press(findByTestId(tree, 'screen-time-glance-close')[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('the choreography surfaces', () => {
    it('dims everything outside the panel with night, not red', () => {
      const tree = renderGlance({ exceeded: true });
      const scrim = findByTestId(tree, 'screen-time-glance-scrim')[0];

      expect(StyleSheet.flatten(scrim.props.style).backgroundColor).toBe(
        SCREEN_TIME_GLANCE.scrim
      );
    });

    it('raises the spinner at the centre of the ring it echoes', () => {
      const tree = renderGlance();
      const spinner = findByTestId(tree, 'screen-time-glance-spinner')[0];
      const style = StyleSheet.flatten(spinner.props.style);

      // the box's own size, not a second copy of the formula that computes
      // it: what matters is that it is centred on the ring, and re-deriving
      // the size here meant this broke the moment anything else widened the box
      // without moving anything
      expect(style.left + style.width / 2).toBeCloseTo(ORIGIN.x);
      expect(style.top + style.height / 2).toBeCloseTo(ORIGIN.y);
    });

    it('draws the border in the water blue, whatever the state', () => {
      const red = findByTestId(renderGlance({ exceeded: true }), 'screen-time-glance-border')[0];
      const calm = findByTestId(renderGlance({ exceeded: false }), 'screen-time-glance-border')[0];

      expect(red.props.stroke).toBe(SCREEN_TIME_GLANCE.drawWater);
      expect(calm.props.stroke).toBe(SCREEN_TIME_GLANCE.drawWater);
    });

    it('starts the orb in the colour of the ring it echoes', () => {
      // the turn to water blue happens mid-spin, animated -- what is pinned
      // here is where the turn starts from
      const red = findByTestId(renderGlance({ exceeded: true }), 'screen-time-glance-spinner-arc')[0];
      const calm = findByTestId(renderGlance({ exceeded: false }), 'screen-time-glance-spinner-arc')[0];

      expect(red.props.stroke).toBe(SCREEN_TIME_GLANCE.exceededDraw);
      expect(calm.props.stroke).toBe(SCREEN_TIME_GLANCE.calmDraw);
    });

    it('gives the orb a solid core in the ring colour, to take over from the dot', () => {
      const red = findByTestId(renderGlance({ exceeded: true }), 'screen-time-glance-spinner-core')[0];
      const calm = findByTestId(renderGlance({ exceeded: false }), 'screen-time-glance-spinner-core')[0];

      // the core starts as the ring's own dot -- same radius, same colour --
      // so one control becomes the orb rather than a second one appearing
      expect(red.props.fill).toBe(SCREEN_TIME_GLANCE.exceededDraw);
      expect(calm.props.fill).toBe(SCREEN_TIME_GLANCE.calmDraw);
    });

    it('leaves a third of the circle open so the spin can be seen', () => {
      const arc = findByTestId(renderGlance(), 'screen-time-glance-spinner-arc')[0];
      const [dash, gap] = String(arc.props.strokeDasharray).split(/[ ,]+/).map(Number);
      const circumference = 2 * Math.PI * SCREEN_TIME_GLANCE.spinnerRadius;

      expect(dash + gap).toBeCloseTo(circumference);
      expect(gap / circumference).toBeGreaterThan(0.25);
    });

    it('arms the border for a dash-offset sweep along its whole length', () => {
      const border = findByTestId(renderGlance(), 'screen-time-glance-border')[0];
      const dash = String(border.props.strokeDasharray);
      const [visible, gap] = dash.split(/[ ,]+/).map(Number);

      // one dash the length of the path, one gap the same: offsetting from
      // length to zero is what draws it. The window has no real size under
      // jest, so the invariant is agreement, not magnitude: dash, gap and the
      // path the border was built from must all describe the same length.
      const { width, height } = RN.Dimensions.get('window');
      const inset = SCREEN_TIME_GLANCE.panelInset;
      const { length } = panelBorderPath({
        left: inset,
        top: inset,
        right: width - inset,
        bottom: height - inset,
        radius: SCREEN_TIME_GLANCE.panelRadius,
      });

      expect(visible).toBeCloseTo(gap);
      expect(visible).toBeCloseTo(length);
    });

    it('keeps the panel fill contained inside the panel', () => {
      const tree = renderGlance({ exceeded: true });

      const painted = tree.UNSAFE_root.findAll((n: any) => {
        const style = StyleSheet.flatten(n.props?.style);
        return style?.backgroundColor === SCREEN_TIME_GLANCE.exceededSurface;
      });

      // the fill exists exactly once, and it is the panel -- nothing
      // full-bleed behind it carries the colour, which is what stops the
      // window washing the whole screen in a single tone
      expect(painted.length).toBeGreaterThan(0);
      for (const node of painted) {
        expect(node.props.testID).toBe('screen-time-glance-panel');
      }
    });

    it('fills the panel with the night palette when the ring is calm', () => {
      const tree = renderGlance({ exceeded: false });
      const panel = findByTestId(tree, 'screen-time-glance-panel')[0];

      expect(StyleSheet.flatten(panel.props.style).backgroundColor).toBe(
        SCREEN_TIME_GLANCE.calmSurface
      );
    });

    it('carries a drop tint in the water blue, ready for the close', () => {
      const tree = renderGlance({ exceeded: true });
      const tint = findByTestId(tree, 'screen-time-glance-drop-tint')[0];

      expect(StyleSheet.flatten(tint.props.style).backgroundColor).toBe(
        SCREEN_TIME_GLANCE.drawWater
      );
    });

    it('drops a true teardrop of water, whatever the state', () => {
      for (const exceeded of [true, false]) {
        const shape = findByTestId(renderGlance({ exceeded }), 'screen-time-glance-drop-shape')[0];

        expect(shape.props.d).toBe(DROP_PATH);
        expect(shape.props.fill).toBe(SCREEN_TIME_GLANCE.drawWater);
      }
    });

    it('never paints the panel or its frame in the alarm colour', () => {
      // red survives only where it means something -- the ring, the alert
      // header's badge, the usage figure -- never as a surface or a frame
      const panel = findByTestId(renderGlance({ exceeded: true }), 'screen-time-glance-panel')[0];
      const style = StyleSheet.flatten(panel.props.style);

      expect(style.backgroundColor).not.toBe(SCREEN_TIME_GLANCE.exceededDraw);
      expect(style.borderColor).not.toBe(SCREEN_TIME_GLANCE.exceededDraw);
    });

    it('centres the teardrop on the panel it condenses from', () => {
      const tree = renderGlance();
      const drop = findByTestId(tree, 'screen-time-glance-drop')[0];
      const style = StyleSheet.flatten(drop.props.style);
      const { width, height } = RN.Dimensions.get('window');
      const bounds = glancePanelBounds(width, height, 0, 0);

      expect(style.left + SCREEN_TIME_GLANCE.dropWidth / 2).toBeCloseTo(
        (bounds.left + bounds.right) / 2
      );
      expect(style.top + SCREEN_TIME_GLANCE.dropHeight / 2).toBeCloseTo(
        (bounds.top + bounds.bottom) / 2
      );
    });

    it('rebuilds the orb at the ring, round and at the ring dot size', () => {
      // whatever the open left it as -- flattened into a line and parked at
      // the border -- the orb the drop reforms into is a round dot the same
      // size as the ring it hands the corner back to
      const tree = renderGlance({ exceeded: true });
      const core = findByTestId(tree, 'screen-time-glance-spinner-core')[0];

      expect(core.props.r).toBe(SCREEN_TIME_RING.size / 2);
      expect(core.props.fill).toBe(SCREEN_TIME_GLANCE.exceededDraw);
    });
  });

  describe('the framed panel', () => {
    const panelStyle = (tree: ReturnType<typeof render>) =>
      StyleSheet.flatten(findByTestId(tree, 'screen-time-glance-panel')[0].props.style);

    it('sits exactly where glancePanelBounds says, so all the geometry agrees', () => {
      const { width, height } = RN.Dimensions.get('window');
      const bounds = glancePanelBounds(width, height, 0, 0);

      const style = panelStyle(renderGlance());

      expect(style.left).toBe(bounds.left);
      expect(style.right).toBe(width - bounds.right);
      expect(style.top).toBe(bounds.top);
      expect(style.bottom).toBe(height - bounds.bottom);
    });

    it('clears the notch and the home indicator as well as the inset', () => {
      mockInsets = { top: 59, bottom: 34, left: 0, right: 0 };
      const { width, height } = RN.Dimensions.get('window');
      const bounds = glancePanelBounds(width, height, 59, 34);

      const style = panelStyle(renderGlance());

      expect(style.top).toBe(bounds.top);
      expect(bounds.top).toBeGreaterThanOrEqual(59 + SCREEN_TIME_GLANCE.panelInset);
      expect(style.bottom).toBe(height - bounds.bottom);
      expect(height - bounds.bottom).toBeGreaterThanOrEqual(34 + SCREEN_TIME_GLANCE.panelInset);
    });

    it("outlines it with the design's rounded border", () => {
      const style = panelStyle(renderGlance());

      expect(style.borderRadius).toBe(SCREEN_TIME_GLANCE.panelRadius);
      expect(style.borderWidth).toBe(SCREEN_TIME_GLANCE.panelBorderWidth);
    });

    it('keeps the border in the water blue the line drew it in', () => {
      // the drawn stroke fades out over a border it matches, so the frame
      // never flips colour as the panel settles behind it
      expect(panelStyle(renderGlance({ exceeded: true })).borderColor).toBe(
        SCREEN_TIME_GLANCE.drawWater
      );
    });

    it('leaves the calm border the faint hairline it has always been', () => {
      expect(panelStyle(renderGlance({ exceeded: false })).borderColor).toBe(
        SCREEN_TIME_GLANCE.calmBorder
      );
    });

    it('lights the border with a glow that matches its state', () => {
      expect(panelStyle(renderGlance({ exceeded: true })).shadowColor).toBe(
        SCREEN_TIME_GLANCE.exceededGlow
      );
      expect(panelStyle(renderGlance({ exceeded: false })).shadowColor).toBe(
        SCREEN_TIME_GLANCE.calmGlow
      );
    });

    it('puts the close button inside the panel', () => {
      const tree = renderGlance();
      const panel = findByTestId(tree, 'screen-time-glance-panel')[0];

      expect(
        panel.findAll((n: any) => n.props.testID === 'screen-time-glance-close')
      ).not.toHaveLength(0);
    });

    it('holds the alert and its action inside the frame too', () => {
      const tree = renderGlance({ exceeded: true });
      const panel = findByTestId(tree, 'screen-time-glance-panel')[0];

      for (const id of ['screen-time-alert-header', 'screen-time-glance-tips']) {
        expect(panel.findAll((n: any) => n.props.testID === id)).not.toHaveLength(0);
      }
    });
  });

  describe('the alert state', () => {
    it('leads with the alert header once the limit is spent', () => {
      const tree = renderGlance({ exceeded: true, usageSeconds: 3900, limitSeconds: 3600 });

      expect(findByTestId(tree, 'screen-time-alert-header').length).toBeGreaterThan(0);
    });

    it('shows no alert while the child is still within the limit', () => {
      const tree = renderGlance({ exceeded: false, usageSeconds: 840, limitSeconds: 3600 });

      expect(findByTestId(tree, 'screen-time-alert-header')).toHaveLength(0);
    });

    it('drops the dashboard greeting only in the alert state', () => {
      const alert = findByTestId(renderGlance({ exceeded: true }), 'screen-time-content')[0];
      const calm = findByTestId(renderGlance({ exceeded: false }), 'screen-time-content')[0];

      expect(alert.props.showGreetingForTest).toBe(false);
      expect(calm.props.showGreetingForTest).toBe(true);
    });

    it('gives the alert the usage figures it is about', () => {
      const tree = renderGlance({ exceeded: true, usageSeconds: 3900, limitSeconds: 3600 });
      const json = JSON.stringify(tree.toJSON());

      expect(json).toContain('screenTime.alert.usage (used:');
      expect(json).toContain('["1h 5m"]');
      expect(json).toContain(', limit:1h)');
    });
  });

  describe('the tips action', () => {
    it('offers tips alongside the alert', () => {
      const tree = renderGlance({ exceeded: true });

      expect(findByTestId(tree, 'screen-time-glance-tips').length).toBeGreaterThan(0);
    });

    it('offers nothing extra while the child is within the limit', () => {
      const tree = renderGlance({ exceeded: false });

      expect(findByTestId(tree, 'screen-time-glance-tips')).toHaveLength(0);
    });

    it('labels the action from a translation key', () => {
      const tips = findByTestId(renderGlance({ exceeded: true }), 'screen-time-glance-tips')[0];
      const labels = tips
        .findAll((n: any) => typeof n.props.children === 'string')
        .map((n: any) => n.props.children);

      expect(tips.props.accessibilityLabel).toBe('screenTime.alert.showTips');
      expect(labels).toContain('screenTime.alert.showTips');
    });

    it('opens the tips over the dashboard', () => {
      const tree = renderGlance({ exceeded: true });

      expect(findByTestId(tree, 'real-world-tips')).toHaveLength(0);

      fireEvent.press(findByTestId(tree, 'screen-time-glance-tips')[0]);

      expect(findByTestId(tree, 'real-world-tips').length).toBeGreaterThan(0);
      expect(findByTestId(tree, 'screen-time-content')).toHaveLength(0);
    });

    it('comes back to the dashboard rather than closing the window', () => {
      const onClose = jest.fn();
      const tree = renderGlance({ exceeded: true, onClose });

      fireEvent.press(findByTestId(tree, 'screen-time-glance-tips')[0]);
      fireEvent.press(findByTestId(tree, 'real-world-tips-done')[0]);

      expect(findByTestId(tree, 'screen-time-content').length).toBeGreaterThan(0);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('the halo', () => {
    it('is the same size as the one the ring wears', () => {
      // The two have to be interchangeable: the close hands the corner back
      // without a fade, so a halo of a different size would be a visible jump
      // at the exact moment the handover is supposed to be invisible.
      const tree = renderGlance({ exceeded: true });
      const halo = findByTestId(tree, 'screen-time-glance-spinner-halo')[0];
      const style = StyleSheet.flatten(halo.props.style);

      expect(style.width).toBe(SCREEN_TIME_RING.size * SCREEN_TIME_RING.haloScale);
      expect(style.height).toBe(style.width);
      expect(style.borderRadius).toBe(style.width / 2);
    });

    it('is not worn at all when the ring is not over its limit', () => {
      const tree = renderGlance({ exceeded: false });

      expect(findByTestId(tree, 'screen-time-glance-spinner-halo')).toHaveLength(0);
    });
  });

  describe('the dial the calm orb hands over', () => {
    const USAGE = 900;
    const LIMIT = 3600;

    const shape = (node: any) => ({
      r: node.props.r,
      stroke: node.props.stroke,
      strokeOpacity: node.props.strokeOpacity,
      strokeWidth: node.props.strokeWidth,
      strokeLinecap: node.props.strokeLinecap,
      strokeDasharray: node.props.strokeDasharray,
      strokeDashoffset: node.props.strokeDashoffset,
    });

    function ringSide() {
      return render(
        <ScreenTimeRing
          usageSeconds={USAGE}
          limitSeconds={LIMIT}
          tint={HOME_THEMES.day.chromeInk}
        />
      );
    }

    function orbSide() {
      return renderGlance({ usageSeconds: USAGE, limitSeconds: LIMIT });
    }

    it.each([
      ['track', 'screen-time-ring-track', 'screen-time-glance-spinner-dial-track'],
      ['progress arc', 'screen-time-ring-arc', 'screen-time-glance-spinner-dial-arc'],
    ])('wears the same %s the calm ring is drawn from', (_part, ringId, orbId) => {
      const ring = shape(findByTestId(ringSide(), ringId)[0]);

      const underTest = shape(findByTestId(orbSide(), orbId)[0]);

      expect(underTest).toEqual(ring);
    });

    it('wears no dial at all once the ring is a solid disc instead', () => {
      const tree = renderGlance({ exceeded: true, usageSeconds: LIMIT, limitSeconds: LIMIT });

      expect(findByTestId(tree, 'screen-time-glance-spinner-dial-track')).toHaveLength(0);
    });
  });


  it('renders as an overlay in the home tree, never through a Modal', () => {
    // Presenting or dismissing a Modal is an iOS window change, and a window
    // change was filmed dropping one frame of the ring in the main window --
    // the flicker that survived every choreography fix. The glance must stay
    // inside the home screen's own window.
    const tree = renderGlance();

    expect(tree.UNSAFE_root.findAll((n: any) => n.type === MockModal)).toHaveLength(0);
  });

  describe('handing the corner back', () => {
    const HANDBACK = {
      visible: true,
      timeOfDay: 'day' as const,
      origin: ORIGIN,
      exceeded: false,
    };

    it('is gone in the very commit that gives the corner back, with no timers left', () => {
      // The swap is atomic: the same render that lets the ring show also
      // takes the orb off screen, so no animation clock is in flight for an
      // unrelated commit to freeze mid-value.
      jest.useFakeTimers();
      const onClose = jest.fn();
      const tree = render(<ScreenTimeGlance {...HANDBACK} onClose={onClose} />);

      act(() => {
        fireEvent.press(findByTestId(tree, 'screen-time-glance-close')[0]);
      });
      tree.rerender(<ScreenTimeGlance {...HANDBACK} visible={false} onClose={onClose} />);

      expect(findByTestId(tree, 'screen-time-glance-spinner')).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
      jest.useRealTimers();
    });

    it('does not statically hide the spinner while the glance is open', () => {
      const onClose = jest.fn();
      const tree = render(<ScreenTimeGlance {...HANDBACK} onClose={onClose} />);
      const spinnerStyle = () =>
        StyleSheet.flatten(findByTestId(tree, 'screen-time-glance-spinner')[0].props.style);

      expect(spinnerStyle().opacity).not.toBe(0);
    });
  });

});