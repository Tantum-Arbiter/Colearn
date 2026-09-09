import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useOwlGuide } from '@/contexts/owl-guide-context';
import {
  DEFAULT_BUBBLE_HEIGHT,
  GUIDE_BUTTON_KEYS,
  GUIDE_TIMING,
  guideRevealShift,
  guideSteps,
  placeGuideBubble,
  planGuideLayout,
  rectsOverlap,
  spotlightFrame,
  type GuideId,
  type SpotlightShape,
  type TargetRect,
} from '@/constants/owl-guide';
import { owlPerchFrame, type OwlPhase } from '@/constants/owl-companion';
import { OwlPerch } from '@/components/screen-time/owl-perch';
import { OwlSpeechBubble } from '@/components/screen-time/owl-speech-bubble';
import { GuideSpotlight } from './guide-spotlight';
import { ScreenTimeRingLegend } from './screen-time-ring-legend';
import { useGuideTargets, type GuideTargetRefs } from './use-guide-targets';
import type { GuideScroller } from './use-guide-scroller';

const ILLUSTRATIONS = {
  screenTimeRing: <ScreenTimeRingLegend />,
} as const;

const NO_TARGETS: GuideTargetRefs = {};

/** How far the owl fades back when it would otherwise cover its own subject. */
export const PERCH_STEP_BACK = 0.18;

/**
 * How many times one step will ask the page to move.
 *
 * Two, because a page's first scroll is clamped to the end it had before the
 * room it reserved was laid out, so it arrives one render short. More than
 * that and a page that keeps under-delivering would inch along for seconds.
 */
const REVEALS_PER_STEP = 2;

export interface OwlGuideProps {
  id: GuideId;
  active?: boolean;
  targets?: GuideTargetRefs;
  replay?: boolean;
  delayMs?: number;
  /** A page that can move, so a buried highlight is scrolled into the clear
   *  rather than the bubble being lifted off the owl to reach it. */
  scroller?: GuideScroller;
  onEnd?: () => void;
  testID?: string;
}

export function OwlGuide({
  id,
  active = true,
  targets = NO_TARGETS,
  replay = false,
  delayMs,
  scroller,
  onEnd,
  testID = 'owl-guide',
}: OwlGuideProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const guide = useOwlGuide();

  const isMine = guide.activeGuide === id;
  const [replaying, setReplaying] = useState(false);
  const [phase, setPhase] = useState<OwlPhase>('arrive');
  const [sayCount, setSayCount] = useState(0);
  const [bubbleHeight, setBubbleHeight] = useState(DEFAULT_BUBBLE_HEIGHT);
  const endedRef = useRef(false);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const layout = useMemo(() => planGuideLayout({ width, height }), [width, height]);
  const wantsToStart = active && guide.isLoaded && guide.activeGuide === null && (replay || guide.shouldShowGuide(id));

  useEffect(() => {
    if (!wantsToStart) return;
    const wait = delayMs ?? (layout.landscape ? GUIDE_TIMING.landscapeShowDelayMs : GUIDE_TIMING.showDelayMs);
    const timer = setTimeout(() => {
      setReplaying(replay);
      setPhase('arrive');
      setSayCount(0);
      endedRef.current = false;
      guide.startGuide(id);
    }, wait);
    return () => clearTimeout(timer);
  }, [wantsToStart, delayMs, layout.landscape, replay, id, guide]);

  const frameKey = `${width}x${height}`;
  // bumped whenever the page has been moved, so the targets are measured
  // again in the view the scroll came to rest in
  const [moves, setMoves] = useState(0);
  /** What this step has asked the page for, and the measurement it last asked on. */
  const [asked, setAsked] = useState<{ at: number; owed: number; times: number } | null>(null);
  const measurements = useGuideTargets(targets, isMine, guide.stepIndex, frameKey, moves);
  const steps = useMemo(() => guideSteps(id, Object.keys(targets)), [id, targets]);
  const step = steps[Math.min(guide.stepIndex, Math.max(steps.length - 1, 0))];
  // only rects taken for this step: between steps the ones on hand are still
  // the last step's, read in whatever view that step had scrolled the page to,
  // and a ring drawn from those marks where the subject was standing a moment
  // ago rather than where it is
  const freshlyMeasured = measurements.ready && measurements.step === guide.stepIndex;
  const rect = step?.target && freshlyMeasured ? measurements.rects[step.target] ?? null : null;
  const perch = useMemo(() => owlPerchFrame(layout.owlWidth), [layout.owlWidth]);
  // worked out in the render the measurement lands in, not in an effect after
  // it: an effect renders once with the old view first, and that frame is a
  // spotlight cut around where the highlight used to be
  // a pinned subject is furniture the page cannot move, so asking for room
  // only walks the page off the thing being talked about and back again
  const owed =
    scroller && rect && !step?.pinned
      ? guideRevealShift(
          { width, height },
          insets,
          { width: perch.width, height: perch.height },
          { maxWidth: layout.bubbleMaxWidth, height: bubbleHeight },
          layout.landscape,
          rect
        )
      : 0;
  // A page does not always travel the whole way it was asked for in one go --
  // the room it reserves to do it in only exists a render later. So the step
  // asks a second time while the page is still closing the gap, and gives up
  // once it has had its turns or an ask stops making any progress.
  const answered = asked !== null && measurements.revision !== asked.at;
  const worthAsking =
    owed !== 0 &&
    (asked === null ||
      (answered && asked.times < REVEALS_PER_STEP && Math.abs(owed) < Math.abs(asked.owed)));

  // nothing honest to draw around a highlight the page is still going to move,
  // nor while it moves. Once it has settled the highlight is spotlit wherever
  // it ended up -- a page with nothing left to give still gets its ring, it is
  // just not as clear of the bubble as it might have been.
  const waiting = owed !== 0 && (!answered || worthAsking);
  const target = waiting ? null : rect;
  const placement = useMemo(
    () =>
      placeGuideBubble(
        { width, height },
        insets,
        { width: perch.width, height: perch.height },
        { maxWidth: layout.bubbleMaxWidth, height: bubbleHeight },
        layout.landscape
      ),
    [width, height, insets, perch.width, perch.height, layout.bubbleMaxWidth, layout.landscape, bubbleHeight]
  );

  // A step measures the page where the last one left it and moves it from
  // there. The page used to be carried home first and sent out again, which
  // was a bounce between every pair of steps and left the ring drawn over a
  // page in motion.
  useEffect(() => {
    setAsked(null);
  }, [guide.stepIndex]);

  // and the page is given back whole when this guide is done with it --
  // finished, skipped, or the screen left underneath it
  useEffect(() => {
    if (!isMine) return;
    return () => scroller?.release();
  }, [isMine, scroller]);

  // asked for once a step: a page with nothing left to give would otherwise be
  // asked again on every re-measure, and never stop
  // Guarded on isMine because a screen mounts every tour it can run at once
  // and they share the page's scroller -- the step index is the guide's, not
  // this instance's.
  useEffect(() => {
    if (!scroller || !isMine || !worthAsking) return;
    setAsked((last) => ({ at: measurements.revision, owed, times: (last?.times ?? 0) + 1 }));
    scroller.reveal(owed);
    setMoves((count) => count + 1);
  }, [scroller, isMine, worthAsking, owed, measurements.revision]);

  // Which step's words the bubble is showing. It lags the guide's own index:
  // the spotlight lands on the new subject first and is left alone for a beat,
  // so the eye has already gone with it by the time the words change.
  const [shownIndex, setShownIndex] = useState(0);
  // Measured, and settled wherever the page came to rest for it. A subject
  // that cannot be measured at all still counts as landed -- the owl speaks
  // about it without a ring, the way it always has, rather than the words
  // waiting for something that is never coming.
  const landedOnSubject = !step?.target || (freshlyMeasured && !waiting);

  useEffect(() => {
    if (!isMine) setShownIndex(0);
  }, [isMine]);

  useEffect(() => {
    if (shownIndex === guide.stepIndex || !landedOnSubject) return;
    const timer = setTimeout(() => setShownIndex(guide.stepIndex), GUIDE_TIMING.highlightLeadMs);
    return () => clearTimeout(timer);
  }, [shownIndex, guide.stepIndex, landedOnSubject]);

  const finish = useCallback(
    (how: 'complete' | 'skip') => {
      if (endedRef.current) return;
      endedRef.current = true;
      scroller?.release();
      if (replaying) {
        guide.dismissGuide();
      } else if (how === 'complete') {
        guide.completeGuide();
      } else {
        guide.skipGuide();
      }
      onEndRef.current?.();
    },
    [guide, replaying]
  );

  const handlePhaseEnd = useCallback(
    (ended: OwlPhase) => {
      if (ended === 'arrive') {
        setPhase('idle');
        setSayCount((count) => count + 1);
      } else if (ended === 'delight') {
        finish('complete');
      } else if (ended === 'leave') {
        finish('skip');
      }
    },
    [finish]
  );

  const swapping = shownIndex !== guide.stepIndex;
  const isLast = shownIndex >= steps.length - 1;

  // The ring stays on the last subject while the next one is being found, so
  // the spotlight moves from one to the other rather than blinking out in
  // between. It goes the moment the page is asked to move, though: a rect
  // measured before a scroll is a lie the instant the page starts gliding,
  // and the ring would sit over whatever slid under it.
  //
  // Cleared and read in the render rather than an effect: an effect draws one
  // frame of the old view first, which is a ring around where a subject used
  // to be.
  const drawn = useRef<{ rect: TargetRect; shape?: SpotlightShape; radius?: number } | null>(null);
  const found = target ? { rect: target, shape: step?.shape, radius: step?.radius } : null;
  if (!swapping) drawn.current = found;
  if (waiting) drawn.current = null;
  const spotlight = found ?? (swapping ? drawn.current : null);

  // The owl stands in the bottom-left corner, which is exactly where the first
  // item of a fixed bottom bar sits. Rather than stand in front of the thing it
  // is pointing at, it steps back until the step has moved on.
  const inTheOwlsWay =
    spotlight !== null &&
    rectsOverlap(spotlightFrame(spotlight.rect, spotlight.shape, spotlight.radius), {
      x: 0,
      y: height - perch.height,
      width: perch.width,
      height: perch.height,
    });
  const perchPresence = useSharedValue(1);
  useEffect(() => {
    perchPresence.value = withTiming(inTheOwlsWay ? PERCH_STEP_BACK : 1, {
      duration: GUIDE_TIMING.highlightLeadMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [inTheOwlsWay, perchPresence]);
  const perchStyle = useAnimatedStyle(() => ({ opacity: perchPresence.value }));

  const handleNext = useCallback(() => {
    if (phase !== 'idle' || swapping) return;
    Haptics.selectionAsync();
    if (isLast) {
      setPhase('delight');
      return;
    }
    guide.nextStep();
    setSayCount((count) => count + 1);
  }, [guide, isLast, phase, swapping]);

  const handleSkip = useCallback(() => {
    if (phase === 'delight' || phase === 'leave') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('leave');
  }, [phase]);

  const handleBubbleLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.height);
    if (measured > 0) setBubbleHeight((current) => (current === measured ? current : measured));
  }, []);

  // A tour that is due but has not arrived yet still owns the screen. Without
  // this the page stays live through the delay before the owl lands, and a tap
  // in that window opens something else -- the owl then talks about this page
  // over the top of whatever was opened.
  const blocking = (
    <View style={styles.root} testID={`${testID}-blocker`}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} testID="owl-guide-pending" />
    </View>
  );

  if (!isMine) return wantsToStart ? blocking : null;
  if (!step) return null;
  if (step.target && !measurements.ready) return blocking;

  const shown = steps[Math.min(shownIndex, Math.max(steps.length - 1, 0))] ?? step;
  const landed = phase !== 'arrive';

  return (
    <View style={styles.root} testID={testID} accessibilityViewIsModal>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} testID="owl-guide-dim" />
      <GuideSpotlight
        width={width}
        height={height}
        target={spotlight?.rect ?? null}
        shape={spotlight?.shape}
        radius={spotlight?.radius}
      />

      <Animated.View style={[styles.perch, perchStyle]} pointerEvents="none" testID="owl-guide-perch">
        <OwlPerch
          testID="owl-guide-owl-perch"
          phase={phase}
          sayCount={sayCount}
          owlWidth={layout.owlWidth}
          pointing={Boolean(spotlight)}
          wingSide="right"
          onPhaseEnd={handlePhaseEnd}
          accessibilityLabel={t('screenTimeOwl.owlLabel')}
        />
      </Animated.View>

      {landed ? (
        <View
          testID={`owl-guide-bubble-${placement.mode}`}
          style={[
            styles.bubbleSlot,
            {
              left: placement.left,
              width: placement.width,
              top: placement.top,
              bottom: placement.bottom,
            },
          ]}
          pointerEvents="box-none"
        >
          <OwlSpeechBubble
            idPrefix="owl-guide"
            testID="owl-guide-bubble"
            title={t(shown.titleKey)}
            body={t(shown.descriptionKey)}
            illustration={shown.illustration ? ILLUSTRATIONS[shown.illustration] : undefined}
            muted={swapping}
            page={shownIndex}
            pageCount={steps.length}
            nextLabel={t(isLast ? GUIDE_BUTTON_KEYS.finish : GUIDE_BUTTON_KEYS.next)}
            closeLabel={t(GUIDE_BUTTON_KEYS.skip)}
            onNext={handleNext}
            onClose={handleSkip}
            leaving={phase !== 'idle'}
            maxWidth={placement.width}
            tail={placement.tail}
            tailOffset={Math.round(perch.owl.left + layout.owlWidth * 0.42 - placement.left)}
            pointer={placement.pointer}
            onLayout={handleBubbleLayout}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 20,
  },
  perch: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
  bubbleSlot: {
    position: 'absolute',
  },
});
