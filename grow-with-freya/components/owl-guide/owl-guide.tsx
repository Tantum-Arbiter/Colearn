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
import { useGuideOnTop } from './owl-guide-layer';
import { ScreenTimeRingLegend } from './screen-time-ring-legend';
import { ProfileSlotLegend } from './profile-slot-legend';
import { ContinueOrbLegend } from './continue-orb-legend';
import { useGuideTargets, type GuideTargetRefs } from './use-guide-targets';
import type { GuideScroller } from './use-guide-scroller';

const noop = () => undefined;

const ILLUSTRATIONS = {
  screenTimeRing: <ScreenTimeRingLegend />,
  profileSlot: <ProfileSlotLegend />,
  continueOrb: <ContinueOrbLegend />,
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
  const rowSteps = useMemo(() => steps.filter((entry) => entry.row !== undefined), [steps]);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const recordRowHeight = useCallback((stepId: string, event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.height);
    if (measured > 0) setRowHeights((known) => (known[stepId] === measured ? known : { ...known, [stepId]: measured }));
  }, []);
  const revealHeight = step?.row
    ? Math.max(bubbleHeight, ...rowSteps.filter((entry) => entry.row === step.row).map((entry) => rowHeights[entry.id] ?? 0))
    : bubbleHeight;
  // worked out in the render the measurement lands in, not in an effect after
  // it: an effect renders once with the old view first, and that frame is a
  // spotlight cut around where the highlight used to be
  // a pinned subject is furniture the page cannot move, so asking for room
  // only walks the page off the thing being talked about and back again
  const owed =
    scroller && rect && step?.pinned
      ? -scroller.away()
      : scroller && rect
      ? guideRevealShift(
          { width, height },
          insets,
          { width: perch.width, height: perch.height },
          { maxWidth: layout.bubbleMaxWidth, height: revealHeight },
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

  // Which step's words the bubble is showing. It lags the guide's own index
  // by a beat when the subject was already on screen, so the eye has time to
  // follow the ring before the words under it change. It does *not* wait for
  // a page that has to scroll to reveal that subject -- the words read while
  // the page is still moving, rather than sitting on the old step's text
  // until the scroll (which can run well past this beat) has settled.
  const [shownIndex, setShownIndex] = useState(0);
  // True the moment the new step's target has been measured at all, whether
  // or not the page still has to scroll it into view. A subject that cannot
  // be measured at all still counts as landed -- the owl speaks about it
  // without a ring, the way it always has, rather than the words waiting for
  // something that is never coming.
  const landedOnSubject = !step?.target || freshlyMeasured;

  useEffect(() => {
    if (!isMine) setShownIndex(0);
  }, [isMine]);

  useEffect(() => {
    if (shownIndex === guide.stepIndex || !landedOnSubject) return;
    const timer = setTimeout(() => setShownIndex(guide.stepIndex), GUIDE_TIMING.highlightLeadMs);
    return () => clearTimeout(timer);
  }, [shownIndex, guide.stepIndex, landedOnSubject]);

  /**
   * A tour belongs to its page. `active` only ever gated *starting* one, so a
   * tour begun on one section carried on over whatever the child moved to
   * next -- talking about subjects that were no longer on screen, and holding
   * the new page's own tour shut behind it, since only one runs at a time.
   *
   * Leaving ends it without marking it seen: the page it belongs to still owes
   * the child that tour the next time they open it.
   */
  useEffect(() => {
    if (!isMine || active || endedRef.current) return;
    endedRef.current = true;
    scroller?.release();
    guide.dismissGuide();
    onEndRef.current?.();
  }, [isMine, active, scroller, guide]);

  const holdsTour = useRef(false);
  const letGo = useRef(guide.dismissGuide);
  useEffect(() => {
    holdsTour.current = isMine;
    letGo.current = guide.dismissGuide;
  });
  useEffect(() => {
    const ended = endedRef;
    return () => {
      if (!holdsTour.current || ended.current) return;
      ended.current = true;
      letGo.current();
    };
  }, []);

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
    step?.revealsBar === true ||
    (spotlight !== null &&
      rectsOverlap(spotlightFrame(spotlight.rect, spotlight.shape, spotlight.radius), {
        x: 0,
        y: height - perch.height,
        width: perch.width,
        height: perch.height,
      }));
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

  const content = (() => {
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

        {landed
          ? rowSteps.map((entry) => (
              <View
                key={entry.id}
                testID={`owl-guide-measure-${entry.id}`}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                onLayout={(event) => recordRowHeight(entry.id, event)}
                style={[styles.measure, { width: placement.width }]}
              >
                <OwlSpeechBubble
                  idPrefix="owl-guide-measure"
                  testID={`owl-guide-measure-bubble-${entry.id}`}
                  title={t(entry.titleKey)}
                  body={t(entry.descriptionKey)}
                  illustration={entry.illustration ? ILLUSTRATIONS[entry.illustration] : undefined}
                  page={steps.indexOf(entry)}
                  pageCount={steps.length}
                  nextLabel={t(GUIDE_BUTTON_KEYS.next)}
                  closeLabel={t(GUIDE_BUTTON_KEYS.skip)}
                  closeAsWord
                  onNext={noop}
                  onClose={noop}
                  maxWidth={placement.width}
                  tail={placement.tail}
                  pointer={null}
                />
              </View>
            ))
          : null}

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
              closeAsWord
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
  })();

  const onTop = useGuideOnTop(content);
  return <>{onTop}</>;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
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
  measure: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
  },
});
