import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { MENU_FADE_MS, MENU_PANEL, ReaderMenu, menuPlacement, panelSlices, type ReaderMenuRow } from '@/components/stories/reader-menu';
import { readerEdge } from '@/components/stories/narration-layout';

type Node = { props?: { testID?: string }; children: (string | Node)[] };
const text = (node: Node): string => (String(node.props?.testID).startsWith('reader-menu-icon-') ? '' : node.children.map((child) => (typeof child === 'string' ? child : text(child))).join(''));

const rows = (count: number): ReaderMenuRow[] =>
  (['page-preview', 'font-size', 'language', 'compare', 'tips', 'auto-play', 'instrument'] as const).slice(0, count).map((icon, i) => ({
    key: icon,
    icon,
    label: `Row ${i + 1}`,
    onPress: jest.fn(),
    testID: `row-${i + 1}`,
  }));

const find = (root: ReactTestInstance, test: (node: ReactTestInstance) => boolean) => root.findAll(test);
const panel = (root: ReactTestInstance) => find(root, (node) => node.props.testID === 'reader-menu' && typeof node.props.onLayout === 'function')[0];
const layOut = (root: ReactTestInstance, width: number, height: number) =>
  act(() => fireEvent(panel(root), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } }));
const unique = (nodes: ReactTestInstance[]) => nodes.filter((node, i) => nodes.findIndex((other) => other.props.testID === node.props.testID) === i);

describe('panelSlices', () => {
  it.each([[276, 400], [276, 600], [317, 500]])('a %p wide panel %p tall keeps its top and bottom at the picture`s shape and stretches only the middle', (width, height) => {
    const scale = width / MENU_PANEL.width;
    const slices = panelSlices(width, height);

    expect(slices.top).toBeCloseTo(MENU_PANEL.top * scale, 5);
    expect(slices.bottom).toBeCloseTo((MENU_PANEL.height - MENU_PANEL.bottom) * scale, 5);
    expect(slices.middle).toBeCloseTo(height - slices.top - slices.bottom, 5);
  });

  it('never stretches the middle below nothing', () => {
    expect(panelSlices(276, 10).middle).toBe(0);
  });
});

describe('menuPlacement', () => {
  const tipOf = (place: ReturnType<typeof menuPlacement>, width: number) => ({ x: place.tipX, y: place.top + MENU_PANEL.tipY * (width / MENU_PANEL.width) });

  it('draws the pointer out of the panel`s top-right corner, pointing up and right', () => {
    expect(MENU_PANEL.tipX / MENU_PANEL.width).toBeGreaterThanOrEqual(0.98);
    expect(MENU_PANEL.tipY).toBeLessThan(MENU_PANEL.top / 2);
    expect(MENU_PANEL.tipY).toBeGreaterThan(MENU_PANEL.tipX - MENU_PANEL.width);
  });

  it.each([
    ['a phone on its side, beside the island', 874, 59, 50, 276],
    ['a phone on its side, the other way round', 874, 62, 50, 276],
    ['a tablet upright', 834, 0, 58, 317],
    ['a tablet on its side', 1194, 0, 58, 317],
  ])('on %s the pointer aims along its 45° line at the coin`s middle, just below and left of it', (_name, screen, inset, coin, width) => {
    const coinBottom = 20 + coin;
    const place = menuPlacement(screen, readerEdge(inset), coin, width, coinBottom, inset);
    const tip = tipOf(place, width);
    const coinMiddle = { x: screen - readerEdge(inset) - coin / 2, y: coinBottom - coin / 2 };

    expect(coinMiddle.x - tip.x).toBeCloseTo(tip.y - coinMiddle.y, 5);
    expect(tip.y).toBeCloseTo(coinBottom + 2, 5);
    expect(place.right).toBeGreaterThanOrEqual(Math.max(inset, 2));
  });

  it.each([[0], [44], [59], [62]])('keeps the panel inside a %p-point safe area on the right', (inset) => {
    const place = menuPlacement(874, readerEdge(inset), 50, 276, 70, inset);

    expect(place.right).toBeGreaterThanOrEqual(Math.max(inset, 2));
  });

  it('when the coin sits right at the edge, stops the panel at the safe area instead of following the coin', () => {
    const place = menuPlacement(874, 4, 50, 276, 70, 59);

    expect(place.right).toBeCloseTo(59, 5);
  });
});

describe('ReaderMenu', () => {
  const setup = (count: number) => {
    const items = rows(count);
    const view = render(<ReaderMenu rows={items} top={80} right={20} width={276} fontSize={16} scale={1} maxHeight={330} visible reduceMotion={false} />);
    return { view, items };
  };

  it.each([[4], [5], [7]])('shows each of %p rows in order, with a line between rows and none after the last', (count) => {
    const { view } = setup(count);
    const shown = unique(find(view.UNSAFE_root, (node) => /^row-\d+$/.test(String(node.props.testID)) && typeof node.props.onPress === 'function'));
    const lines = find(view.UNSAFE_root, (node) => node.props.testID === 'reader-menu-divider');

    expect(shown.map((node) => text(node as unknown as Node))).toEqual(rows(count).map((row) => row.label));
    expect(lines).toHaveLength(count - 1);
  });

  it('gives every row its picture tile and the arrow', () => {
    const { view } = setup(7);

    for (const icon of ['page-preview', 'font-size', 'language', 'compare', 'tips', 'auto-play', 'instrument']) {
      expect(find(view.UNSAFE_root, (node) => node.props.testID === `reader-menu-icon-${icon}`)).not.toHaveLength(0);
    }
    expect(find(view.UNSAFE_root, (node) => node.props.testID === 'reader-menu-arrow' && node.props.source !== undefined && typeof node.type !== 'string').length).toBeGreaterThanOrEqual(7);
  });

  it('a row does what it was given, and says what it is to the screen reader', () => {
    const { view, items } = setup(5);
    const third = find(view.UNSAFE_root, (node) => node.props.testID === 'row-3' && typeof node.props.onPress === 'function')[0];

    fireEvent.press(third);

    expect(items[2].onPress).toHaveBeenCalledTimes(1);
    expect(third.props.accessibilityRole).toBe('button');
    expect(third.props.accessibilityLabel).toBe('Row 3');
  });

  it('is the given width and as tall as its rows, never past the room it is given; beyond that its rows scroll', () => {
    const { view } = setup(7);
    const style = StyleSheet.flatten(panel(view.UNSAFE_root).props.style);
    const scroller = find(view.UNSAFE_root, (node) => node.props.testID === 'reader-menu-scroll')[0];

    expect(style).toEqual(expect.objectContaining({ position: 'absolute', top: 80, right: 20, width: 276, maxHeight: 330 }));
    expect(style.height).toBeUndefined();
    expect(scroller.findAll((node) => node.props.testID === 'row-7').length).toBeGreaterThan(0);
  });

  it('keeps its rows inside the painted face: clear of the rim, below the pointer and leaves, above the mushrooms', () => {
    const { view } = setup(5);
    const style = StyleSheet.flatten(panel(view.UNSAFE_root).props.style);
    const scale = 276 / MENU_PANEL.width;

    expect(style.paddingTop).toBeCloseTo(MENU_PANEL.content.top * scale, 5);
    expect(style.paddingBottom).toBeCloseTo((MENU_PANEL.height - MENU_PANEL.content.bottom) * scale, 5);
    expect(style.paddingLeft).toBeCloseTo(MENU_PANEL.content.left * scale, 5);
    expect(style.paddingRight).toBeCloseTo((MENU_PANEL.width - MENU_PANEL.content.right) * scale, 5);
    expect(style.minHeight).toBeCloseTo((MENU_PANEL.top + MENU_PANEL.height - MENU_PANEL.bottom) * scale, 5);
  });

  it('draws the painted panel once it knows its height: top and bottom as painted, the middle stretched between and tucked a pixel under each so no seam shows', () => {
    const { view } = setup(5);
    const slice = (name: string) => unique(find(view.UNSAFE_root, (node) => node.props.testID === `reader-menu-panel-${name}` && node.props.source !== undefined))[0];
    expect(slice('middle')).toBeUndefined();

    layOut(view.UNSAFE_root, 276, 420);

    const slices = panelSlices(276, 420);
    expect(StyleSheet.flatten(slice('top').props.style)).toEqual(expect.objectContaining({ position: 'absolute', top: 0, width: 276, height: slices.top }));
    expect(StyleSheet.flatten(slice('middle').props.style)).toEqual(expect.objectContaining({ top: slices.top - 1, width: 276, height: slices.middle + 2 }));
    expect(StyleSheet.flatten(slice('bottom').props.style)).toEqual(expect.objectContaining({ bottom: 0, width: 276, height: slices.bottom }));
    expect(slice('top').props.accessible).toBe(false);
  });

  it('long words shrink to fit a row rather than run past the arrow', () => {
    const { view } = setup(1);
    const label = find(view.UNSAFE_root, (node) => node.props.numberOfLines === 1 && node.props.adjustsFontSizeToFit === true);

    expect(label.length).toBeGreaterThan(0);
    expect(label[0].props.minimumFontScale).toBeGreaterThanOrEqual(0.7);
  });

  describe('opening and closing', () => {
    const reanimated = jest.requireMock('react-native-reanimated');
    const mount = (visible: boolean, reduceMotion = false) =>
      render(<ReaderMenu rows={rows(5)} top={80} right={20} width={276} fontSize={16} scale={1} maxHeight={330} visible={visible} reduceMotion={reduceMotion} />);
    const look = (root: ReactTestInstance) => StyleSheet.flatten(panel(root).props.style);

    it('stays built while closed: every row and picture ready, but unseen, untouchable and silent', () => {
      const view = mount(false);
      layOut(view.UNSAFE_root, 276, 300);

      expect(look(view.UNSAFE_root).opacity).toBe(0);
      expect(panel(view.UNSAFE_root).props.pointerEvents).toBe('none');
      expect(panel(view.UNSAFE_root).props.accessibilityElementsHidden).toBe(true);
      expect(panel(view.UNSAFE_root).props.importantForAccessibility).toBe('no-hide-descendants');
      expect(find(view.UNSAFE_root, (node) => node.props.testID === 'row-5').length).toBeGreaterThan(0);
      expect(find(view.UNSAFE_root, (node) => node.props.testID === 'reader-menu-panel-middle' && node.props.source !== undefined).length).toBeGreaterThan(0);
    });

    it('opens as one piece: the whole panel, art and rows together, once it has its size', () => {
      const view = mount(true);
      expect(look(view.UNSAFE_root).opacity).toBe(0);

      layOut(view.UNSAFE_root, 276, 300);

      expect(look(view.UNSAFE_root).opacity).toBe(1);
      expect(panel(view.UNSAFE_root).props.pointerEvents).toBe('auto');
      expect(panel(view.UNSAFE_root).props.accessibilityElementsHidden).toBe(false);
    });

    it('fades the whole menu in and out over MENU_FADE_MS, and at once under Reduce Motion', () => {
      const view = mount(false);
      layOut(view.UNSAFE_root, 276, 300);
      reanimated.withTiming.mockClear();

      view.rerender(<ReaderMenu rows={rows(5)} top={80} right={20} width={276} fontSize={16} scale={1} maxHeight={330} visible reduceMotion={false} />);
      expect(reanimated.withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: MENU_FADE_MS }));
      view.rerender(<ReaderMenu rows={rows(5)} top={80} right={20} width={276} fontSize={16} scale={1} maxHeight={330} visible={false} reduceMotion={false} />);
      expect(reanimated.withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: MENU_FADE_MS }));
      reanimated.withTiming.mockClear();

      view.rerender(<ReaderMenu rows={rows(5)} top={80} right={20} width={276} fontSize={16} scale={1} maxHeight={330} visible reduceMotion />);
      expect(reanimated.withTiming).not.toHaveBeenCalled();
      expect(look(view.UNSAFE_root).opacity).toBe(1);
      expect(MENU_FADE_MS).toBeLessThanOrEqual(200);
    });
  });
});

