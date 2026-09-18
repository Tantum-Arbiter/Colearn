/**
 * The floating circular controls replace the app bar (§6.3). These pin the
 * accessibility contract and the icon semantics for the two control types.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CircleActionButton } from '@/components/child-ui/circle-action-button';

function buttonNode(tree: ReturnType<typeof render>, testID: string) {
  const node = tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID)[0];
  expect(node).toBeTruthy();
  return node;
}

describe('CircleActionButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes the given accessibility label as a button', () => {
    const tree = render(
      <CircleActionButton type="back" onPress={jest.fn()} accessibilityLabel="common.back" />
    );

    const node = buttonNode(tree, 'circle-action-back');
    expect(node.props.accessibilityLabel).toBe('common.back');
    expect(node.props.accessibilityRole).toBe('button');
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const tree = render(
      <CircleActionButton type="back" onPress={onPress} accessibilityLabel="common.back" />
    );

    fireEvent.press(buttonNode(tree, 'circle-action-back'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['back', false, 'arrow-back'],
    ['audio', false, 'volume-high'],
    ['audio', true, 'volume-mute'],
    ['settings', false, 'settings-outline'],
  ] as const)('renders the %s control (muted=%s) with the %s icon', (type, muted, icon) => {
    const tree = render(
      <CircleActionButton type={type} muted={muted} onPress={jest.fn()} accessibilityLabel="label" />
    );

    const icons = tree.UNSAFE_root.findAll((n: any) => n.props.name === icon);
    expect(icons.length).toBeGreaterThan(0);
  });

  it('meets the 44dp minimum touch target on phones', () => {
    const tree = render(
      <CircleActionButton type="back" onPress={jest.fn()} accessibilityLabel="common.back" />
    );

    const rawStyle = buttonNode(tree, 'circle-action-back').props.style;
    const resolved = typeof rawStyle === 'function' ? rawStyle({ pressed: false }) : rawStyle;
    const style = [resolved]
      .flat(Infinity)
      .reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
  });
});
