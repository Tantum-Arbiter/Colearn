import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, renderHook } from '@testing-library/react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import { VoyageRow, useVoyageZoom } from '@/components/home/voyage-row';
import { IslandVoyageProvider, type IslandVoyage } from '@/contexts/island-voyage-context';
import { VOYAGE_ROWS, rowPose, voyageMaxZoom, zoomScale } from '@/constants/island-voyage';

const SCREEN = { width: 390, height: 844 };

function voyage(travel: number): IslandVoyage {
  return {
    phase: 'leaving',
    travel: { value: travel },
    clouds: { value: 0 },
    arrival: { value: 0 },
    reduceMotion: false,
    depart: jest.fn(),
    comeBack: jest.fn(),
    islandReady: jest.fn(),
    settleHome: jest.fn(),
  } as unknown as IslandVoyage;
}

function measureTheScreen() {
  Object.defineProperty(document.documentElement, 'clientWidth', { value: SCREEN.width, configurable: true });
  Object.defineProperty(document.documentElement, 'clientHeight', { value: SCREEN.height, configurable: true });
  window.dispatchEvent(new Event('resize'));
}

describe('VoyageRow', () => {
  beforeEach(() => {
    measureTheScreen();
    (useAnimatedStyle as jest.Mock).mockImplementation((build: () => object) => build());
  });

  afterEach(() => {
    (useAnimatedStyle as jest.Mock).mockImplementation(() => ({}));
  });

  const rowStyle = (row: keyof typeof VOYAGE_ROWS, travel: number | null) => {
    const tree = (
      <VoyageRow row={row} testID="row" style={{ marginBottom: 12 }}>
        <Text>inside</Text>
      </VoyageRow>
    );
    const view = render(travel === null ? tree : <IslandVoyageProvider voyage={voyage(travel)}>{tree}</IslandVoyageProvider>);
    const found = view.UNSAFE_root.findAll((candidate) => candidate.props.testID === 'row');
    const node = found[found.length - 1];

    return { view, style: StyleSheet.flatten(node.props.style) };
  };

  it.each(Object.keys(VOYAGE_ROWS) as (keyof typeof VOYAGE_ROWS)[])('moves %s as the voyage says, part way out', (row) => {
    const { style } = rowStyle(row, 0.2);
    const pose = rowPose(0.2, VOYAGE_ROWS[row].order, VOYAGE_ROWS[row].exit, SCREEN.width, SCREEN.height);

    expect(style.opacity).toBe(pose.opacity);
    expect(style.transform).toEqual([{ translateX: pose.translateX }, { translateY: pose.translateY }]);
  });

  it('keeps the style it was given and draws what is inside it', () => {
    const { view, style } = rowStyle('journey', 0);

    expect(style.marginBottom).toBe(12);
    expect(view.UNSAFE_queryAllByType(Text).map((node) => node.props.children)).toContain('inside');
  });

  it('stays exactly where it is with no voyage above it, as on every screen test', () => {
    const { style } = rowStyle('journey', null);

    expect(style.opacity).toBe(1);
    expect(style.transform).toEqual([{ translateX: 0 }, { translateY: 0 }]);
  });
});

describe('useVoyageZoom', () => {
  beforeEach(() => {
    (useAnimatedStyle as jest.Mock).mockImplementation((build: () => object) => build());
  });

  afterEach(() => {
    (useAnimatedStyle as jest.Mock).mockImplementation(() => ({}));
  });

  const zoomAt = (travel: number) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <IslandVoyageProvider voyage={voyage(travel)}>{children}</IslandVoyageProvider>
    );

    return renderHook(() => useVoyageZoom(SCREEN.width, SCREEN.height), { wrapper }).result.current as unknown as {
      transform: Record<string, number>[];
    };
  };

  it.each([0, 0.5, 1])('grows the sky about the foot of the screen, where the earth is, at a travel of %p', (travel) => {
    const underTest = zoomAt(travel);

    expect(underTest.transform).toEqual([
      { translateY: SCREEN.height / 2 },
      { scale: zoomScale(travel, voyageMaxZoom(SCREEN.width, SCREEN.height)) },
      { translateY: -SCREEN.height / 2 },
    ]);
  });

  it('leaves the sky its own size at rest', () => {
    expect(zoomAt(0).transform[1]).toEqual({ scale: 1 });
  });
});
