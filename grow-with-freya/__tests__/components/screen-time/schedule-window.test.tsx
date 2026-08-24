/**
 * Tests for the schedule window -- the reminders flow as a sheet over the
 * Screen Time dashboard.
 *
 * It renders through React Native's Modal, which is its own native layer
 * immune to any zIndex/stacking context a host might impose (this replaced an
 * earlier plain-View implementation that rendered invisibly when nested
 * inside a host with its own high-zIndex header -- see account-screen.tsx's
 * PageHeader). Modal isn't safely renderable under this repo's jsdom test
 * environment when visible (react-native-web's real Modal throws deep inside
 * react-test-renderer's ref handling), so it is patched here to a plain
 * conditional View that preserves the same visible/testID/onRequestClose
 * contract -- the point of these tests is the navigation and animation logic
 * ScheduleWindow owns, not Modal's own internals.
 *
 * The patch mutates the already-resolved `react-native` module object rather
 * than using `jest.mock('react-native', ...)`: this file's own jest.mock for
 * that module never took effect (verified by a console.log inside the
 * factory that never fired) because jest.setup.js already registers a
 * `react-native` mock for the whole suite, and a second per-file
 * registration of the same module specifier was silently losing to it in
 * this codebase's setup. Direct mutation sidesteps that registration
 * entirely and is confirmed to work.
 *
 * What matters here is: which page is showing, which control steps back
 * where, that every reminder change is reported to the host so its
 * unsaved-changes bar stays honest, and that the actual animated values move
 * where they should rather than just "some withTiming call happened".
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as RN from 'react-native';

import { useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ScheduleWindow } from '@/components/screen-time/schedule-window';

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

const mockUseReducedMotion = jest.fn(() => false);
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

const mockAccessibility = jest.fn(() => ({
  scaledFontSize: (n: number) => n,
  scaledButtonSize: (n: number) => n,
  scaledPadding: (n: number) => n,
  isTablet: false,
  contentMaxWidth: 402,
}));
jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => mockAccessibility(),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, style }: any) => <View style={style}>{children}</View> };
});

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: (props: any) => <View {...props} /> };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// the close animation is how the sheet reaches onClose, so the timing callback
// has to fire -- the default mock drops it
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RN = require('react-native');
  const AnimatedView = React.forwardRef((props: any, ref: any) =>
    React.createElement(RN.View, { ...props, ref })
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
    Easing: { out: jest.fn((e: any) => e), in: jest.fn((e: any) => e), cubic: jest.fn() },
    runOnJS: jest.fn((fn: any) => fn),
  };
});

// stand-ins that expose each callback as something a test can press
jest.mock('@/components/reminders', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    CustomRemindersContent: ({ onCreateNew, onReminderChange, refreshTrigger }: any) => (
      // refreshTrigger is surfaced as a prop on the host node purely so tests
      // can read it back -- CustomRemindersContent's real implementation
      // reacts to it internally instead
      <View testID="reminders-list" refreshTrigger={refreshTrigger}>
        <Pressable testID="list-create-new" onPress={onCreateNew}>
          <Text>new</Text>
        </Pressable>
        <Pressable testID="list-change" onPress={onReminderChange}>
          <Text>change</Text>
        </Pressable>
      </View>
    ),
    CreateReminderContent: ({ onBack, onSuccess }: any) => (
      <View testID="reminders-create">
        <Pressable testID="create-back" onPress={onBack}>
          <Text>back</Text>
        </Pressable>
        <Pressable testID="create-success" onPress={onSuccess}>
          <Text>save</Text>
        </Pressable>
      </View>
    ),
  };
});

// excludes MockModal's own fiber: it carries a `testID` prop unrelated to
// what it renders (Modal's element is always present in the tree; its
// children are not), so a naive match would find "schedule-window" even
// while closed
function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll(
    (n: any) => n.props.testID === testID && n.type !== MockModal
  );
}

function press(tree: ReturnType<typeof render>, testID: string) {
  fireEvent.press(findByTestId(tree, testID)[0]);
}

function renderWindow(props: Partial<React.ComponentProps<typeof ScheduleWindow>> = {}) {
  return render(
    <ScheduleWindow visible onClose={jest.fn()} onReminderChange={jest.fn()} {...props} />
  );
}

/** Android's back key -- routed through the mocked Modal's onRequestClose. */
function pressHardwareBack(tree: ReturnType<typeof render>) {
  const modal = findByTestId(tree, 'schedule-window')[0];
  act(() => {
    modal.props.onRequestCloseForTest();
  });
}

/**
 * useSharedValue is called in a fixed order (translateY, then backdropOpacity)
 * on every render. Reading the values the LAST render's calls produced proves
 * what the animation actually did, rather than just that withTiming ran.
 */
function lastSharedValues() {
  const calls = (useSharedValue as jest.Mock).mock.results;
  return {
    translateY: calls[calls.length - 2].value,
    backdropOpacity: calls[calls.length - 1].value,
  };
}

describe('ScheduleWindow', () => {
  beforeEach(() => {
    (useSharedValue as jest.Mock).mockClear();
    (withTiming as jest.Mock).mockClear();
  });

  it('renders nothing while closed', () => {
    const tree = renderWindow({ visible: false });

    expect(findByTestId(tree, 'schedule-window')).toHaveLength(0);
  });

  it('opens on the reminders list', () => {
    const tree = renderWindow();

    expect(findByTestId(tree, 'schedule-window').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'reminders-list').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'reminders-create')).toHaveLength(0);
  });

  it('titles the list page and offers the new-reminder action', () => {
    const tree = renderWindow();
    const body = JSON.stringify(tree.toJSON());

    expect(body).toContain('screenTime.customReminders');
    expect(findByTestId(tree, 'schedule-window-new').length).toBeGreaterThan(0);
  });

  describe('moving to the create page', () => {
    it('goes there from the header action', () => {
      const tree = renderWindow();

      press(tree, 'schedule-window-new');

      expect(findByTestId(tree, 'reminders-create').length).toBeGreaterThan(0);
      expect(findByTestId(tree, 'reminders-list')).toHaveLength(0);
    });

    it('goes there from the list itself', () => {
      const tree = renderWindow();

      press(tree, 'list-create-new');

      expect(findByTestId(tree, 'reminders-create').length).toBeGreaterThan(0);
      expect(findByTestId(tree, 'reminders-list')).toHaveLength(0);
    });

    it('retitles and hides the new-reminder action', () => {
      const tree = renderWindow();

      press(tree, 'schedule-window-new');
      const body = JSON.stringify(tree.toJSON());

      expect(body).toContain('reminders.createTitle');
      expect(findByTestId(tree, 'schedule-window-new')).toHaveLength(0);
    });
  });

  describe('stepping back', () => {
    it('returns to the list from the create page without closing', () => {
      const onClose = jest.fn();
      const tree = renderWindow({ onClose });

      press(tree, 'schedule-window-new');
      press(tree, 'schedule-window-back');

      expect(findByTestId(tree, 'reminders-list').length).toBeGreaterThan(0);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("returns to the list from the create page's own back", () => {
      const tree = renderWindow();

      press(tree, 'schedule-window-new');
      press(tree, 'create-back');

      expect(findByTestId(tree, 'reminders-list').length).toBeGreaterThan(0);
    });

    it('closes the window from the list', () => {
      const onClose = jest.fn();
      const tree = renderWindow({ onClose });

      press(tree, 'schedule-window-back');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes when the backdrop is tapped', () => {
      const onClose = jest.fn();
      const tree = renderWindow({ onClose });

      press(tree, 'schedule-window-backdrop');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('gives a light haptic tap when closing', () => {
      (Haptics.impactAsync as jest.Mock).mockClear();
      const tree = renderWindow();

      press(tree, 'schedule-window-back');

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe("Android's hardware back key (Modal's onRequestClose)", () => {
    it('closes the window from the list', () => {
      const onClose = jest.fn();
      const tree = renderWindow({ onClose });

      pressHardwareBack(tree);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('steps from the create page back to the list without closing', () => {
      const onClose = jest.fn();
      const tree = renderWindow({ onClose });

      press(tree, 'schedule-window-new');
      pressHardwareBack(tree);

      expect(findByTestId(tree, 'reminders-list').length).toBeGreaterThan(0);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('reporting changes to the host', () => {
    it('passes on a change made in the list', () => {
      const onReminderChange = jest.fn();
      const tree = renderWindow({ onReminderChange });

      press(tree, 'list-change');

      expect(onReminderChange).toHaveBeenCalledTimes(1);
    });

    it('returns to the list and reports after a reminder is created', () => {
      const onReminderChange = jest.fn();
      const tree = renderWindow({ onReminderChange });

      press(tree, 'schedule-window-new');
      press(tree, 'create-success');

      expect(onReminderChange).toHaveBeenCalledTimes(1);
      expect(findByTestId(tree, 'reminders-list').length).toBeGreaterThan(0);
    });

    it('bumps the reminders list refresh trigger, not just the host callback', () => {
      // CustomRemindersContent's own re-fetch is driven by refreshTrigger
      // changing, independent of whatever the host does with onReminderChange
      const tree = renderWindow({ onReminderChange: undefined });

      const before = findByTestId(tree, 'reminders-list')[0].props.refreshTrigger;
      press(tree, 'list-change');
      const after = findByTestId(tree, 'reminders-list')[0].props.refreshTrigger;

      expect(after).toBe(before + 1);
    });

    it('survives a host that passes no change handler', () => {
      const tree = render(<ScheduleWindow visible onClose={jest.fn()} />);

      expect(() => press(tree, 'list-change')).not.toThrow();
    });
  });

  it('drops the sheet when the host closes it directly', () => {
    const tree = renderWindow();
    expect(findByTestId(tree, 'schedule-window').length).toBeGreaterThan(0);

    tree.rerender(<ScheduleWindow visible={false} onClose={jest.fn()} />);

    expect(findByTestId(tree, 'schedule-window')).toHaveLength(0);
  });

  it('reopens on the list even if it was left on the create page', () => {
    const tree = renderWindow();
    press(tree, 'schedule-window-new');
    expect(findByTestId(tree, 'reminders-create').length).toBeGreaterThan(0);

    tree.rerender(<ScheduleWindow visible={false} onClose={jest.fn()} />);
    tree.rerender(<ScheduleWindow visible onClose={jest.fn()} />);

    expect(findByTestId(tree, 'reminders-list').length).toBeGreaterThan(0);
  });

  describe('reduced motion', () => {
    afterEach(() => {
      mockUseReducedMotion.mockReturnValue(false);
    });

    it('slides the sheet when motion is welcome', () => {
      renderWindow();

      expect(withTiming).toHaveBeenCalled();
      // both the sheet and the backdrop should have animated to their open values
      const { translateY, backdropOpacity } = lastSharedValues();
      expect(translateY.value).toBe(0);
      expect(backdropOpacity.value).toBe(1);
    });

    it('places the sheet at its open values without animating', () => {
      mockUseReducedMotion.mockReturnValue(true);

      const tree = renderWindow();

      expect(withTiming).not.toHaveBeenCalled();
      const { translateY, backdropOpacity } = lastSharedValues();
      expect(translateY.value).toBe(0);
      expect(backdropOpacity.value).toBe(1);
      expect(findByTestId(tree, 'reminders-list').length).toBeGreaterThan(0);
    });

    it('still closes, without an exit slide', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onClose = jest.fn();
      const tree = renderWindow({ onClose });
      (withTiming as jest.Mock).mockClear();

      press(tree, 'schedule-window-back');

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(withTiming).not.toHaveBeenCalled();
    });
  });

  describe('on a tablet', () => {
    afterEach(() => {
      mockAccessibility.mockReturnValue({
        scaledFontSize: (n: number) => n,
        scaledButtonSize: (n: number) => n,
        scaledPadding: (n: number) => n,
        isTablet: false,
        contentMaxWidth: 402,
      });
    });

    const sheetStyle = (tree: ReturnType<typeof render>) => {
      const wrap = findByTestId(tree, 'schedule-window-sheet')[0];
      return StyleSheet.flatten(wrap.props.style);
    };

    it('runs full width on a phone', () => {
      const style = sheetStyle(renderWindow());

      expect(style.alignSelf).toBeUndefined();
      expect(style.width).toBeUndefined();
    });

    it('caps the sheet and centres it', () => {
      mockAccessibility.mockReturnValue({
        scaledFontSize: (n: number) => n,
        scaledButtonSize: (n: number) => n,
        scaledPadding: (n: number) => n,
        isTablet: true,
        contentMaxWidth: 700,
      });

      const style = sheetStyle(renderWindow());

      expect(style.width).toBe(700);
      expect(style.alignSelf).toBe('center');
    });
  });
});
