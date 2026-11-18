import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { ROADMAP, roadmapArtFor, roadmapLayout, roadmapMirrors, roadmapStopFrame, roadmapTitleFrame, type ScreenRect } from '@/constants/roadmap';

export interface RoadmapSceneProps {
  controls: readonly ScreenRect[];
  titleStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  testID?: string;
}

export const RoadmapScene = memo(function RoadmapScene({ controls, titleStyle, testID = 'roadmap-scene' }: RoadmapSceneProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const art = roadmapArtFor(width, height);
  const layout = useMemo(
    () => roadmapLayout(art, { width, height, insets, controls }),
    [art, width, height, insets, controls]
  );
  const mirrors = useMemo(() => roadmapMirrors(layout, width, height), [layout, width, height]);
  const title = roadmapTitleFrame(art, layout);
  const titleBox = { left: title.left, top: title.top, width: title.width, height: title.height };
  const description = [
    t('roadmap.title'),
    t('roadmap.scene'),
    ...art.stops.map((stop) =>
      t('roadmap.stop', { quarter: `Q${stop.quarter} ${stop.year}`, place: t(`roadmap.stops.${stop.id}`) })
    ),
  ].join(' ');

  return (
    <View
      testID={testID}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible
      accessibilityRole="image"
      accessibilityLabel={description}
    >
      {mirrors.map((mirror) => (
        <Image
          key={mirror.key}
          testID={`roadmap-mirror-${mirror.key}`}
          source={art.picture}
          style={[
            styles.layer,
            {
              left: mirror.left,
              top: mirror.top,
              width: mirror.width,
              height: mirror.height,
              transform: [{ scaleX: mirror.flipX ? -1 : 1 }, { scaleY: mirror.flipY ? -1 : 1 }],
            },
          ]}
          contentFit="fill"
          transition={0}
        />
      ))}
      {mirrors.some((mirror) => mirror.key === 'top') ? (
        <LinearGradient
          testID="roadmap-sky-fade"
          colors={[art.sky, `${art.sky}00`]}
          style={[styles.skyFade, { height: layout.top }]}
          pointerEvents="none"
        />
      ) : null}
      <Image
        testID="roadmap-picture"
        source={art.picture}
        style={[styles.layer, { left: layout.left, top: layout.top, width: layout.width, height: layout.height }]}
        contentFit="fill"
        transition={0}
      />
      {art.stops.map((stop) => {
        const frame = roadmapStopFrame(stop, layout);

        return (
          <View
            key={stop.id}
            testID={`roadmap-stop-${stop.id}`}
            style={[styles.stop, { left: frame.left, top: frame.top, width: frame.width, height: frame.height }]}
          >
            <Text
              style={[styles.name, { fontSize: frame.fontSize }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={ROADMAP.minimumFontScale}
            >
              {t(`roadmap.stops.${stop.id}`)}
            </Text>
          </View>
        );
      })}
      <Animated.View testID="roadmap-title" style={[styles.stop, titleBox, titleStyle]}>
        <View style={styles.titleLine}>
          <Text
            testID="roadmap-title-shade"
            style={[styles.titleShade, { fontSize: title.fontSize }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={ROADMAP.minimumFontScale}
          >
            {t('roadmap.title')}
          </Text>
          <Text
            testID="roadmap-title-words"
            style={[styles.titleWords, { fontSize: title.fontSize }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={ROADMAP.minimumFontScale}
          >
            {t('roadmap.title')}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
  },
  skyFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  stop: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleLine: {
    alignSelf: 'stretch',
  },
  titleShade: {
    ...StyleSheet.absoluteFill,
    color: ROADMAP.titleShade,
    fontFamily: Fonts.serif,
    textAlign: 'center',
    textShadowColor: ROADMAP.titleShade,
    textShadowRadius: ROADMAP.titleShadeRadius,
    textShadowOffset: { width: 0, height: 1 },
  },
  titleWords: {
    color: ROADMAP.ink,
    fontFamily: Fonts.serif,
    textAlign: 'center',
    textShadowColor: ROADMAP.titleGlow,
    textShadowRadius: ROADMAP.titleGlowRadius,
    textShadowOffset: { width: 0, height: 0 },
  },
  name: {
    color: ROADMAP.ink,
    fontFamily: Fonts.serif,
    textAlign: 'center',
    textShadowColor: ROADMAP.glow,
    textShadowRadius: ROADMAP.glowRadius,
    textShadowOffset: { width: 0, height: 0 },
  },
});
