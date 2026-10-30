import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTurnToLandscape } from '@/hooks/use-turn-to-landscape';

export const FALLBACK_DELAY_MS = 8000;
const NO_SENSOR_FALLBACK_DELAY_MS = 1200;
const GOLD = '#E8B84B';
export const ROTATE_PROMPT_BACK = 38;
const BACK_LEFT = 16;
const BACK_GAP = 8;

export interface RotatePromptOverlayProps {
  bookRect: { x: number; y: number; width: number; height: number } | null;
  onTurned: () => void;
  onOpenAnyway: () => void;
  onBack: () => void;
}

function TurnArrow({ mirrored }: { mirrored?: boolean }) {
  return (
    <Svg
      width={34}
      height={30}
      viewBox="0 0 34 30"
      style={mirrored ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path
        d="M4 24 C 6 12, 16 6, 27 8"
        stroke={GOLD}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M27 8 L 21 4 M27 8 L 23 13"
        stroke={GOLD}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function RotatePromptOverlay({ bookRect, onTurned, onOpenAnyway, onBack }: RotatePromptOverlayProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { scaledFontSize, scaledPadding } = useAccessibility();
  const [showFallback, setShowFallback] = useState(false);

  const { sensorAvailable } = useTurnToLandscape({ enabled: true, onTurned });

  useEffect(() => {
    const delay = sensorAvailable ? FALLBACK_DELAY_MS : NO_SENSOR_FALLBACK_DELAY_MS;
    const timer = setTimeout(() => setShowFallback(true), delay);
    return () => clearTimeout(timer);
  }, [sensorAvailable]);

  const phoneRotation = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0.35);

  useEffect(() => {
    phoneRotation.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(90, { duration: 900, easing: Easing.inOut(Easing.cubic) })),
        withDelay(500, withTiming(0, { duration: 700, easing: Easing.inOut(Easing.cubic) }))
      ),
      -1,
      false
    );
    sparkleOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.35, { duration: 1100, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [phoneRotation, sparkleOpacity]);

  const phoneAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${phoneRotation.value}deg` }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  const clusterTop = bookRect ? bookRect.y + bookRect.height + scaledPadding(26) : undefined;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View testID="rotate-prompt-header" style={[styles.header, { top: insets.top + scaledPadding(8) }]} pointerEvents="box-none">
        <Animated.View
          testID="rotate-prompt-title"
          entering={FadeIn.delay(100).duration(400)}
          exiting={FadeOut.duration(200)}
          style={styles.heading}
          pointerEvents="none"
        >
          <Text
            style={[styles.headingText, { fontSize: scaledFontSize(24) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {t('rotatePrompt.ready')}
          </Text>
        </Animated.View>

        <Animated.View
          testID="rotate-prompt-back-wrap"
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.backButtonWrap}
        >
          <Pressable
            testID="rotate-prompt-back"
            style={styles.backButton}
            onPress={onBack}
            hitSlop={10}
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={scaledFontSize(20)} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </View>

      {bookRect && (
        <Animated.Text
          style={[
            styles.sparkle,
            sparkleAnimatedStyle,
            {
              left: bookRect.x + bookRect.width + scaledPadding(14),
              top: bookRect.y - scaledPadding(6),
              fontSize: scaledFontSize(18),
            },
          ]}
          pointerEvents="none"
        >
          ✦
        </Animated.Text>
      )}
      {bookRect && (
        <Animated.Text
          style={[
            styles.sparkle,
            sparkleAnimatedStyle,
            {
              left: bookRect.x - scaledPadding(20),
              top: bookRect.y + bookRect.height * 0.65,
              fontSize: scaledFontSize(13),
            },
          ]}
          pointerEvents="none"
        >
          ✦
        </Animated.Text>
      )}

      <Animated.View
        entering={FadeIn.delay(200).duration(400)}
        exiting={FadeOut.duration(200)}
        style={[styles.cluster, clusterTop !== undefined ? { top: clusterTop } : styles.clusterCentered]}
        pointerEvents="box-none"
      >
        <View style={styles.turnIconRow} pointerEvents="none">
          <TurnArrow />
          <Animated.View style={phoneAnimatedStyle}>
            <Ionicons name="phone-portrait-outline" size={scaledFontSize(34)} color="#FFFFFF" />
          </Animated.View>
          <TurnArrow mirrored />
        </View>

        <Text testID="rotate-prompt" style={[styles.turnTitle, { fontSize: scaledFontSize(19) }]}>{t('rotatePrompt.turnTogether')}</Text>
        <Text style={[styles.turnSubtitle, { fontSize: scaledFontSize(13) }]}>{t('rotatePrompt.openWhenSideways')}</Text>

        {showFallback && (
          <Animated.View entering={FadeIn.duration(400)}>
            <Pressable
              testID="rotate-prompt-open-anyway"
              style={[styles.fallbackButton, { paddingVertical: scaledPadding(10), paddingHorizontal: scaledPadding(20) }]}
              onPress={onOpenAnyway}
              accessibilityLabel={t('rotatePrompt.openForMe')}
            >
              <Text style={[styles.fallbackText, { fontSize: scaledFontSize(14) }]}>{t('rotatePrompt.openForMe')}</Text>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROTATE_PROMPT_BACK,
    zIndex: 45,
  },
  backButtonWrap: {
    position: 'absolute',
    left: BACK_LEFT,
    top: 0,
  },
  backButton: {
    width: ROTATE_PROMPT_BACK,
    height: ROTATE_PROMPT_BACK,
    borderRadius: ROTATE_PROMPT_BACK / 2,
    backgroundColor: 'rgba(10, 15, 44, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: BACK_LEFT + ROTATE_PROMPT_BACK + BACK_GAP,
    right: BACK_LEFT + ROTATE_PROMPT_BACK + BACK_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: {
    fontFamily: Fonts.primary,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sparkle: {
    position: 'absolute',
    color: GOLD,
  },
  cluster: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 10,
  },
  clusterCentered: {
    top: '58%',
  },
  turnIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  turnTitle: {
    fontFamily: Fonts.primary,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  turnSubtitle: {
    fontFamily: Fonts.sans,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    lineHeight: 19,
  },
  fallbackButton: {
    marginTop: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  fallbackText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
