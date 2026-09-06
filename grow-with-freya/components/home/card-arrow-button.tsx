import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { HERO_CARD } from '@/constants/home-sky';

export interface CardArrowButtonProps {
  size: number;
  pressed: boolean;
  testID?: string;
}

export const CardArrowButton = memo(function CardArrowButton({ size, pressed, testID = 'card-arrow' }: CardArrowButtonProps) {
  const press = useSharedValue(0);
  const glowSize = Math.round(size * 1.7);
  const glowOffset = -(glowSize - size) / 2;
  const glyph = Math.round(size * 0.42);
  const stroke = Math.max(2.5, size * 0.065);
  const half = glyph / 2;
  const head = glyph * 0.36;

  useEffect(() => {
    press.value = pressed
      ? withTiming(1, { duration: HERO_CARD.pressInMs, easing: Easing.out(Easing.quad) })
      : withTiming(0, { duration: HERO_CARD.pressOutMs * 1.3, easing: Easing.out(Easing.back(2.2)) });
  }, [pressed, press]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - HERO_CARD.arrowPressScale) * press.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: HERO_CARD.arrowGlowRest + (HERO_CARD.arrowGlowPressed - HERO_CARD.arrowGlowRest) * press.value,
  }));

  return (
    <Animated.View testID={`${testID}-button`} style={[{ width: size, height: size }, scaleStyle]}>
      <Animated.View
        testID={`${testID}-glow`}
        style={[styles.glow, { left: glowOffset, top: glowOffset, width: glowSize, height: glowSize }, glowStyle]}
        pointerEvents="none"
      >
        <Svg width={glowSize} height={glowSize}>
          <Defs>
            <RadialGradient id="card-arrow-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0.3" stopColor={HERO_CARD.arrowGlow} />
              <Stop offset="1" stopColor={HERO_CARD.arrowGlow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glowSize / 2} cy={glowSize / 2} r={glowSize / 2} fill="url(#card-arrow-glow)" />
        </Svg>
      </Animated.View>
      <LinearGradient
        testID={`${testID}-disc`}
        colors={[HERO_CARD.arrowTop, HERO_CARD.arrowBottom]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <View testID={`${testID}-highlight`} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={size} height={size}>
            <Defs>
              <RadialGradient id="card-arrow-highlight" cx="50%" cy="35%" rx="50%" ry="45%">
                <Stop offset="0" stopColor={HERO_CARD.arrowHighlight} stopOpacity={0.55} />
                <Stop offset="1" stopColor={HERO_CARD.arrowHighlight} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={size / 2} cy={size * 0.3} rx={size * 0.34} ry={size * 0.24} fill="url(#card-arrow-highlight)" />
          </Svg>
        </View>
        <View testID={`${testID}-glyph`} style={styles.glyph}>
          <Svg width={glyph} height={glyph} viewBox={`${-half} ${-half} ${glyph} ${glyph}`}>
            <Path
              d={`M ${-half + stroke / 2} 0 H ${half - stroke / 2} M ${half - stroke / 2 - head} ${-head} L ${half - stroke / 2} 0 L ${half - stroke / 2 - head} ${head}`}
              stroke={HERO_CARD.arrowInk}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#3A2400',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 5,
  },
  glyph: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
