import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { ACCENT_GOLD, SKY_GRADIENT_WORLD } from '@/constants/night-palette';
import { generateStarPositions } from '@/components/main-menu/utils';
import { earthCap } from '@/constants/earth';

const STAR_SEED = 47;

/** Clear of the globe's rim, so a star never sits on the atmosphere. */
const PLANET_MARGIN = 12;

export interface PlacedStar {
  id: number;
  left: number;
  top: number;
  opacity: number;
}

/**
 * The star field with nothing left over the planet.
 *
 * The globe hangs from the top of every journey page, and the generator that
 * scatters these knows nothing about it, so a good few landed on the
 * continents. Rather than dropping those -- which would thin the sky exactly
 * where it is widest -- each one is folded down into the clear sky below the
 * globe, keeping its horizontal place and the field's even spread.
 */
export function clearOfPlanet(
  stars: readonly PlacedStar[],
  capBottom: number,
  height: number,
): PlacedStar[] {
  const clearHeight = Math.max(1, height - capBottom);

  return stars.map((star) => {
    if (star.top >= capBottom) return star;
    const depth = capBottom <= 0 ? 0 : star.top / capBottom;
    return { ...star, top: capBottom + depth * clearHeight };
  });
}
const POINT_STAR_SIZE = 3;
const ACCENT_STAR_SIZE = 16;

interface CelestialBackgroundProps {
  starCount?: number;
  goldStarRatio?: number;
  accentStars?: number;
  children?: ReactNode;
}

function fourPointPath(size: number): string {
  const c = size / 2;
  const waist = size * 0.16;
  return [
    `M ${c} 0`,
    `Q ${c + waist} ${c - waist} ${size} ${c}`,
    `Q ${c + waist} ${c + waist} ${c} ${size}`,
    `Q ${c - waist} ${c + waist} 0 ${c}`,
    `Q ${c - waist} ${c - waist} ${c} 0`,
    'Z',
  ].join(' ');
}

const AccentStar = ({ left, top, opacity }: { left: number; top: number; opacity: number }) => (
  <View
    testID="celestial-star-accent"
    style={[styles.accentStar, { left, top, opacity }]}
    pointerEvents="none"
  >
    <Svg width={ACCENT_STAR_SIZE} height={ACCENT_STAR_SIZE} viewBox={`0 0 ${ACCENT_STAR_SIZE} ${ACCENT_STAR_SIZE}`}>
      <Path d={fourPointPath(ACCENT_STAR_SIZE)} fill={ACCENT_GOLD} opacity={0.92} />
    </Svg>
  </View>
);

export function CelestialBackground({
  // Three times the dots there were. The gold ratio drops each time to match,
  // so every star added is a plain white one and the handful of gold ones
  // stays the handful it started as.
  starCount = 84,
  goldStarRatio = 0.084,
  accentStars = 3,
  children,
}: CelestialBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(
    () => clearOfPlanet(
      generateStarPositions(starCount + accentStars, STAR_SEED),
      earthCap(width, height, 'top') + PLANET_MARGIN,
      height,
    ),
    [starCount, accentStars, width, height],
  );
  const goldEvery = goldStarRatio > 0 ? Math.max(2, Math.round(1 / goldStarRatio)) : 0;

  return (
    <LinearGradient colors={SKY_GRADIENT_WORLD} style={styles.fill}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="celestial-star-field">
        {stars.map((star, index) => {
          if (index >= starCount) {
            return <AccentStar key={star.id} left={star.left} top={star.top} opacity={star.opacity} />;
          }
          const isGold = goldEvery > 0 && index % goldEvery === goldEvery - 1;
          return (
            <View
              key={star.id}
              testID={isGold ? 'celestial-star-gold' : 'celestial-star'}
              style={[
                styles.pointStar,
                {
                  left: star.left,
                  top: star.top,
                  opacity: star.opacity,
                  backgroundColor: isGold ? ACCENT_GOLD : '#FFFFFF',
                },
              ]}
            />
          );
        })}
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  pointStar: {
    position: 'absolute',
    width: POINT_STAR_SIZE,
    height: POINT_STAR_SIZE,
    borderRadius: POINT_STAR_SIZE / 2,
  },
  accentStar: {
    position: 'absolute',
    shadowColor: ACCENT_GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
