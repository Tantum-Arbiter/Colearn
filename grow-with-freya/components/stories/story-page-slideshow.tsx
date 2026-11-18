import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Story } from '@/types/story';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  STORY_PAGE_PREVIEW,
  cornerPose,
  faceMix,
  foldState,
  frameKey,
  landingShadow,
  leadProgress,
  liftShadow,
  nextFrame,
  pageFrame,
  pagePlaces,
  previewFrames,
  sheetPoint,
  stripTint,
  turnsBack,
  warmFrames,
  type PreviewFrame,
} from '@/constants/story-page-preview';

export interface StoryPageSlideshowProps {
  story: Story;
  isCurrent: boolean;
  width: number;
  height: number;
  heldPage?: number | null;
  onPickTurning?: (turning: boolean) => void;
}

const CAST_COLORS = ['rgba(4, 9, 31, 0.6)', 'rgba(4, 9, 31, 0.18)', 'rgba(4, 9, 31, 0)'] as const;
const CAST_LOCATIONS = [0, 0.35, 0.8] as const;

export function StoryPageSlideshow({ story, isCurrent, width, height, heldPage = null, onPickTurning }: StoryPageSlideshowProps) {
  const frames = useMemo(() => previewFrames(story), [story]);
  const held = useMemo(() => (heldPage === null ? null : pageFrame(story, heldPage) ?? null), [story, heldPage]);
  const warm = useMemo(() => (isCurrent ? warmFrames(story) : []), [story, isCurrent]);
  const places = useMemo(() => pagePlaces(story), [story]);

  if (frames.length === 0 && !held) {
    return null;
  }
  return (
    <>
      {warm.length > 0 ? <Warmth frames={warm} width={width} height={height} /> : null}
      {!isCurrent || frames.length < 2 ? (
        <Frame source={held ?? frames[0]} width={width} height={height} testID="story-page-preview-page" />
      ) : (
        <PageTurns frames={frames} heldFrame={held} places={places} width={width} height={height} onPickTurning={onPickTurning} />
      )}
    </>
  );
}

interface WarmthProps {
  frames: PreviewFrame[];
  width: number;
  height: number;
}

function Warmth({ frames, width, height }: WarmthProps) {
  return (
    <View
      style={[styles.warmth, { width, height }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="story-page-preview-warmth"
    >
      {frames.map((frame) => (
        <Frame key={frameKey(frame)} source={frame} width={width} height={height} testID="story-page-preview-warm" />
      ))}
    </View>
  );
}

interface FrameProps {
  source: PreviewFrame;
  width: number;
  height: number;
  offset?: number;
  mirrored?: boolean;
  testID: string;
}

function Frame({ source, width, height, offset = 0, mirrored = false, testID }: FrameProps) {
  return (
    <ExpoImage
      source={source}
      style={[{ position: 'absolute', top: 0, left: offset, width, height }, mirrored && styles.mirrored]}
      contentFit="cover"
      cachePolicy="memory-disk"
      priority="high"
      testID={testID}
    />
  );
}

interface PageTurnsProps {
  frames: PreviewFrame[];
  heldFrame: PreviewFrame | null;
  places: Map<string, number>;
  width: number;
  height: number;
  onPickTurning?: (turning: boolean) => void;
}

interface Target {
  to: PreviewFrame;
  index: number | null;
  back: boolean;
  backward: boolean;
}

function PageTurns({ frames, heldFrame, places, width, height, onPickTurning }: PageTurnsProps) {
  const reduceMotion = useReducedMotion();
  const [rest, setRest] = useState<PreviewFrame>(frames[0]);
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<Target | null>(null);
  const [ready, setReady] = useState(false);
  const [turning, setTurning] = useState(false);
  const [turns, setTurns] = useState(0);
  const [pickSeen, setPickSeen] = useState<string | null>(null);
  const heldKey = heldFrame === null ? null : frameKey(heldFrame);
  const holding = heldKey !== null && heldKey === frameKey(rest);

  if (heldKey !== pickSeen) {
    setPickSeen(heldKey);
    if (heldFrame !== null && holding) {
      setTarget((current) => (current === null ? current : { ...current, back: true }));
    } else if (heldFrame !== null) {
      setTarget((current) => ({
        to: heldFrame,
        index: null,
        back: false,
        backward: current === null ? turnsBack(places, rest, heldFrame) : current.backward,
      }));
      setTurning(true);
    }
  }
  const heldRef = useRef(heldFrame);
  const framesRef = useRef(frames);
  const reportRef = useRef(onPickTurning);
  const picked = target !== null && (target.index === null || target.back);

  useEffect(() => {
    heldRef.current = heldFrame;
    framesRef.current = frames;
    reportRef.current = onPickTurning;
  });

  useEffect(() => {
    if (!picked) {
      return undefined;
    }
    const report = reportRef.current;
    report?.(true);
    return () => report?.(false);
  }, [picked]);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), STORY_PAGE_PREVIEW.readyMs);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const turn = setTimeout(() => {
      if (heldRef.current !== null) {
        return;
      }
      const coming = nextFrame(index, framesRef.current.length);
      setTarget({ to: framesRef.current[coming], index: coming, back: false, backward: false });
      setTurning(true);
    }, STORY_PAGE_PREVIEW.dwellMs);
    return () => clearTimeout(turn);
  }, [turns, frames.length, index]);

  const landed = useCallback(() => {
    if (target && !target.back) {
      setRest(target.to);
      if (target.index !== null) {
        setIndex(target.index);
      }
    }
    setTarget(null);
    setTurning(false);
    setTurns((count) => count + 1);
  }, [target]);

  const next = target?.to ?? frames[nextFrame(index, frames.length)];
  const stage = {
    from: rest,
    to: next,
    turning,
    back: target?.back ?? false,
    backward: target?.backward ?? false,
    picked,
    onLanded: landed,
    width,
    height,
  };

  return (
    <View style={{ width, height }} testID={holding && !turning ? 'story-page-preview-held' : 'story-page-preview-playing'}>
      <Frame key={`base-${frameKey(next)}`} source={next} width={width} height={height} testID="story-page-preview-base" />
      <Frame key={`base-${frameKey(rest)}`} source={rest} width={width} height={height} testID="story-page-preview-base" />
      {(ready || turning) && (reduceMotion ? <PageFade key={turns} {...stage} /> : <PageTurn key={turns} {...stage} />)}
    </View>
  );
}

interface StageProps {
  from: PreviewFrame;
  to: PreviewFrame;
  turning: boolean;
  back: boolean;
  backward: boolean;
  picked: boolean;
  onLanded: () => void;
  width: number;
  height: number;
}

function useTurnProgress(turning: boolean, back: boolean, durationMs: number, picked: boolean, onLanded: () => void) {
  const progress = useSharedValue(0);
  const latest = useRef({ picked, onLanded });

  useEffect(() => {
    latest.current = { picked, onLanded };
  });

  const land = useCallback(() => latest.current.onLanded(), []);

  useEffect(() => {
    if (!turning) {
      return undefined;
    }
    const end = back ? 0 : 1;
    const easing = latest.current.picked ? Easing.out(Easing.sin) : Easing.inOut(Easing.cubic);
    progress.value = withTiming(end, { duration: durationMs * Math.abs(end - progress.value), easing }, (finished) => {
      if (finished) {
        runOnJS(land)();
      }
    });
    return () => cancelAnimation(progress);
  }, [turning, back, durationMs, land, progress]);

  return progress;
}

function PageTurn({ from, to, turning, back, backward, picked, onLanded, width, height }: StageProps) {
  const progress = useTurnProgress(turning, back, STORY_PAGE_PREVIEW.turnMs, picked, onLanded);
  const half = width / 2;
  const strips = STORY_PAGE_PREVIEW.curl.strips;
  const castWidth = half * STORY_PAGE_PREVIEW.curl.castWidth;

  const landingStyle = useAnimatedStyle(() => ({ opacity: landingShadow(progress.value) }));
  const liftStyle = useAnimatedStyle(() => {
    const { phi, bend } = foldState(leadProgress(progress.value, 0.5), half);
    const shadow = liftShadow(phi, bend, half);
    return { opacity: shadow.opacity, transform: [{ translateX: shadow.translateX }] };
  });

  return (
    <View style={[StyleSheet.absoluteFill, backward && styles.mirrored]} testID="story-page-preview-stage">
      <View style={[styles.half, { left: 0, width: half, height }]}>
        <Frame source={from} width={width} height={height} mirrored={backward} testID="story-page-preview-page" />
        <Animated.View style={[StyleSheet.absoluteFill, landingStyle]} pointerEvents="none">
          <LinearGradient colors={CAST_COLORS} locations={CAST_LOCATIONS} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>

      <View style={[styles.half, { left: half, width: half, height }]}>
        <Frame key={frameKey(to)} source={to} width={width} height={height} offset={-half} mirrored={backward} testID="story-page-preview-under" />
        <Animated.View style={[styles.liftShadow, { width: castWidth, height }, liftStyle]} pointerEvents="none">
          <LinearGradient colors={CAST_COLORS} locations={CAST_LOCATIONS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>

      <View style={[styles.leaf, { left: half, width: half, height }]} testID="story-page-preview-leaf" pointerEvents="none">
        {Array.from({ length: strips }, (_, index) => (
          <Strip key={index} index={index} count={strips} half={half} width={width} height={height} from={from} to={to} mirrored={backward} progress={progress} />
        ))}
      </View>
      {!turning && <Frame source={from} width={width} height={height} testID="story-page-preview-still" />}
    </View>
  );
}

interface StripProps {
  index: number;
  count: number;
  half: number;
  width: number;
  height: number;
  from: PreviewFrame;
  to: PreviewFrame;
  mirrored: boolean;
  progress: { value: number };
}

function Strip({ index, count, half, width, height, from, to, mirrored, progress }: StripProps) {
  const stripWidth = half / count;
  const isLast = index === count - 1;
  const a = index * stripWidth;
  const b = a + stripWidth + (isLast ? 0 : STORY_PAGE_PREVIEW.curl.overlap);
  const mid = (a + b) / 2;

  const poseStyle = useAnimatedStyle(() => {
    const pose = cornerPose(a, b, progress.value, half, height);
    return { transform: [{ translateX: pose.translateX }, { skewX: pose.skewX }, { scaleX: pose.scaleX }] };
  });
  const backStyle = useAnimatedStyle(() => {
    const { phi, bend } = foldState(leadProgress(progress.value, 0.5), half);
    return { opacity: faceMix(sheetPoint(mid, phi, bend).theta) };
  });
  const tintStyle = useAnimatedStyle(() => {
    const { phi, bend } = foldState(leadProgress(progress.value, 0.5), half);
    const pose = cornerPose(a, b, progress.value, half, height);
    return { backgroundColor: stripTint(sheetPoint(mid, phi, bend).theta, pose.scaleX) };
  });

  return (
    <Animated.View style={[styles.strip, { left: a, width: b - a, height }, poseStyle]} testID="story-page-preview-strip">
      <Frame source={from} width={width} height={height} offset={-(half + a)} mirrored={mirrored} testID="story-page-preview-page" />
      <Animated.View style={[styles.face, styles.backFace, backStyle]} testID="story-page-preview-back">
        <Frame source={to} width={width} height={height} offset={b - half} mirrored={mirrored} testID="story-page-preview-next" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, tintStyle]} testID="story-page-preview-tint" />
    </Animated.View>
  );
}

function PageFade({ from, to, turning, back, picked, onLanded, width, height }: StageProps) {
  const progress = useTurnProgress(turning, back, STORY_PAGE_PREVIEW.fadeMs, picked, onLanded);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));

  return (
    <>
      <Frame source={to} width={width} height={height} testID="story-page-preview-next" />
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]} testID="story-page-preview-fade" pointerEvents="none">
        <Frame source={from} width={width} height={height} testID="story-page-preview-page" />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  warmth: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0,
  },
  half: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  liftShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  leaf: {
    position: 'absolute',
    top: 0,
  },
  strip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  face: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  backFace: {
    transform: [{ scaleX: -1 }],
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
});
