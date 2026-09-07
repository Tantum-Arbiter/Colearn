import React, { memo, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useOwlRhythm } from '@/hooks/use-owl-rhythm';
import { choreograph, type Beat, type Track } from '@/utils/choreograph';
import {
  OWL_CANVAS,
  OWL_LAYERS,
  OWL_RIG,
  OWL_RHYTHM,
  arrivalOffset,
  landingSquash,
  leaveOffset,
  lidReveal,
  owlOrigin,
  talkBeats,
  wingPose,
  type BlinkShape,
  type GlanceGesture,
  type OwlApproach,
  type OwlPhase,
  type OwlWingSide,
} from '@/constants/owl-companion';

export interface OwlSpriteProps {
  width: number;
  phase: OwlPhase;
  sayCount?: number;
  pointing?: boolean;
  wingSide?: OwlWingSide;
  approach?: OwlApproach;
  onPhaseEnd?: (phase: OwlPhase) => void;
  testID?: string;
}

const HEAD_ORIGIN = owlOrigin(OWL_RIG.headPivot);
const WING_ORIGIN = owlOrigin(OWL_RIG.wingPivot);

const settle = Easing.out(Easing.cubic);
const glide = Easing.inOut(Easing.cubic);
const perk = Easing.out(Easing.back(1.6));
const sway = Easing.inOut(Easing.sin);
const drop = Easing.in(Easing.quad);
const shut = Easing.in(Easing.quad);
const spring = Easing.out(Easing.back(2));

interface Rig {
  fade: SharedValue<number>;
  rise: SharedValue<number>;
  land: SharedValue<number>;
  ruffleX: SharedValue<number>;
  ruffleY: SharedValue<number>;
  tilt: SharedValue<number>;
  bob: SharedValue<number>;
  peekX: SharedValue<number>;
  peekScale: SharedValue<number>;
  shake: SharedValue<number>;
  lid: SharedValue<number>;
  beak: SharedValue<number>;
  wingLift: SharedValue<number>;
  wave: SharedValue<number>;
}

interface PhaseRun {
  phase: OwlPhase;
  reduceMotion: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

function restingTracks(rig: Rig): Track[] {
  return [
    { on: rig.land, name: 'landing', from: 0, beats: [] },
    { on: rig.ruffleX, name: 'ruffle x', from: 1, beats: [] },
    { on: rig.ruffleY, name: 'ruffle y', from: 1, beats: [] },
    { on: rig.tilt, name: 'tilt', from: 0, beats: [] },
    { on: rig.bob, name: 'bob', from: 0, beats: [] },
    { on: rig.peekX, name: 'peek', from: 0, beats: [] },
    { on: rig.peekScale, name: 'peek scale', from: 1, beats: [] },
    { on: rig.shake, name: 'shake', from: 0, beats: [] },
    { on: rig.lid, name: 'lid', from: 0, beats: [] },
    { on: rig.beak, name: 'beak', from: 0, beats: [] },
    { on: rig.wingLift, name: 'wing', from: 0, beats: [] },
    { on: rig.wave, name: 'wave', from: 0, beats: [] },
  ];
}

function withBeats(tracks: Track[], name: string, beats: Beat[]): Track[] {
  return tracks.map((track) => (track.name === name ? { ...track, beats } : track));
}

function arrivalTracks(rig: Rig, approach: OwlApproach): Track[] {
  const { arriveMs, landSettleMs, waveAfterLandingMs, waveRaiseMs, waveBeatMs, waveBeats, waveLowerMs } =
    OWL_RHYTHM;
  const waveAt = arriveMs + waveAfterLandingMs;
  const beatsAt = waveAt + waveRaiseMs;
  const lowerAt = beatsAt + waveBeatMs * waveBeats;

  const waving: Beat[] = Array.from({ length: waveBeats }, (_, i) => ({
    at: beatsAt + i * waveBeatMs,
    to: i % 2 === 0 ? 1 : -1,
    over: waveBeatMs,
    easing: sway,
  }));
  waving.push({ at: lowerAt, to: 0, over: waveLowerMs, easing: glide });

  let tracks = restingTracks(rig);
  tracks = withBeats(tracks, 'landing', [
    { at: arriveMs - 140, to: 1, over: landSettleMs, easing: Easing.linear },
  ]);
  tracks = withBeats(tracks, 'tilt', [
    { at: arriveMs - 200, to: -3, over: 140, easing: settle },
    { at: arriveMs - 60, to: 0, over: 200, easing: glide },
    { at: waveAt, to: OWL_RHYTHM.waveLeanDegrees, over: waveRaiseMs, easing: perk },
    { at: lowerAt, to: 0, over: waveLowerMs, easing: glide },
  ]);
  tracks = withBeats(tracks, 'wing', [
    { at: waveAt, to: 1, over: waveRaiseMs, easing: perk },
    { at: lowerAt, to: 0, over: waveLowerMs, easing: glide },
  ]);
  tracks = withBeats(tracks, 'wave', waving);

  return [
    { on: rig.fade, name: 'fade', from: 0, beats: [{ at: 0, to: 1, over: 160 }] },
    {
      on: rig.rise,
      name: 'rise',
      from: arrivalOffset(approach),
      beats: [{ at: 0, to: 0, over: arriveMs, easing: settle }],
    },
    ...tracks,
  ];
}

function delightTracks(rig: Rig): Track[] {
  let tracks = restingTracks(rig);
  tracks = withBeats(tracks, 'lid', [{ at: 0, to: 1, over: 110, easing: settle }]);
  tracks = withBeats(tracks, 'tilt', [
    { at: 0, to: 5, over: 220, easing: perk },
    { at: 340, to: 0, over: 220, easing: glide },
  ]);
  tracks = withBeats(tracks, 'landing', [{ at: 440, to: 1, over: 200, easing: Easing.linear }]);
  tracks = withBeats(tracks, 'wing', [
    { at: 0, to: 1, over: 200, easing: perk },
    { at: 300, to: 0, over: 260, easing: glide },
  ]);

  return [
    {
      on: rig.fade,
      name: 'fade',
      from: 1,
      beats: [
        {
          at: OWL_RHYTHM.delightMs - OWL_RHYTHM.delightFadeMs,
          to: 0,
          over: OWL_RHYTHM.delightFadeMs,
          easing: drop,
        },
      ],
    },
    {
      on: rig.rise,
      name: 'rise',
      from: 0,
      beats: [
        { at: 40, to: -OWL_RIG.delightHopPixels, over: 220, easing: settle },
        { at: 260, to: 0, over: 240, easing: drop },
      ],
    },
    ...tracks,
  ];
}

function leaveTracks(rig: Rig, approach: OwlApproach): Track[] {
  return [
    {
      on: rig.fade,
      name: 'fade',
      from: 1,
      beats: [{ at: 0, to: 0, over: OWL_RHYTHM.leaveMs, easing: drop }],
    },
    {
      on: rig.rise,
      name: 'rise',
      from: 0,
      beats: [{ at: 0, to: leaveOffset(approach), over: OWL_RHYTHM.leaveMs, easing: drop }],
    },
    { on: rig.tilt, name: 'tilt', beats: [{ at: 0, to: 0, over: OWL_RHYTHM.leaveMs, easing: glide }] },
  ];
}

function reducedTracks(rig: Rig, phase: OwlPhase): Track[] {
  const over = OWL_RHYTHM.reducedFadeMs;
  const tracks = restingTracks(rig).filter((track) => track.name !== 'lid');
  const lidTo = phase === 'delight' ? 1 : 0;

  return [
    {
      on: rig.fade,
      name: 'fade',
      from: phase === 'arrive' ? 0 : 1,
      beats: [{ at: 0, to: phase === 'leave' ? 0 : 1, over }],
    },
    { on: rig.rise, name: 'rise', from: 0, beats: [] },
    { on: rig.lid, name: 'lid', beats: [{ at: 0, to: lidTo, over }] },
    ...tracks,
  ];
}

function blinkBeats(shape: BlinkShape): Beat[] {
  const { blinkDownMs, blinkHoldMs, blinkUpMs, slowBlinkDownMs, slowBlinkHoldMs, slowBlinkUpMs, doubleBlinkGapMs } =
    OWL_RHYTHM;

  if (shape === 'slow') {
    return [
      { at: 0, to: 1, over: slowBlinkDownMs, easing: shut },
      { at: slowBlinkDownMs + slowBlinkHoldMs, to: 0, over: slowBlinkUpMs, easing: settle },
    ];
  }

  const quick = (start: number): Beat[] => [
    { at: start, to: 1, over: blinkDownMs, easing: shut },
    { at: start + blinkDownMs + blinkHoldMs, to: 0, over: blinkUpMs, easing: settle },
  ];
  const quickMs = blinkDownMs + blinkHoldMs + blinkUpMs;

  return shape === 'double' ? [...quick(0), ...quick(quickMs + doubleBlinkGapMs)] : quick(0);
}

function glanceTracks(rig: Rig, gesture: GlanceGesture, holdMs: number): Track[] {
  const { glanceReturnMs } = OWL_RHYTHM;
  const back = (at: number, to: number): Beat => ({ at, to, over: glanceReturnMs, easing: glide });

  if (gesture === 'bob') {
    return [
      {
        on: rig.bob,
        name: 'bob',
        beats: [
          { at: 0, to: -OWL_RIG.bobPixels, over: 160, easing: settle },
          { at: 160, to: 1, over: 140, easing: glide },
          { at: 300, to: 0, over: 120, easing: glide },
        ],
      },
    ];
  }

  if (gesture === 'tilt-left' || gesture === 'tilt-right') {
    const degrees = gesture === 'tilt-left' ? -OWL_RIG.tiltDegrees : OWL_RIG.tiltDegrees;
    return [
      { on: rig.tilt, name: 'tilt', beats: [{ at: 0, to: degrees, over: 260, easing: perk }, back(260 + holdMs, 0)] },
      { on: rig.bob, name: 'bob', beats: [{ at: 0, to: 1.5, over: 260, easing: settle }, back(260 + holdMs, 0)] },
    ];
  }

  const direction = gesture === 'peek-left' ? -1 : 1;
  return [
    {
      on: rig.peekX,
      name: 'peek',
      beats: [{ at: 0, to: direction * OWL_RIG.peekPixels, over: 240, easing: settle }, back(240 + holdMs, 0)],
    },
    {
      on: rig.peekScale,
      name: 'peek scale',
      beats: [{ at: 0, to: OWL_RIG.peekScaleX, over: 240, easing: settle }, back(240 + holdMs, 1)],
    },
    {
      on: rig.tilt,
      name: 'tilt',
      beats: [{ at: 0, to: direction * OWL_RIG.peekDegrees, over: 240, easing: settle }, back(240 + holdMs, 0)],
    },
  ];
}

function ruffleTracks(rig: Rig): Track[] {
  const { ruffleShakeDegrees } = OWL_RIG;
  return [
    {
      on: rig.ruffleX,
      name: 'ruffle x',
      beats: [
        { at: 0, to: OWL_RIG.ruffleScaleX, over: 120, easing: settle },
        { at: 120, to: 1, over: 400, easing: spring },
      ],
    },
    {
      on: rig.ruffleY,
      name: 'ruffle y',
      beats: [
        { at: 0, to: OWL_RIG.ruffleScaleY, over: 120, easing: settle },
        { at: 120, to: 1, over: 400, easing: spring },
      ],
    },
    {
      on: rig.shake,
      name: 'shake',
      beats: [
        { at: 0, to: -ruffleShakeDegrees, over: 90, easing: sway },
        { at: 90, to: ruffleShakeDegrees, over: 110, easing: sway },
        { at: 200, to: -ruffleShakeDegrees / 2, over: 100, easing: sway },
        { at: 300, to: 0, over: 120, easing: sway },
      ],
    },
  ];
}

function pointTracks(rig: Rig, raised: boolean): Track[] {
  if (raised) {
    return [
      { on: rig.wingLift, name: 'wing', beats: [{ at: 0, to: 1, over: OWL_RHYTHM.pointRaiseMs, easing: perk }] },
      { on: rig.tilt, name: 'tilt', beats: [{ at: 0, to: OWL_RHYTHM.waveLeanDegrees, over: OWL_RHYTHM.pointRaiseMs, easing: perk }] },
    ];
  }
  return [
    { on: rig.wingLift, name: 'wing', beats: [{ at: 0, to: 0, over: OWL_RHYTHM.pointLowerMs, easing: glide }] },
    { on: rig.wave, name: 'wave', beats: [{ at: 0, to: 0, over: OWL_RHYTHM.pointLowerMs, easing: glide }] },
    { on: rig.tilt, name: 'tilt', beats: [{ at: 0, to: 0, over: OWL_RHYTHM.pointLowerMs, easing: glide }] },
  ];
}

function talkTracks(rig: Rig, roll: number): Track[] {
  const beats = talkBeats(roll);
  return [
    {
      on: rig.beak,
      name: 'beak',
      from: 0,
      beats: beats.map((beat) => ({ at: beat.at, to: beat.open ? 1 : 0, over: beat.over })),
    },
    {
      on: rig.bob,
      name: 'bob',
      from: 0,
      beats: beats.map((beat) => ({
        at: beat.at,
        to: beat.open ? -OWL_RIG.talkBobPixels : 0,
        over: beat.over,
        easing: settle,
      })),
    },
  ];
}

function phaseDuration(phase: OwlPhase, reduceMotion: boolean): number | null {
  if (phase === 'idle') return null;
  if (reduceMotion) return OWL_RHYTHM.reducedFadeMs;
  if (phase === 'arrive') return OWL_RHYTHM.arriveMs;
  if (phase === 'delight') return OWL_RHYTHM.delightMs;
  return OWL_RHYTHM.leaveMs;
}

export const OwlSprite = memo(function OwlSprite({
  width,
  phase,
  sayCount = 0,
  pointing = false,
  wingSide = 'right',
  approach = 'below',
  onPhaseEnd,
  testID = 'owl-sprite',
}: OwlSpriteProps) {
  const reduceMotion = useReducedMotion();
  const scale = width / OWL_CANVAS.width;
  const height = width * (OWL_CANVAS.height / OWL_CANVAS.width);

  const fade = useSharedValue(phase === 'arrive' ? 0 : 1);
  const rise = useSharedValue(phase === 'arrive' ? arrivalOffset(approach) : 0);
  const land = useSharedValue(0);
  const breath = useSharedValue(0);
  const ruffleX = useSharedValue(1);
  const ruffleY = useSharedValue(1);
  const tilt = useSharedValue(0);
  const bob = useSharedValue(0);
  const peekX = useSharedValue(0);
  const peekScale = useSharedValue(1);
  const shake = useSharedValue(0);
  const lid = useSharedValue(0);
  const beak = useSharedValue(0);
  const wingLift = useSharedValue(0);
  const wave = useSharedValue(0);

  const rigRef = useRef<Rig>({ fade, rise, land, ruffleX, ruffleY, tilt, bob, peekX, peekScale, shake, lid, beak, wingLift, wave });
  const onPhaseEndRef = useRef(onPhaseEnd);
  onPhaseEndRef.current = onPhaseEnd;
  const runRef = useRef<PhaseRun | null>(null);
  const spokenRef = useRef(0);

  useEffect(() => {
    if (reduceMotion) {
      breath.value = 0;
      return;
    }

    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: OWL_RHYTHM.breathMs / 2, easing: sway }),
        withTiming(0, { duration: OWL_RHYTHM.breathMs / 2, easing: sway })
      ),
      -1,
      false
    );

    return () => cancelAnimation(breath);
  }, [breath, reduceMotion]);

  useEffect(() => {
    const current = runRef.current;
    if (current && current.phase === phase && current.reduceMotion === reduceMotion) return;
    if (current?.timer) clearTimeout(current.timer);

    const rig = rigRef.current;
    if (reduceMotion) {
      choreograph(reducedTracks(rig, phase));
    } else if (phase === 'arrive') {
      choreograph(arrivalTracks(rig, approach));
    } else if (phase === 'delight') {
      choreograph(delightTracks(rig));
    } else if (phase === 'leave') {
      choreograph(leaveTracks(rig, approach));
    }

    const duration = phaseDuration(phase, reduceMotion);
    const timer =
      duration === null
        ? null
        : setTimeout(() => {
            runRef.current = { phase, reduceMotion, timer: null };
            onPhaseEndRef.current?.(phase);
          }, duration);

    runRef.current = { phase, reduceMotion, timer };
  }, [phase, reduceMotion, approach]);

  useEffect(
    () => () => {
      if (runRef.current?.timer) clearTimeout(runRef.current.timer);
    },
    []
  );

  const pointedRef = useRef(false);

  useEffect(() => {
    if (phase !== 'idle' || reduceMotion) return;
    if (pointing === pointedRef.current) return;
    pointedRef.current = pointing;
    const rig = rigRef.current;
    choreograph(pointTracks(rig, pointing));
    if (pointing) {
      rig.wave.value = withRepeat(
        withSequence(
          withTiming(OWL_RHYTHM.pointBob, { duration: OWL_RHYTHM.pointBobMs / 2, easing: sway }),
          withTiming(-OWL_RHYTHM.pointBob, { duration: OWL_RHYTHM.pointBobMs / 2, easing: sway })
        ),
        -1,
        true
      );
    }
  }, [pointing, phase, reduceMotion]);

  useEffect(() => {
    if (sayCount <= spokenRef.current) return;
    spokenRef.current = sayCount;
    if (reduceMotion) return;
    choreograph(talkTracks(rigRef.current, Math.random()));
  }, [sayCount, reduceMotion]);

  const handleBlink = useCallback((shape: BlinkShape) => {
    choreograph([{ on: rigRef.current.lid, name: 'lid', beats: blinkBeats(shape) }]);
  }, []);

  const handleGlance = useCallback((gesture: GlanceGesture, holdMs: number) => {
    choreograph(glanceTracks(rigRef.current, gesture, holdMs));
  }, []);

  const handleRuffle = useCallback(() => {
    choreograph(ruffleTracks(rigRef.current));
  }, []);

  useOwlRhythm({
    enabled: phase === 'idle' && !reduceMotion,
    onBlink: handleBlink,
    onGlance: handleGlance,
    onRuffle: handleRuffle,
  });

  const rigStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: rise.value }],
  }));

  const bodyStyle = useAnimatedStyle(() => {
    const squash = landingSquash(land.value);
    return {
      transform: [
        { scaleX: squash.x * ruffleX.value * (1 - OWL_RIG.breathScaleX * breath.value) },
        { scaleY: squash.y * ruffleY.value * (1 + OWL_RIG.breathScaleY * breath.value) },
      ],
    };
  });

  const headStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: peekX.value },
      { translateY: bob.value - OWL_RIG.breathHeadLift * breath.value },
      { rotate: `${tilt.value + shake.value}deg` },
      { scaleX: peekScale.value },
    ],
  }));

  const lidWindowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lidReveal(lid.value, scale).windowTop }],
  }));

  const lidContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lidReveal(lid.value, scale).contentTop }],
  }));

  const beakStyle = useAnimatedStyle(() => ({ opacity: beak.value }));

  const wingStyle = useAnimatedStyle(() => {
    const pose = wingPose(wingLift.value, wave.value);
    return {
      opacity: pose.opacity,
      transform: [{ rotate: `${pose.rotate}deg` }],
    };
  });

  const eyeWindowHeight = OWL_RIG.eyeWindow.height * scale;

  return (
    <View
      style={[styles.stage, { width, height }, wingSide === 'left' && styles.mirrored]}
      testID={testID}
      pointerEvents="none"
    >
      <Animated.View style={[styles.layerBox, rigStyle]}>
        <Animated.View testID="owl-wing" style={[styles.layerBox, styles.wingOrigin, wingStyle]}>
          <Image testID="owl-layer-wing" source={OWL_LAYERS.wing} style={styles.layer} contentFit="fill" transition={0} />
        </Animated.View>

        <Animated.View testID="owl-body" style={[styles.layerBox, styles.bodyOrigin, bodyStyle]}>
          <Image testID="owl-layer-body" source={OWL_LAYERS.body} style={styles.layer} contentFit="fill" transition={0} />
        </Animated.View>

        <Animated.View testID="owl-head" style={[styles.layerBox, styles.headOrigin, headStyle]}>
          <Image testID="owl-layer-head" source={OWL_LAYERS.head} style={styles.layer} contentFit="fill" transition={0} />

          <Animated.View
            testID="owl-eye-window"
            style={[styles.eyeWindow, { width, height: eyeWindowHeight }, lidWindowStyle]}
          >
            <Animated.View style={[styles.layerBox, { width, height }, lidContentStyle]}>
              <Image testID="owl-layer-eyes" source={OWL_LAYERS.eyes} style={styles.layer} contentFit="fill" transition={0} />
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.layerBox, beakStyle]}>
            <Image testID="owl-layer-beak" source={OWL_LAYERS.beak} style={styles.layer} contentFit="fill" transition={0} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  stage: {
    overflow: 'visible',
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  layerBox: {
    ...StyleSheet.absoluteFillObject,
  },
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  wingOrigin: {
    transformOrigin: WING_ORIGIN,
  },
  bodyOrigin: {
    transformOrigin: '50% 100%',
  },
  headOrigin: {
    transformOrigin: HEAD_ORIGIN,
  },
  eyeWindow: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
});
