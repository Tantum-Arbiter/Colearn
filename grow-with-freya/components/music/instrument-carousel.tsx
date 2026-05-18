/**
 * InstrumentCarousel
 *
 * Inline 3D coverflow carousel for selecting an instrument, matching the
 * visual style of the full-screen "choose your instrument" picker overlay.
 * All sizes scale with the accessibility text-size setting (small / default / large / xl).
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, interpolate, Extrapolation, Easing, SharedValue, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { getAvailableInstrumentIds, getInstrument, InstrumentDefinition } from '@/services/music-asset-registry';
import { StoryAccessService } from '@/services/story-access-service';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';

// Slightly smaller than the full-screen picker overlay, tuned for inline use
const BASE_RADIUS = 150;
const BASE_IMAGE_SIZE = 90;
const CENTER_SCALE = 1.0;
const SIDE_SCALE = 0.85;

interface Props {
  selectedInstrumentId: string;
  onSelect: (id: string) => void;
  /** Called when user tries to select a locked instrument */
  onLockedPress?: () => void;
}

export const InstrumentCarousel = React.memo(function InstrumentCarousel({ selectedInstrumentId, onSelect, onLockedPress }: Props) {
  const { scaledButtonSize, scaledFontSize } = useAccessibility();
  const imageSize = scaledButtonSize(BASE_IMAGE_SIZE);
  const radius = scaledButtonSize(BASE_RADIUS);
  // Height = image + label area below
  const labelAreaHeight = scaledButtonSize(70);
  const carouselHeight = imageSize + labelAreaHeight;

  const instruments = useMemo<InstrumentDefinition[]>(() =>
    getAvailableInstrumentIds().map(id => getInstrument(id)).filter((i): i is InstrumentDefinition => !!i), []);
  const itemCount = instruments.length;
  const anglePerItem = itemCount > 0 ? 360 / itemCount : 360;

  const selectedIndex = Math.max(0, instruments.findIndex(i => i.id === selectedInstrumentId));
  const targetRotation = -(selectedIndex * anglePerItem);
  const rotation = useSharedValue(targetRotation);
  const gestureStart = useSharedValue(0);

  // Refs so gesture worklets can read the latest values without being in
  // useMemo deps. Changing useMemo deps recreates the Gesture objects which
  // crashes react-native-gesture-handler when the native recognizers are active.
  const selectedIdRef = useRef(selectedInstrumentId);
  selectedIdRef.current = selectedInstrumentId;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    rotation.value = withTiming(targetRotation, { duration: 300, easing: Easing.out(Easing.ease) });
  }, [targetRotation]);

  const getCenteredIndex = useCallback((r: number) => {
    if (itemCount === 0) return 0;
    return (itemCount - (Math.round(((r % 360) + 360) % 360 / anglePerItem) % itemCount)) % itemCount;
  }, [anglePerItem, itemCount]);

  const selectFromRotation = useCallback((target: number) => {
    const inst = instruments[getCenteredIndex(target)];
    if (inst) onSelectRef.current(inst.id);
  }, [getCenteredIndex, instruments]);

  const goToNeighbor = useCallback((dir: -1 | 1) => {
    const snapped = Math.round(rotation.value / anglePerItem) * anglePerItem;
    const target = snapped + dir * anglePerItem;
    rotation.value = withTiming(target, { duration: 300, easing: Easing.out(Easing.ease) });
    selectFromRotation(target);
  }, [anglePerItem, rotation, selectFromRotation]);

  // Tap disabled -selection is driven only by the arrows and pan gesture.
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
  if (instruments.length === 0) return null;

  const arrowSize = scaledButtonSize(36);
  // Arrows sit at the vertical center of the image, not the full carousel height
  const arrowTop = imageSize / 2 - arrowSize / 2;
  return (
    <View style={[st.wrapper, { height: carouselHeight }]}>
      {/* Left arrow -flush with carousel edges */}
      <Pressable
        style={[st.arrow, { width: arrowSize, height: arrowSize, borderRadius: arrowSize / 2, top: arrowTop, left: 8 }]}
        onPress={() => goToNeighbor(1)}>
        <Text style={[st.arrowTxt, { fontSize: scaledFontSize(26) }]}>‹</Text>
      </Pressable>
      {/* Carousel */}
      <GestureHandlerRootView style={st.gesture}>
        <GestureDetector gesture={pan}>
          <View style={[st.cContainer, { height: carouselHeight }]}>
            <Animated.View style={st.carousel}>
              {instruments.map((inst, i) => (
                <CarouselItem key={inst.id} instrument={inst} index={i} anglePerItem={anglePerItem}
                  rotation={rotation} imageSize={imageSize} radius={radius}
                  nameFontSize={scaledFontSize(16)} descFontSize={scaledFontSize(12)}
                  isLocked={!StoryAccessService.isInstrumentUnlocked(inst.id)}
                  onLockedPress={onLockedPress} />
              ))}
            </Animated.View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
      {/* Right arrow -flush with carousel edges */}
      <Pressable
        style={[st.arrow, { width: arrowSize, height: arrowSize, borderRadius: arrowSize / 2, top: arrowTop, right: 8 }]}
        onPress={() => goToNeighbor(-1)}>
        <Text style={[st.arrowTxt, { fontSize: scaledFontSize(26) }]}>›</Text>
      </Pressable>
    </View>
  );
});

// --- CarouselItem: 3D positioned instrument with pulsing ring ---

interface ItemProps {
  instrument: InstrumentDefinition; index: number; anglePerItem: number;
  rotation: SharedValue<number>; imageSize: number; radius: number;
  nameFontSize: number; descFontSize: number;
  isLocked?: boolean; onLockedPress?: () => void;
}

function CarouselItem({ instrument, index, anglePerItem, rotation, imageSize, radius, nameFontSize, descFontSize, isLocked = false, onLockedPress }: ItemProps) {
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
    // Compensate for scale so all items share the same bottom edge (baseline).
    // When scale < 1 the element shrinks toward its center, pushing the bottom
    // edge up by half the lost height. Shift it back down to keep bottoms aligned.
    // Then raise the selected (front) item above the baseline.
    const scaleCompensation = ((1 - sc) * imageSize) / 2;
    const raiseSelected = interpolate(nz, [0, 1], [0, -20], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: x },
        { translateY: scaleCompensation + raiseSelected },
        { scale: sc },
      ],
      opacity: interpolate(nz, [0, 0.4, 0.85, 1], [0.1, 0.3, 0.7, 1], Extrapolation.CLAMP),
      zIndex: Math.round(nz * 100),
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const th = ((rotation.value + index * anglePerItem) * Math.PI) / 180;
    const nz = (Math.cos(th) * radius + radius) / (2 * radius);
    return { transform: [{ scale: pulseScale.value }], opacity: pulseOpacity.value * (nz > 0.85 ? 1 : 0) };
  });

  const labelStyle = useAnimatedStyle(() => {
    const th = ((rotation.value + index * anglePerItem) * Math.PI) / 180;
    const nz = (Math.cos(th) * radius + radius) / (2 * radius);
    return { opacity: interpolate(nz, [0.7, 0.9], [0, 1], Extrapolation.CLAMP) };
  });

  const ringSize = imageSize + 24;
  const hasImage = instrument.image !== 0;

  return (
    <Animated.View style={[st.item, { width: imageSize + 40 }, itemStyle]}>
      <Animated.View style={[st.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, top: -12, borderWidth: 3 }, ringStyle]} />
      <View style={{ width: imageSize, height: imageSize, justifyContent: 'center', alignItems: 'center' }}>
        {hasImage ? (
          <Image source={instrument.image}
            style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2, opacity: isLocked ? 0.5 : 1 }} resizeMode="contain" />
        ) : (
          <View style={[st.ph, { width: imageSize, height: imageSize, borderRadius: imageSize / 2,
            backgroundColor: instrument.noteLayout[0]?.color || '#666', opacity: isLocked ? 0.5 : 1 }]}>
            <Text style={{ fontSize: imageSize * 0.45 }}>{instrument.noteLayout[0]?.label || '🎵'}</Text>
          </View>
        )}
        {/* Lock overlay for subscription-gated instruments */}
        {isLocked && (
          <Pressable
            onPress={onLockedPress}
            style={[st.lockOverlay, { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }]}
          >
            <View style={st.lockBadge}>
              <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        )}
      </View>
      <Animated.View style={[st.label, labelStyle]}>
        <Text style={[st.name, { fontSize: nameFontSize }]}>{instrument.displayName}</Text>
        <Text style={[st.desc, { fontSize: descFontSize }]} numberOfLines={2}>{instrument.description}</Text>
      </Animated.View>
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
  ph: { justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  label: { alignItems: 'center', marginTop: 8 },
  name: {
    color: '#FFF', fontWeight: '700', fontFamily: Fonts.rounded, textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  desc: {
    color: 'rgba(255,255,255,0.6)', fontWeight: '400', textAlign: 'center',
    marginTop: 3, maxWidth: 200,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  lockBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 50, 0.7)',
  },
});
