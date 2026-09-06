/**
 * Tests for the owl screen-time alert -- the surface that replaced the
 * full-screen warning modal.
 *
 * The owl perches bottom-left and the whole guide is written in the box
 * beside it: title, message, guidelines and all three real-world tips, in one
 * scrollable surface with nothing hidden behind a button. The assertions
 * about all three tip bodies being present are what protect that -- the
 * earlier design put them behind a *Show me ideas* press, and the operator
 * asked for the guide to be readable in place.
 *
 * The box is text only. `CATEGORY_CONFIG` in `RealWorldTips` still carries an
 * Ionicon per category for the glance panel, so the icon assertions here pin
 * the owl's surface to `showIcons={false}` rather than trusting it.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

import { ScreenTimeOwlAlert } from '@/components/screen-time/screen-time-owl-alert';
import type { ScreenTimeWarning } from '@/services/screen-time-service';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

const APPROACHING: ScreenTimeWarning = {
  type: 'approaching_limit',
  remainingTime: 240,
  message: 'Only 4 minutes of screen time left today.',
};

const LIMIT_REACHED: ScreenTimeWarning = {
  type: 'limit_reached',
  remainingTime: 0,
  message: 'Daily screen time limit reached.',
};

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

/**
 * The sprite forwards its testID to a plain View, so a testID query matches
 * both the element and its host. `clip` only exists on the element, which is
 * the one carrying the state these tests are about.
 */
function owl(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll(
    (node: any) => typeof node.props.clip === 'string' && typeof node.props.width === 'number'
  )[0];
}

function press(tree: ReturnType<typeof render>, testID: string) {
  const target = findByTestId(tree, testID)[0];
  act(() => {
    target.props.onPress();
  });
}

function renderAlert(props: Partial<React.ComponentProps<typeof ScreenTimeOwlAlert>> = {}) {
  return render(
    <ScreenTimeOwlAlert visible warning={APPROACHING} onDismiss={jest.fn()} {...props} />
  );
}

describe('ScreenTimeOwlAlert', () => {
  it('renders nothing without a warning', () => {
    const tree = renderAlert({ warning: null });

    expect(tree.toJSON()).toBeNull();
  });

  it('renders nothing while hidden', () => {
    const tree = renderAlert({ visible: false });

    expect(tree.toJSON()).toBeNull();
  });

  it('speaks the warning message', () => {
    const json = JSON.stringify(renderAlert().toJSON());

    expect(json).toContain(APPROACHING.message);
  });

  it.each([
    ['approaching_limit', 'screenTimeWarning.approachingLimit'],
    ['limit_reached', 'screenTimeWarning.limitReached'],
    ['daily_complete', 'screenTimeWarning.dailyComplete'],
  ])('titles a %s warning with its own copy', (type, expectedKey) => {
    const tree = renderAlert({
      warning: { type: type as never, remainingTime: 0, message: 'msg' },
    });

    expect(JSON.stringify(tree.toJSON())).toContain(expectedKey);
  });

  it('falls back to a neutral title for an unrecognised warning type', () => {
    const tree = renderAlert({
      warning: { type: 'something-new' as never, remainingTime: 0, message: 'msg' },
    });

    expect(JSON.stringify(tree.toJSON())).toContain('screenTimeWarning.notice');
  });

  it('perches an owl beside the bubble', () => {
    const tree = renderAlert();

    expect(owl(tree)).toBeTruthy();
    expect(findByTestId(tree, 'screen-time-owl-bubble')).toHaveLength(1);
  });

  it('perches the owl in the bottom-left corner', () => {
    const tree = renderAlert();

    const root = findByTestId(tree, 'screen-time-owl-alert')[0];
    const style = [root.props.style].flat(3).reduce((a: any, b: any) => ({ ...a, ...b }), {});

    expect(style.justifyContent).toBe('flex-end');
    expect(style.alignItems).toBe('flex-start');
  });

  it('leaves the app underneath usable rather than blocking it', () => {
    const tree = renderAlert();

    const root = findByTestId(tree, 'screen-time-owl-alert')[0];

    expect(root.props.pointerEvents).toBe('box-none');
  });

  it('waves before it settles', () => {
    const tree = renderAlert();

    expect(owl(tree).props.clip).toBe('wave');
  });

  it('dismisses when the parent acknowledges it', () => {
    const onDismiss = jest.fn();
    const tree = renderAlert({ onDismiss });

    press(tree, 'screen-time-owl-okay');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('writes the guide in the box rather than hiding it behind a press', () => {
    const tree = renderAlert();

    expect(findByTestId(tree, 'real-world-tips').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'screen-time-owl-ideas')).toHaveLength(0);
  });

  it('carries every tip in full, headline and body', () => {
    const json = JSON.stringify(renderAlert().toJSON());

    for (const key of ['atHome', 'outdoors', 'creative']) {
      expect(json).toContain(`screenTime.tips.${key}.title`);
      expect(json).toContain(`screenTime.tips.${key}.body`);
    }
  });

  it('keeps the guidance note the old modal carried', () => {
    const json = JSON.stringify(renderAlert().toJSON());

    expect(json).toContain('screenTimeWarning.guidelines');
  });

  it('scrolls rather than clipping a guide too tall for the box', () => {
    const tree = renderAlert();

    const scrollers = tree.UNSAFE_root.findAll(
      (node: any) => typeof node.props.contentContainerStyle !== 'undefined'
    );

    expect(scrollers.length).toBeGreaterThan(0);
  });

  it('shows no icons or imagery in the guide', () => {
    const json = JSON.stringify(renderAlert().toJSON());

    for (const icon of ['home-outline', 'leaf-outline', 'color-palette-outline']) {
      expect(json).not.toContain(icon);
    }
  });

  it('names the owl for screen readers', () => {
    const tree = renderAlert();

    const labelled = tree.UNSAFE_root.findAll(
      (node: any) => node.props.accessibilityLabel === 'screenTimeOwl.owlLabel'
    );

    expect(labelled.length).toBeGreaterThan(0);
  });
});

describe('ScreenTimeOwlAlert clip sequencing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('talks once the wave has finished', () => {
    const tree = renderAlert();

    act(() => {
      owl(tree).props.onClipEnd();
    });

    expect(owl(tree).props.clip).toBe('talk');
  });

  it('falls quiet after it has said its piece', () => {
    const tree = renderAlert();

    act(() => {
      owl(tree).props.onClipEnd();
    });
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(owl(tree).props.clip).toBe('idle');
  });

  it('settles to idle rather than talking forever', () => {
    const tree = renderAlert();

    act(() => {
      owl(tree).props.onClipEnd();
    });
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(owl(tree).props.clip).toBe('idle');
  });
});
