/**
 * The owl that lands when screen time runs out. One bubble says why it came;
 * an arrow then leads into a hand of tips dealt fresh from the pool each
 * visit, swiped or stepped through either way. While the owl is on screen
 * the app beneath it waits -- nothing under the dim answers a tap until the
 * owl has gone.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

import { ScreenTimeOwlAlert, OWL_SWIPE_THRESHOLD, swipeIntent } from '@/components/screen-time/screen-time-owl-alert';
import { TIPS_PER_VISIT, SCREEN_TIME_TIP_KEYS } from '@/constants/screen-time-tips';
import { OWL_RHYTHM } from '@/constants/owl-companion';
import type { ScreenTimeWarning } from '@/services/screen-time-service';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

const mockReducedMotion = jest.fn(() => false);
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

const APPROACHING: ScreenTimeWarning = {
  type: 'approaching_limit',
  remainingTime: 240,
  message: 'Only 4 minutes of screen time left today.',
};

/** A roll that always lands high keeps the pool in its written order. */
const IN_ORDER = () => 0.999;
const TIP_COUNT = TIPS_PER_VISIT;
const PAGE_COUNT = TIP_COUNT + 1;

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

function has(tree: ReturnType<typeof render>, testID: string): boolean {
  return findByTestId(tree, testID).length > 0;
}

function owl(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll(
    (node: any) => typeof node.props.phase === 'string' && typeof node.props.width === 'number'
  )[0];
}

function press(tree: ReturnType<typeof render>, testID: string) {
  const target = findByTestId(tree, testID)[0];
  act(() => {
    target.props.onPress();
  });
}

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

function json(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

function renderAlert(props: Partial<React.ComponentProps<typeof ScreenTimeOwlAlert>> = {}) {
  return render(
    <ScreenTimeOwlAlert visible warning={APPROACHING} onDismiss={jest.fn()} random={IN_ORDER} {...props} />
  );
}

function renderLanded(props: Partial<React.ComponentProps<typeof ScreenTimeOwlAlert>> = {}) {
  const tree = renderAlert(props);
  advance(OWL_RHYTHM.arriveMs);
  return tree;
}

function pressNextTimes(tree: ReturnType<typeof render>, times: number) {
  for (let i = 0; i < times; i += 1) press(tree, 'screen-time-owl-next');
}

describe('ScreenTimeOwlAlert', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing without a warning', () => {
    expect(renderAlert({ warning: null }).toJSON()).toBeNull();
  });

  it('renders nothing while hidden', () => {
    expect(renderAlert({ visible: false }).toJSON()).toBeNull();
  });

  it('brings the owl in first, and keeps the bubble until it has landed', () => {
    const tree = renderAlert();

    expect(owl(tree).props.phase).toBe('arrive');
    expect(findByTestId(tree, 'screen-time-owl-bubble')).toHaveLength(0);

    advance(OWL_RHYTHM.arriveMs);

    expect(owl(tree).props.phase).toBe('idle');
    expect(findByTestId(tree, 'screen-time-owl-bubble')).toHaveLength(1);
  });

  it('opens with the warning itself', () => {
    const tree = renderLanded();

    expect(json(tree)).toContain('screenTimeWarning.approachingLimit');
    expect(json(tree)).toContain(APPROACHING.message);
    expect(json(tree)).toContain('screenTimeWarning.guidelines');
  });

  it.each([
    ['limit_reached', 'screenTimeWarning.limitReached'],
    ['daily_complete', 'screenTimeWarning.dailyComplete'],
  ])('titles a %s warning with its own copy', (type, expectedKey) => {
    const tree = renderLanded({
      warning: { type: type as never, remainingTime: 0, message: 'msg' },
    });

    expect(json(tree)).toContain(expectedKey);
  });

  it('falls back to a neutral title for an unrecognised warning type', () => {
    const tree = renderLanded({
      warning: { type: 'something-new' as never, remainingTime: 0, message: 'msg' },
    });

    expect(json(tree)).toContain('screenTimeWarning.notice');
  });

  /** The warning is one page: a single bubble, then an arrow onward. */
  it('keeps the first bubble to the warning, with an arrow into the tips and no way back', () => {
    const tree = renderLanded();

    expect(json(tree)).not.toContain('screenTime.tips.atHome.body');
    expect(has(tree, 'screen-time-owl-next')).toBe(true);
    expect(has(tree, 'screen-time-owl-back')).toBe(false);
    expect(has(tree, 'screen-time-owl-okay')).toBe(false);
    expect(findByTestId(tree, 'screen-time-owl-next')[0].props.accessibilityLabel).toBe('screenTimeOwl.showIdeas');
    expect(json(tree)).toContain('chevron-forward');
  });
});

/**
 * The tips are a carousel: dealt fresh from the pool each time the owl
 * lands, stepped through with arrows either way, or swiped.
 */
describe('the tips carousel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // A couple of ideas, not the whole pool: ten bubbles to page through at the
  // end of a screen-time day is a wall, not help.
  it('deals a short hand from the pool, one bubble each, after the warning', () => {
    const tree = renderLanded();

    for (let page = 0; page < PAGE_COUNT; page += 1) {
      expect(findByTestId(tree, `screen-time-owl-dot-${page}`)).toHaveLength(1);
    }
    expect(findByTestId(tree, `screen-time-owl-dot-${PAGE_COUNT}`)).toHaveLength(0);
  });

  it('steps forward into the first tip dealt', () => {
    const tree = renderLanded();

    press(tree, 'screen-time-owl-next');

    expect(json(tree)).toContain('screenTime.tips.title');
    expect(json(tree)).toContain(`screenTime.tips.${SCREEN_TIME_TIP_KEYS[0]}.title`);
    expect(json(tree)).toContain(`screenTime.tips.${SCREEN_TIME_TIP_KEYS[0]}.body`);
    expect(json(tree)).not.toContain(`screenTime.tips.${SCREEN_TIME_TIP_KEYS[1]}.body`);
    expect(findByTestId(tree, 'screen-time-owl-next')[0].props.accessibilityLabel).toBe('common.next');
  });

  it('deals the tips in the order the roll gives, not the pool’s', () => {
    const tree = renderLanded({ random: () => 0 });

    press(tree, 'screen-time-owl-next');

    expect(json(tree)).not.toContain(`screenTime.tips.${SCREEN_TIME_TIP_KEYS[0]}.body`);
  });

  it('deals a fresh hand each time the owl lands', () => {
    const rolls = [0.999, 0.999, 0];
    let index = 0;
    const random = () => rolls[Math.min(index++, rolls.length - 1)];
    const tree = renderLanded({ random });

    tree.rerender(
      <ScreenTimeOwlAlert
        visible
        warning={{ type: 'limit_reached', remainingTime: 0, message: 'Limit.' }}
        onDismiss={jest.fn()}
        random={random}
      />
    );
    advance(OWL_RHYTHM.arriveMs);

    expect(index).toBeGreaterThan(TIP_COUNT);
  });

  it('offers a way back from every tip, and back lands on the page before', () => {
    const tree = renderLanded();
    pressNextTimes(tree, 2);
    expect(json(tree)).toContain(`screenTime.tips.${SCREEN_TIME_TIP_KEYS[1]}.body`);

    expect(has(tree, 'screen-time-owl-back')).toBe(true);
    expect(findByTestId(tree, 'screen-time-owl-back')[0].props.accessibilityLabel).toBe('common.back');
    press(tree, 'screen-time-owl-back');

    expect(json(tree)).toContain(`screenTime.tips.${SCREEN_TIME_TIP_KEYS[0]}.body`);
    expect(json(tree)).not.toContain(`screenTime.tips.${SCREEN_TIME_TIP_KEYS[1]}.body`);
  });

  it('goes back to the warning itself from the first tip', () => {
    const tree = renderLanded();
    press(tree, 'screen-time-owl-next');

    press(tree, 'screen-time-owl-back');

    expect(json(tree)).toContain(APPROACHING.message);
    expect(has(tree, 'screen-time-owl-back')).toBe(false);
  });

  it('ends the last tip on an okay, with the closing line', () => {
    const tree = renderLanded();

    pressNextTimes(tree, TIP_COUNT);

    expect(json(tree)).toContain(`screenTime.tips.${SCREEN_TIME_TIP_KEYS[TIP_COUNT - 1]}.body`);
    expect(json(tree)).toContain('screenTime.tips.closing');
    expect(has(tree, 'screen-time-owl-okay')).toBe(true);
    expect(has(tree, 'screen-time-owl-next')).toBe(false);
    expect(findByTestId(tree, 'screen-time-owl-okay')[0].props.accessibilityLabel).toBe('screenTimeOwl.okay');
  });

  it('marks the current dot as the pages turn', () => {
    const tree = renderLanded();

    expect(findByTestId(tree, 'screen-time-owl-dot-0')[0].props.accessibilityState).toEqual({ selected: true });

    press(tree, 'screen-time-owl-next');

    expect(findByTestId(tree, 'screen-time-owl-dot-0')[0].props.accessibilityState).toEqual({ selected: false });
    expect(findByTestId(tree, 'screen-time-owl-dot-1')[0].props.accessibilityState).toEqual({ selected: true });
  });

  it('gives the owl something new to say with every page, either way', () => {
    const tree = renderLanded();
    expect(owl(tree).props.sayCount).toBe(1);

    press(tree, 'screen-time-owl-next');
    expect(owl(tree).props.sayCount).toBe(2);

    press(tree, 'screen-time-owl-back');
    expect(owl(tree).props.sayCount).toBe(3);
  });

  it('slides the page in from the side it came from', () => {
    const tree = renderLanded();
    const bubble = () =>
      tree.UNSAFE_root.findAll((node: any) => typeof node.props.pageCount === 'number')[0];

    press(tree, 'screen-time-owl-next');
    expect(bubble().props.direction).toBe('forward');

    press(tree, 'screen-time-owl-back');
    expect(bubble().props.direction).toBe('back');
  });

  it('listens for a swipe across the bubble', () => {
    const tree = renderLanded();

    const slot = findByTestId(tree, 'screen-time-owl-swipe')[0];

    expect(typeof slot.props.onResponderRelease).toBe('function');
    expect(typeof slot.props.onMoveShouldSetResponder).toBe('function');
  });
});

/**
 * What a drag across the bubble means. A clear sideways pull turns the page;
 * a tap, a wobble, or a scroll-shaped drag does nothing.
 */
describe('swipeIntent', () => {
  it.each([
    { pull: 'a firm pull left', dx: -OWL_SWIPE_THRESHOLD - 10, dy: 0, expected: 'next' },
    { pull: 'a firm pull right', dx: OWL_SWIPE_THRESHOLD + 10, dy: 0, expected: 'back' },
    { pull: 'a pull exactly at the threshold', dx: -OWL_SWIPE_THRESHOLD, dy: 0, expected: 'next' },
    { pull: 'a short nudge', dx: -OWL_SWIPE_THRESHOLD / 2, dy: 0, expected: null },
    { pull: 'a tap', dx: 0, dy: 0, expected: null },
    { pull: 'a mostly vertical drag', dx: -OWL_SWIPE_THRESHOLD - 10, dy: OWL_SWIPE_THRESHOLD + 40, expected: null },
  ])('reads $pull as $expected', ({ dx, dy, expected }) => {
    expect(swipeIntent(dx, dy)).toBe(expected);
  });
});

/**
 * The owl is modal: while it is on screen, the app underneath waits. The
 * dim is there from the moment it arrives until the moment it has gone.
 */
describe('while the owl is on screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('puts a dim over the app before the owl has even landed', () => {
    const tree = renderAlert();

    expect(has(tree, 'screen-time-owl-dim')).toBe(true);
    expect(findByTestId(tree, 'screen-time-owl-alert')[0].props.pointerEvents).not.toBe('box-none');
  });

  it('keeps the dim up while the owl is leaving', () => {
    const tree = renderLanded();

    press(tree, 'screen-time-owl-close');

    expect(owl(tree).props.phase).toBe('leave');
    expect(has(tree, 'screen-time-owl-dim')).toBe(true);
  });

  it('swallows a tap on the dim rather than passing it beneath', () => {
    const tree = renderLanded();
    const dim = findByTestId(tree, 'screen-time-owl-dim')[0];

    expect(typeof dim.props.onPress).toBe('function');
    act(() => {
      dim.props.onPress();
    });

    expect(owl(tree).props.phase).toBe('idle');
  });
});

describe('leaving', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lets the owl celebrate before it goes when the parent says okay', () => {
    const onDismiss = jest.fn();
    const tree = renderLanded({ onDismiss });
    pressNextTimes(tree, TIP_COUNT);

    press(tree, 'screen-time-owl-okay');

    expect(owl(tree).props.phase).toBe('delight');
    expect(onDismiss).not.toHaveBeenCalled();

    advance(OWL_RHYTHM.delightMs);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('can be closed from any bubble, and the owl slips away', () => {
    const onDismiss = jest.fn();
    const tree = renderLanded({ onDismiss });

    press(tree, 'screen-time-owl-close');

    expect(owl(tree).props.phase).toBe('leave');
    advance(OWL_RHYTHM.leaveMs);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('ignores a second press while the owl is already leaving', () => {
    const onDismiss = jest.fn();
    const tree = renderLanded({ onDismiss });

    press(tree, 'screen-time-owl-close');
    press(tree, 'screen-time-owl-close');
    advance(OWL_RHYTHM.leaveMs * 2);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps leaving even if okay is pressed on the way out', () => {
    const onDismiss = jest.fn();
    const tree = renderLanded({ onDismiss });
    pressNextTimes(tree, TIP_COUNT);

    press(tree, 'screen-time-owl-close');
    press(tree, 'screen-time-owl-okay');

    expect(owl(tree).props.phase).toBe('leave');
    advance(OWL_RHYTHM.leaveMs);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('starts over from the warning when a new one arrives', () => {
    const tree = renderLanded();
    press(tree, 'screen-time-owl-next');

    tree.rerender(
      <ScreenTimeOwlAlert
        visible
        warning={{ type: 'limit_reached', remainingTime: 0, message: 'Limit.' }}
        onDismiss={jest.fn()}
        random={IN_ORDER}
      />
    );
    advance(OWL_RHYTHM.arriveMs);

    expect(json(tree)).toContain('screenTimeWarning.limitReached');
    expect(json(tree)).not.toContain('screenTime.tips.atHome.body');
  });
});

describe('the owl itself', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('perches on its rock in the bottom-left corner', () => {
    const tree = renderAlert();

    const perch = findByTestId(tree, 'screen-time-owl-perch')[0];
    const style = [perch.props.style].flat(3).reduce((a: any, b: any) => ({ ...a, ...b }), {});

    expect(style).toMatchObject({ left: 0, bottom: 0 });
    expect(has(tree, 'owl-perch-ledge')).toBe(true);
    expect(owl(tree).props.approach).toBe('none');
  });

  it('keeps the bubble small: no scrolling guide, no category icons', () => {
    const tree = renderLanded();
    press(tree, 'screen-time-owl-next');

    const scrollers = tree.UNSAFE_root.findAll(
      (node: any) => typeof node.props.contentContainerStyle !== 'undefined'
    );

    expect(scrollers).toHaveLength(0);
    expect(findByTestId(tree, 'real-world-tips')).toHaveLength(0);
    for (const icon of ['home-outline', 'leaf-outline', 'color-palette-outline']) {
      expect(json(tree)).not.toContain(icon);
    }
  });

  it('names the owl and the close control for screen readers', () => {
    const tree = renderLanded();

    const labelled = (label: string) =>
      tree.UNSAFE_root.findAll((node: any) => node.props.accessibilityLabel === label);

    expect(labelled('screenTimeOwl.owlLabel').length).toBeGreaterThan(0);
    expect(labelled('screenTimeWarning.closeNotification').length).toBeGreaterThan(0);
  });

  it('shows the bubble at once when motion is reduced', () => {
    mockReducedMotion.mockReturnValue(true);
    const tree = renderAlert();

    advance(OWL_RHYTHM.reducedFadeMs);

    expect(findByTestId(tree, 'screen-time-owl-bubble')).toHaveLength(1);
  });
});
