import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import type { ScreenTimeWarning } from '@/services/screen-time-service';
import { OwlSprite } from './owl-sprite';
import { RealWorldTips } from './real-world-tips';
import type { OwlClipName } from '@/constants/owl-companion';

const OWL_WIDTH_PHONE = 104;
const OWL_WIDTH_TABLET = 132;
const TALK_MS = 3200;

const TITLE_KEY: Record<ScreenTimeWarning['type'], string> = {
  approaching_limit: 'screenTimeWarning.approachingLimit',
  limit_reached: 'screenTimeWarning.limitReached',
  daily_complete: 'screenTimeWarning.dailyComplete',
};

const FALLBACK_TITLE_KEY = 'screenTimeWarning.notice';

export interface ScreenTimeOwlAlertProps {
  visible: boolean;
  warning: ScreenTimeWarning | null;
  onDismiss: () => void;
}

export function ScreenTimeOwlAlert({ visible, warning, onDismiss }: ScreenTimeOwlAlertProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, isTablet } = useAccessibility();

  const [clip, setClip] = useState<OwlClipName>('wave');
  const quietTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearQuietTimer = useCallback(() => {
    if (quietTimer.current) {
      clearTimeout(quietTimer.current);
      quietTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible || !warning) {
      clearQuietTimer();
      setClip('wave');
    }
  }, [visible, warning, clearQuietTimer]);

  useEffect(() => clearQuietTimer, [clearQuietTimer]);

  const handleClipEnd = useCallback(() => {
    setClip((current) => {
      if (current === 'wave') {
        clearQuietTimer();
        quietTimer.current = setTimeout(() => setClip('idle'), TALK_MS);
        return 'talk';
      }
      if (current === 'delight') {
        return 'idle';
      }
      return current;
    });
  }, [clearQuietTimer]);

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearQuietTimer();
    onDismiss();
  }, [clearQuietTimer, onDismiss]);

  if (!visible || !warning) return null;

  const spoken = (
    <View style={styles.spoken}>
      <Text style={[styles.title, { fontSize: scaledFontSize(19) }]} testID="screen-time-owl-title">
        {t(TITLE_KEY[warning.type] ?? FALLBACK_TITLE_KEY)}
      </Text>
      <Text style={[styles.message, { fontSize: scaledFontSize(15) }]}>{warning.message}</Text>
      <Text style={[styles.guidelines, { fontSize: scaledFontSize(12) }]}>
        {t('screenTimeWarning.guidelines')}
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        { paddingBottom: insets.bottom + 14, paddingTop: insets.top + 14 },
      ]}
      pointerEvents="box-none"
      testID="screen-time-owl-alert"
    >
      <View style={[styles.bubble, isTablet && styles.bubbleTablet]} testID="screen-time-owl-bubble">
        <RealWorldTips
          onClose={handleDismiss}
          topInset={18}
          showIcons={false}
          showDone={false}
          header={spoken}
        />

        <View style={styles.actions}>
          <Pressable
            testID="screen-time-owl-okay"
            accessibilityRole="button"
            accessibilityLabel={t('screenTimeOwl.okay')}
            onPress={handleDismiss}
            style={styles.okay}
          >
            <Text style={[styles.okayLabel, { fontSize: scaledFontSize(16) }]}>
              {t('screenTimeOwl.okay')}
            </Text>
          </Pressable>
        </View>

      </View>

      <View style={styles.tail} />

      <View
        style={styles.perch}
        accessibilityLabel={t('screenTimeOwl.owlLabel')}
        accessible
      >
        <OwlSprite
          testID="screen-time-owl"
          clip={clip}
          width={isTablet ? OWL_WIDTH_TABLET : OWL_WIDTH_PHONE}
          onClipEnd={handleClipEnd}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    zIndex: 1000,
  },
  bubble: {
    width: '100%',
    maxWidth: 460,
    height: '76%',
    backgroundColor: 'rgba(18, 24, 46, 0.97)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingBottom: 12,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 16,
    elevation: 10,
  },
  tail: {
    marginLeft: 40,
    marginTop: -21,
    marginBottom: 5,
    width: 16,
    height: 16,
    backgroundColor: 'rgba(18, 24, 46, 0.97)',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    transform: [{ rotate: '45deg' }],
  },
  spoken: {
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontFamily: Fonts.rounded,
    color: 'rgba(255, 255, 255, 0.86)',
    textAlign: 'center',
    lineHeight: 21,
  },
  guidelines: {
    fontFamily: Fonts.rounded,
    color: 'rgba(255, 255, 255, 0.58)',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 8,
  },
  actions: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  okay: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  okayLabel: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bubbleTablet: {
    height: '72%',
    maxWidth: 600,
  },
  perch: {
    marginLeft: 6,
  },
});
