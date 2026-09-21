import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { HERO_CARD } from '@/constants/home-sky';

export interface CardArrowButtonProps {
  size: number;
  pressed: boolean;
  testID?: string;
}

export const CardArrowButton = memo(function CardArrowButton({ size, pressed, testID = 'card-arrow' }: CardArrowButtonProps) {
  const press = useSharedValue(0);
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

  return (
    <Animated.View testID={`${testID}-button`} style={[{ width: size, height: size }, scaleStyle]}>
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
