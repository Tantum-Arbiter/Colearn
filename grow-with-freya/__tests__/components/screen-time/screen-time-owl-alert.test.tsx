import React from 'react';
import { render, act } from '@testing-library/react-native';

import { ScreenTimeOwlAlert, OWL_BUBBLE_PAGES } from '@/components/screen-time/screen-time-owl-alert';
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
    <ScreenTimeOwlAlert visible warning={APPROACHING} onDismiss={jest.fn()} {...props} />
  );
}

function renderLanded(props: Partial<React.ComponentProps<typeof ScreenTimeOwlAlert>> = {}) {
  const tree = renderAlert(props);
  advance(OWL_RHYTHM.arriveMs);
  return tree;
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

  it('keeps the first bubble to the warning, with the tips still to come', () => {
    const tree = renderLanded();

    expect(json(tree)).not.toContain('screenTime.tips.atHome.body');
    expect(has(tree, 'screen-time-owl-next')).toBe(true);
    expect(has(tree, 'screen-time-owl-okay')).toBe(false);
  });

  it('walks through every tip in turn, one small bubble each', () => {
    const tree = renderLanded();

    press(tree, 'screen-time-owl-next');
    expect(json(tree)).toContain('screenTime.tips.title');
    expect(json(tree)).toContain('screenTime.tips.atHome.title');
    expect(json(tree)).toContain('screenTime.tips.atHome.body');
    expect(json(tree)).not.toContain('screenTime.tips.outdoors.body');

    press(tree, 'screen-time-owl-next');
    expect(json(tree)).toContain('screenTime.tips.outdoors.body');
    expect(json(tree)).not.toContain('screenTime.tips.atHome.body');

    press(tree, 'screen-time-owl-next');
    expect(json(tree)).toContain('screenTime.tips.creative.body');
    expect(json(tree)).toContain('screenTime.tips.closing');
  });

  it('ends on an okay rather than another next', () => {
    const tree = renderLanded();

    press(tree, 'screen-time-owl-next');
    press(tree, 'screen-time-owl-next');
    press(tree, 'screen-time-owl-next');

    expect(has(tree, 'screen-time-owl-okay')).toBe(true);
    expect(has(tree, 'screen-time-owl-next')).toBe(false);
    expect(findByTestId(tree, 'screen-time-owl-okay')[0].props.accessibilityLabel).toBe('screenTimeOwl.okay');
  });

  it('labels the pill next until the last bubble', () => {
    const tree = renderLanded();

    expect(findByTestId(tree, 'screen-time-owl-next')[0].props.accessibilityLabel).toBe('common.next');
  });

  it('keeps leaving even if okay is pressed on the way out', () => {
    const onDismiss = jest.fn();
    const tree = renderLanded({ onDismiss });
    press(tree, 'screen-time-owl-next');
    press(tree, 'screen-time-owl-next');
    press(tree, 'screen-time-owl-next');

    press(tree, 'screen-time-owl-close');
    press(tree, 'screen-time-owl-okay');

    expect(owl(tree).props.phase).toBe('leave');
    advance(OWL_RHYTHM.leaveMs);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows one dot per bubble, with the current one marked', () => {
    const tree = renderLanded();

    expect(OWL_BUBBLE_PAGES).toBe(4);
    for (let page = 0; page < OWL_BUBBLE_PAGES; page++) {
      expect(findByTestId(tree, `screen-time-owl-dot-${page}`)).toHaveLength(1);
    }
    expect(findByTestId(tree, 'screen-time-owl-dot-0')[0].props.accessibilityState).toEqual({ selected: true });
    expect(findByTestId(tree, 'screen-time-owl-dot-1')[0].props.accessibilityState).toEqual({ selected: false });

    press(tree, 'screen-time-owl-next');

    expect(findByTestId(tree, 'screen-time-owl-dot-1')[0].props.accessibilityState).toEqual({ selected: true });
  });

  it('gives the owl something new to say with every bubble', () => {
    const tree = renderLanded();

    expect(owl(tree).props.sayCount).toBe(1);

    press(tree, 'screen-time-owl-next');

    expect(owl(tree).props.sayCount).toBe(2);
  });

  it('lets the owl celebrate before it goes when the parent says okay', () => {
    const onDismiss = jest.fn();
    const tree = renderLanded({ onDismiss });
    press(tree, 'screen-time-owl-next');
    press(tree, 'screen-time-owl-next');
    press(tree, 'screen-time-owl-next');

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

  it('starts over from the first bubble when a new warning arrives', () => {
    const tree = renderLanded();
    press(tree, 'screen-time-owl-next');

    tree.rerender(
      <ScreenTimeOwlAlert
        visible
        warning={{ type: 'limit_reached', remainingTime: 0, message: 'Limit.' }}
        onDismiss={jest.fn()}
      />
    );
    advance(OWL_RHYTHM.arriveMs);

    expect(json(tree)).toContain('screenTimeWarning.limitReached');
    expect(json(tree)).not.toContain('screenTime.tips.atHome.body');
  });

  it('perches the owl on its rock in the bottom-left corner', () => {
    const tree = renderAlert();

    const perch = findByTestId(tree, 'screen-time-owl-perch')[0];
    const style = [perch.props.style].flat(3).reduce((a: any, b: any) => ({ ...a, ...b }), {});

    expect(style).toMatchObject({ left: 0, bottom: 0 });
    expect(has(tree, 'owl-perch-ledge')).toBe(true);
    expect(owl(tree).props.approach).toBe('none');
  });

  it('leaves the app underneath usable rather than blocking it', () => {
    const tree = renderAlert();

    expect(findByTestId(tree, 'screen-time-owl-alert')[0].props.pointerEvents).toBe('box-none');
  });

  it('keeps the bubble small: no scrolling guide, no icons', () => {
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
