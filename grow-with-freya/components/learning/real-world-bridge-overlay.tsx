/**
 * RealWorldBridgeOverlay
 *
 * A landscape-oriented overlay that appears after game completion to bridge
 * digital learning into real-world parent-child activities. Features Wombat
 * narration, 3 adventure cards (At Home, Outdoors, Creative), and a closing
 * encouragement — all driven by i18n keys from the bridge data layer.
 *
 * Polish: staggered Reanimated entry animations, haptic feedback, responsive
 * tablet layout via useAccessibility, and RTL-safe styles.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getBridgeData } from '@/data/bridge';
import type { RealWorldAdventure } from '@/types/real-world-bridge';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

/** Category display config */
const CATEGORY_CONFIG: Record<RealWorldAdventure['category'], {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  labelKey: string;
  color: string;
}> = {
  'at-home': { icon: 'home-outline', labelKey: 'bridge.atHome', color: '#D4626E' },
  'outdoors': { icon: 'leaf-outline', labelKey: 'bridge.outdoors', color: '#5AAF8C' },
  'creative': { icon: 'color-palette-outline', labelKey: 'bridge.creative', color: '#B070B8' },
};

/** Staggered animation timing (ms) */
const ANIM = {
  OVERLAY_FADE: 250,
  NARRATION_DELAY: 150,
  CARD_BASE_DELAY: 350,
  CARD_STAGGER: 120,
  CLOSING_DELAY: 750,
  ELEMENT_DURATION: 400,
  SLIDE_DISTANCE: 24 as number,
};

interface RealWorldBridgeOverlayProps {
  visible: boolean;
  activityId: string;
  gameSection: 'spelling' | 'numbers' | 'feelings';
  onDismiss: () => void;
}

export function RealWorldBridgeOverlay({
  visible,
  activityId,
  onDismiss,
}: RealWorldBridgeOverlayProps) {
  const { t } = useTranslation();
  const bridgeData = getBridgeData(activityId);
  const { isTablet, scaledFontSize, scaledPadding, textSizeScale } = useAccessibility();
  const { width: screenWidth } = useWindowDimensions();

  // --- Staggered entry animations ---
  const overlayOpacity = useSharedValue(0);
  const narrationOpacity = useSharedValue(0);
  const narrationTranslateY = useSharedValue(ANIM.SLIDE_DISTANCE);
  const card0Opacity = useSharedValue(0);
  const card0TranslateY = useSharedValue(ANIM.SLIDE_DISTANCE);
  const card1Opacity = useSharedValue(0);
  const card1TranslateY = useSharedValue(ANIM.SLIDE_DISTANCE);
  const card2Opacity = useSharedValue(0);
  const card2TranslateY = useSharedValue(ANIM.SLIDE_DISTANCE);
  const closingOpacity = useSharedValue(0);


  const cardOpacities = [card0Opacity, card1Opacity, card2Opacity];
  const cardTranslates = [card0TranslateY, card1TranslateY, card2TranslateY];

  useEffect(() => {
    if (!visible || !bridgeData) return;

    const ease = Easing.out(Easing.cubic);
    const elemConfig = { duration: ANIM.ELEMENT_DURATION, easing: ease };

    // 1. Overlay background fades in
    overlayOpacity.value = withTiming(1, { duration: ANIM.OVERLAY_FADE, easing: ease });

    // 2. Narration slides up + fades in
    narrationOpacity.value = withDelay(ANIM.NARRATION_DELAY, withTiming(1, elemConfig));
    narrationTranslateY.value = withDelay(ANIM.NARRATION_DELAY, withTiming(0, elemConfig));

    // 3. Cards stagger in
    for (let i = 0; i < 3; i++) {
      const delay = ANIM.CARD_BASE_DELAY + i * ANIM.CARD_STAGGER;
      cardOpacities[i].value = withDelay(delay, withTiming(1, elemConfig));
      cardTranslates[i].value = withDelay(delay, withTiming(0, elemConfig));
    }

    // 4. Closing text fades in
    closingOpacity.value = withDelay(ANIM.CLOSING_DELAY, withTiming(1, elemConfig));

    // Cleanup: reset animation values when hidden
    return () => {
      overlayOpacity.value = 0;
      narrationOpacity.value = 0;
      narrationTranslateY.value = ANIM.SLIDE_DISTANCE;
      card0Opacity.value = 0;
      card0TranslateY.value = ANIM.SLIDE_DISTANCE;
      card1Opacity.value = 0;
      card1TranslateY.value = ANIM.SLIDE_DISTANCE;
      card2Opacity.value = 0;
      card2TranslateY.value = ANIM.SLIDE_DISTANCE;
      closingOpacity.value = 0;
    };
  }, [visible, bridgeData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animated styles
  const overlayAnimatedStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const narrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: narrationOpacity.value,
    transform: [{ translateY: narrationTranslateY.value }],
  }));
  const cardAnimatedStyles = [
    useAnimatedStyle(() => ({ opacity: card0Opacity.value, transform: [{ translateY: card0TranslateY.value }] })),
    useAnimatedStyle(() => ({ opacity: card1Opacity.value, transform: [{ translateY: card1TranslateY.value }] })),
    useAnimatedStyle(() => ({ opacity: card2Opacity.value, transform: [{ translateY: card2TranslateY.value }] })),
  ];
  const closingAnimatedStyle = useAnimatedStyle(() => ({ opacity: closingOpacity.value }));

  // --- Haptic handlers ---
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  // Don't render if not visible or no data for this activity
  if (!visible || !bridgeData) {
    return null;
  }

  // Responsive sizing — card width scales with text size
  const baseCardWidth = isTablet ? Math.min(260, (screenWidth - 80) / 3) : 200;
  const cardWidth = baseCardWidth * Math.max(1, textSizeScale);

  return (
    <Animated.View style={[styles.container, overlayAnimatedStyle]} testID="bridge-overlay">
      {/* Back button (top-left arrow) */}
      <Pressable
        style={styles.backButton}
        onPress={handleClose}
        testID="bridge-close-button"
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Ionicons name="chevron-back" size={isTablet ? 32 : 28} color="#FFFFFF" />
      </Pressable>

      <View
        style={[
          styles.content,
          { paddingHorizontal: scaledPadding(24) },
        ]}
      >
        {/* Title */}
        <Animated.View style={narrationAnimatedStyle}>
          <Text style={[styles.title, { fontSize: scaledFontSize(22) }]}>
            {t('bridge.title', 'Continue back in reality')}
          </Text>
          <Text style={[styles.narration, { fontSize: scaledFontSize(14) }]}>
            {t(bridgeData.narrationKey)}
          </Text>
        </Animated.View>

        {/* Adventure cards */}
        <View style={styles.cardsRow}>
          {bridgeData.adventures.map((adventure, index) => {
            const config = CATEGORY_CONFIG[adventure.category];
            return (
              <Animated.View
                key={adventure.category}
                style={[cardAnimatedStyles[index]]}
              >
                <View
                  style={[styles.card, { borderColor: config.color, width: cardWidth }]}
                  testID={`adventure-card-${index}`}
                >
                  <View style={[styles.cardHeader, { backgroundColor: config.color }]}>
                    <Ionicons name={config.icon} size={isTablet ? 24 : 20} color="#FFFFFF" />
                    <Text style={[styles.categoryLabel, { fontSize: scaledFontSize(12) }]}>
                      {t(config.labelKey)}
                    </Text>
                  </View>
                  <Text style={[styles.cardDescription, { fontSize: scaledFontSize(14) }]}>
                    {t(adventure.descriptionKey)}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* Closing encouragement */}
        <Animated.View style={closingAnimatedStyle}>
          <Text style={[styles.closing, { fontSize: scaledFontSize(13) }]}>
            {t(bridgeData.closingKey)}
          </Text>
        </Animated.View>


      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 110,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontFamily: Fonts.rounded,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  narration: {
    fontFamily: Fonts.primary,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 14,
    maxWidth: 600,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  categoryLabel: {
    fontFamily: Fonts.rounded,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cardDescription: {
    fontFamily: Fonts.primary,
    color: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 8,
    lineHeight: 17,
  },
  closing: {
    fontFamily: Fonts.primary,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 10,
    maxWidth: 500,
  },

});
