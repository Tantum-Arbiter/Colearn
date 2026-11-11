import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SPACE_3, SPACE_4 } from '@/components/child-ui/tokens';
import { TipsBadge, TipsPanel, tipsPanelFrame } from '@/components/stories/learning-tips';
import { readerEdge } from '@/components/stories/narration-layout';

jest.mock('@/hooks/use-steady-shared-value', () => ({
  useSteadySharedValue: (initial: number) => require('react').useState({ value: initial })[0],
}));

const TIPS = ['Use your quiet voice.', 'Say their name gently.', 'Tell them, “You’re safe.”'];

function texts(node: ReactTestInstance): string[] {
  return node.children.flatMap((child) => (typeof child === 'string' ? [child] : texts(child)));
}

function pressable(root: ReactTestInstance, testID: string) {
  return root.findAll((node: ReactTestInstance) => node.props.testID === testID && typeof node.props.onPress === 'function')[0];
}

describe('tipsPanelFrame', () => {
  const cases = [
    { name: 'a phone on its side, clear of the notch and the corner buttons', screen: { width: 874, height: 402 }, insets: { top: 0, bottom: 21, left: 59, right: 59 }, button: 50 },
    { name: 'a tablet with no insets', screen: { width: 1180, height: 820 }, insets: { top: 24, bottom: 20, left: 0, right: 0 }, button: 64 },
    { name: 'a small bottom inset still keeps the panel off the edge', screen: { width: 667, height: 375 }, insets: { top: 0, bottom: 0, left: 0, right: 0 }, button: 50 },
  ];

  it.each(cases)('$name', ({ screen, insets, button }) => {
    const side = (inset: number) => readerEdge(inset) + button + 12 + SPACE_4;
    const top = Math.max(insets.top + 20, 20) + button + SPACE_3;
    const bottom = screen.height - Math.max(insets.bottom, 12) - SPACE_3;

    expect(tipsPanelFrame(screen, insets, button)).toEqual({
      left: side(insets.left),
      top,
      width: screen.width - side(insets.left) - side(insets.right),
      height: bottom - top,
    });
  });

  it('never gives a negative size on a screen too small to hold it', () => {
    const frame = tipsPanelFrame({ width: 100, height: 80 }, { top: 0, bottom: 0, left: 0, right: 0 }, 50);

    expect(frame.width).toBe(0);
    expect(frame.height).toBe(0);
  });
});

describe('TipsPanel', () => {
  const FRAME = { left: 140, top: 82, width: 594, height: 290 };

  function renderPanel(overrides: Partial<React.ComponentProps<typeof TipsPanel>> = {}) {
    const onClose = jest.fn();
    const view = render(
      <TipsPanel picture="file:///talk-softly.webp" label="Talk softly" heading="When a friend gets a fright, you can talk softly:" tips={TIPS} frame={FRAME} isTablet={false} reduceMotion={false} open closeLabel="Close" onClose={onClose} {...overrides} />
    );
    const root = view.UNSAFE_root;
    const find = (testID: string) => root.findAll((node: ReactTestInstance) => node.props.testID === testID)[0];
    return { ...view, root, find, onClose };
  }

  it('Close sits at the foot of the panel, below the tips, which keep their own centred block', () => {
    const { StyleSheet } = require('react-native');
    const { find } = renderPanel();
    const close = find('learning-tips-close');
    const block = find('learning-challenge-tips-text');
    const column = find('learning-challenge-tips-column');

    expect(block.findAll((node: ReactTestInstance) => node.props.testID === 'learning-challenge-tips-heading').length).toBeGreaterThan(0);
    expect(block.findAll((node: ReactTestInstance) => node.props.testID === 'learning-tips-close')).toHaveLength(0);
    expect(StyleSheet.flatten(block.props.style)).toEqual(expect.objectContaining({ flex: 1, justifyContent: 'center' }));
    expect(StyleSheet.flatten(column.props.style).alignSelf).toBe('stretch');
    const order = column.findAll((node: ReactTestInstance) => node.props.testID === 'learning-challenge-tips-text' || node.props.testID === 'learning-tips-close').map((node: ReactTestInstance) => node.props.testID);
    expect(order[0]).toBe('learning-challenge-tips-text');
    expect(order[order.length - 1]).toBe('learning-tips-close');
    expect(StyleSheet.flatten(close.props.style).alignSelf).toBe('flex-end');
  });

  it('shows the picture, named, beside the heading and every thing to do', () => {
    const { find } = renderPanel();

    expect(find('learning-challenge-tips-picture').props.source).toEqual({ uri: 'file:///talk-softly.webp' });
    expect(texts(find('learning-challenge-tips-label')).join('')).toBe('Talk softly');
    expect(texts(find('learning-challenge-tips-heading')).join('')).toBe('When a friend gets a fright, you can talk softly:');
    expect([0, 1, 2].map((i) => texts(find(`learning-challenge-tip-${i}`)).join(''))).toEqual(TIPS);
  });

  it('sits in the frame it is given', () => {
    const { find } = renderPanel();

    expect(find('learning-challenge-tips').props.style).toEqual(expect.arrayContaining([expect.objectContaining(FRAME)]));
  });

  it('open, it can be touched and read aloud', () => {
    const panel = renderPanel().find('learning-challenge-tips');

    expect(panel.props.pointerEvents).toBe('auto');
    expect(panel.props.accessibilityElementsHidden).toBe(false);
    expect(panel.props.importantForAccessibility).toBe('auto');
  });

  it('closed, it is out of reach and out of the screen reader', () => {
    const panel = renderPanel({ open: false }).find('learning-challenge-tips');

    expect(panel.props.pointerEvents).toBe('none');
    expect(panel.props.accessibilityElementsHidden).toBe(true);
    expect(panel.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('its button closes the tips, and is named for it', () => {
    const { root, onClose } = renderPanel();
    const close = pressable(root, 'learning-tips-close');

    expect(close.props.accessibilityRole).toBe('button');
    expect(close.props.accessibilityLabel).toBe('Close');
    expect(texts(close).join('')).toBe('Close');
    fireEvent.press(close);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('TipsBadge', () => {
  function renderBadge(overrides: Partial<React.ComponentProps<typeof TipsBadge>> = {}) {
    const onPress = jest.fn();
    const view = render(<TipsBadge size={34} open={false} reduceMotion={false} label="Tips" onPress={onPress} {...overrides} />);
    const root = view.UNSAFE_root;
    return { ...view, root, onPress, badge: () => pressable(root, 'learning-tips-badge') };
  }

  it('is a named button that says whether the tips are open', () => {
    const { badge, rerender, onPress } = renderBadge();

    expect(badge().props.accessibilityRole).toBe('button');
    expect(badge().props.accessibilityLabel).toBe('Tips');
    expect(badge().props.accessibilityState).toEqual({ expanded: false });

    rerender(<TipsBadge size={34} open reduceMotion={false} label="Tips" onPress={onPress} />);
    expect(badge().props.accessibilityState).toEqual({ expanded: true });
  });

  it('pressing it asks for the tips', () => {
    const { badge, onPress } = renderBadge();

    fireEvent.press(badge());

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is the size it is given, and easy to hit', () => {
    const { root, badge } = renderBadge({ size: 30 });
    const body = root.findAll((node: ReactTestInstance) => node.props.testID === 'learning-tips-badge-spot')[0];

    expect(body.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: 30, height: 30 })]));
    expect(badge().props.hitSlop).toBeGreaterThanOrEqual(10);
  });
});
