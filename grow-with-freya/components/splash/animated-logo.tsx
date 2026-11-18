import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  BOOK_HALVES,
  OUTLINE_STROKES,
  ROOT_STRAND_COUNT,
  SPLASH_LEAVES,
  SPLASH_TIMELINE,
  bookPose,
  bookSpineOffset,
  coverSkewYDeg,
  growEase,
  layerFrame,
  leafPivotOffset,
  leafPose,
  leafUnfurlDelayMs,
  logoIntroScale,
  outlineLength,
  outlineOpacity,
  outlinePath,
  outlineStrokeDrawn,
  outlineStrokeWidth,
  penDashArray,
  penDashOffset,
  revealHeight,
  rootStrandDrawn,
  rootStrandLength,
  rootStrandPath,
  rootsStrokeWidth,
  spineFrame,
  spineOpacity,
  type BookHalf,
  type OutlineStroke,
  type SplashLeaf,
} from '@/constants/splash-logo';
import { SPLASH_LOGO_ART } from './splash-logo-art';

const LEAF_OVERSHOOT = 1.6;
const INK = '#FFFFFF';
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface StemLayerProps {
  size: number;
  progress: SharedValue<number>;
}

function StemLayer({ size, progress }: StemLayerProps) {
  const frame = layerFrame('stem', size);
  const fullHeight = frame.height;

  const reveal = useAnimatedStyle(() => ({ height: revealHeight(progress.value, fullHeight) }));

  return (
    <Animated.View
      testID="splash-logo-stem"
      style={[styles.reveal, { bottom: size - (frame.top + frame.height), left: frame.left, width: frame.width }, reveal]}
    >
      <Image
        source={SPLASH_LOGO_ART.stem}
        style={[styles.art, styles.artFromBottom, { width: frame.width, height: frame.height }]}
        fadeDuration={0}
      />
    </Animated.View>
  );
}

interface RootStrandLayerProps {
  index: number;
  size: number;
  clock: SharedValue<number>;
}

function RootStrandLayer({ index, size, clock }: RootStrandLayerProps) {
  const path = rootStrandPath(index, size);
  const length = rootStrandLength(index, size);
  const width = rootsStrokeWidth(size);

  const pen = useAnimatedProps(() => ({
    strokeDashoffset: penDashOffset(length, width, rootStrandDrawn(index, clock.value)),
  }));

  return (
    <AnimatedPath
      d={path}
      stroke={INK}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={penDashArray(length, width)}
      animatedProps={pen}
    />
  );
}

interface RootsProps {
  size: number;
  clock: SharedValue<number>;
  ink: SharedValue<number>;
}

function Roots({ size, clock, ink }: RootsProps) {
  const frame = layerFrame('roots', size);
  const inked = useAnimatedStyle(() => ({ opacity: ink.value }));
  const drawn = useAnimatedStyle(() => ({ opacity: outlineOpacity(ink.value) }));

  return (
    <>
      <Animated.View testID="splash-logo-roots" style={[styles.layer, frame, inked]}>
        <Image source={SPLASH_LOGO_ART.roots} style={styles.fill} fadeDuration={0} />
      </Animated.View>
      <Animated.View testID="splash-logo-root-strands" style={[StyleSheet.absoluteFill, drawn]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {Array.from({ length: ROOT_STRAND_COUNT }, (_, index) => (
            <RootStrandLayer key={index} index={index} size={size} clock={clock} />
          ))}
        </Svg>
      </Animated.View>
    </>
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

  const pose = useAnimatedStyle(() => {
    const turned = bookPose(half, open.value);

    return {
      transform: [
        { translateX: spineX },
        { scaleX: turned.scaleX },
        { skewY: `${coverSkewYDeg(turned)}deg` },
        { translateX: -spineX },
      ],
    };
  });

  return (
    <Animated.View testID={`splash-logo-${half}`} style={[styles.layer, frame, pose]}>
      <Image source={SPLASH_LOGO_ART[half]} style={styles.fill} fadeDuration={0} />
    </Animated.View>
  );
}

interface OutlineStrokeLayerProps {
  stroke: OutlineStroke;
  size: number;
  drawn: SharedValue<number>;
}

function OutlineStrokeLayer({ stroke, size, drawn }: OutlineStrokeLayerProps) {
  const path = outlinePath(stroke, size);
  const length = outlineLength(stroke, size);
  const width = outlineStrokeWidth(size);

  const pen = useAnimatedProps(() => ({
    strokeDashoffset: penDashOffset(length, width, outlineStrokeDrawn(stroke, drawn.value)),
  }));

  return (
    <AnimatedPath
      d={path}
      stroke={INK}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={penDashArray(length, width)}
      animatedProps={pen}
    />
  );
}

interface BookOutlineProps {
  size: number;
  drawn: SharedValue<number>;
  ink: SharedValue<number>;
}

function BookOutline({ size, drawn, ink }: BookOutlineProps) {
  const fade = useAnimatedStyle(() => ({ opacity: outlineOpacity(ink.value) }));

  return (
    <Animated.View testID="splash-logo-outline" style={[StyleSheet.absoluteFill, fade]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {OUTLINE_STROKES.map((stroke) => (
          <OutlineStrokeLayer key={stroke} stroke={stroke} size={size} drawn={drawn} />
        ))}
      </Svg>
    </Animated.View>
  );
}

interface BookProps {
  size: number;
  open: SharedValue<number>;
  drawn: SharedValue<number>;
  ink: SharedValue<number>;
}

function Book({ size, open, drawn, ink }: BookProps) {
  const spine = useAnimatedStyle(() => ({ opacity: spineOpacity(open.value) }));
  const inked = useAnimatedStyle(() => ({ opacity: ink.value }));
  const spineShape = spineFrame(size);

  return (
    <View testID="splash-logo-book" style={StyleSheet.absoluteFill}>
      <Animated.View testID="splash-logo-ink" style={[StyleSheet.absoluteFill, inked]}>
        <Animated.View
          testID="splash-logo-spine"
          style={[styles.layer, styles.spine, spineShape, { borderRadius: spineShape.width / 2 }, spine]}
        />
        {BOOK_HALVES.map((half) => (
          <BookHalfLayer key={half} half={half} size={size} open={open} />
        ))}
      </Animated.View>
      <BookOutline size={size} drawn={drawn} ink={ink} />
    </View>
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
  const drawn = useSharedValue(0);
  const ink = useSharedValue(0);
  const book = useSharedValue(0);
  const stem = useSharedValue(0);
  const rootsClock = useSharedValue(0);
  const rootsInk = useSharedValue(0);
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
    const moving = [scale, plant, drawn, ink, book, stem, rootsClock, rootsInk, leafLeft, leafRight, leafTop, wordmark, sway];

    moving.forEach(cancelAnimation);

    if (reduceMotion) {
      scale.value = 1;
      drawn.value = 1;
      ink.value = 1;
      book.value = 1;
      stem.value = 1;
      rootsClock.value = SPLASH_TIMELINE.roots.drawMs;
      rootsInk.value = 1;
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
    drawn.value = withDelay(
      SPLASH_TIMELINE.outline.delayMs,
      withTiming(1, { duration: SPLASH_TIMELINE.outline.durationMs, ...grow })
    );
    ink.value = withDelay(
      SPLASH_TIMELINE.ink.delayMs,
      withTiming(1, { duration: SPLASH_TIMELINE.ink.durationMs, easing: Easing.inOut(Easing.quad) })
    );
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
    rootsClock.value = withDelay(
      SPLASH_TIMELINE.roots.delayMs,
      withTiming(SPLASH_TIMELINE.roots.drawMs, { duration: SPLASH_TIMELINE.roots.drawMs, easing: Easing.linear })
    );
    rootsInk.value = withDelay(
      SPLASH_TIMELINE.roots.delayMs + SPLASH_TIMELINE.roots.drawMs,
      withTiming(1, { duration: SPLASH_TIMELINE.roots.inkMs, easing: Easing.inOut(Easing.quad) })
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
  }, [playing, reduceMotion, scale, plant, drawn, ink, book, stem, rootsClock, rootsInk, leafLeft, leafRight, leafTop, wordmark, sway]);

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
      <Book size={size} open={book} drawn={drawn} ink={ink} />

      <Animated.View style={[StyleSheet.absoluteFill, plantStyle]}>
        <Roots size={size} clock={rootsClock} ink={rootsInk} />
        <StemLayer size={size} progress={stem} />
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
  spine: {
    backgroundColor: '#FFFFFF',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
});
