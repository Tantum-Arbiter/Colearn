import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { PROGRESS_GRADIENT, PROGRESS_TRACK } from './onboarding-theme';

export const ONBOARDING_PROGRESS_FILL_MS = 700;
export const ONBOARDING_PROGRESS_SHEEN_MS = 900;

const BAR_HEIGHT = 6;
const SHEEN_WIDTH = 36;
const SHEEN_DELAY_MS = 180;
const SHEEN_PEAK_OPACITY = 0.7;

export function onboardingProgressFraction(currentStep: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return Math.min(1, Math.max(0, currentStep / totalSteps));
}

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgressBar({ currentStep, totalSteps }: OnboardingProgressBarProps) {
  const reduceMotion = useReducedMotion();
  const fraction = onboardingProgressFraction(currentStep, totalSteps);
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);
  const sheen = useSharedValue(0);
  const previousFraction = useRef(0);

  useEffect(() => {
    const grew = fraction > previousFraction.current;
    previousFraction.current = fraction;

    if (reduceMotion) {
      progress.value = fraction;
      sheen.value = 0;
      return;
    }

    progress.value = withTiming(fraction, {
      duration: ONBOARDING_PROGRESS_FILL_MS,
      easing: Easing.out(Easing.cubic),
    });
    if (grew) {
      sheen.value = 0;
      sheen.value = withDelay(
        SHEEN_DELAY_MS,
        withTiming(1, { duration: ONBOARDING_PROGRESS_SHEEN_MS, easing: Easing.inOut(Easing.quad) })
      );
    }
  }, [fraction, reduceMotion, progress, sheen]);

  const handleTrackLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    setTrackWidth((current) => (current === measured ? current : measured));
  }, []);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth * progress.value,
  }));

  const sheenStyle = useAnimatedStyle(() => {
    const phase = sheen.value;
    const travel = trackWidth * progress.value + SHEEN_WIDTH;
    return {
      opacity: phase > 0 && phase < 1 ? Math.sin(Math.PI * phase) * SHEEN_PEAK_OPACITY : 0,
      transform: [{ translateX: phase * travel - SHEEN_WIDTH }],
    };
  });

  return (
    <View
      testID="onboarding-progress-bar"
      style={styles.bar}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: totalSteps, now: currentStep }}
    >
      <View testID="onboarding-progress-track" style={styles.track} onLayout={handleTrackLayout}>
        <Animated.View testID="onboarding-progress-fill" style={[styles.fill, fillStyle]}>
          <View style={styles.fillClip}>
            <LinearGradient
              testID="onboarding-progress-gradient"
              colors={PROGRESS_GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.gradient, { width: trackWidth }]}
            />
            <Animated.View testID="onboarding-progress-sheen" style={[styles.sheen, sheenStyle]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flex: 1,
    maxWidth: 220,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  track: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: PROGRESS_TRACK,
  },
  fill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: PROGRESS_GRADIENT[0],
    shadowColor: PROGRESS_GRADIENT[1],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
  },
  fillClip: {
    flex: 1,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SHEEN_WIDTH,
  },
});
