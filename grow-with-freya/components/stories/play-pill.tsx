import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { Fonts } from '@/constants/theme';

export const PLAY_PILL_ART = {
  width: 2000,
  height: 667,
  left: 82,
  right: 1896,
  top: 126,
  bottom: 538,
} as const;

export const PLAY_SLIDE_MS = 320;
const INK = '#7F427E';
const HALO = 'rgba(255, 255, 255, 0.7)';
const PILL = require('@/assets/images/play-pill/play-pill.webp');
const TRIANGLE = 'M7 4.2 C7 2.6 8.7 1.6 10.1 2.4 L21.6 9.3 C22.9 10.1 22.9 11.9 21.6 12.7 L10.1 19.6 C8.7 20.4 7 19.4 7 17.8 Z';

export function playPillFrame(height: number) {
  const scale = height / (PLAY_PILL_ART.bottom - PLAY_PILL_ART.top);
  return {
    width: (PLAY_PILL_ART.right - PLAY_PILL_ART.left) * scale,
    art: {
      left: -PLAY_PILL_ART.left * scale,
      top: -PLAY_PILL_ART.top * scale,
      width: PLAY_PILL_ART.width * scale,
      height: PLAY_PILL_ART.height * scale,
    },
  };
}

export function playSlideIn(distance: number) {
  const easing = Easing.out(Easing.cubic);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: -distance }] },
      animations: {
        opacity: withTiming(1, { duration: PLAY_SLIDE_MS }),
        transform: [{ translateY: withTiming(0, { duration: PLAY_SLIDE_MS, easing }) }],
      },
    };
  };
}

export function playSlideOut(distance: number) {
  const easing = Easing.in(Easing.cubic);
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
      animations: {
        opacity: withTiming(0, { duration: PLAY_SLIDE_MS }),
        transform: [{ translateY: withTiming(-distance, { duration: PLAY_SLIDE_MS, easing }) }],
      },
    };
  };
}

function PlayIcon({ size }: { size: number }) {
  return (
    <View testID="play-pill-icon">
      <Svg width={size} height={size} viewBox="0 0 24 22">
        <Path d={TRIANGLE} fill="none" stroke={HALO} strokeWidth={3.5} strokeLinejoin="round" />
        <Path d={TRIANGLE} fill={INK} />
      </Svg>
    </View>
  );
}

interface PlayPillProps {
  label: string;
  height: number;
  slideFrom: number;
  reduceMotion: boolean;
  onPress: () => void;
  testID: string;
  style?: StyleProp<ViewStyle>;
}

export const PlayPill = memo(function PlayPill({ label, height, slideFrom, reduceMotion, onPress, testID, style }: PlayPillProps) {
  const frame = playPillFrame(height);
  const entering = useMemo(() => (reduceMotion ? undefined : playSlideIn(slideFrom)), [reduceMotion, slideFrom]);
  const exiting = useMemo(() => (reduceMotion ? undefined : playSlideOut(slideFrom)), [reduceMotion, slideFrom]);

  return (
    <Animated.View
      testID="play-pill"
      entering={entering}
      exiting={exiting}
      style={style}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={[styles.button, { width: frame.width, height }]}
      >
        <Image
          testID="play-pill-art"
          accessible={false}
          source={PILL}
          contentFit="fill"
          transition={0}
          style={{ position: 'absolute', ...frame.art }}
        />
        <View style={[styles.row, { gap: height * 0.14 }]}>
          <PlayIcon size={height * 0.46} />
          <Text testID="play-pill-label" allowFontScaling={false} style={[styles.label, { fontSize: height * 0.4 }]}>
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: INK,
  },
});
