import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { COIN_CANVAS, COIN_DIM_OPACITY, ReaderCoin, coinFrame } from '@/components/child-ui/reader-coin';

const find = (root: ReactTestInstance, testID: string) => root.findAll((node) => node.props.testID === testID);
const art = (root: ReactTestInstance) => root.findAll((node) => node.props.source !== undefined && typeof node.type !== 'string')[0];

describe('coinFrame', () => {
  const cases: [number, number, number][] = [
    [50, 63, -6.5],
    [58, 73, -7.5],
    [75, 94, -9.5],
  ];

  it.each(cases)('a %p point button draws its %p point picture %p points out, so the disc fills the button and its shadow spills round it', (size, picture, offset) => {
    expect(coinFrame(size)).toEqual({ art: picture, offset });
  });

  it('leaves room for the painted shadow', () => {
    expect(COIN_CANVAS).toBeGreaterThan(1);
  });
});

describe('ReaderCoin', () => {
  it('names the coin it shows and sizes the picture to the button', () => {
    const { UNSAFE_root } = render(<ReaderCoin coin="next" size={50} />);
    const coin = find(UNSAFE_root, 'reader-coin-next')[0];

    expect(StyleSheet.flatten(coin.props.style)).toEqual(expect.objectContaining({ width: 50, height: 50 }));
    expect(StyleSheet.flatten(art(UNSAFE_root).props.style)).toEqual(expect.objectContaining({ position: 'absolute', width: 63, height: 63, left: -6.5, top: -6.5 }));
  });

  it.each(['exit', 'menu', 'sound', 'back', 'next', 'done'] as const)('has a picture for the %s coin', (name) => {
    const { UNSAFE_root } = render(<ReaderCoin coin={name} size={50} />);

    expect(find(UNSAFE_root, `reader-coin-${name}`)).toHaveLength(1);
    expect(art(UNSAFE_root).props.source).toBeDefined();
  });

  const looks: [string, { dimmed?: boolean; slashed?: boolean }, number, boolean][] = [
    ['as painted', {}, 1, false],
    ['dimmed when it cannot be pressed', { dimmed: true }, COIN_DIM_OPACITY, false],
    ['dimmed and slashed when muted', { dimmed: true, slashed: true }, COIN_DIM_OPACITY, true],
  ];

  it.each(looks)('shows %s', (_name, props, opacity, slash) => {
    const { UNSAFE_root } = render(<ReaderCoin coin="sound" size={50} {...props} />);

    expect(StyleSheet.flatten(art(UNSAFE_root).props.style).opacity ?? 1).toBe(opacity);
    expect(find(UNSAFE_root, 'reader-coin-slash')).toHaveLength(slash ? 1 : 0);
  });

  it('a slash keeps its full strength over the dimmed coin', () => {
    const { UNSAFE_root } = render(<ReaderCoin coin="sound" size={50} dimmed slashed />);

    expect(StyleSheet.flatten(find(UNSAFE_root, 'reader-coin-slash')[0].props.style).opacity ?? 1).toBe(1);
  });

  it('is a picture only: the button round it takes the touches and speaks for it', () => {
    const { UNSAFE_root } = render(<ReaderCoin coin="menu" size={50} />);
    const coin = find(UNSAFE_root, 'reader-coin-menu')[0];

    expect(coin.props.pointerEvents).toBe('none');
    expect(coin.props.accessibilityElementsHidden).toBe(true);
    expect(coin.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
