import React, { memo, useCallback, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  FeGaussianBlur,
  Filter,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { HERO_CARD } from '@/constants/home-sky';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const HERO_CARD_FILL = [HERO_CARD.fillTop, HERO_CARD.fillBottom] as const;

interface CardGlowLayerProps {
  width: number;
  height: number | null;
  radius: number;
  testID: string;
}

const CardGlowLayer = memo(function CardGlowLayer({ width, height, radius, testID }: CardGlowLayerProps) {
  const spread = HERO_CARD.bloomSpread;

  if (height === null) {
    return <View testID={testID} style={styles.glow} pointerEvents="none" />;
  }

  const canvasWidth = width + spread * 2;
  const canvasHeight = height + spread * 2;

  return (
    <View testID={testID} style={[styles.glow, { left: -spread, top: -spread, width: canvasWidth, height: canvasHeight }]} pointerEvents="none">
      <Svg width={canvasWidth} height={canvasHeight}>
        <Defs>
          <Filter id="hero-card-bloom" x="-20%" y="-30%" width="140%" height="160%">
            <FeGaussianBlur stdDeviation={HERO_CARD.bloomBlur} />
          </Filter>
          <SvgLinearGradient id="hero-card-bloom-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={HERO_CARD.bloomTop} />
            <Stop offset="1" stopColor={HERO_CARD.bloomBottom} />
          </SvgLinearGradient>
        </Defs>
        <Rect
          x={spread - 3}
          y={spread - 3}
          width={width + 6}
          height={height + 6}
          rx={radius + 3}
          fill="url(#hero-card-bloom-fill)"
          filter="url(#hero-card-bloom)"
        />
      </Svg>
    </View>
  );
});

export interface HeroCardFrameProps {
  width: number;
  onPress: () => void;
  onPressed?: () => void;
  onPressStateChange?: (pressed: boolean) => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  fill?: readonly [string, string];
  backdrop?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}

export const HeroCardFrame = memo(function HeroCardFrame({
  width,
  onPress,
  onPressed,
  onPressStateChange,
  accessibilityLabel,
  accessibilityHint,
  fill = HERO_CARD_FILL,
  backdrop,
  children,
  testID = 'hero-card',
}: HeroCardFrameProps) {
  const pressed = useSharedValue(0);
  const [height, setHeight] = useState<number | null>(null);
  const radius = HERO_CARD.radius;
  const innerRadius = radius - HERO_CARD.strokeWidth;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: HERO_CARD.pressInMs, easing: Easing.out(Easing.quad) });
    onPressStateChange?.(true);
  }, [pressed, onPressStateChange]);

  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: HERO_CARD.pressOutMs, easing: Easing.out(Easing.back(1.6)) });
    onPressStateChange?.(false);
  }, [pressed, onPressStateChange]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressed?.();
    onPress();
  }, [onPress, onPressed]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - HERO_CARD.pressScale) * pressed.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onLayout={handleLayout}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[styles.card, { width }, pressStyle]}
    >
      <CardGlowLayer width={width} height={height} radius={radius} testID={`${testID}-glow`} />

      <View style={[styles.depth, { borderRadius: radius }]}>
        <LinearGradient
          testID={`${testID}-border`}
          colors={[HERO_CARD.strokeTop, HERO_CARD.strokeSide, HERO_CARD.strokeBottom]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.border, { borderRadius: radius, padding: HERO_CARD.strokeWidth }]}
        >
          <View style={[styles.surface, { borderRadius: innerRadius }]}>
            <LinearGradient
              testID={`${testID}-surface`}
              colors={[fill[0], fill[1]]}
              style={StyleSheet.absoluteFill}
            />
            {backdrop}
            <LinearGradient
              testID={`${testID}-sheen`}
              colors={[HERO_CARD.sheen, 'transparent']}
              style={styles.sheen}
              pointerEvents="none"
            />
            <LinearGradient
              colors={[HERO_CARD.hairlineLeft, HERO_CARD.hairlineRight, 'transparent']}
              locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.hairline, { left: radius * 0.6, right: radius * 0.6 }]}
              pointerEvents="none"
            />
            <View
              testID={`${testID}-inner-highlight`}
              style={[styles.innerHighlight, { borderRadius: innerRadius }]}
              pointerEvents="none"
            />
            {children}
          </View>
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
  },
  depth: {
    shadowColor: HERO_CARD.depthShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 10,
  },
  border: {
    overflow: 'hidden',
  },
  surface: {
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '48%',
  },
  hairline: {
    position: 'absolute',
    top: 0,
    height: 1,
  },
  innerHighlight: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: HERO_CARD.innerRim,
  },
});
