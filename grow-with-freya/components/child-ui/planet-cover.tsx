import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { earthLayout } from '@/constants/earth';
import { headerSkyVeil } from '@/constants/night-palette';
import { useAccessibility } from '@/hooks/use-accessibility';
import { PinnedInSection } from './section-crossfade';
import { PlanetHeaderArtwork } from './planet-header-artwork';

export const PLANET_HEADER_ESTIMATE = { phone: 130, tablet: 190 } as const;

export function planetCoverHeight(headerHeight: number, screenWidth: number, screenHeight: number): number {
  return Math.max(headerHeight, earthLayout(screenWidth, screenHeight, 'top').cap);
}

export interface PlanetCoverLayout {
  coverHeight: number;
  onHeaderLayout: (event: LayoutChangeEvent) => void;
}

export function usePlanetCover(): PlanetCoverLayout {
  const { width, height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const { isTablet } = useAccessibility();
  const [measured, setMeasured] = useState<number | null>(null);
  const headerHeight = measured ?? top + (isTablet ? PLANET_HEADER_ESTIMATE.tablet : PLANET_HEADER_ESTIMATE.phone);

  const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    setMeasured(Math.round(event.nativeEvent.layout.height));
  }, []);

  return { coverHeight: planetCoverHeight(headerHeight, width, height), onHeaderLayout };
}

interface PlanetCoverProps {
  height: number;
  testID?: string;
}

export function PlanetCover({ height, testID = 'planet-cover' }: PlanetCoverProps) {
  const { height: screenHeight } = useWindowDimensions();
  const veil = useMemo(() => headerSkyVeil(height, screenHeight), [height, screenHeight]);

  return (
    <PinnedInSection testID={testID}>
      <LinearGradient
        testID={`${testID}-veil`}
        colors={veil.colours}
        locations={veil.locations}
        style={[styles.veil, { height }]}
      />
      <PlanetHeaderArtwork />
    </PinnedInSection>
  );
}

const styles = StyleSheet.create({
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
