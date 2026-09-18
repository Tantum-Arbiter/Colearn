import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  BOOK_HALVES,
  SPLASH_LEAVES,
  SPLASH_TIMELINE,
  bookPose,
  bookShiftX,
  bookSpineOffset,
  growEase,
  layerFrame,
  leafPivotOffset,
  leafPose,
  leafUnfurlDelayMs,
  logoIntroScale,
  revealHeight,
  spineFrame,
  spineOpacity,
  type BookHalf,
  type SplashLeaf,
} from '@/constants/splash-logo';
import { SPLASH_LOGO_ART } from './splash-logo-art';

const LEAF_OVERSHOOT = 1.6;

interface GrowingLayerProps {
  layer: 'stem' | 'roots';
  growsFrom: 'bottom' | 'top';
  size: number;
  progress: SharedValue<number>;
}

function GrowingLayer({ layer, growsFrom, size, progress }: GrowingLayerProps) {
  const frame = layerFrame(layer, size);
  const anchor = growsFrom === 'bottom' ? { bottom: size - (frame.top + frame.height) } : { top: frame.top };
  const artAnchor = growsFrom === 'bottom' ? styles.artFromBottom : styles.artFromTop;
  const fullHeight = frame.height;

  const reveal = useAnimatedStyle(() => ({ height: revealHeight(progress.value, fullHeight) }));

  return (
    <Animated.View
      testID={`splash-logo-${layer}`}
      style={[styles.reveal, anchor, { left: frame.left, width: frame.width }, reveal]}
    >
      <Image
        source={SPLASH_LOGO_ART[layer]}
        style={[styles.art, artAnchor, { width: frame.width, height: frame.height }]}
        fadeDuration={0}
      />
    </Animated.View>
  );
}

interface BookHalfLayerProps {
  half: BookHalf;
  size: number;
  open: SharedValue<number>;
}

function BookHalfLayer({ half, size, open }: BookHalfLayerProps) {
  const frame = layerFrame(half, size);
  const spineX = bookSpineOffset(half, size);

  const pose = useAnimatedStyle(() => ({
    transform: [{ translateX: spineX }, { scaleX: bookPose(half, open.value).scaleX }, { translateX: -spineX }],
  }));

  return (
    <Animated.View testID={`splash-logo-${half}`} style={[styles.layer, frame, pose]}>
      <Image source={SPLASH_LOGO_ART[half]} style={styles.fill} fadeDuration={0} />
    </Animated.View>
  );
}

interface BookProps {
  size: number;
  open: SharedValue<number>;
}

function Book({ size, open }: BookProps) {
  const shift = useAnimatedStyle(() => ({ transform: [{ translateX: bookShiftX(open.value, size) }] }));
  const spine = useAnimatedStyle(() => ({ opacity: spineOpacity(open.value) }));
  const spineShape = spineFrame(size);

  return (
    <Animated.View testID="splash-logo-book" style={[StyleSheet.absoluteFill, shift]}>
      <Animated.View
        testID="splash-logo-spine"
        style={[styles.layer, styles.spine, spineShape, { borderRadius: spineShape.width / 2 }, spine]}
      />
      {BOOK_HALVES.map((half) => (
        <BookHalfLayer key={half} half={half} size={size} open={open} />
      ))}
    </Animated.View>
  );
}

interface LeafLayerProps {
  leaf: SplashLeaf;
  size: number;
  unfurl: SharedValue<number>;
  sway: SharedValue<number>;
}

function LeafLayer({ leaf, size, unfurl, sway }: LeafLayerProps) {
  const frame = layerFrame(leaf, size);
  const pivot = leafPivotOffset(leaf, size);
  const pivotX = pivot.x;
  const pivotY = pivot.y;

  const pose = useAnimatedStyle(() => {
    const { scale, rotateDeg } = leafPose(leaf, unfurl.value, sway.value);

    return {
      transform: [
        { translateX: pivotX },
        { translateY: pivotY },
        { rotate: `${rotateDeg}deg` },
        { scale },
        { translateX: -pivotX },
        { translateY: -pivotY },
      ],
    };
  });

  return (
    <Animated.View testID={`splash-logo-${leaf}`} style={[styles.layer, frame, pose]}>
      <Image source={SPLASH_LOGO_ART[leaf]} style={styles.fill} fadeDuration={0} />
    </Animated.View>
  );
}

export interface AnimatedLogoProps {
  size: number;
  playing: boolean;
  reduceMotion: boolean;
  testID?: string;
}

export function AnimatedLogo({ size, playing, reduceMotion, testID = 'splash-logo' }: AnimatedLogoProps) {
  const introScale = logoIntroScale(size);
  const scale = useSharedValue(introScale);
  const plant = useSharedValue(1);
  const book = useSharedValue(0);
  const stem = useSharedValue(0);
  const roots = useSharedValue(0);
  const leafLeft = useSharedValue(0);
  const leafRight = useSharedValue(0);
  const leafTop = useSharedValue(0);
  const wordmark = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const unfurls: Record<SplashLeaf, SharedValue<number>> = { leafLeft, leafRight, leafTop };
    const moving = [scale, plant, book, stem, roots, leafLeft, leafRight, leafTop, wordmark, sway];

    moving.forEach(cancelAnimation);

    if (reduceMotion) {
      scale.value = 1;
      book.value = 1;
      stem.value = 1;
      roots.value = 1;
      SPLASH_LEAVES.forEach((leaf) => {
        unfurls[leaf].value = 1;
      });
      sway.value = 0;
      plant.value = 0;
      plant.value = withTiming(1, { duration: SPLASH_TIMELINE.reducedMotionFadeMs });
      wordmark.value = withTiming(1, { duration: SPLASH_TIMELINE.reducedMotionFadeMs });

      return;
    }

    const grow = { easing: growEase };
    const settle = Easing.inOut(Easing.sin);
    const lastLeafOpenMs = Math.max(...SPLASH_LEAVES.map(leafUnfurlDelayMs)) + SPLASH_TIMELINE.leafUnfurlMs;

    plant.value = 1;
    book.value = withDelay(
      SPLASH_TIMELINE.book.delayMs,
      withTiming(1, { duration: SPLASH_TIMELINE.book.durationMs, ...grow })
    );
    scale.value = withDelay(
      SPLASH_TIMELINE.stem.delayMs,
      withTiming(1, { duration: SPLASH_TIMELINE.stem.durationMs, ...grow })
    );
    stem.value = withDelay(
      SPLASH_TIMELINE.stem.delayMs,
      withTiming(1, { duration: SPLASH_TIMELINE.stem.durationMs, ...grow })
    );
    roots.value = withDelay(
      SPLASH_TIMELINE.roots.delayMs,
      withTiming(1, { duration: SPLASH_TIMELINE.roots.durationMs, ...grow })
    );
    SPLASH_LEAVES.forEach((leaf) => {
      unfurls[leaf].value = withDelay(
        leafUnfurlDelayMs(leaf),
        withTiming(1, { duration: SPLASH_TIMELINE.leafUnfurlMs, easing: Easing.out(Easing.back(LEAF_OVERSHOOT)) })
      );
    });
    wordmark.value = withDelay(
      SPLASH_TIMELINE.wordmark.delayMs,
      withTiming(1, { duration: SPLASH_TIMELINE.wordmark.durationMs, easing: Easing.out(Easing.cubic) })
    );
    sway.value = withDelay(
      lastLeafOpenMs,
      withSequence(
        withTiming(1, { duration: SPLASH_TIMELINE.swayMs / 2, easing: settle }),
        withRepeat(withTiming(-1, { duration: SPLASH_TIMELINE.swayMs, easing: settle }), -1, true)
      )
    );

    return () => {
      moving.forEach(cancelAnimation);
    };
  }, [playing, reduceMotion, scale, plant, book, stem, roots, leafLeft, leafRight, leafTop, wordmark, sway]);

  const wordmarkFrame = layerFrame('wordmark', size);
  const risePx = SPLASH_TIMELINE.wordmark.risePx;

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const plantStyle = useAnimatedStyle(() => ({ opacity: plant.value }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: (1 - wordmark.value) * risePx + 0 }],
  }));

  return (
    <Animated.View testID={testID} style={[{ width: size, height: size }, logoStyle]} pointerEvents="none">
      <Book size={size} open={book} />

      <Animated.View style={[StyleSheet.absoluteFill, plantStyle]}>
        <GrowingLayer layer="roots" growsFrom="top" size={size} progress={roots} />
        <GrowingLayer layer="stem" growsFrom="bottom" size={size} progress={stem} />
        <LeafLayer leaf="leafLeft" size={size} unfurl={leafLeft} sway={sway} />
        <LeafLayer leaf="leafRight" size={size} unfurl={leafRight} sway={sway} />
        <LeafLayer leaf="leafTop" size={size} unfurl={leafTop} sway={sway} />
      </Animated.View>

      <Animated.View testID="splash-logo-wordmark" style={[styles.layer, wordmarkFrame, wordmarkStyle]}>
        <Image source={SPLASH_LOGO_ART.wordmark} style={styles.fill} fadeDuration={0} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
  },
  reveal: {
    position: 'absolute',
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    left: 0,
  },
  artFromBottom: {
    bottom: 0,
  },
  artFromTop: {
    top: 0,
  },
  spine: {
    backgroundColor: '#FFFFFF',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
});
