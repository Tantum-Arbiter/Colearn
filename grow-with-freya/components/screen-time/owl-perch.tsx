import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  OWL_PERCH,
  OWL_RHYTHM,
  owlPerchFrame,
  type OwlPhase,
  type OwlWingSide,
} from '@/constants/owl-companion';
import { OwlSprite } from './owl-sprite';

export interface OwlPerchProps {
  phase: OwlPhase;
  owlWidth: number;
  sayCount?: number;
  pointing?: boolean;
  wingSide?: OwlWingSide;
  onPhaseEnd?: (phase: OwlPhase) => void;
  accessibilityLabel?: string;
  testID?: string;
}

const glideIn = Easing.out(Easing.cubic);
const glideOut = Easing.in(Easing.quad);
const sway = Easing.inOut(Easing.sin);

export const OwlPerch = memo(function OwlPerch({
  phase,
  owlWidth,
  sayCount = 0,
  pointing = false,
  wingSide = 'right',
  onPhaseEnd,
  accessibilityLabel,
  testID = 'owl-perch',
}: OwlPerchProps) {
  const reduceMotion = useReducedMotion();
  const frame = useMemo(() => owlPerchFrame(owlWidth), [owlWidth]);
  const slide = useSharedValue(phase === 'arrive' ? frame.slideFrom : 0);
  const presence = useSharedValue(phase === 'arrive' ? 0 : 1);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      slide.value = 0;
      if (phase === 'arrive') {
        presence.value = withTiming(1, { duration: OWL_RHYTHM.reducedFadeMs });
      } else if (phase === 'leave' || phase === 'delight') {
        presence.value = withTiming(0, { duration: OWL_RHYTHM.reducedFadeMs });
      }
      return;
    }

    presence.value = 1;
    if (phase === 'arrive') {
      slide.value = frame.slideFrom;
      slide.value = withTiming(0, { duration: OWL_RHYTHM.arriveMs, easing: glideIn });
    } else if (phase === 'leave') {
      slide.value = withTiming(frame.slideFrom, { duration: OWL_RHYTHM.leaveMs, easing: glideOut });
    } else if (phase === 'delight') {
      slide.value = withDelay(
        OWL_RHYTHM.delightMs - OWL_RHYTHM.delightFadeMs,
        withTiming(frame.slideFrom, { duration: OWL_RHYTHM.delightFadeMs, easing: glideOut })
      );
    }
  }, [phase, reduceMotion, frame.slideFrom, slide, presence]);

  useEffect(() => {
    if (reduceMotion) {
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: OWL_PERCH.driftMs / 2, easing: sway }),
        withTiming(-1, { duration: OWL_PERCH.driftMs / 2, easing: sway })
      ),
      -1,
      false
    );
    return () => cancelAnimation(drift);
  }, [drift, reduceMotion]);

  const perchStyle = useAnimatedStyle(() => ({
    opacity: presence.value,
    transform: [{ translateX: slide.value }],
  }));

  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value * OWL_PERCH.driftPixels }],
  }));

  return (
    <Animated.View
      testID={testID}
      style={[styles.perch, { width: frame.width, height: frame.height }, perchStyle]}
      pointerEvents="none"
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    >
      <View testID="owl-perch-ledge" style={[styles.box, boxStyle(frame.ledge)]}>
        <Image source={OWL_PERCH.ledge} style={styles.fill} contentFit="fill" transition={0} />
      </View>

      <View testID="owl-perch-owl" style={[styles.box, boxStyle(frame.owl)]}>
        <OwlSprite
          testID="owl-perch-sprite"
          phase={phase}
          sayCount={sayCount}
          pointing={pointing}
          wingSide={wingSide}
          approach="none"
          width={owlWidth}
          onPhaseEnd={onPhaseEnd}
        />
      </View>

      <Animated.View testID="owl-perch-cloud" style={[styles.box, boxStyle(frame.cloud), cloudStyle]}>
        <Image source={OWL_PERCH.cloud} style={[styles.fill, styles.cloud]} contentFit="fill" transition={0} />
      </Animated.View>
    </Animated.View>
  );
});

function boxStyle(box: { left: number; bottom: number; width: number; height: number }) {
  return { left: box.left, bottom: box.bottom, width: box.width, height: box.height };
}

const styles = StyleSheet.create({
  perch: {
    overflow: 'visible',
  },
  box: {
    position: 'absolute',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  cloud: {
    opacity: 0.85,
  },
});
