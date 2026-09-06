/**
 * The journey navigation shelf (§6.11): four fixed areas, exactly one
 * selected, labels resolved through i18n keys, and selection reported
 * through the onSelect callback rather than any internal routing.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  ChildBottomNavigation,
  navItemCentre,
  CHILD_NAV_ITEMS,
  navBottomOffset,
  navClearance,
  navWidth,
} from '@/components/child-ui/child-bottom-navigation';
import { NAV_HEIGHT, NAV_MAX_WIDTH } from '@/components/child-ui/tokens';
import {
  CHILD_UI_SCALE,
  CHILD_UI_SPRING,
  NAV_ANTICIPATION_SHARE,
} from '@/constants/child-ui-motion';

function items(tree: ReturnType<typeof render>) {
  return CHILD_NAV_ITEMS.map((item) =>
    tree.UNSAFE_root.findAll((n: any) => n.props.testID === `navigation-item-${item.id}` && n.props.accessibilityRole === 'tab')[0]
  );
}

describe('ChildBottomNavigation', () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * Order is the contract: Screensafe sits mid-bar as the parent's control,
   * with the two browsing areas either side of it and Favourites at the end.
   */
  it('renders the five journey areas in order', () => {
    expect(CHILD_NAV_ITEMS.map((item) => item.id))
      .toEqual(['home', 'library', 'screensafe', 'progress', 'saved']);

    const tree = render(<ChildBottomNavigation selected="library" onSelect={jest.fn()} />);

    items(tree).forEach((node) => expect(node).toBeTruthy());
  });

  it('marks exactly one item as selected', () => {
    const tree = render(<ChildBottomNavigation selected="library" onSelect={jest.fn()} />);

    const selectedFlags = items(tree).map((node: any) => node.props.accessibilityState?.selected);
    expect(selectedFlags.filter(Boolean)).toHaveLength(1);
    expect(selectedFlags[1]).toBe(true);
  });

  it('labels every item through a translation key', () => {
    const tree = render(<ChildBottomNavigation selected="home" onSelect={jest.fn()} />);

    items(tree).forEach((node: any, index) => {
      expect(node.props.accessibilityLabel).toBe(CHILD_NAV_ITEMS[index].labelKey);
    });
  });

  it('reports a tap through onSelect with the item id', () => {
    const onSelect = jest.fn();
    const tree = render(<ChildBottomNavigation selected="library" onSelect={onSelect} />);

    fireEvent.press(items(tree)[0]);

    expect(onSelect).toHaveBeenCalledWith('home');
  });

  it('reserves scroll clearance for its full height, its bottom offset and breathing room', () => {
    expect(navClearance(0)).toBeGreaterThan(NAV_HEIGHT + navBottomOffset(0));
    expect(navClearance(34)).toBe(NAV_HEIGHT + navBottomOffset(34) + (navClearance(0) - NAV_HEIGHT - navBottomOffset(0)));
  });

  it('sits low on the screen: tucked toward the home indicator but never below a small floor', () => {
    expect(navBottomOffset(0)).toBeGreaterThan(0);
    expect(navBottomOffset(34)).toBeLessThan(34);
    expect(navBottomOffset(34)).toBeGreaterThan(navBottomOffset(0));
  });

  it('caps its width on wide screens instead of stretching', () => {
    expect(navWidth(393, false)).toBeLessThan(393);
    expect(navWidth(1024, true)).toBe(NAV_MAX_WIDTH);
  });
});

/**
 * The screen-time panel opens out of the button that asked for it, so the bar
 * has to be able to say where its buttons are without being measured.
 */
describe('navItemCentre', () => {
  const PHONE = { width: 402, height: 874, safeBottom: 34 };

  function centre(id: Parameters<typeof navItemCentre>[0]) {
    return navItemCentre(id, PHONE.width, PHONE.height, PHONE.safeBottom, false);
  }

  it('puts Screensafe on the screen’s centre line', () => {
    expect(centre('screensafe').x).toBeCloseTo(PHONE.width / 2, 5);
  });

  it('sits every item at the same height, inside the bar', () => {
    const ys = CHILD_NAV_ITEMS.map((item) => centre(item.id).y);

    expect(new Set(ys).size).toBe(1);
    expect(ys[0]).toBeLessThan(PHONE.height);
    expect(ys[0]).toBeGreaterThan(PHONE.height - navClearance(PHONE.safeBottom));
  });

  it('orders the items left to right', () => {
    const xs = CHILD_NAV_ITEMS.map((item) => centre(item.id).x);

    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it('keeps every item inside the bar it belongs to', () => {
    const half = navWidth(PHONE.width, false) / 2;

    for (const item of CHILD_NAV_ITEMS) {
      expect(Math.abs(centre(item.id).x - PHONE.width / 2)).toBeLessThan(half);
    }
  });
});

/**
 * Screensafe is the screen-time ring itself rather than a glyph of one: the
 * bar carries today's usage where a parent already looks, and the glance
 * opens out of the very control it is showing.
 */
describe('ChildBottomNavigation screensafe ring', () => {
  function ringIn(tree: ReturnType<typeof render>) {
    return tree.UNSAFE_root.findAll((node: any) => node.props.testID === 'nav-screen-time-ring');
  }

  function shieldIn(tree: ReturnType<typeof render>) {
    return tree.UNSAFE_root.findAll(
      (node: any) => typeof node.props.name === 'string' && node.props.name.startsWith('shield'),
    );
  }

  it('shows the live ring once there is an allowance to draw', () => {
    const tree = render(
      <ChildBottomNavigation
        selected="home"
        onSelect={jest.fn()}
        screenTime={{ usageSeconds: 900, limitSeconds: 3600 }}
      />,
    );

    expect(ringIn(tree).length).toBeGreaterThan(0);
    expect(shieldIn(tree)).toHaveLength(0);
  });

  /** No allowance means no ring to draw, so the slot keeps its shield. */
  it.each([
    ['screen time is off', { usageSeconds: 0, limitSeconds: 0 }],
    ['the allowance is unknown', null],
  ])('falls back to the shield when %s', (_label, screenTime) => {
    const tree = render(
      <ChildBottomNavigation selected="home" onSelect={jest.fn()} screenTime={screenTime} />,
    );

    expect(ringIn(tree)).toHaveLength(0);
    expect(shieldIn(tree).length).toBeGreaterThan(0);
  });

  it('still reports a tap on the ring as the screensafe item', () => {
    const onSelect = jest.fn();
    const tree = render(
      <ChildBottomNavigation
        selected="home"
        onSelect={onSelect}
        screenTime={{ usageSeconds: 900, limitSeconds: 3600 }}
      />,
    );

    fireEvent.press(items(tree)[2]);

    expect(onSelect).toHaveBeenCalledWith('screensafe');
  });
});

/**
 * The ring says what it is by drawing today's usage, so the word beneath it
 * was spending the bar's scarcest resource -- height -- on a label the
 * control already carries. It survives as the accessible name.
 */
describe('the screensafe slot', () => {
  const SCREEN_TIME = { usageSeconds: 900, limitSeconds: 3600 };

  function labelsIn(tree: ReturnType<typeof render>) {
    return tree.UNSAFE_root
      .findAll((node: any) => typeof node.props.children === 'string')
      .map((node: any) => node.props.children);
  }

  it('draws no label under the ring', () => {
    const tree = render(
      <ChildBottomNavigation selected="home" onSelect={jest.fn()} screenTime={SCREEN_TIME} />,
    );

    expect(labelsIn(tree)).not.toContain('childUi.nav.screensafe');
  });

  it('keeps the label as the accessible name', () => {
    const tree = render(
      <ChildBottomNavigation selected="home" onSelect={jest.fn()} screenTime={SCREEN_TIME} />,
    );

    expect(items(tree)[2].props.accessibilityLabel).toBe('childUi.nav.screensafe');
  });

  it('still labels every other item', () => {
    const tree = render(
      <ChildBottomNavigation selected="home" onSelect={jest.fn()} screenTime={SCREEN_TIME} />,
    );
    const drawn = labelsIn(tree);

    for (const item of CHILD_NAV_ITEMS.filter((entry) => entry.id !== 'screensafe')) {
      expect(drawn).toContain(item.labelKey);
    }
  });
});

/**
 * The gather is the first half of one movement -- the window opens out of the
 * space the bar leaves -- so however the bounce is shaped, the whole of it has
 * to fit inside the duration the window's opening is scheduled against.
 */
describe('the bar’s bounce', () => {
  it('spends the anticipation inside the collapse, not on top of it', () => {
    expect(NAV_ANTICIPATION_SHARE).toBeGreaterThan(0);
    expect(NAV_ANTICIPATION_SHARE).toBeLessThan(1);
  });

  it('draws wider before it gathers', () => {
    expect(CHILD_UI_SCALE.navAnticipation).toBeGreaterThan(0);
  });

  it('gathers to about the ring it closes around, not to nothing', () => {
    expect(CHILD_UI_SCALE.navCollapsed).toBeGreaterThan(0);
    expect(CHILD_UI_SCALE.navCollapsed).toBeLessThan(0.5);
  });

  /** Underdamped on purpose: a critically damped spring does not bound out. */
  it('springs back out rather than easing back out', () => {
    const { damping, stiffness, mass } = CHILD_UI_SPRING.navExpand;

    expect(damping).toBeLessThan(2 * Math.sqrt(stiffness * mass));
  });
});

/**
 * The dial's track is the unspent part of the circle. On the home screen at
 * 36pt it is a hairline nobody reads as anything; blown up to the bar's ring
 * it became a full faint circle sitting behind the glyph, which looked like a
 * stray artefact rather than part of the control. The arc that shows actual
 * usage stays.
 */
describe('the ring in the bar', () => {
  const SCREEN_TIME = { usageSeconds: 900, limitSeconds: 3600 };

  function render_() {
    return render(
      <ChildBottomNavigation selected="home" onSelect={jest.fn()} screenTime={SCREEN_TIME} />,
    );
  }

  it('draws no track behind the glyph', () => {
    const tree = render_();

    expect(
      tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'nav-screen-time-ring-track'),
    ).toHaveLength(0);
  });

  it('still draws the arc that shows how much has been used', () => {
    const tree = render_();

    expect(
      tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'nav-screen-time-ring-arc').length,
    ).toBeGreaterThan(0);
  });
});
