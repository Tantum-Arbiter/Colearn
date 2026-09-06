import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { HOME_CARDS, HOME_CARD_TINTS, HOME_JOURNEY_MOTION } from '@/constants/home-journey';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function useArrowNudge() {
  const nudge = useSharedValue(0);

  const play = useCallback(() => {
    nudge.value = withSequence(
      withTiming(1, { duration: HOME_JOURNEY_MOTION.arrowNudgeMs, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: HOME_JOURNEY_MOTION.arrowNudgeMs * 1.6, easing: Easing.inOut(Easing.quad) })
    );
  }, [nudge]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: HOME_JOURNEY_MOTION.arrowNudge * nudge.value }],
  }));

  return { play, style };
}

export interface HomeCardProps {
  width: number;
  onPress: () => void;
  onPressed?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  emphasis?: boolean;
  children: React.ReactNode;
  testID?: string;
}

export const HomeCard = memo(function HomeCard({
  width,
  onPress,
  onPressed,
  accessibilityLabel,
  accessibilityHint,
  emphasis = false,
  children,
  testID = 'home-card',
}: HomeCardProps) {
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: HOME_JOURNEY_MOTION.pressInMs, easing: Easing.out(Easing.quad) });
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: HOME_JOURNEY_MOTION.pressOutMs, easing: Easing.out(Easing.back(1.6)) });
  }, [pressed]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressed?.();
    onPress();
  }, [onPress, onPressed]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - HOME_JOURNEY_MOTION.pressScale) * pressed.value }],
  }));

  const radius = HOME_CARDS.radius;

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[styles.card, { width, borderRadius: radius }, emphasis ? styles.emphasis : null, pressStyle]}
    >
      {emphasis ? <View testID={`${testID}-glow`} style={[styles.glow, { borderRadius: radius + 6 }]} pointerEvents="none" /> : null}

      <View
        style={[
          styles.surface,
          { borderRadius: radius, borderColor: emphasis ? HOME_CARD_TINTS.primaryEdge : HOME_CARD_TINTS.cardEdge },
        ]}
      >
        <LinearGradient
          colors={
            emphasis
              ? [HOME_CARD_TINTS.primaryTop, HOME_CARD_TINTS.primaryBottom]
              : [HOME_CARD_TINTS.cardTop, HOME_CARD_TINTS.cardBottom]
          }
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[HOME_CARD_TINTS.cardGloss, 'transparent']}
          style={styles.gloss}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', HOME_CARD_TINTS.cardHairline, HOME_CARD_TINTS.cardHairline, 'transparent']}
          locations={[0, 0.2, 0.8, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.hairline, { left: radius * 0.5, right: radius * 0.5 }]}
          pointerEvents="none"
        />
        {children}
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'visible',
  },
  emphasis: {
    shadowColor: '#8CA0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 8,
  },
  glow: {
    position: 'absolute',
    left: -6,
    right: -6,
    top: -6,
    bottom: -6,
    backgroundColor: HOME_CARD_TINTS.primaryGlow,
    opacity: 0.35,
  },
  surface: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  gloss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 60,
  },
  hairline: {
    position: 'absolute',
    top: 1,
    height: 1,
  },
});
