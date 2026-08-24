/**
 * Tests for the screen-time glance -- the window that opens out of the ring
 * in the home screen's bottom-left corner.
 *
 * It exists to answer one question ("how long today?"), so it deliberately
 * carries the usage dashboard and nothing else: no schedule callout, no
 * bedtime guidance, no route into building reminders. Those live in settings.
 *
 * It is also meant to read as the ring itself growing into a page, which is
 * why the reveal circle starts at the ring's own centre in the ring's own
 * colour, and why the surface behind it turns red only when the ring is red.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as RN from 'react-native';

import { ScreenTimeGlance } from '@/components/home/screen-time-glance';
import { SCREEN_TIME_GLANCE, revealDiameter } from '@/constants/screen-time-ring';

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
    ScreenTimeContent: ({ showSchedule }: any) => (
      <View testID="screen-time-content" {...{ showScheduleForTest: showSchedule }} />
    ),
  };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

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
    Easing: { out: jest.fn((e: any) => e), in: jest.fn((e: any) => e), cubic: jest.fn() },
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

  describe('opening out of the ring', () => {
    const revealStyle = (tree: ReturnType<typeof render>) =>
      StyleSheet.flatten(findByTestId(tree, 'screen-time-glance-reveal')[0].props.style);

    it('centres the reveal circle on the ring', () => {
      const style = revealStyle(renderGlance());

      // the circle is positioned by its top-left, so its centre lands on the
      // origin only if the offset accounts for its own radius
      expect(style.left + style.width / 2).toBeCloseTo(ORIGIN.x);
      expect(style.top + style.height / 2).toBeCloseTo(ORIGIN.y);
    });

    it('grows the circle wide enough to cover the screen', () => {
      const style = revealStyle(renderGlance());
      const { width, height } = RN.Dimensions.get('window');

      expect(style.width).toBeCloseTo(revealDiameter(ORIGIN, width, height));
      expect(style.width).toBe(style.height);
    });

    it('keeps the circle actually circular', () => {
      const style = revealStyle(renderGlance());

      expect(style.borderRadius).toBeCloseTo(style.width / 2);
    });

    it('falls back to the middle of the screen with no origin given', () => {
      const style = revealStyle(renderGlance({ origin: undefined }));
      const { width, height } = RN.Dimensions.get('window');

      expect(style.left + style.width / 2).toBeCloseTo(width / 2);
      expect(style.top + style.height / 2).toBeCloseTo(height / 2);
    });
  });

  describe('taking its colour from the ring', () => {
    const surfaceStyle = (tree: ReturnType<typeof render>) =>
      StyleSheet.flatten(findByTestId(tree, 'screen-time-glance-surface')[0].props.style);

    const revealStyle = (tree: ReturnType<typeof render>) =>
      StyleSheet.flatten(findByTestId(tree, 'screen-time-glance-reveal')[0].props.style);

    it('opens red out of a red ring', () => {
      const tree = renderGlance({ exceeded: true });

      expect(revealStyle(tree).backgroundColor).toBe(SCREEN_TIME_GLANCE.exceededReveal);
      expect(surfaceStyle(tree).backgroundColor).toBe(SCREEN_TIME_GLANCE.exceededSurface);
    });

    it('stays with the night palette when the ring is calm', () => {
      const tree = renderGlance({ exceeded: false });

      expect(revealStyle(tree).backgroundColor).toBe(SCREEN_TIME_GLANCE.calmReveal);
      expect(surfaceStyle(tree).backgroundColor).toBe(SCREEN_TIME_GLANCE.calmSurface);
    });
  });
});
