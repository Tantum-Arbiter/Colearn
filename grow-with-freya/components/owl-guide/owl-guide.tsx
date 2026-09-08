import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
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
  type GuideId,
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
  /** Which measurement this step asked the page to move on, if it has. */
  const [askedAt, setAskedAt] = useState<number | null>(null);
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
  const owed =
    scroller && rect
      ? guideRevealShift(
          { width, height },
          insets,
          { width: perch.width, height: perch.height },
          { maxWidth: layout.bubbleMaxWidth, height: bubbleHeight },
          layout.landscape,
          rect
        )
      : 0;
  // nothing honest to draw around a highlight the page still has to move, nor
  // while it moves. Once it has been measured again the highlight is spotlit
  // wherever it ended up -- a page with nothing left to give still gets its
  // ring, it is just not as clear of the bubble as it might have been.
  const waiting = owed > 0 && (askedAt === null || measurements.revision === askedAt);
  const target = waiting ? null : rect;
  // with a page to move, the bubble never leaves the owl: the target is only
  // the spotlight's business, not the placement's
  const placementTarget = scroller ? null : target;
  const placement = useMemo(
    () =>
      placeGuideBubble(
        { width, height },
        insets,
        { width: perch.width, height: perch.height },
        { maxWidth: layout.bubbleMaxWidth, height: bubbleHeight },
        layout.landscape,
        placementTarget
      ),
    [width, height, insets, perch.width, perch.height, layout.bubbleMaxWidth, layout.landscape, bubbleHeight, placementTarget]
  );

  // Every step starts from the page's own resting place, so what the next one
  // asks for is measured against the same ground as the last.
  //
  // Guarded on isMine because a screen mounts every tour it can run at once
  // and they share the page's scroller: the step index is the guide's, not
  // this instance's, so without the guard the tours standing by would each
  // put the page back the moment the running one moved it.
  //
  // A page carried back is still gliding when the ordinary settle is up, so
  // the step counts it as a move and measures on the scroll settle instead --
  // read mid-glide, the next subject is wherever it happens to be passing.
  useEffect(() => {
    if (!isMine) return;
    setAskedAt(null);
    if (scroller?.restore()) setMoves((count) => count + 1);
  }, [guide.stepIndex, isMine, scroller]);

  // and the page is given back whole when this guide is done with it --
  // finished, skipped, or the screen left underneath it
  useEffect(() => {
    if (!isMine) return;
    return () => scroller?.release();
  }, [isMine, scroller]);

  // asked for once a step: a page with nothing left to give would otherwise be
  // asked again on every re-measure, and never stop
  useEffect(() => {
    if (!scroller || !isMine || owed <= 0 || askedAt !== null) return;
    setAskedAt(measurements.revision);
    scroller.reveal(owed);
    setMoves((count) => count + 1);
  }, [scroller, isMine, owed, askedAt, measurements.revision]);

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

  const isLast = guide.stepIndex >= steps.length - 1;

  const handleNext = useCallback(() => {
    if (phase !== 'idle') return;
    Haptics.selectionAsync();
    if (isLast) {
      setPhase('delight');
      return;
    }
    guide.nextStep();
    setSayCount((count) => count + 1);
  }, [guide, isLast, phase]);

  const handleSkip = useCallback(() => {
    if (phase === 'delight' || phase === 'leave') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('leave');
  }, [phase]);

  const handleBubbleLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.height);
    if (measured > 0) setBubbleHeight((current) => (current === measured ? current : measured));
  }, []);

  if (!isMine || !step) return null;
  if (step.target && !measurements.ready) return null;

  const landed = phase !== 'arrive';

  return (
    <View style={styles.root} testID={testID} accessibilityViewIsModal>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} testID="owl-guide-dim" />
      <GuideSpotlight width={width} height={height} target={target} shape={step.shape} radius={step.radius} />

      <View style={styles.perch} pointerEvents="none" testID="owl-guide-perch">
        <OwlPerch
          testID="owl-guide-owl-perch"
          phase={phase}
          sayCount={sayCount}
          owlWidth={layout.owlWidth}
          pointing={Boolean(target)}
          wingSide="right"
          onPhaseEnd={handlePhaseEnd}
          accessibilityLabel={t('screenTimeOwl.owlLabel')}
        />
      </View>

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
            title={t(step.titleKey)}
            body={t(step.descriptionKey)}
            illustration={step.illustration ? ILLUSTRATIONS[step.illustration] : undefined}
            page={guide.stepIndex}
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
