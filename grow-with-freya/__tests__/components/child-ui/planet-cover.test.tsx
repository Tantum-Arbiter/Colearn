/**
 * The journey pages hang the planet from the top and let their content scroll
 * away behind it. Content starts below the lowest point of the planet or the
 * header, whichever is lower, so nothing is hidden at rest, and it dissolves
 * into the sky as it rises under the header.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, renderHook } from '@testing-library/react-native';
import { PLANET_HEADER_ESTIMATE, PlanetCover, planetCoverHeight, usePlanetCover } from '@/components/child-ui/planet-cover';
import { planetReach } from '@/constants/earth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PHONE = { width: 402, height: 874 };
const TABLET = { width: 834, height: 1210 };
const TABLET_LANDSCAPE = { width: 1194, height: 834 };

describe('planetCoverHeight', () => {
  it.each([
    ['a tablet', TABLET, 151],
    ['a tablet on its side', TABLET_LANDSCAPE, 151],
    ['a phone', PHONE, 170],
  ])('should reach below the planet on %s when the planet hangs lower than the header', (_case, screen, header) => {
    const cap = planetReach(screen.width, screen.height, 'top');

    const underTest = planetCoverHeight(header, screen.width, screen.height);

    expect(underTest).toBe(Math.max(header, cap));
    expect(underTest).toBeGreaterThanOrEqual(cap);
  });

  it('should follow the header when the header reaches lower than the planet', () => {
    const cap = planetReach(TABLET.width, TABLET.height, 'top');

    const underTest = planetCoverHeight(cap + 40, TABLET.width, TABLET.height);

    expect(underTest).toBe(cap + 40);
  });

  it('should fall back to the header before the screen has been measured', () => {
    const underTest = planetCoverHeight(PLANET_HEADER_ESTIMATE.phone, 0, 0);

    expect(underTest).toBe(PLANET_HEADER_ESTIMATE.phone);
  });
});

describe('usePlanetCover', () => {
  it('gives the header its estimated height until it has been measured, then the height it was laid out at', () => {
    const { result } = renderHook(() => usePlanetCover());
    const estimated = result.current.headerHeight;

    act(() => result.current.onHeaderLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 193.6 } } } as never));

    expect(estimated).toBe(useSafeAreaInsets().top + PLANET_HEADER_ESTIMATE.phone);
    expect(result.current.headerHeight).toBe(194);
  });
});

describe('PlanetCover', () => {
  function byTestId(tree: ReturnType<typeof render>, testID: string) {
    return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
  }

  it('draws a sky veil the height of the cover and the planet over it', () => {
    const tree = render(<PlanetCover height={240} testID="cover" />);

    const veil = StyleSheet.flatten(byTestId(tree, 'cover-veil')[0].props.style);
    const all = tree.UNSAFE_root.findAll((n: any) => typeof n.props.testID === 'string').map((n: any) => n.props.testID);

    expect(veil.top).toBe(0);
    expect(veil.height).toBe(240);
    expect(all.indexOf('cover-veil')).toBeLessThan(all.indexOf('planet-header-artwork-planet'));
  });

  it('never takes a touch', () => {
    const tree = render(<PlanetCover height={240} testID="cover" />);

    const cover = byTestId(tree, 'cover').filter((n: any) => n.props.style)[0];

    expect(cover.props.pointerEvents).toBe('none');
  });
});
