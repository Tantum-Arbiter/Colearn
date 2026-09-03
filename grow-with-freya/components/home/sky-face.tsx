import React, { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { SKY_FACE_RHYTHM } from '@/constants/sky-face';
import type { TimeOfDay } from '@/constants/home-scene';
import { useSkyFace } from '@/hooks/use-sky-face';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const SKY_FACE_ART = {
  day: {
    resting: require('../../assets/images/ui-elements/home-sun.webp'),
    laughing: require('../../assets/images/ui-elements/home-sun-laughing.webp'),
  },
  night: {
    resting: require('../../assets/images/ui-elements/home-moon.webp'),
    laughing: require('../../assets/images/ui-elements/home-moon-laughing.webp'),
  },
} as const;

export interface SkyFaceProps {
  size: number;
  timeOfDay: TimeOfDay;
  animated?: boolean;
  testID?: string;
}

export const SkyFace = memo(function SkyFace({
  size,
  timeOfDay,
  animated = true,
  testID = 'sky-face',
}: SkyFaceProps) {
  const { t } = useTranslation();
  const expression = useSkyFace({ enabled: animated });
  const laughOpacity = useSharedValue(0);
  const giggle = useSharedValue(0);

  useEffect(() => {
    const laughing = expression === 'laughing';
    laughOpacity.value = withTiming(laughing ? 1 : 0, {
      duration: SKY_FACE_RHYTHM.crossFadeMs,
      easing: Easing.inOut(Easing.quad),
    });
    if (!laughing) {
      giggle.value = withTiming(0, { duration: SKY_FACE_RHYTHM.crossFadeMs, easing: Easing.out(Easing.quad) });
      return;
    }
    const beat = SKY_FACE_RHYTHM.laughMs / 5;
    const sway = Easing.inOut(Easing.sin);
    giggle.value = withSequence(
      withTiming(1, { duration: beat, easing: sway }),
      withTiming(-1, { duration: beat, easing: sway }),
      withTiming(0.6, { duration: beat, easing: sway }),
      withTiming(-0.4, { duration: beat, easing: sway }),
      withTiming(0, { duration: beat, easing: sway })
    );
  }, [expression, laughOpacity, giggle]);

  const laughStyle = useAnimatedStyle(() => ({ opacity: laughOpacity.value }));
  const giggleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${giggle.value * SKY_FACE_RHYTHM.giggleDegrees}deg` }],
  }));

  const art = SKY_FACE_ART[timeOfDay];
  const dimensions = { width: size, height: size };

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={t(timeOfDay === 'day' ? 'home.sun' : 'home.moon')}
      style={[dimensions, giggleStyle]}
    >
      <Image
        testID="sky-face-resting"
        source={art.resting}
        style={[styles.layer, dimensions]}
        contentFit="contain"
        transition={0}
      />

      <AnimatedImage
        testID="sky-face-laughing"
        source={art.laughing}
        style={[styles.layer, dimensions, laughStyle]}
        contentFit="contain"
        transition={0}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
