/**
 * AgeRangeCarousel
 *
 * Inline 3D coverflow carousel for selecting an age range, matching the
 * visual style of the InstrumentCarousel but with age-range text circles
 * instead of instrument images.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, interpolate, Extrapolation, Easing, SharedValue, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

const BASE_RADIUS = 130;
const BASE_CIRCLE_SIZE = 80;
const CENTER_SCALE = 1.0;
const SIDE_SCALE = 0.85;

export type AgeRange = 'all' | '1-2' | '2-4' | '4+';

interface AgeRangeItem {
  id: AgeRange;
  /** Translation key or plain label */
  labelKey?: string;
  label?: string;
  color: string;
}

const AGE_RANGES: AgeRangeItem[] = [
  { id: 'all', labelKey: 'learning.ageAll', color: '#8B5CF6' },
  { id: '1-2', label: '1-2', color: '#F59E0B' },
  { id: '2-4', label: '2-4', color: '#10B981' },
  { id: '4+', label: '4+', color: '#3B82F6' },
];

/** Map child age in months to the closest age range. */
export function ageMonthsToRange(ageInMonths: number): AgeRange {
  if (ageInMonths < 24) return '1-2';
  if (ageInMonths < 48) return '2-4';
  return '4+';
}

interface Props {
  selectedRange: AgeRange;
  onSelect: (range: AgeRange) => void;
}

export const AgeRangeCarousel = React.memo(function AgeRangeCarousel({ selectedRange, onSelect }: Props) {
  const { scaledButtonSize, scaledFontSize } = useAccessibility();
  const { t } = useTranslation();
  const circleSize = scaledButtonSize(BASE_CIRCLE_SIZE);
  const radius = scaledButtonSize(BASE_RADIUS);
  const padding = scaledButtonSize(16);
  const carouselHeight = circleSize + padding;

  const itemCount = AGE_RANGES.length;
  const anglePerItem = 360 / itemCount;

  const selectedIndex = Math.max(0, AGE_RANGES.findIndex(r => r.id === selectedRange));
  const targetRotation = -(selectedIndex * anglePerItem);
  const rotation = useSharedValue(targetRotation);
  const gestureStart = useSharedValue(0);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    rotation.value = withTiming(targetRotation, { duration: 300, easing: Easing.out(Easing.ease) });
  }, [targetRotation]);

  const getCenteredIndex = useCallback((r: number) => {
    return (itemCount - (Math.round(((r % 360) + 360) % 360 / anglePerItem) % itemCount)) % itemCount;
  }, [anglePerItem, itemCount]);

  const selectFromRotation = useCallback((target: number) => {
    const item = AGE_RANGES[getCenteredIndex(target)];
    if (item) onSelectRef.current(item.id);
  }, [getCenteredIndex]);

  const goToNeighbor = useCallback((dir: -1 | 1) => {
    const snapped = Math.round(rotation.value / anglePerItem) * anglePerItem;
    const target = snapped + dir * anglePerItem;
    rotation.value = withTiming(target, { duration: 300, easing: Easing.out(Easing.ease) });
    selectFromRotation(target);
  }, [anglePerItem, rotation, selectFromRotation]);

  const pan = useMemo(() => Gesture.Pan()
    .onStart(() => { gestureStart.value = rotation.value; })
    .onUpdate(e => {
      const drag = Math.max(-anglePerItem * 0.6, Math.min(anglePerItem * 0.6, e.translationX * 0.15));
      rotation.value = gestureStart.value + drag;
    })
    .onEnd(e => {
      const ss = Math.round(gestureStart.value / anglePerItem) * anglePerItem;
      const d = rotation.value - gestureStart.value;
      let step = 0;
      if (d > anglePerItem * 0.15 || e.velocityX > 200) step = 1;
      else if (d < -anglePerItem * 0.15 || e.velocityX < -200) step = -1;
      const target = ss + step * anglePerItem;
      rotation.value = withTiming(target, { duration: 300, easing: Easing.out(Easing.ease) });
      runOnJS(selectFromRotation)(target);
    }), [anglePerItem, gestureStart, rotation, selectFromRotation]);

  const arrowSize = scaledButtonSize(36);
  const arrowTop = circleSize / 2 - arrowSize / 2;

  return (
    <View style={[st.wrapper, { height: carouselHeight }]}>
      <Pressable
        style={[st.arrow, { width: arrowSize, height: arrowSize, borderRadius: arrowSize / 2, top: arrowTop, left: 8 }]}
        onPress={() => goToNeighbor(1)}>
        <Text style={[st.arrowTxt, { fontSize: scaledFontSize(26) }]}>‹</Text>
      </Pressable>
      <GestureHandlerRootView style={st.gesture}>
        <GestureDetector gesture={pan}>
          <View style={[st.cContainer, { height: carouselHeight }]}>
            <Animated.View style={st.carousel}>
              {AGE_RANGES.map((item, i) => (
                <AgeRangeCircle key={item.id} item={item} index={i} anglePerItem={anglePerItem}
                  rotation={rotation} circleSize={circleSize} radius={radius}
                  resolvedLabel={item.labelKey ? t(item.labelKey) : item.label ?? item.id} />
              ))}
            </Animated.View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
      <Pressable
        style={[st.arrow, { width: arrowSize, height: arrowSize, borderRadius: arrowSize / 2, top: arrowTop, right: 8 }]}
        onPress={() => goToNeighbor(-1)}>
        <Text style={[st.arrowTxt, { fontSize: scaledFontSize(26) }]}>›</Text>
      </Pressable>
    </View>
  );
});

// --- AgeRangeCircle: 3D positioned age-range circle with pulsing ring ---

interface CircleProps {
  item: AgeRangeItem; index: number; anglePerItem: number;
  rotation: SharedValue<number>; circleSize: number; radius: number;
  resolvedLabel: string;
}

function AgeRangeCircle({ item, index, anglePerItem, rotation, circleSize, radius, resolvedLabel }: CircleProps) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    pulseScale.value = withRepeat(withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(1.2, { duration: 900, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);
    pulseOpacity.value = withRepeat(withSequence(
      withTiming(0.6, { duration: 0 }),
      withTiming(0.15, { duration: 900, easing: Easing.out(Easing.ease) }),
      withTiming(0.6, { duration: 900, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);
  }, [pulseScale, pulseOpacity]);

  const itemStyle = useAnimatedStyle(() => {
    const th = ((rotation.value + index * anglePerItem) * Math.PI) / 180;
    const x = Math.sin(th) * radius;
    const z = Math.cos(th) * radius;
    const nz = (z + radius) / (2 * radius);
    const sc = interpolate(nz, [0, 1], [SIDE_SCALE, CENTER_SCALE], Extrapolation.CLAMP);
    const scaleCompensation = ((1 - sc) * circleSize) / 2;
    const raiseSelected = interpolate(nz, [0, 1], [0, -15], Extrapolation.CLAMP);
    return {
      transform: [{ translateX: x }, { translateY: scaleCompensation + raiseSelected }, { scale: sc }],
      opacity: interpolate(nz, [0, 0.4, 0.85, 1], [0.1, 0.3, 0.7, 1], Extrapolation.CLAMP),
      zIndex: Math.round(nz * 100),
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const th = ((rotation.value + index * anglePerItem) * Math.PI) / 180;
    const nz = (Math.cos(th) * radius + radius) / (2 * radius);
    return { transform: [{ scale: pulseScale.value }], opacity: pulseOpacity.value * (nz > 0.85 ? 1 : 0) };
  });

  const ringSize = circleSize + 20;
  const isMultiLine = resolvedLabel.includes('\n');
  const labelFontSize = isMultiLine ? circleSize * 0.22 : circleSize * 0.32;

  return (
    <Animated.View style={[st.item, { width: circleSize + 30 }, itemStyle]}>
      <Animated.View style={[st.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, top: -10, borderWidth: 3 }, ringStyle]} />
      <View style={[st.circle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, backgroundColor: item.color }]}>
        <Text style={[st.circleText, { fontSize: labelFontSize }]}>{resolvedLabel}</Text>
      </View>
    </Animated.View>
  );
}

// --- Styles ---

const st = StyleSheet.create({
  wrapper: { width: '100%', marginBottom: 4 },
  arrow: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  arrowTxt: { color: 'rgba(255,255,255,0.8)', fontWeight: '300', marginTop: -2 },
  gesture: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cContainer: { width: '100%', justifyContent: 'center', alignItems: 'center' },
  carousel: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  item: { position: 'absolute', alignItems: 'center' },
  ring: { position: 'absolute', borderColor: 'rgba(255,255,255,0.8)' },
  circle: { justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  circleText: {
    color: '#FFF', fontWeight: '700', fontFamily: Fonts.rounded, textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
});
