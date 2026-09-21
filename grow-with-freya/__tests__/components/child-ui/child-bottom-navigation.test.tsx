/**
 * The journey navigation shelf (§6.11): four fixed areas, exactly one
 * selected, labels resolved through i18n keys, and selection reported
 * through the onSelect callback rather than any internal routing.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { withTiming } from 'react-native-reanimated';
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
  CHILD_UI_MOTION,
  CHILD_UI_SCALE,
  CHILD_UI_SPRING,
  NAV_ANTICIPATION_SHARE,
  springRiseMs,
} from '@/constants/child-ui-motion';
import { TEXT_PRIMARY } from '@/constants/night-palette';

function glyphs(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll(
    (node: any) => typeof node.props.name === 'string' && typeof node.props.size === 'number',
  );
}

function items(tree: ReturnType<typeof render>) {
  return CHILD_NAV_ITEMS.map((item) =>
    tree.UNSAFE_root.findAll((n: any) => n.props.testID === `navigation-item-${item.id}` && n.props.accessibilityRole === 'tab')[0]
  );
}

describe('ChildBottomNavigation', () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * Order is the contract: Screensafe sits mid-bar as the parent's control,
   * with Progress and Search either side of it and Profile at the end.
   */
  it('renders the five journey areas in order', () => {
    expect(CHILD_NAV_ITEMS.map((item) => item.id))
      .toEqual(['home', 'progress', 'screensafe', 'search', 'profile']);

    const tree = render(<ChildBottomNavigation selected="progress" onSelect={jest.fn()} />);

    items(tree).forEach((node) => expect(node).toBeTruthy());
  });

  it('floats above the page by default, pinned to the foot of the screen', () => {
    const tree = render(<ChildBottomNavigation selected="progress" onSelect={jest.fn()} />);

    const wrapper = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'child-bottom-navigation-positioner')[0];
    const underTest = StyleSheet.flatten(wrapper.props.style);

    expect(underTest.position).toBe('absolute');
    expect(underTest.bottom).toBeGreaterThan(0);
  });

  it('shows the first item as learning, with a school cap rather than a house', () => {
    const home = CHILD_NAV_ITEMS.find((item) => item.id === 'home')!;

    expect(home.icon).toBe('school-outline');
    expect(home.selectedIcon).toBe('school');
  });

  it('marks exactly one item as selected', () => {
    const tree = render(<ChildBottomNavigation selected="progress" onSelect={jest.fn()} />);

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

  it('reports a tap on the profile slot as the profile item', () => {
    const onSelect = jest.fn();
    const tree = render(<ChildBottomNavigation selected="home" onSelect={onSelect} />);

    fireEvent.press(items(tree)[4]);

    expect(onSelect).toHaveBeenCalledWith('profile');
  });

  it('reports a tap through onSelect with the item id', () => {
    const onSelect = jest.fn();
    const tree = render(<ChildBottomNavigation selected="progress" onSelect={onSelect} />);

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
 * The bar is glyphs alone. Every slot's name survives as its accessible
 * label, but no word is drawn beneath any glyph -- the height that bought
 * goes to the glyphs themselves, which draw larger for it.
 */
describe('an icon-only bar', () => {
  const SCREEN_TIME = { usageSeconds: 900, limitSeconds: 3600 };

  function labelsIn(tree: ReturnType<typeof render>) {
    return tree.UNSAFE_root
      .findAll((node: any) => typeof node.props.children === 'string')
      .map((node: any) => node.props.children);
  }

  it('draws no label under any glyph', () => {
    const tree = render(
      <ChildBottomNavigation selected="home" onSelect={jest.fn()} screenTime={SCREEN_TIME} />,
    );

    for (const item of CHILD_NAV_ITEMS) {
      expect(labelsIn(tree)).not.toContain(item.labelKey);
    }
  });

  it('keeps every label as the accessible name', () => {
    const tree = render(
      <ChildBottomNavigation selected="home" onSelect={jest.fn()} screenTime={SCREEN_TIME} />,
    );

    items(tree).forEach((node: any, index) => {
      expect(node.props.accessibilityLabel).toBe(CHILD_NAV_ITEMS[index].labelKey);
    });
  });

  /** The bar picks out its selection in white, not gold -- gold is for stars. */
  it('draws the selected glyph in white and the rest dimmer', () => {
    const tree = render(<ChildBottomNavigation selected="home" onSelect={jest.fn()} />);

    const [home, ...rest] = glyphs(tree);

    expect(home.props.color).toBe(TEXT_PRIMARY);
    for (const glyph of rest) expect(glyph.props.color).not.toBe(TEXT_PRIMARY);
  });

  it('draws the selected glyph a touch bolder than its neighbours', () => {
    const tree = render(<ChildBottomNavigation selected="home" onSelect={jest.fn()} />);

    const [home, progress] = glyphs(tree);

    expect(home.props.size).toBeGreaterThan(progress.props.size);
  });

  it('draws its glyphs larger than a labelled bar could afford', () => {
    const tree = render(<ChildBottomNavigation selected="home" onSelect={jest.fn()} />);

    const glyphSizes = tree.UNSAFE_root
      .findAll((node: any) => typeof node.props.name === 'string' && typeof node.props.size === 'number')
      .map((node: any) => node.props.size);

    expect(glyphSizes.length).toBeGreaterThan(0);
    // the bar is 76 tall and carries no labels, so a 32pt glyph left room
    // going spare -- they fill more of the height they were given
    for (const size of glyphSizes) expect(size).toBeGreaterThanOrEqual(38);
  });
});

/**
 * Profile is the child's own corner, so its slot wears their avatar rather
 * than a person glyph -- the same substitution Screensafe makes for its ring.
 */
describe('the profile slot', () => {
  function avatarIn(tree: ReturnType<typeof render>) {
    return tree.UNSAFE_root.findAll((node: any) => node.props.testID === 'profile-nav-avatar');
  }

  it('wears the child avatar in place of a glyph', () => {
    const tree = render(<ChildBottomNavigation selected="home" onSelect={jest.fn()} />);

    expect(avatarIn(tree)).toHaveLength(1);
  });

  it('is named for a screen reader like every other slot', () => {
    const tree = render(<ChildBottomNavigation selected="home" onSelect={jest.fn()} />);

    expect(items(tree)[4].props.accessibilityLabel).toBe('childUi.nav.profile');
  });
});

const ROW_WIDTH = 500;

function layOutRow(tree: ReturnType<typeof render>) {
  const row = tree.UNSAFE_root.findAll((n: any) => typeof n.props.onLayout === 'function')[0];
  act(() => {
    row.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: ROW_WIDTH, height: 60 } } });
  });
}

/**
 * The bar is also shown on pages that are none of its places -- the main menu
 * above all. Nothing may be lit there, or the bar claims the child is somewhere
 * they are not.
 */
describe('on a page that is none of the bar’s places', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lights no item', () => {
    const tree = render(<ChildBottomNavigation selected={null} onSelect={jest.fn()} />);

    const selectedFlags = items(tree).map((node: any) => node.props.accessibilityState?.selected);
    expect(selectedFlags.filter(Boolean)).toHaveLength(0);
  });

  it('still reports a tap on any item', () => {
    const onSelect = jest.fn();
    const tree = render(<ChildBottomNavigation selected={null} onSelect={onSelect} />);

    fireEvent.press(items(tree)[0]);

    expect(onSelect).toHaveBeenCalledWith('home');
  });

  it('fades the highlight out when the child leaves its places, rather than leaving the last one lit', () => {
    const tree = render(<ChildBottomNavigation selected="progress" onSelect={jest.fn()} />);
    layOutRow(tree);
    (withTiming as jest.Mock).mockClear();

    tree.rerender(<ChildBottomNavigation selected={null} onSelect={jest.fn()} />);

    expect(withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: CHILD_UI_MOTION.navSlide.duration }));
  });

  it('lights the chosen place where it is, rather than sliding in from the last place lit', () => {
    const itemWidth = ROW_WIDTH / CHILD_NAV_ITEMS.length;
    const tree = render(<ChildBottomNavigation selected={null} onSelect={jest.fn()} />);
    layOutRow(tree);
    (withTiming as jest.Mock).mockClear();

    tree.rerender(<ChildBottomNavigation selected="search" onSelect={jest.fn()} />);

    expect(withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: CHILD_UI_MOTION.navSlide.duration }));
    expect(withTiming).not.toHaveBeenCalledWith(3 * itemWidth, expect.anything());
  });

  it('comes back up on the place chosen after the child has been off the bar\'s places', () => {
    const itemWidth = ROW_WIDTH / CHILD_NAV_ITEMS.length;
    const tree = render(<ChildBottomNavigation selected="progress" onSelect={jest.fn()} />);
    layOutRow(tree);
    tree.rerender(<ChildBottomNavigation selected={null} onSelect={jest.fn()} />);
    (withTiming as jest.Mock).mockClear();

    tree.rerender(<ChildBottomNavigation selected="search" onSelect={jest.fn()} />);

    expect(withTiming).not.toHaveBeenCalledWith(3 * itemWidth, expect.anything());
  });

  it('slides between two places it owns', () => {
    const itemWidth = ROW_WIDTH / CHILD_NAV_ITEMS.length;
    const tree = render(<ChildBottomNavigation selected="progress" onSelect={jest.fn()} />);
    layOutRow(tree);
    (withTiming as jest.Mock).mockClear();

    tree.rerender(<ChildBottomNavigation selected="search" onSelect={jest.fn()} />);

    expect(withTiming).toHaveBeenCalledWith(3 * itemWidth, expect.anything());
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

  /**
   * Filmed: the droplet landed, and one frame later the bar was already out
   * at full width and full opacity while the splash still had 400ms to run.
   * The spring now takes about as long to rise as the splash takes to
   * spread, and the bar fades up over that rise instead of snapping on.
   */
  it('rises out over the splash rather than in a single frame', () => {
    const rise = springRiseMs(CHILD_UI_SPRING.navExpand);

    expect(rise).toBeGreaterThanOrEqual(300);
    expect(rise).toBeLessThanOrEqual(520);
  });

  it('fades itself up as it widens, over a real beat', () => {
    expect(CHILD_UI_MOTION.navPresence.duration).toBeGreaterThanOrEqual(180);
    expect(CHILD_UI_MOTION.navPresence.duration).toBeLessThanOrEqual(springRiseMs(CHILD_UI_SPRING.navExpand));
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

/**
 * A tour that wants to point the owl at a slot has to be able to measure
 * it, so every slot is wrapped in a view that stays a real native view
 * (`collapsable={false}`) and takes the ref the bar is handed for it. Refs
 * never fill under this test renderer, so the wrapper is what is asserted.
 */
describe('pointing at a slot', () => {
  it('wraps every slot in a measurable view', () => {
    const tree = render(<ChildBottomNavigation selected="home" onSelect={jest.fn()} />);

    const wrappers = tree.UNSAFE_root.findAll((n: any) => n.props.collapsable === false);

    expect(wrappers.length).toBeGreaterThanOrEqual(CHILD_NAV_ITEMS.length);
  });

  it('asks for nothing when no refs are handed over', () => {
    const tree = render(<ChildBottomNavigation selected="home" onSelect={jest.fn()} />);

    expect(items(tree)).toHaveLength(CHILD_NAV_ITEMS.length);
  });
});
