import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { apply, countOfKind, initialState, type GameEffect, type GameState } from '@/components/experience/rules';
import type { PackSounds } from '@/components/experience/pack-sounds';
import { Fonts } from '@/constants/theme';
import { useSteadySharedValue } from '@/hooks/use-steady-shared-value';
import type { LoadedPack } from '@/services/pack-service';
import type { ArtCrop, EngineSave, GameObject, HostMove, Layer, Mission, MissionGesture, ZonePlace } from '@/types/game-pack';
import type { PlanAgeRange } from '@/types/learning-plan';
import { fitArt, slotIn, toScreen, zoneAt, type ArtFit, type ScreenFrame, type ScreenShape } from './place-geometry';

export type EngineEvent =
  | { type: 'ready' }
  | { type: 'first-action-shown' }
  | { type: 'progress'; done: number; of: number }
  | { type: 'stage'; promptKey: string }
  | { type: 'complete' }
  | { type: 'save'; save: EngineSave };

export interface PlaceEngineProps {
  pack: LoadedPack;
  mission: Mission | null;
  band: PlanAgeRange;
  crop: ArtCrop;
  screen: ScreenShape;
  reduceMotion: boolean;
  paused: boolean;
  demo: boolean;
  save: EngineSave | null;
  sounds: PackSounds;
  onEvent: (event: EngineEvent) => void;
  testID?: string;
}

export const TWINKLE_MS = 3200;
export const PLACE_MS = 380;
export const RETURN_MS = 420;
export const DEMO = { waitMs: 500, outMs: 900, holdMs: 500, backMs: 700, stillMs: 700 } as const;
const MOVE_CODE: Record<HostMove, number> = { bob: 0, turn: 1, hum: 2, nod: 3, cheer: 4 };
const DRAG_MIN_DISTANCE = 8;

export function gestureFor(mission: Mission | null, band: PlanAgeRange): MissionGesture {
  return mission ? mission.byAge[band].gesture : 'drag';
}

export function dragAllowed(gesture: MissionGesture): boolean {
  return gesture === 'drag';
}

export function tapSends(gesture: MissionGesture): boolean {
  return gesture === 'tap';
}

interface Reaction {
  move: HostMove;
  ms: number;
  tick: number;
}

interface ItemProps {
  object: GameObject;
  source: ReturnType<LoadedPack['image']>;
  start: ScreenFrame;
  placed: ScreenFrame | null;
  bounce: number;
  selected: boolean;
  enabled: boolean;
  drag: boolean;
  zones: readonly ZonePlace[];
  fit: ArtFit;
  reduceMotion: boolean;
  demoTo: ScreenFrame | null;
  label: string;
  onTap: (id: string) => void;
  onDrop: (id: string, zone: string) => void;
  onDemoDone: () => void;
}

const PlaceItem = memo(function PlaceItem({
  object,
  source,
  start,
  placed,
  bounce,
  selected,
  enabled,
  drag,
  zones,
  fit,
  reduceMotion,
  demoTo,
  label,
  onTap,
  onDrop,
  onDemoDone,
}: ItemProps) {
  const tx = useSteadySharedValue(0);
  const ty = useSteadySharedValue(0);
  const grow = useSteadySharedValue(1);
  const fromX = useSteadySharedValue(0);
  const fromY = useSteadySharedValue(0);
  const timing = useCallback((ms: number) => ({ duration: reduceMotion ? 0 : ms, easing: Easing.out(Easing.cubic) }), [reduceMotion]);

  useEffect(() => {
    if (!placed) return;
    tx.value = withTiming(placed.left - start.left, timing(PLACE_MS));
    ty.value = withTiming(placed.top - start.top, timing(PLACE_MS));
    grow.value = withTiming(start.width > 0 ? placed.width / start.width : 1, timing(PLACE_MS));
  }, [placed, start.left, start.top, start.width, timing, tx, ty, grow]);

  useEffect(() => {
    if (bounce === 0 || placed) return;
    tx.value = withTiming(0, timing(RETURN_MS));
    ty.value = withTiming(0, timing(RETURN_MS));
  }, [bounce, placed, timing, tx, ty]);

  useEffect(() => {
    if (!demoTo) return undefined;
    const dx = demoTo.left + demoTo.width / 2 - (start.left + start.width / 2);
    const dy = demoTo.top + demoTo.height / 2 - (start.top + start.height / 2);
    if (reduceMotion) {
      const still = setTimeout(onDemoDone, DEMO.stillMs);
      return () => clearTimeout(still);
    }
    const ease = { easing: Easing.inOut(Easing.cubic) };
    tx.value = withDelay(DEMO.waitMs, withSequence(withTiming(dx, { duration: DEMO.outMs, ...ease }), withDelay(DEMO.holdMs, withTiming(0, { duration: DEMO.backMs, ...ease }))));
    ty.value = withDelay(
      DEMO.waitMs,
      withSequence(
        withTiming(dy, { duration: DEMO.outMs, ...ease }),
        withDelay(
          DEMO.holdMs,
          withTiming(0, { duration: DEMO.backMs, ...ease }, (finished) => {
            if (finished) runOnJS(onDemoDone)();
          })
        )
      )
    );
    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
    };
  }, [demoTo, onDemoDone, reduceMotion, start.height, start.left, start.top, start.width, tx, ty]);

  const handleTap = useCallback(() => onTap(object.id), [object.id, onTap]);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(drag && enabled)
        .minDistance(DRAG_MIN_DISTANCE)
        .onStart(() => {
          fromX.value = tx.value;
          fromY.value = ty.value;
        })
        .onUpdate((event) => {
          tx.value = fromX.value + event.translationX;
          ty.value = fromY.value + event.translationY;
        })
        .onEnd(() => {
          const centreX = start.left + tx.value + start.width / 2;
          const centreY = start.top + ty.value + start.height / 2;
          const zone = zoneAt({ x: centreX, y: centreY }, zones, fit);
          if (zone !== null) {
            runOnJS(onDrop)(object.id, zone);
          } else {
            tx.value = withTiming(0, { duration: RETURN_MS, easing: Easing.out(Easing.cubic) });
            ty.value = withTiming(0, { duration: RETURN_MS, easing: Easing.out(Easing.cubic) });
          }
        }),
    [drag, enabled, fit, fromX, fromY, object.id, onDrop, start.height, start.left, start.top, start.width, tx, ty, zones]
  );

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: grow.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View testID={`place-item-${object.id}`} style={[styles.piece, start, motion]} pointerEvents={placed ? 'none' : 'auto'}>
        <Pressable
          testID={`place-item-${object.id}-press`}
          onPress={handleTap}
          disabled={!enabled || placed !== null}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected, disabled: !enabled || placed !== null }}
          style={styles.fill}
        >
          {selected ? <View testID={`place-item-${object.id}-halo`} pointerEvents="none" style={styles.halo} /> : null}
          <Image source={source} style={styles.fill} contentFit="fill" transition={0} alt="" />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
});

interface HostProps {
  source: ReturnType<LoadedPack['image']>;
  frame: ScreenFrame;
  reaction: Reaction | null;
  reduceMotion: boolean;
  enabled: boolean;
  label: string;
  onTap: () => void;
  onHold: () => void;
  testID: string;
}

const HostFigure = memo(function HostFigure({ source, frame, reaction, reduceMotion, enabled, label, onTap, onHold, testID }: HostProps) {
  const clock = useSteadySharedValue(0);
  const moveCode = reaction ? MOVE_CODE[reaction.move] : 0;

  useEffect(() => {
    if (!reaction || reduceMotion) return;
    clock.value = 0;
    clock.value = withTiming(1, { duration: reaction.ms, easing: Easing.inOut(Easing.quad) });
  }, [reaction, reduceMotion, clock]);

  const motion = useAnimatedStyle(() => {
    const t = clock.value;
    const wave = Math.sin(Math.PI * t);
    if (moveCode === 0) return { transform: [{ translateY: -14 * wave }] };
    if (moveCode === 1) return { transform: [{ rotate: `${8 * Math.sin(2 * Math.PI * t)}deg` }] };
    if (moveCode === 2) return { transform: [{ scale: 1 + 0.05 * wave }] };
    if (moveCode === 3) return { transform: [{ rotate: `${-6 * wave}deg` }] };
    return { transform: [{ translateY: -22 * Math.abs(Math.sin(2 * Math.PI * t)) }, { rotate: `${6 * Math.sin(4 * Math.PI * t)}deg` }] };
  });

  return (
    <Animated.View testID={testID} style={[styles.piece, frame, motion]}>
      <Pressable
        testID={`${testID}-press`}
        onPress={onTap}
        onLongPress={onHold}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.fill}
      >
        <Image source={source} style={styles.fill} contentFit="fill" transition={0} alt="" />
      </Pressable>
    </Animated.View>
  );
});

interface SheetProps {
  layer: Layer;
  source: ReturnType<LoadedPack['image']>;
  frame: ScreenFrame;
  twinkle: SharedValue<number>;
  phase: number;
}

const SceneLayer = memo(function SceneLayer({ layer, source, frame, twinkle, phase }: SheetProps) {
  const clocked = layer.clock === 'twinkle';
  const shimmer = useAnimatedStyle(() => ({
    opacity: clocked ? 0.65 + 0.35 * Math.sin(2 * Math.PI * (twinkle.value + phase)) : 1,
  }));

  return (
    <Animated.View testID={`place-layer-${layer.id}`} pointerEvents="none" style={[styles.piece, frame, shimmer]}>
      <Image source={source} style={styles.fill} contentFit="fill" transition={0} alt="" />
    </Animated.View>
  );
});

function goalOf(mission: Mission | null, band: PlanAgeRange): Record<string, number> {
  if (!mission) return {};
  const stages = mission.byAge[band].stages;
  return stages.length > 0 ? stages[stages.length - 1].goal : {};
}

function progressOf(state: GameState, objects: readonly GameObject[], goal: Record<string, number>): { done: number; of: number } {
  return Object.entries(goal).reduce(
    (sum, [kind, wanted]) => ({ done: sum.done + Math.min(countOfKind(state, objects, kind), wanted), of: sum.of + wanted }),
    { done: 0, of: 0 }
  );
}

function saveOf(state: GameState, mission: Mission | null): EngineSave {
  return { missionId: mission?.id ?? null, stage: state.stage, states: { ...state.states }, placed: { ...state.placed }, savedAt: new Date().toISOString() };
}

export const PlaceEngine = memo(function PlaceEngine({
  pack,
  mission,
  band,
  crop,
  screen,
  reduceMotion,
  paused,
  demo,
  save,
  sounds,
  onEvent,
  testID = 'place-engine',
}: PlaceEngineProps) {
  const { t } = useTranslation();
  const { manifest } = pack;
  const art = pack.art(crop);
  const fit = useMemo(() => fitArt(art, screen), [art, screen]);
  const zones = useMemo(() => manifest.zones ?? [], [manifest.zones]);
  const zonePlaces = useMemo<ZonePlace[]>(() => zones.map((zone) => ({ id: zone.id, frame: art.zones[zone.id] })), [zones, art.zones]);
  const stages = useMemo(() => (mission ? mission.byAge[band].stages : []), [mission, band]);
  const rules = useMemo(() => [...manifest.rules, ...(mission?.rules ?? [])], [manifest.rules, mission]);
  const context = useMemo(() => ({ objects: manifest.objects, zones, stages }), [manifest.objects, zones, stages]);
  const goal = useMemo(() => goalOf(mission, band), [mission, band]);
  const gesture = gestureFor(mission, band);
  const [state, setState] = useState<GameState>(() => initialState(manifest.objects, zones, save));
  const [selected, setSelected] = useState<string | null>(null);
  const [bounces, setBounces] = useState<Record<string, number>>({});
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const reactionTick = useRef(0);
  const layersById = useMemo(() => new Map(art.layers.map((layer) => [layer.id, layer])), [art.layers]);
  const objectLayers = useMemo(() => new Set(manifest.objects.flatMap((object) => Object.values(object.layerByState))), [manifest.objects]);
  const twinkle = useSteadySharedValue(0);

  useEffect(() => {
    if (paused || reduceMotion) {
      cancelAnimation(twinkle);
      return undefined;
    }
    twinkle.value = withRepeat(withTiming(1, { duration: TWINKLE_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(twinkle);
  }, [paused, reduceMotion, twinkle]);

  useEffect(() => {
    onEvent({ type: 'ready' });
    onEvent({ type: 'progress', ...progressOf(state, manifest.objects, goal) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const react = useCallback(
    (id: string) => {
      const found = manifest.host.reactions[id];
      if (!found) return;
      reactionTick.current += 1;
      setReaction({ move: found.move, ms: found.ms, tick: reactionTick.current });
      if (found.sound) sounds.play(found.sound);
    },
    [manifest.host.reactions, sounds]
  );

  const take = useCallback(
    (effects: GameEffect[], next: GameState) => {
      effects.forEach((effect) => {
        if (effect.type === 'play-sound') sounds.play(effect.sound);
        else if (effect.type === 'react-host') react(effect.reaction);
        else if (effect.type === 'refuse') setBounces((current) => ({ ...current, [effect.object]: (current[effect.object] ?? 0) + 1 }));
        else if (effect.type === 'stage') onEvent({ type: 'stage', promptKey: stages[effect.index].promptKey });
        else if (effect.type === 'complete') onEvent({ type: 'complete' });
      });
      onEvent({ type: 'progress', ...progressOf(next, manifest.objects, goal) });
      onEvent({ type: 'save', save: saveOf(next, mission) });
    },
    [goal, manifest.objects, mission, onEvent, react, sounds, stages]
  );

  const act = useCallback(
    (input: Parameters<typeof apply>[2]) => {
      setState((current) => {
        const applied = apply(rules, current, input, context);
        take(applied.effects, applied.state);
        return applied.state;
      });
    },
    [context, rules, take]
  );

  const drop = useCallback(
    (id: string, zone: string) => {
      setSelected(null);
      act({ type: 'drop', object: id, zone });
    },
    [act]
  );

  const openZoneFor = useCallback(
    (object: GameObject): string | null => {
      const candidates = object.placeable?.zones ?? [];
      return candidates.find((zoneId) => zones.some((zone) => zone.id === zoneId)) ?? null;
    },
    [zones]
  );

  const tapItem = useCallback(
    (id: string) => {
      if (paused) return;
      const object = manifest.objects.find((candidate) => candidate.id === id);
      if (!object || !object.placeable || state.placed[id] !== undefined) return;
      if (tapSends(gesture)) {
        const zone = openZoneFor(object);
        if (zone) drop(id, zone);
        return;
      }
      setSelected((current) => (current === id ? null : id));
    },
    [drop, gesture, manifest.objects, openZoneFor, paused, state.placed]
  );

  const tapZone = useCallback(
    (zoneId: string) => {
      if (paused || selected === null) return;
      drop(selected, zoneId);
    },
    [drop, paused, selected]
  );

  const tapHost = useCallback(() => {
    if (paused) return;
    act({ type: 'tap', object: manifest.host.objectId });
  }, [act, manifest.host.objectId, paused]);

  const holdHost = useCallback(() => {
    if (paused) return;
    act({ type: 'hold', object: manifest.host.objectId, ms: 600 });
  }, [act, manifest.host.objectId, paused]);

  const demoDone = useCallback(() => onEvent({ type: 'first-action-shown' }), [onEvent]);

  const placedFrames = useMemo(() => {
    const frames: Record<string, ScreenFrame> = {};
    zones.forEach((zone) => {
      const zoneFrame = art.zones[zone.id];
      const inside = manifest.objects.filter((object) => state.placed[object.id] === zone.id);
      inside.forEach((object, index) => {
        const start = art.starts[object.id];
        frames[object.id] = toScreen(slotIn(zoneFrame, start, index, inside.length), fit);
      });
    });
    return frames;
  }, [art.starts, art.zones, fit, manifest.objects, state.placed, zones]);

  const demoItem = useMemo(() => {
    if (!demo) return null;
    const first = manifest.objects.find((object) => object.placeable && state.placed[object.id] === undefined && openZoneFor(object) !== null);
    if (!first) return null;
    const zoneId = openZoneFor(first);
    return zoneId ? { id: first.id, to: toScreen(art.zones[zoneId], fit) } : null;
  }, [art.zones, demo, fit, manifest.objects, openZoneFor, state.placed]);

  useEffect(() => {
    if (demo && demoItem === null) demoDone();
  }, [demo, demoItem, demoDone]);

  const count = Object.keys(goal).reduce((sum, kind) => sum + countOfKind(state, manifest.objects, kind), 0);
  const hostObject = manifest.objects.find((object) => object.id === manifest.host.objectId);
  const hostLayer = hostObject ? layersById.get(hostObject.layerByState[state.states[hostObject.id]]) : undefined;
  const sceneLayers = art.layers.filter((layer) => !objectLayers.has(layer.id)).sort((a, b) => a.z - b.z);
  const stills = manifest.objects.filter((object) => !object.placeable && object.id !== manifest.host.objectId);
  const placeables = manifest.objects.filter((object) => object.placeable !== undefined);
  const enabled = !paused && !demo;

  return (
    <View testID={testID} style={[styles.root, { backgroundColor: art.sky }]}>
      {sceneLayers.map((layer, index) => (
        <SceneLayer key={layer.id} layer={layer} source={pack.image(layer.file)} frame={toScreen(layer.frame, fit)} twinkle={twinkle} phase={index * 0.37} />
      ))}
      {stills.map((object) => {
        const layer = layersById.get(object.layerByState[state.states[object.id]]);
        if (!layer) return null;
        return (
          <Image
            key={object.id}
            testID={`place-object-${object.id}`}
            source={pack.image(layer.file)}
            style={[styles.piece, toScreen(layer.frame, fit)]}
            contentFit="fill"
            transition={0}
            pointerEvents="none"
            alt=""
          />
        );
      })}
      {zones.map((zone) => (
        <Pressable
          key={zone.id}
          testID={`place-zone-${zone.id}`}
          onPress={() => tapZone(zone.id)}
          disabled={!enabled || selected === null}
          accessibilityRole="button"
          accessibilityLabel={zone.labelKey ? t(zone.labelKey) : zone.id}
          style={[styles.piece, toScreen(art.zones[zone.id], fit)]}
        />
      ))}
      {hostObject && hostLayer ? (
        <HostFigure
          testID={`place-host-${hostObject.id}`}
          source={pack.image(hostLayer.file)}
          frame={toScreen(hostLayer.frame, fit)}
          reaction={reaction}
          reduceMotion={reduceMotion}
          enabled={enabled}
          label={hostObject.labelKey ? t(hostObject.labelKey) : hostObject.id}
          onTap={tapHost}
          onHold={holdHost}
        />
      ) : null}
      {placeables.map((object) => {
        const layer = layersById.get(object.layerByState[state.states[object.id]]);
        const start = art.starts[object.id];
        if (!layer || !start) return null;
        return (
          <PlaceItem
            key={object.id}
            object={object}
            source={pack.image(layer.file)}
            start={toScreen(start, fit)}
            placed={placedFrames[object.id] ?? null}
            bounce={bounces[object.id] ?? 0}
            selected={selected === object.id}
            enabled={enabled}
            drag={dragAllowed(gesture)}
            zones={zonePlaces}
            fit={fit}
            reduceMotion={reduceMotion}
            demoTo={demoItem?.id === object.id ? demoItem.to : null}
            label={object.labelKey ? t(object.labelKey) : object.id}
            onTap={tapItem}
            onDrop={drop}
            onDemoDone={demoDone}
          />
        );
      })}
      {band !== '1-2' && hostLayer ? (
        <View
          testID="place-count"
          pointerEvents="none"
          style={[styles.count, { left: toScreen(hostLayer.frame, fit).left + toScreen(hostLayer.frame, fit).width / 2 - COUNT_SIZE / 2, top: toScreen(hostLayer.frame, fit).top - COUNT_SIZE - 6 }]}
        >
          <Text testID="place-count-text" allowFontScaling={false} style={styles.countText}>
            {String(count)}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const COUNT_SIZE = 40;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 228, 120, 0.55)',
    transform: [{ scale: 1.35 }],
  },
  count: {
    position: 'absolute',
    width: COUNT_SIZE,
    height: COUNT_SIZE,
    borderRadius: COUNT_SIZE / 2,
    backgroundColor: 'rgba(255, 250, 235, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '700',
    color: '#2A1C0A',
  },
});
