/**
 * The app's one gold call to action, worn by Login and by the free trial so
 * the two can never drift apart: a lemon-to-gold face, a white sheen along
 * its top edge, dark ink, and a soft gold halo beneath.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { GOLD_BUTTON, GoldButton } from '@/components/child-ui/gold-button';
import { HERO_CARD } from '@/constants/home-sky';

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function pressable(tree: ReturnType<typeof render>) {
  return byTestId(tree, 'gold-button').filter((n: any) => n.props.accessibilityRole === 'button')[0];
}

function glyphOrder(tree: ReturnType<typeof render>, icon: string, label: string): string[] {
  return tree.UNSAFE_root
    .findAll((n: any) => n.props.name === icon || n.props.children === label)
    .map((n: any) => (n.props.name === icon ? 'icon' : 'label'))
    .filter((kind: string, index: number, all: string[]) => all.indexOf(kind) === index);
}

describe('GoldButton', () => {
  it('should be a button named by its label, and press through', () => {
    const onPress = jest.fn();
    const tree = render(<GoldButton label="common.login" icon="log-in-outline" onPress={onPress} />);

    fireEvent.press(pressable(tree));

    expect(pressable(tree).props.accessibilityLabel).toBe('common.login');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should wear a lemon-to-gold face with a white sheen fading down from its top edge', () => {
    const tree = render(<GoldButton label="x" icon="log-in-outline" onPress={jest.fn()} />);

    const palettes = tree.UNSAFE_root
      .findAll((n: any) => Array.isArray(n.props.colors))
      .map((n: any) => JSON.stringify(n.props.colors));
    expect(palettes).toContain(JSON.stringify([HERO_CARD.arrowTop, HERO_CARD.arrowBottom]));
    expect(palettes).toContain(JSON.stringify([...GOLD_BUTTON.sheen]));
  });

  it('should glow gold beneath itself, a halo rather than a hard edge', () => {
    const tree = render(<GoldButton label="x" icon="log-in-outline" onPress={jest.fn()} />);

    const glow = StyleSheet.flatten(byTestId(tree, 'gold-button-glow')[0].props.style);
    expect(glow.shadowColor).toBe(HERO_CARD.arrowBottom);
    expect(glow.shadowOpacity).toBeGreaterThanOrEqual(0.5);
    expect(glow.shadowRadius).toBeGreaterThanOrEqual(16);
    expect(glow.margin).toBeUndefined();
  });

  it('should set its glyph and word in the dark ink', () => {
    const tree = render(<GoldButton label="common.login" icon="log-in-outline" onPress={jest.fn()} />);

    const glyph = tree.UNSAFE_root.findAll((n: any) => n.props.name === 'log-in-outline')[0];
    expect(glyph.props.color).toBe(HERO_CARD.arrowInk);
  });

  it('should lead with its glyph by default and trail it when asked', () => {
    const leading = render(<GoldButton label="L" icon="log-in-outline" onPress={jest.fn()} />);
    const trailing = render(<GoldButton label="T" icon="lock-closed" iconPosition="trailing" onPress={jest.fn()} />);

    expect(glyphOrder(leading, 'log-in-outline', 'L')).toEqual(['icon', 'label']);
    expect(glyphOrder(trailing, 'lock-closed', 'T')).toEqual(['label', 'icon']);
  });

  it('should be as tall as it is asked, and stay a pill', () => {
    const tree = render(<GoldButton label="x" icon="lock-closed" onPress={jest.fn()} height={48} />);

    const root = StyleSheet.flatten(pressable(tree).props.style({ pressed: false }));
    const glow = StyleSheet.flatten(byTestId(tree, 'gold-button-glow')[0].props.style);
    expect(root.minHeight).toBe(48);
    expect(glow.borderRadius).toBe(24);
  });
});
