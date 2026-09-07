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
  onEnd?: () => void;
  testID?: string;
}

export function OwlGuide({
  id,
  active = true,
  targets = NO_TARGETS,
  replay = false,
  delayMs,
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
  const measurements = useGuideTargets(targets, isMine, guide.stepIndex, frameKey);
  const steps = useMemo(() => guideSteps(id, Object.keys(targets)), [id, targets]);
  const step = steps[Math.min(guide.stepIndex, Math.max(steps.length - 1, 0))];
  const target = step?.target ? measurements.rects[step.target] ?? null : null;
  const perch = useMemo(() => owlPerchFrame(layout.owlWidth), [layout.owlWidth]);
  const placement = useMemo(
    () =>
      placeGuideBubble(
        { width, height },
        insets,
        { width: perch.width, height: perch.height },
        { maxWidth: layout.bubbleMaxWidth, height: bubbleHeight },
        layout.landscape,
        target
      ),
    [width, height, insets, perch.width, perch.height, layout.bubbleMaxWidth, layout.landscape, bubbleHeight, target]
  );

  const finish = useCallback(
    (how: 'complete' | 'skip') => {
      if (endedRef.current) return;
      endedRef.current = true;
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
