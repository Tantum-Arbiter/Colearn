import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import type { ReactTestInstance } from 'react-test-renderer';
import { VOYAGE_LAYER_Z, VoyageLayer } from '@/components/island/voyage-layer';
import { JOURNEY_BAR_LAYER_Z } from '@/components/child-ui/journey-bar-slot';
import { IslandVoyageProvider, type IslandVoyage } from '@/contexts/island-voyage-context';
import { CLOUD_PUFFS, VOYAGE_COVER, fogOpacity, puffPose, type VoyagePhase } from '@/constants/island-voyage';

const SCREEN = { width: 390, height: 844 };

function voyage(overrides: Partial<IslandVoyage> = {}): IslandVoyage {
  return {
    phase: 'leaving',
    travel: { value: 0 },
    clouds: { value: 0 },
    arrival: { value: 0 },
    reduceMotion: false,
    depart: jest.fn(),
    comeBack: jest.fn(),
    islandReady: jest.fn(),
    settleHome: jest.fn(),
    ...overrides,
  } as unknown as IslandVoyage;
}

function renderLayer(given: IslandVoyage) {
  const view = render(
    <IslandVoyageProvider voyage={given}>
      <VoyageLayer />
    </IslandVoyageProvider>
  );
  return { ...view, root: view.UNSAFE_root };
}

function withTestId(root: ReactTestInstance, testID: string): ReactTestInstance[] {
  return root.findAll((node) => node.props.testID === testID && node.parent?.props.testID !== testID);
}

function measureTheScreen() {
  Object.defineProperty(document.documentElement, 'clientWidth', { value: SCREEN.width, configurable: true });
  Object.defineProperty(document.documentElement, 'clientHeight', { value: SCREEN.height, configurable: true });
  window.dispatchEvent(new Event('resize'));
}

describe('VoyageLayer', () => {
  beforeEach(() => {
    measureTheScreen();
    (useAnimatedStyle as jest.Mock).mockImplementation((build: () => object) => build());
  });

  afterEach(() => {
    (useAnimatedStyle as jest.Mock).mockImplementation(() => ({}));
  });

  it.each(['home', 'island'] as VoyagePhase[])('draws nothing at all while resting at %s', (phase) => {
    const { root } = renderLayer(voyage({ phase }));

    expect(withTestId(root, 'voyage-layer')).toHaveLength(0);
    expect(withTestId(root, 'voyage-fog')).toHaveLength(0);
  });

  it.each(['leaving', 'crossing', 'arriving', 'returning', 'recrossing', 'landing'] as VoyagePhase[])(
    'lies over everything and takes every touch while %s',
    (phase) => {
      const { root } = renderLayer(voyage({ phase }));

      const layer = withTestId(root, 'voyage-layer')[0];
      const style = StyleSheet.flatten(layer.props.style);

      expect(layer.props.pointerEvents).toBe('auto');
      expect(style.position).toBe('absolute');
      expect([style.top, style.right, style.bottom, style.left]).toEqual([0, 0, 0, 0]);
      expect(style.zIndex).toBe(VOYAGE_LAYER_Z);
    }
  );

  it('sits above the bar at the foot of the screen', () => {
    expect(VOYAGE_LAYER_Z).toBeGreaterThan(JOURNEY_BAR_LAYER_Z);
  });

  it('is kept from a screen reader, being weather and nothing else', () => {
    const { root } = renderLayer(voyage());

    const layer = withTestId(root, 'voyage-layer')[0];

    expect(layer.props.accessibilityElementsHidden).toBe(true);
    expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it.each([0, 0.7, 1, 1.4])('fogs the screen as thickly as the cloud says, at %p', (clouds) => {
    const { root } = renderLayer(voyage({ clouds: { value: clouds } } as Partial<IslandVoyage>));

    const fog = StyleSheet.flatten(withTestId(root, 'voyage-fog')[0].props.style);

    expect(fog.opacity).toBe(fogOpacity(clouds));
    expect(fog.backgroundColor).toBe(VOYAGE_COVER);
  });

  it('flies every cloud where the cloud says it should be', () => {
    const { root } = renderLayer(voyage({ clouds: { value: 0.8 } } as Partial<IslandVoyage>));

    const puffs = withTestId(root, 'voyage-cloud');

    expect(puffs).toHaveLength(CLOUD_PUFFS.length);
    puffs.forEach((puff, index) => {
      const style = StyleSheet.flatten(puff.props.style);
      const pose = puffPose(0.8, index, SCREEN.width, SCREEN.height);

      expect(style.opacity).toBe(pose.opacity);
      expect(style.transform).toEqual([
        { translateX: pose.translateX },
        { translateY: pose.translateY },
        { scale: pose.scale },
      ]);
    });
  });

  it('starts every cloud from the middle of the screen', () => {
    const { root } = renderLayer(voyage());

    withTestId(root, 'voyage-cloud').forEach((puff) => {
      const style = StyleSheet.flatten(puff.props.style);

      expect(style.left + style.width / 2).toBeCloseTo(SCREEN.width / 2, 5);
      expect(style.top + style.height / 2).toBeCloseTo(SCREEN.height / 2, 5);
    });
  });

  it('is a plain fade, with no clouds flying, for someone who has asked for less motion', () => {
    const { root } = renderLayer(voyage({ reduceMotion: true, clouds: { value: 1 } } as Partial<IslandVoyage>));

    expect(withTestId(root, 'voyage-cloud')).toHaveLength(0);
    expect(StyleSheet.flatten(withTestId(root, 'voyage-fog')[0].props.style).opacity).toBe(1);
  });
});
