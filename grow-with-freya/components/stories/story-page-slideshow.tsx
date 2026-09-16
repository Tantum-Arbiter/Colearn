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
  castShadows,
  leafFaces,
  leafPose,
  leafShade,
  nextFrame,
  previewFrames,
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

function PageTurns({ frames, width, height }: PageTurnsProps) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);
  const [turning, setTurning] = useState(false);
  const [turns, setTurns] = useState(0);

  useEffect(() => {
    if (turning) {
      return undefined;
    }
    const timer = setTimeout(() => setTurning(true), STORY_PAGE_PREVIEW.dwellMs);
    return () => clearTimeout(timer);
  }, [turning]);

  const landed = useCallback(() => {
    setShown((index) => nextFrame(index, frames.length));
    setTurning(false);
    setTurns((count) => count + 1);
  }, [frames.length]);

  const current = Math.min(shown, frames.length - 1);
  const stage = {
    from: frames[current],
    to: frames[nextFrame(current, frames.length)],
    turning,
    onLanded: landed,
    width,
    height,
  };

  return (
    <View style={{ width, height }} testID="story-page-preview-playing">
      {reduceMotion ? <PageFade key={turns} {...stage} /> : <PageTurn key={turns} {...stage} />}
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

  const leafStyle = useAnimatedStyle(() => leafPose(progress.value, width));
  const frontStyle = useAnimatedStyle(() => ({ opacity: leafFaces(progress.value).front }));
  const backStyle = useAnimatedStyle(() => ({ opacity: leafFaces(progress.value).back }));
  const frontShadeStyle = useAnimatedStyle(() => ({ opacity: leafShade(progress.value).front }));
  const backShadeStyle = useAnimatedStyle(() => ({ opacity: leafShade(progress.value).back }));
  const leftCastStyle = useAnimatedStyle(() => ({ opacity: castShadows(progress.value).left }));
  const rightCastStyle = useAnimatedStyle(() => ({ opacity: castShadows(progress.value).right }));

  return (
    <>
      <View style={[styles.half, { left: 0, width: half, height }]}>
        <Frame source={from} width={width} height={height} testID="story-page-preview-page" />
        <Animated.View style={[StyleSheet.absoluteFill, leftCastStyle]} pointerEvents="none">
          <LinearGradient colors={CAST_COLORS} locations={CAST_LOCATIONS} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>

      <View style={[styles.half, { left: half, width: half, height }]}>
        <Frame source={to} width={width} height={height} offset={-half} testID="story-page-preview-next" />
        <Animated.View style={[StyleSheet.absoluteFill, rightCastStyle]} pointerEvents="none">
          <LinearGradient colors={CAST_COLORS} locations={CAST_LOCATIONS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.leaf, { left: half, width: half, height }, leafStyle]} testID="story-page-preview-leaf" pointerEvents="none">
        <Animated.View style={[styles.face, frontStyle]}>
          <Frame source={from} width={width} height={height} offset={-half} testID="story-page-preview-page" />
          <Animated.View style={[styles.shade, frontShadeStyle]} />
        </Animated.View>
        <Animated.View style={[styles.face, styles.backFace, backStyle]}>
          <Frame source={to} width={width} height={height} testID="story-page-preview-next" />
          <Animated.View style={[styles.shade, backShadeStyle]} />
        </Animated.View>
      </Animated.View>
    </>
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
  leaf: {
    position: 'absolute',
    top: 0,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  backFace: {
    transform: [{ scaleX: -1 }],
  },
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#04091F',
  },
});
