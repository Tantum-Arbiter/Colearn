import React, { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import type { ScreenFrame } from '@/components/experience/engines/place/place-geometry';
import { useSteadySharedValue } from '@/hooks/use-steady-shared-value';
import { sceneTap, type SceneEvent, type SceneMode } from './scene-layout';

export type { SceneEvent, SceneMode } from './scene-layout';

export interface Spot {
  id: string;
  label: string;
  frame: ScreenFrame;
}

export interface SceneEngineProps {
  spots: Spot[];
  mode: SceneMode;
  target: string;
  reduceMotion: boolean;
  paused: boolean;
  onEvent: (event: SceneEvent) => void;
  testID?: string;
}

export const SCENE_ENTRANCE_MS = 600;
export const BREATH_MS = 1400;
export const WOBBLE_MS = 360;
export const MARK_SIZE = 36;
export const RING = 3;

interface SpotProps {
  spot: Spot;
  mark: string | number | null;
  enabled: boolean;
  wobble: number;
  reduceMotion: boolean;
  onPress: (id: string) => void;
}

const SceneSpot = memo(function SceneSpot({ spot, mark, enabled, wobble, reduceMotion, onPress }: SpotProps) {
  const found = mark !== null;
  const arrival = useSteadySharedValue(reduceMotion ? 1 : 0);
  const breath = useSteadySharedValue(1);
  const shake = useSteadySharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      arrival.value = 1;
      return;
    }
    arrival.value = withTiming(1, { duration: SCENE_ENTRANCE_MS, easing: Easing.out(Easing.cubic) });
  }, [arrival, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || found) {
      cancelAnimation(breath);
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(withSequence(withTiming(0.55, { duration: BREATH_MS / 2 }), withTiming(1, { duration: BREATH_MS / 2 })), -1, false);
  }, [breath, found, reduceMotion]);

  useEffect(() => {
    if (wobble === 0 || reduceMotion) return;
    shake.value = withSequence(withTiming(-5, { duration: WOBBLE_MS / 4 }), withTiming(5, { duration: WOBBLE_MS / 4 }), withTiming(-2, { duration: WOBBLE_MS / 4 }), withTiming(0, { duration: WOBBLE_MS / 4 }));
  }, [wobble, shake, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: arrival.value, transform: [{ translateX: shake.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: breath.value }));
  const press = useCallback(() => onPress(spot.id), [onPress, spot.id]);
  const radius = Math.min(spot.frame.width, spot.frame.height) / 2;

  return (
    <Animated.View testID={`scene-spot-${spot.id}-frame`} style={[styles.spot, { left: spot.frame.left, top: spot.frame.top, width: spot.frame.width, height: spot.frame.height }, style]}>
      <Pressable
        testID={`scene-spot-${spot.id}`}
        onPress={press}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={spot.label}
        accessibilityState={{ selected: found, disabled: !enabled }}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring, { borderRadius: radius }, found ? styles.ringFound : null, ringStyle]} />
      </Pressable>
      {found ? (
        <View pointerEvents="none" style={styles.markBadge}>
          <Text testID={`scene-spot-${spot.id}-mark`} style={styles.markText} accessible={false}>
            {mark}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
});

export function spotMark(mode: SceneMode, found: readonly string[], id: string): string | number | null {
  const index = found.indexOf(id);
  if (index < 0) return null;
  return mode === 'count' ? index + 1 : '✓';
}

export const SceneEngine = memo(function SceneEngine({ spots, mode, target, reduceMotion, paused, onEvent, testID = 'scene-engine' }: SceneEngineProps) {
  const [found, setFound] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [wobbles, setWobbles] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = setTimeout(() => onEvent({ type: 'first-action-shown' }), reduceMotion ? 0 : SCENE_ENTRANCE_MS);
    return () => clearTimeout(timer);
  }, [onEvent, reduceMotion]);

  const handlePress = useCallback(
    (id: string) => {
      if (paused || done) return;
      const result = sceneTap(mode, spots.map((spot) => spot.id), target, found, id);
      if (!result.event) return;
      if (result.event.type === 'repair') setWobbles((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
      if (result.event.type === 'complete') setDone(true);
      setFound(result.found);
      onEvent(result.event);
    },
    [paused, done, mode, spots, target, found, onEvent]
  );

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {spots.map((spot) => (
        <SceneSpot key={spot.id} spot={spot} mark={spotMark(mode, found, spot.id)} enabled={!paused && !done} wobble={wobbles[spot.id] ?? 0} reduceMotion={reduceMotion} onPress={handlePress} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  spot: {
    position: 'absolute',
  },
  ring: {
    borderWidth: RING,
    borderColor: 'rgba(255, 246, 227, 0.85)',
    backgroundColor: 'rgba(255, 246, 227, 0.12)',
    shadowColor: '#FFF6E3',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  ringFound: {
    borderColor: '#FFE14A',
    backgroundColor: 'rgba(255, 225, 74, 0.2)',
    shadowColor: '#FFE14A',
  },
  markBadge: {
    position: 'absolute',
    top: -MARK_SIZE / 3,
    right: -MARK_SIZE / 3,
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE14A',
    borderWidth: 2,
    borderColor: '#FFF6E3',
  },
  markText: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    fontSize: 20,
    color: '#2E2A4F',
  },
});
