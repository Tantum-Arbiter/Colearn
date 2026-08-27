import React, { memo, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ScreenTimeDial } from './screen-time-dial';
import {
  SCREEN_TIME_RING,
  isScreenTimeExceeded,
  screenTimeProgress,
} from '@/constants/screen-time-ring';

export interface ScreenTimeRingProps {
  usageSeconds: number;
  limitSeconds: number;
  tint?: string;
  onPress?: () => void;
  /** True while the glance is open. The ring steps aside for the orb that
   *  rises in its place -- left visible it sat beneath the choreography as a
   *  second red dot that never moved. */
  hidden?: boolean;
  testID?: string;
}

export const ScreenTimeRing = memo(function ScreenTimeRing({
  usageSeconds,
  limitSeconds,
  tint = '#FFFFFF',
  onPress,
  hidden = false,
  testID = 'screen-time-ring',
}: ScreenTimeRingProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const presence = useSharedValue(hidden ? 0 : 1);

  useEffect(() => {
    // Both directions ramp, over the window the glance's orb ramps against.
    // Handing the corner back on a single frame is a race between two things
    // nothing orders -- this view's opacity and the teardown of the modal the
    // orb sits in -- and it resolves as either a frame with neither on screen
    // or a frame with both, which is brighter rather than identical because
    // everything here is translucent. A complementary dissolve has no frame
    // that can go either way.
    presence.value = withTiming(hidden ? 0 : 1, {
      duration: SCREEN_TIME_RING.presenceFade,
    });
  }, [hidden, presence]);

  const exceeded = isScreenTimeExceeded(usageSeconds, limitSeconds);

  useEffect(() => {
    if (hidden || !exceeded || reduceMotion) {
      cancelAnimation(pulse);
      // instant while hidden: there is nothing on screen to see it settle,
      // and it has to be back at rest before the corner is handed back
      pulse.value = hidden ? 1 : withTiming(1, { duration: 200 });
      return;
    }

    pulse.value = withDelay(
      SCREEN_TIME_RING.pulseSettle,
      withRepeat(
        withSequence(
          withTiming(SCREEN_TIME_RING.pulseScale, {
            duration: SCREEN_TIME_RING.pulseDuration,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, {
            duration: SCREEN_TIME_RING.pulseDuration,
            easing: Easing.inOut(Easing.quad),
          })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(pulse);
    };
  }, [hidden, exceeded, reduceMotion, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: presence.value,
    transform: [{ scale: pulse.value }],
  }));

  if (limitSeconds <= 0) {
    return null;
  }

  const size = SCREEN_TIME_RING.size;
  const stroke = SCREEN_TIME_RING.strokeWidth;
  const radius = (size - stroke) / 2;
  const centre = size / 2;
  const progress = screenTimeProgress(usageSeconds, limitSeconds);

  const label = t(exceeded ? 'home.screenTimeExceeded' : 'home.screenTimeRemaining');

  const dial = (
    <Animated.View style={[styles.root, animatedStyle]}>
      {exceeded ? (
        <View
          style={[
            styles.halo,
            {
              width: size * SCREEN_TIME_RING.haloScale,
              height: size * SCREEN_TIME_RING.haloScale,
              borderRadius: (size * SCREEN_TIME_RING.haloScale) / 2,
              backgroundColor: SCREEN_TIME_RING.exceededHalo,
            },
          ]}
        />
      ) : null}

      <Svg width={size} height={size}>
        {exceeded ? (
          <>
            <Circle
              cx={centre}
              cy={centre}
              r={radius}
              stroke={SCREEN_TIME_RING.exceededColour}
              strokeWidth={stroke}
              fill="none"
            />

            <Circle
              testID="screen-time-ring-fill"
              cx={centre}
              cy={centre}
              r={radius - stroke / 2}
              fill={SCREEN_TIME_RING.exceededColour}
            />
          </>
        ) : (
          <ScreenTimeDial cx={centre} cy={centre} tint={tint} progress={progress} testID={testID} />
        )}
      </Svg>
    </Animated.View>
  );

  if (!onPress) {
    return (
      <View testID={testID} accessibilityRole="image" accessibilityLabel={label}>
        {dial}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('home.screenTimeOpen')}
      hitSlop={SCREEN_TIME_RING.hitSlop}
      onPress={onPress}
      disabled={hidden}
    >
      {dial}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
  },
});
