import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  previewFrames,
  sheetPoint,
  stripTint,
  type PreviewFrame,
} from '@/constants/story-page-preview';

export interface StoryPageSlideshowProps {
  story: Story;
  isCurrent: boolean;
  width: number;
  height: number;
}

const CAST_COLORS = ['rgba(4, 9, 31, 0.6)', 'rgba(4, 9, 31, 0.18)', 'rgba(4, 9, 31, 0)'] as const;
const CAST_LOCATIONS = [0, 0.35, 0.8] as const;

export function StoryPageSlideshow({ story, isCurrent, width, height }: StoryPageSlideshowProps) {
  const frames = useMemo(() => previewFrames(story), [story]);

  if (frames.length === 0) {
    return null;
  }
  if (!isCurrent || frames.length < 2) {
    return <Frame source={frames[0]} width={width} height={height} testID="story-page-preview-page" />;
  }
  return <PageTurns frames={frames} width={width} height={height} />;
}

interface FrameProps {
  source: PreviewFrame;
  width: number;
  height: number;
  offset?: number;
  testID: string;
}

function Frame({ source, width, height, offset = 0, testID }: FrameProps) {
  return (
    <ExpoImage
      source={source}
      style={{ position: 'absolute', top: 0, left: offset, width, height }}
      contentFit="cover"
      cachePolicy="memory-disk"
      priority="high"
      testID={testID}
    />
  );
}

interface PageTurnsProps {
  frames: PreviewFrame[];
  width: number;
  height: number;
}

type TurnPhase = 'rest' | 'staged' | 'turning';

function PageTurns({ frames, width, height }: PageTurnsProps) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<TurnPhase>('rest');
  const [turns, setTurns] = useState(0);

  useEffect(() => {
    const { dwellMs, prepareMs } = STORY_PAGE_PREVIEW;
    const stage = setTimeout(() => setPhase('staged'), dwellMs - prepareMs);
    const turn = setTimeout(() => setPhase('turning'), dwellMs);
    return () => {
      clearTimeout(stage);
      clearTimeout(turn);
    };
  }, [turns]);

  const landed = useCallback(() => {
    setShown((index) => nextFrame(index, frames.length));
    setPhase('rest');
    setTurns((count) => count + 1);
  }, [frames.length]);

  const current = Math.min(shown, frames.length - 1);
  const next = nextFrame(current, frames.length);
  const stage = {
    from: frames[current],
    to: frames[next],
    turning: phase === 'turning',
    onLanded: landed,
    width,
    height,
  };

  return (
    <View style={{ width, height }} testID="story-page-preview-playing">
      <Frame key={`base-${frameKey(frames[next])}`} source={frames[next]} width={width} height={height} testID="story-page-preview-base" />
      <Frame key={`base-${frameKey(frames[current])}`} source={frames[current]} width={width} height={height} testID="story-page-preview-base" />
      {phase !== 'rest' && (reduceMotion ? <PageFade key={turns} {...stage} /> : <PageTurn key={turns} {...stage} />)}
    </View>
  );
}

interface StageProps {
  from: PreviewFrame;
  to: PreviewFrame;
  turning: boolean;
  onLanded: () => void;
  width: number;
  height: number;
}

function useTurnProgress(turning: boolean, durationMs: number, onLanded: () => void) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!turning) {
      return undefined;
    }
    progress.value = withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(onLanded)();
      }
    });
    return () => cancelAnimation(progress);
  }, [turning, durationMs, onLanded, progress]);

  return progress;
}

function PageTurn({ from, to, turning, onLanded, width, height }: StageProps) {
  const progress = useTurnProgress(turning, STORY_PAGE_PREVIEW.turnMs, onLanded);
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
    <>
      <View style={[styles.half, { left: 0, width: half, height }]}>
        <Frame source={from} width={width} height={height} testID="story-page-preview-page" />
        <Animated.View style={[StyleSheet.absoluteFill, landingStyle]} pointerEvents="none">
          <LinearGradient colors={CAST_COLORS} locations={CAST_LOCATIONS} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>

      <View style={[styles.half, { left: half, width: half, height }]}>
        <Frame source={to} width={width} height={height} offset={-half} testID="story-page-preview-next" />
        <Animated.View style={[styles.liftShadow, { width: castWidth, height }, liftStyle]} pointerEvents="none">
          <LinearGradient colors={CAST_COLORS} locations={CAST_LOCATIONS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>

      <View style={[styles.leaf, { left: half, width: half, height }]} testID="story-page-preview-leaf" pointerEvents="none">
        {Array.from({ length: strips }, (_, index) => (
          <Strip key={index} index={index} count={strips} half={half} width={width} height={height} from={from} to={to} progress={progress} />
        ))}
      </View>
      {!turning && <Frame source={from} width={width} height={height} testID="story-page-preview-still" />}
    </>
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
  progress: { value: number };
}

function Strip({ index, count, half, width, height, from, to, progress }: StripProps) {
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
      <Frame source={from} width={width} height={height} offset={-(half + a)} testID="story-page-preview-page" />
      <Animated.View style={[styles.face, styles.backFace, backStyle]} testID="story-page-preview-back">
        <Frame source={to} width={width} height={height} offset={b - half} testID="story-page-preview-next" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, tintStyle]} testID="story-page-preview-tint" />
    </Animated.View>
  );
}

function PageFade({ from, to, turning, onLanded, width, height }: StageProps) {
  const progress = useTurnProgress(turning, STORY_PAGE_PREVIEW.fadeMs, onLanded);
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
});
