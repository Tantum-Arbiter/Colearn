import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useAccessibility } from '@/hooks/use-accessibility';
import type { ScreenTimeWarning } from '@/services/screen-time-service';
import { owlPerchFrame, type OwlPhase } from '@/constants/owl-companion';
import { OwlPerch } from './owl-perch';
import { OwlSpeechBubble } from './owl-speech-bubble';

const OWL_WIDTH_PHONE = 116;
const OWL_WIDTH_TABLET = 148;
const BUBBLE_MAX_PHONE = 340;
const BUBBLE_MAX_TABLET = 420;

export const OWL_BUBBLE_PAGES = 4;

const TITLE_KEY: Record<ScreenTimeWarning['type'], string> = {
  approaching_limit: 'screenTimeWarning.approachingLimit',
  limit_reached: 'screenTimeWarning.limitReached',
  daily_complete: 'screenTimeWarning.dailyComplete',
};

const FALLBACK_TITLE_KEY = 'screenTimeWarning.notice';

const TIP_KEYS = ['atHome', 'outdoors', 'creative'] as const;

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
  t: (key: string) => string
): BubblePage {
  if (page === 0) {
    return {
      title: t(TITLE_KEY[warning.type] ?? FALLBACK_TITLE_KEY),
      body: warning.message,
      footnote: t('screenTimeWarning.guidelines'),
    };
  }

  const tip = TIP_KEYS[Math.min(page - 1, TIP_KEYS.length - 1)];
  const isLast = page >= OWL_BUBBLE_PAGES - 1;

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
}

export function ScreenTimeOwlAlert({ visible, warning, onDismiss }: ScreenTimeOwlAlertProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { isTablet } = useAccessibility();

  const [phase, setPhase] = useState<OwlPhase>('arrive');
  const [page, setPage] = useState(0);
  const [landed, setLanded] = useState(false);
  const [sayCount, setSayCount] = useState(0);
  const exitingRef = useRef(false);

  useEffect(() => {
    if (!visible || !warning) return;
    setPhase('arrive');
    setPage(0);
    setLanded(false);
    setSayCount(0);
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

  const handleNext = useCallback(() => {
    if (exitingRef.current) return;
    Haptics.selectionAsync();
    setPage((current) => Math.min(current + 1, OWL_BUBBLE_PAGES - 1));
    setSayCount((count) => count + 1);
  }, []);

  const leaveAs = useCallback((exit: OwlPhase) => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase(exit);
  }, []);

  const handleOkay = useCallback(() => leaveAs('delight'), [leaveAs]);
  const handleClose = useCallback(() => leaveAs('leave'), [leaveAs]);

  if (!visible || !warning) return null;

  const isLast = page >= OWL_BUBBLE_PAGES - 1;
  const content = bubblePage(page, warning, t);
  const owlWidth = isTablet ? OWL_WIDTH_TABLET : OWL_WIDTH_PHONE;
  const perch = owlPerchFrame(owlWidth);
  const bubbleMaxWidth = Math.min(screenWidth - 24, isTablet ? BUBBLE_MAX_TABLET : BUBBLE_MAX_PHONE);

  return (
    <View style={styles.root} pointerEvents="box-none" testID="screen-time-owl-alert">
      {landed && (
        <View
          style={[styles.bubbleSlot, { left: 12 + insets.left, bottom: perch.height - 4, width: bubbleMaxWidth }]}
          pointerEvents="box-none"
        >
          <OwlSpeechBubble
            eyebrow={content.eyebrow}
            title={content.title}
            body={content.body}
            footnote={content.footnote}
            footnoteEmphasis={content.footnoteEmphasis}
            page={page}
            pageCount={OWL_BUBBLE_PAGES}
            nextLabel={isLast ? t('screenTimeOwl.okay') : t('common.next')}
            closeLabel={t('screenTimeWarning.closeNotification')}
            onNext={isLast ? handleOkay : handleNext}
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
  bubbleSlot: {
    position: 'absolute',
  },
  perch: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
});
