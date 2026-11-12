import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { render, renderHook } from '@testing-library/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHELF_FOOT_FADE, ShelfFoot } from '@/components/child-ui/shelf-foot';
import { navClearance } from '@/components/child-ui/nav-metrics';
import { skyFoot } from '@/constants/night-palette';

const PHONE = { width: 402, height: 874, scale: 3, fontScale: 1 };

function insets() {
  const { result } = renderHook(() => useSafeAreaInsets());
  return result.current;
}

function foot(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll((node: { props: { testID?: string } }) => node.props.testID === 'shelf-foot')[0];
}

describe('ShelfFoot', () => {
  let window: jest.SpyInstance;

  beforeEach(() => {
    window = jest.spyOn(Dimensions, 'get').mockReturnValue(PHONE);
  });

  afterEach(() => {
    window.mockRestore();
  });

  it('sits on the edge where the shelves stop, just above the bar', () => {
    const underTest = render(<ShelfFoot />);

    expect(StyleSheet.flatten(foot(underTest).props.style).bottom).toBe(navClearance(insets().bottom));
  });

  it('is as deep as the fade', () => {
    const underTest = render(<ShelfFoot />);

    expect(StyleSheet.flatten(foot(underTest).props.style).height).toBe(SHELF_FOOT_FADE);
  });

  it('spans the width of the screen', () => {
    const underTest = render(<ShelfFoot />);

    expect(StyleSheet.flatten(foot(underTest).props.style)).toEqual(
      expect.objectContaining({ position: 'absolute', left: 0, right: 0 }),
    );
  });

  it('lets every touch through to the shelves', () => {
    const underTest = render(<ShelfFoot />);

    expect(foot(underTest).props.pointerEvents).toBe('none');
  });

  it('fades the shelves into the sky that is behind them at that height', () => {
    const edge = PHONE.height - navClearance(insets().bottom);

    const underTest = render(<ShelfFoot />);

    const gradient = foot(underTest).findAll((node: { props: { colors?: unknown } }) => Array.isArray(node.props.colors))[0];
    const expected = skyFoot(edge - SHELF_FOOT_FADE, edge, PHONE.height);
    expect(gradient.props.colors).toEqual(expected.colours);
    expect(gradient.props.locations).toEqual(expected.locations);
  });
});
