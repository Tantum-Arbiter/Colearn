/**
 * The floating circular controls replace the app bar (§6.3). These pin the
 * accessibility contract and the icon semantics for the two control types.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
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

  it('calls onLongPress when held, and not onPress', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const tree = render(
      <CircleActionButton type="audio" onPress={onPress} onLongPress={onLongPress} accessibilityLabel="catalogue.sound" />
    );

    fireEvent(buttonNode(tree, 'circle-action-audio'), 'longPress');

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows an emoji in place of its icon when given one, at the round button\'s size', () => {
    const tree = render(
      <CircleActionButton type="language" emoji="🇩🇪" onPress={jest.fn()} accessibilityLabel="account.language" />
    );

    const node = buttonNode(tree, 'circle-action-language');
    const style = StyleSheet.flatten(node.props.style({ pressed: false }));

    expect(tree.UNSAFE_root.findAll((n: any) => n.props.children === '🇩🇪').length).toBeGreaterThan(0);
    expect(tree.UNSAFE_root.findAll((n: any) => n.props.name !== undefined && typeof n.props.name === 'string' && n.props.size !== undefined)).toHaveLength(0);
    expect(style.width).toBe(56);
    expect(style.height).toBe(56);
  });

  it('shows a globe for the language button when it has no flag', () => {
    const tree = render(
      <CircleActionButton type="language" onPress={jest.fn()} accessibilityLabel="account.language" />
    );

    expect(tree.UNSAFE_root.findAll((n: any) => n.props.name === 'globe-outline').length).toBeGreaterThan(0);
  });

  it('offers no long press unless one is given', () => {
    const tree = render(
      <CircleActionButton type="audio" onPress={jest.fn()} accessibilityLabel="catalogue.sound" />
    );

    expect(buttonNode(tree, 'circle-action-audio').props.onLongPress).toBeUndefined();
  });

  it.each([
    ['back', false, 'arrow-back'],
    ['home', false, 'home'],
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

/**
 * A control that says what it does: the icon with its word beside it, in a
 * pill the height of the round button, so a row of labelled and plain
 * controls still lines up.
 */
describe('CircleActionButton with a label', () => {
  function flat(node: any) {
    const raw = node.props.style;
    const resolved = typeof raw === 'function' ? raw({ pressed: false }) : raw;

    return [resolved].flat(3).reduce((merged: any, part: any) => ({ ...merged, ...part }), {});
  }

  it('shows the word beside the icon', () => {
    const tree = render(<CircleActionButton type="home" label="Home" onPress={jest.fn()} accessibilityLabel="Home" />);

    const node = buttonNode(tree, 'circle-action-home');
    const words = node.findAll((n: any) => n.props.children === 'Home');
    const icons = node.findAll((n: any) => n.props.name === 'home');

    expect(words.length).toBeGreaterThan(0);
    expect(icons.length).toBeGreaterThan(0);
  });

  it('is a pill as tall as the round button, fitted to its word', () => {
    const round = render(<CircleActionButton type="home" onPress={jest.fn()} accessibilityLabel="Home" />);
    const labelled = render(<CircleActionButton type="home" label="Home" onPress={jest.fn()} accessibilityLabel="Home" />);

    const circle = flat(buttonNode(round, 'circle-action-home'));
    const underTest = flat(buttonNode(labelled, 'circle-action-home'));

    expect(underTest.height).toBe(circle.height);
    expect(underTest.borderRadius).toBe(circle.height / 2);
    expect(underTest.width).toBeUndefined();
    expect(underTest.flexDirection).toBe('row');
  });

  it('stays a plain circle without a label', () => {
    const tree = render(<CircleActionButton type="home" onPress={jest.fn()} accessibilityLabel="Home" />);

    const underTest = flat(buttonNode(tree, 'circle-action-home'));

    expect(underTest.width).toBe(underTest.height);
  });
});

describe('a long label', () => {
  it('shrinks its word rather than overflowing the space it is given', () => {
    const tree = render(<CircleActionButton type="settings" label="Dla dorosłych" onPress={jest.fn()} accessibilityLabel="x" />);

    const word = tree.UNSAFE_root.findAll((n: any) => n.props.children === 'Dla dorosłych' && n.props.numberOfLines === 1)[0];

    expect(word.props.adjustsFontSizeToFit).toBe(true);
    expect(word.props.minimumFontScale).toBeGreaterThanOrEqual(0.6);
  });
});

