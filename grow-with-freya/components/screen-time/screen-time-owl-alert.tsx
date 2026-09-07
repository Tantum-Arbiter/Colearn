import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useAccessibility } from '@/hooks/use-accessibility';
import type { ScreenTimeWarning } from '@/services/screen-time-service';
import { owlPerchFrame, type OwlPhase } from '@/constants/owl-companion';
import { SCREEN_TIME_TIP_KEYS, shuffleTips, type ScreenTimeTipKey } from '@/constants/screen-time-tips';
import { OwlPerch } from './owl-perch';
import { OwlSpeechBubble, type BubbleTurn } from './owl-speech-bubble';

const OWL_WIDTH_PHONE = 116;
const OWL_WIDTH_TABLET = 148;
const BUBBLE_MAX_PHONE = 340;
const BUBBLE_MAX_TABLET = 420;

/** How far a finger has to travel sideways before it counts as a page turn. */
export const OWL_SWIPE_THRESHOLD = 40;

const DIM = 'rgba(4, 10, 28, 0.42)';

const TITLE_KEY: Record<ScreenTimeWarning['type'], string> = {
  approaching_limit: 'screenTimeWarning.approachingLimit',
  limit_reached: 'screenTimeWarning.limitReached',
  daily_complete: 'screenTimeWarning.dailyComplete',
};

const FALLBACK_TITLE_KEY = 'screenTimeWarning.notice';

export type SwipeIntent = 'next' | 'back' | null;

/**
 * What a drag across the bubble meant. Only a clear sideways pull turns the
 * page; anything short, or more up-and-down than across, is left alone.
 */
export function swipeIntent(dx: number, dy: number): SwipeIntent {
  if (Math.abs(dx) < OWL_SWIPE_THRESHOLD) return null;
  if (Math.abs(dy) > Math.abs(dx)) return null;
  return dx < 0 ? 'next' : 'back';
}

interface BubblePage {
  eyebrow?: string;
  title?: string;
  body: string;
  footnote?: string;
  footnoteEmphasis?: boolean;
}

function bubblePage(
  page: number,
  warning: ScreenTimeWarning,
  tips: readonly ScreenTimeTipKey[],
  t: (key: string) => string
): BubblePage {
  if (page === 0) {
    return {
      title: t(TITLE_KEY[warning.type] ?? FALLBACK_TITLE_KEY),
      body: warning.message,
      footnote: t('screenTimeWarning.guidelines'),
    };
  }

  const tip = tips[Math.min(page - 1, tips.length - 1)];
  const isLast = page >= tips.length;

  return {
    eyebrow: page === 1 ? t('screenTime.tips.title') : undefined,
    title: t(`screenTime.tips.${tip}.title`),
    body: t(`screenTime.tips.${tip}.body`),
    footnote: isLast ? t('screenTime.tips.closing') : undefined,
    footnoteEmphasis: isLast,
  };
}

export interface ScreenTimeOwlAlertProps {
  visible: boolean;
  warning: ScreenTimeWarning | null;
  onDismiss: () => void;
  /** The roll the tips are dealt from. Injected so a test can predict the hand. */
  random?: () => number;
}

export function ScreenTimeOwlAlert({ visible, warning, onDismiss, random = Math.random }: ScreenTimeOwlAlertProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { isTablet } = useAccessibility();

  const [phase, setPhase] = useState<OwlPhase>('arrive');
  const [page, setPage] = useState(0);
  const [turn, setTurn] = useState<BubbleTurn>('forward');
  const [landed, setLanded] = useState(false);
  const [sayCount, setSayCount] = useState(0);
  const [tips, setTips] = useState<ScreenTimeTipKey[]>(() => shuffleTips(SCREEN_TIME_TIP_KEYS, random));
  const exitingRef = useRef(false);
  const randomRef = useRef(random);
  randomRef.current = random;

  const pageCount = tips.length + 1;

  // a fresh hand every time the owl lands, so the same parent does not hear
  // the same three tips in the same order every evening
  useEffect(() => {
    if (!visible || !warning) return;
    setPhase('arrive');
    setPage(0);
    setTurn('forward');
    setLanded(false);
    setSayCount(0);
    setTips(shuffleTips(SCREEN_TIME_TIP_KEYS, randomRef.current));
    exitingRef.current = false;
  }, [visible, warning]);

  const handlePhaseEnd = useCallback(
    (ended: OwlPhase) => {
      if (ended === 'arrive') {
        setPhase('idle');
        setLanded(true);
        setSayCount((count) => count + 1);
        return;
      }
      if (ended === 'delight' || ended === 'leave') {
        onDismiss();
      }
    },
    [onDismiss]
  );

  const turnPage = useCallback((direction: BubbleTurn) => {
    if (exitingRef.current) return;
    setPage((current) => {
      const next = direction === 'forward' ? current + 1 : current - 1;
      if (next < 0 || next > pageCount - 1) return current;
      Haptics.selectionAsync();
      setTurn(direction);
      setSayCount((count) => count + 1);
      return next;
    });
  }, [pageCount]);

  const handleNext = useCallback(() => turnPage('forward'), [turnPage]);
  const handleBack = useCallback(() => turnPage('back'), [turnPage]);

  const leaveAs = useCallback((exit: OwlPhase) => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase(exit);
  }, []);

  const handleOkay = useCallback(() => leaveAs('delight'), [leaveAs]);
  const handleClose = useCallback(() => leaveAs('leave'), [leaveAs]);

  // the swipe lives on the slot around the bubble, and only claims the touch
  // once it has moved -- a plain tap still reaches the buttons inside
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_event, gesture) => {
          const intent = swipeIntent(gesture.dx, gesture.dy);
          if (intent === 'next') turnPage('forward');
          if (intent === 'back') turnPage('back');
        },
      }),
    [turnPage]
  );

  if (!visible || !warning) return null;

  const isLast = page >= pageCount - 1;
  const content = bubblePage(page, warning, tips, t);
  const owlWidth = isTablet ? OWL_WIDTH_TABLET : OWL_WIDTH_PHONE;
  const perch = owlPerchFrame(owlWidth);
  const bubbleMaxWidth = Math.min(screenWidth - 24, isTablet ? BUBBLE_MAX_TABLET : BUBBLE_MAX_PHONE);

  return (
    <View style={styles.root} testID="screen-time-owl-alert" accessibilityViewIsModal>
      <Pressable style={styles.dim} onPress={() => {}} testID="screen-time-owl-dim" accessible={false} />

      {landed && (
        <View
          testID="screen-time-owl-swipe"
          style={[styles.bubbleSlot, { left: 12 + insets.left, bottom: perch.height - 4, width: bubbleMaxWidth }]}
          pointerEvents="box-none"
          {...swipe.panHandlers}
        >
          <OwlSpeechBubble
            eyebrow={content.eyebrow}
            title={content.title}
            body={content.body}
            footnote={content.footnote}
            footnoteEmphasis={content.footnoteEmphasis}
            page={page}
            pageCount={pageCount}
            direction={turn}
            nextLabel={isLast ? t('screenTimeOwl.okay') : page === 0 ? t('screenTimeOwl.showIdeas') : t('common.next')}
            nextAsArrow
            backLabel={t('common.back')}
            closeLabel={t('screenTimeWarning.closeNotification')}
            onNext={isLast ? handleOkay : handleNext}
            onBack={page > 0 ? handleBack : undefined}
            onClose={handleClose}
            leaving={phase !== 'idle'}
            maxWidth={bubbleMaxWidth}
            tailOffset={Math.round(perch.owl.left + owlWidth * 0.42 - 12)}
          />
        </View>
      )}

      <View style={styles.perch} pointerEvents="none" testID="screen-time-owl-perch">
        <OwlPerch
          testID="screen-time-owl"
          phase={phase}
          sayCount={sayCount}
          owlWidth={owlWidth}
          onPhaseEnd={handlePhaseEnd}
          accessibilityLabel={t('screenTimeOwl.owlLabel')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DIM,
  },
  bubbleSlot: {
    position: 'absolute',
  },
  perch: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
});
