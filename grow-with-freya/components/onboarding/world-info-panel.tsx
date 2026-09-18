import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Image, Dimensions, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '../themed-text';
import { useAccessibility } from '@/hooks/use-accessibility';
import { GOLD, CARD_BORDER, TEXT_MUTED, NIGHT_BASE } from './onboarding-theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDE_IN_MS = 320;
const SLIDE_OUT_MS = 260;

export interface WorldInfoPanelProps {
  worldKey: string;
  art: ImageSourcePropType;
  onClose: () => void;
}

export function WorldInfoPanel({ worldKey, art, onClose }: WorldInfoPanelProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledPadding } = useAccessibility();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: SLIDE_IN_MS, easing: Easing.out(Easing.cubic) });
    backdropOpacity.value = withTiming(1, { duration: SLIDE_IN_MS });
  }, [translateY, backdropOpacity]);

  const dismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    backdropOpacity.value = withTiming(0, { duration: SLIDE_OUT_MS });
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: SLIDE_OUT_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      }
    );
  };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <View style={styles.container} testID={`world-info-${worldKey}`}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          testID="world-info-backdrop"
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityLabel={t('onboardingV2.worlds.close')}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          { paddingBottom: Math.max(insets.bottom, 16) + scaledPadding(12) },
        ]}
      >
        <View style={styles.grabber} />

        <Image source={art} style={styles.art} resizeMode="contain" />

        <ThemedText style={[styles.title, { fontSize: scaledFontSize(24) }]}>
          {t(`onboardingV2.worlds.${worldKey}`)}
        </ThemedText>

        <ThemedText style={[styles.description, { fontSize: scaledFontSize(15) }]}>
          {t(`onboardingV2.worlds.${worldKey}Desc`)}
        </ThemedText>

        <Pressable
          testID="world-info-close"
          style={styles.closeButton}
          onPress={dismiss}
          accessibilityLabel={t('onboardingV2.worlds.close')}
        >
          <Ionicons name="close" size={scaledFontSize(18)} color={NIGHT_BASE} />
          <ThemedText style={[styles.closeText, { fontSize: scaledFontSize(16) }]}>
            {t('onboardingV2.worlds.close')}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 7, 26, 0.72)',
  },
  sheet: {
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#101743',
    borderTopWidth: 1,
    borderColor: CARD_BORDER,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 18,
  },
  art: {
    width: 148,
    height: 148,
    borderRadius: 24,
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 10,
  },
  description: {
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 26,
    backgroundColor: GOLD,
  },
  closeText: {
    color: NIGHT_BASE,
    fontWeight: '700',
  },
});
