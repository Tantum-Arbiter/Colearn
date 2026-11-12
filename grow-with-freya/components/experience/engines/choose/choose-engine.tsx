import React, { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import Animated, { Easing, useAnimatedStyle, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { RADIUS_CARD, SPACE_1, SPACE_2 } from '@/components/child-ui/tokens';
import { Fonts } from '@/constants/theme';
import type { ScreenFrame } from '@/components/experience/engines/place/place-geometry';
import { useSteadySharedValue } from '@/hooks/use-steady-shared-value';
import { cardFrames, chooseOutcome } from './choose-layout';

export interface Choice {
  id: string;
  image: string | number;
  label: string;
}

export function pictureSource(image: string | number): ImageProps['source'] {
  return typeof image === 'string' ? { uri: image } : image;
}

export type ChooseEvent =
  | { type: 'first-action-shown' }
  | { type: 'repair'; id: string }
  | { type: 'complete'; choice: string };

export interface ChooseEngineProps {
  choices: Choice[];
  target: string;
  tray: ScreenFrame;
  reduceMotion: boolean;
  paused: boolean;
  /** The choice is made and something else takes the stage: every card fades out and stops answering touch. */
  leaving?: boolean;
  onEvent: (event: ChooseEvent) => void;
  testID?: string;
}

export const LEAVE_MS = 320;

export const ENTRANCE_MS = 900;
export const STAGGER_MS = 140;
export const WOBBLE_MS = 360;
export const RING = 4;

interface CardProps {
  choice: Choice;
  frame: ScreenFrame;
  order: number;
  selected: boolean;
  dimmed: boolean;
  hidden: boolean;
  enabled: boolean;
  wobble: number;
  reduceMotion: boolean;
  onPress: (id: string) => void;
}

const ChoiceCard = memo(function ChoiceCard({ choice, frame, order, selected, dimmed, hidden, enabled, wobble, reduceMotion, onPress }: CardProps) {
  const arrival = useSteadySharedValue(reduceMotion ? 1 : 0);
  const shake = useSteadySharedValue(0);
  const fade = useSteadySharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      arrival.value = 1;
      return;
    }
    arrival.value = withDelay(order * STAGGER_MS, withTiming(1, { duration: ENTRANCE_MS - STAGGER_MS, easing: Easing.out(Easing.cubic) }));
  }, [arrival, order, reduceMotion]);

  useEffect(() => {
    if (wobble === 0 || reduceMotion) return;
    shake.value = withSequence(withTiming(-6, { duration: WOBBLE_MS / 4 }), withTiming(6, { duration: WOBBLE_MS / 4 }), withTiming(-3, { duration: WOBBLE_MS / 4 }), withTiming(0, { duration: WOBBLE_MS / 4 }));
  }, [wobble, shake, reduceMotion]);

  useEffect(() => {
    fade.value = withTiming(cardOpacity(hidden, dimmed), { duration: reduceMotion ? 0 : hidden ? LEAVE_MS : 240 });
  }, [dimmed, hidden, fade, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: arrival.value * fade.value,
    transform: [{ translateY: (1 - arrival.value) * 24 }, { translateX: shake.value }],
  }));

  const press = useCallback(() => onPress(choice.id), [onPress, choice.id]);

  return (
    <Animated.View testID={`choose-card-${choice.id}-frame`} pointerEvents={hidden ? 'none' : 'auto'} style={[styles.card, { left: frame.left, top: frame.top, width: frame.width, height: frame.height }, style]}>
      <Pressable
        testID={`choose-card-${choice.id}`}
        onPress={press}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={choice.label}
        accessibilityState={{ selected, disabled: !enabled }}
        style={[styles.face, selected ? styles.faceSelected : null]}
      >
        <Image source={pictureSource(choice.image)} style={styles.picture} contentFit="contain" transition={0} accessible={false} />
        <Text testID={`choose-card-${choice.id}-label`} style={[styles.label, { fontSize: labelSize(frame.width) }]} numberOfLines={1} adjustsFontSizeToFit accessible={false}>
          {choice.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

export function cardOpacity(hidden: boolean, dimmed: boolean): number {
  return hidden ? 0 : dimmed ? 0.45 : 1;
}

export function labelSize(cardWidth: number): number {
  return Math.round(Math.min(20, Math.max(13, cardWidth * 0.13)));
}

export const ChooseEngine = memo(function ChooseEngine({ choices, target, tray, reduceMotion, paused, leaving = false, onEvent, testID = 'choose-engine' }: ChooseEngineProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [wobbles, setWobbles] = useState<Record<string, number>>({});
  const frames = cardFrames(choices.length, tray);

  useEffect(() => {
    const timer = setTimeout(() => onEvent({ type: 'first-action-shown' }), reduceMotion ? 0 : ENTRANCE_MS);
    return () => clearTimeout(timer);
  }, [onEvent, reduceMotion]);

  const handlePress = useCallback(
    (id: string) => {
      if (paused || chosen !== null) return;
      if (chooseOutcome(target, id) === 'repair') {
        setWobbles((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
        onEvent({ type: 'repair', id });
        return;
      }
      setChosen(id);
      onEvent({ type: 'complete', choice: id });
    },
    [paused, chosen, target, onEvent]
  );

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {choices.map((choice, index) => (
        <ChoiceCard
          key={choice.id}
          choice={choice}
          frame={frames[index]}
          order={index}
          selected={chosen === choice.id}
          dimmed={chosen !== null && chosen !== choice.id}
          hidden={leaving}
          enabled={!paused && !leaving && chosen === null}
          wobble={wobbles[choice.id] ?? 0}
          reduceMotion={reduceMotion}
          onPress={handlePress}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
  },
  face: {
    flex: 1,
    borderRadius: RADIUS_CARD,
    borderWidth: RING,
    borderColor: 'rgba(255, 246, 227, 0.35)',
    backgroundColor: 'rgba(16, 22, 60, 0.82)',
    padding: SPACE_2,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  faceSelected: {
    borderColor: '#FFE14A',
    backgroundColor: 'rgba(16, 22, 60, 0.95)',
  },
  picture: {
    flex: 1,
    borderRadius: RADIUS_CARD - RING,
    backgroundColor: '#F8E3C4',
  },
  label: {
    marginTop: SPACE_1,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFF6E3',
    textAlign: 'center',
  },
});
