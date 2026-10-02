import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CircleActionButton } from '@/components/child-ui/circle-action-button';
import {
  CIRCLE_BUTTON_DIAMETER_PHONE,
  CIRCLE_BUTTON_DIAMETER_TABLET,
  contentMargin,
  journeyHeaderTop,
} from '@/components/child-ui/tokens';
import { HeroSunContainer } from '@/components/home/hero-sun-container';
import { heroMotionMode } from '@/constants/home-sky';
import type { TimeOfDay } from '@/constants/home-scene';
import { ISLAND_ART } from '@/constants/island-art';
import { ISLAND_NIGHT, ISLAND_SKY, islandLayout } from '@/constants/island-scene';
import { chromeOpacity, islandScale, sunRise } from '@/constants/island-voyage';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { useIslandVoyage } from '@/contexts/island-voyage-context';
import { useIslandClocks } from '@/hooks/use-island-clocks';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import { BillowingCloud, DriftingCloud } from './island-clouds';
import { IslandWaterfalls } from './island-falls';
import { IslandGulls } from './island-gulls';
import { IslandLights } from './island-lights';
import { SwayingTree } from './island-trees';
import { IslandWater } from './island-water';
import { MoonlitImage } from './moonlit-image';

export interface IslandSceneProps {
  isActive?: boolean;
  timeOfDay?: TimeOfDay;
  testID?: string;
}

export const IslandScene = memo(function IslandScene({
  isActive = true,
  timeOfDay,
  testID = 'island-scene',
}: IslandSceneProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isTablet } = useAccessibility();
  const { phase, arrival, islandReady, comeBack } = useIslandVoyage();
  const { isMuted, toggleMute } = useGlobalSound();
  const clockTimeOfDay = useTimeOfDay();
  const reduceMotion = useReducedMotion();
  const settled = useSettledAfterTransition(isActive);
  const [loaded, setLoaded] = useState(false);
  const clocks = useIslandClocks(settled && !reduceMotion);

  const time = timeOfDay ?? clockTimeOfDay;
  const night = time === 'night';
  const layout = useMemo(() => islandLayout({ width, height, topInset: insets.top }), [width, height, insets.top]);
  const riseFrom = layout.riseFrom;

  useEffect(() => {
    if (loaded && phase === 'crossing') islandReady();
  }, [loaded, phase, islandReady]);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleSound = useCallback(() => {
    void toggleMute();
  }, [toggleMute]);
  const margin = contentMargin(isTablet);

  const stage = useAnimatedStyle(() => ({ transform: [{ scale: islandScale(arrival.value) }] }));
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: sunRise(arrival.value, riseFrom) }] }));
  const chrome = useAnimatedStyle(() => ({ opacity: chromeOpacity(arrival.value) }));

  return (
    <View testID={testID} style={[styles.root, { backgroundColor: night ? ISLAND_NIGHT.tint : ISLAND_SKY }]}>
      <Animated.View testID="island-stage" style={[styles.fill, stage]}>
        <Image
          testID="island-picture"
          source={ISLAND_ART.picture}
          style={[styles.layer, layout.picture]}
          contentFit="fill"
          transition={0}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('island.scene')}
          onLoad={handleLoad}
        />

        <IslandWater layout={layout} ripple={clocks.ripple} />
        <IslandWaterfalls layout={layout} clock={clocks.fall} />
        {ISLAND_ART.lowTrees.map((tree, index) => (
          <SwayingTree key={tree.id} tree={tree} layout={layout} wind={clocks.wind} index={index} />
        ))}
        {ISLAND_ART.farClouds.map((cloud) => (
          <DriftingCloud key={cloud.id} cloud={cloud} layout={layout} tide={clocks.tide} />
        ))}
        {ISLAND_ART.billows.map((billow, index) => (
          <BillowingCloud key={billow.id} billow={billow} layout={layout} tide={clocks.tide} index={index} />
        ))}

        {night ? (
          <View
            testID="island-night"
            pointerEvents="none"
            style={[styles.layer, layout.picture, { backgroundColor: ISLAND_NIGHT.tint, opacity: ISLAND_NIGHT.strength }]}
          />
        ) : null}

        <View
          testID="island-sun-clip"
          pointerEvents="box-none"
          style={[styles.clip, { width, height: layout.clipHeight }]}
        >
          <Animated.View testID="island-sun-rise" pointerEvents="box-none" style={[styles.fill, rise]}>
            <HeroSunContainer
              sun={layout.sun}
              timeOfDay={time}
              mode={heroMotionMode(settled, reduceMotion)}
              animated={isActive}
            />
          </Animated.View>
        </View>

        {ISLAND_ART.nearClouds.map((cloud) => (
          <DriftingCloud key={cloud.id} cloud={cloud} layout={layout} tide={clocks.tide} night={night} />
        ))}
        <MoonlitImage testID="island-horizon" source={ISLAND_ART.horizon} frame={layout.band} night={night} />
        {ISLAND_ART.horizonTrees.map((tree, index) => (
          <SwayingTree
            key={tree.id}
            tree={tree}
            layout={layout}
            wind={clocks.wind}
            index={ISLAND_ART.lowTrees.length + index}
            night={night}
          />
        ))}
        {night ? (
          <IslandLights layout={layout} lamp={clocks.lamp} />
        ) : (
          <IslandGulls layout={layout} sky={clocks.sky} beat={clocks.beat} />
        )}
      </Animated.View>

      <Animated.View
        testID="island-chrome"
        style={[
          styles.chrome,
          {
            top: journeyHeaderTop(insets.top, isTablet),
            left: margin,
            right: margin,
            height: isTablet ? CIRCLE_BUTTON_DIAMETER_TABLET : CIRCLE_BUTTON_DIAMETER_PHONE,
          },
          chrome,
        ]}
      >
        <CircleActionButton
          type="home"
          testID="island-home-button"
          label={t('common.home')}
          onPress={comeBack}
          accessibilityLabel={t('common.home')}
        />
        <CircleActionButton
          type="audio"
          testID="island-sound-button"
          muted={isMuted}
          onPress={handleSound}
          accessibilityLabel={t('catalogue.sound')}
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  layer: {
    position: 'absolute',
  },
  clip: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  chrome: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
