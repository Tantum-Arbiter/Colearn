import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenTimeWarning } from '../../services/screen-time-service';
import type { ActivityType } from './screen-time-provider';
import { getBridgeData } from '@/data/bridge';
import type { RealWorldAdventure } from '@/types/real-world-bridge';
import { Fonts } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

/** Number of suggestion keys per activity type in translations */
const SUGGESTIONS_PER_ACTIVITY = 3;

/** i18n key prefix for each activity type's suggestions */
const SUGGESTION_KEY_MAP: Record<ActivityType, string> = {
  spelling: 'screenTimeWarning.suggestions.spelling',
  counting: 'screenTimeWarning.suggestions.counting',
  instruments: 'screenTimeWarning.suggestions.instruments',
  feelings: 'screenTimeWarning.suggestions.feelings',
  stories: 'screenTimeWarning.suggestions.stories',
  general: 'screenTimeWarning.suggestions.general',
};

/** Emoji icon for each activity type's suggestion section */
const SUGGESTION_EMOJI: Record<ActivityType, string> = {
  spelling: '✏️',
  counting: '🔢',
  instruments: '🎵',
  feelings: '💛',
  stories: '📖',
  general: '🌟',
};

/** Category display config for bridge adventure cards */
const BRIDGE_CATEGORY_CONFIG: Record<RealWorldAdventure['category'], {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  labelKey: string;
  color: string;
}> = {
  'at-home': { icon: 'home-outline', labelKey: 'bridge.atHome', color: '#D4626E' },
  'outdoors': { icon: 'leaf-outline', labelKey: 'bridge.outdoors', color: '#5AAF8C' },
  'creative': { icon: 'color-palette-outline', labelKey: 'bridge.creative', color: '#B070B8' },
};

interface ScreenTimeWarningModalProps {
  visible: boolean;
  warning: ScreenTimeWarning | null;
  lastActivityType?: ActivityType;
  /** Specific bridge activity ID (e.g. 'abc-animals') for contextual suggestions */
  lastCompletedActivityId?: string | null;
  onDismiss: () => void;
}

export function ScreenTimeWarningModal({
  visible,
  warning,
  lastActivityType = 'general',
  lastCompletedActivityId = null,
  onDismiss,
}: ScreenTimeWarningModalProps) {
  const { t } = useTranslation();
  // Animation values for slide up/down
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const isAnimatingOut = useSharedValue(false);

  // Try to get bridge data for the specific activity
  const bridgeData = lastCompletedActivityId ? getBridgeData(lastCompletedActivityId) : undefined;

  // Fall back to generic suggestions when no bridge data is available
  const genericSuggestions = useMemo(() => {
    if (bridgeData) return []; // Not needed when bridge data is available
    const keyPrefix = SUGGESTION_KEY_MAP[lastActivityType];
    const allSuggestions: string[] = [];
    for (let i = 1; i <= SUGGESTIONS_PER_ACTIVITY; i++) {
      allSuggestions.push(t(`${keyPrefix}.${i}`));
    }
    // Shuffle and take 2
    const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }, [lastActivityType, t, bridgeData]);

  // Animate in when visible changes
  useEffect(() => {
    if (visible && warning) {
      // Slide up from bottom
      translateY.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
    }
  }, [visible, warning]);

  // Handle close with slide down animation
  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    isAnimatingOut.value = true;
    backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      {
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(onDismiss)();
          isAnimatingOut.value = false;
        }
      }
    );
  }, [onDismiss]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Don't render if not visible and no warning
  if (!visible && !warning) return null;
  if (!warning) return null;

  type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
  const getModalIcon = (): IoniconsName => {
    switch (warning.type) {
      case 'approaching_limit':
        return 'timer-outline';
      case 'limit_reached':
        return 'stop-circle-outline';
      case 'daily_complete':
        return 'checkmark-circle-outline';
      default:
        return 'timer-outline';
    }
  };

  const getModalTitle = () => {
    switch (warning.type) {
      case 'approaching_limit':
        return t('screenTimeWarning.approachingLimit');
      case 'limit_reached':
        return t('screenTimeWarning.limitReached');
      case 'daily_complete':
        return t('screenTimeWarning.dailyComplete');
      default:
        return t('screenTimeWarning.notice');
    }
  };

  const getModalColor = () => {
    switch (warning.type) {
      case 'approaching_limit':
        return '#F59E0B'; // Amber
      case 'limit_reached':
        return '#EF4444'; // Red
      case 'daily_complete':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <View style={styles.absoluteContainer} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop - tap to close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        </Animated.View>
      </Pressable>

      {/* Modal content - slides up/down */}
      <Animated.View style={[styles.modalWrapper, modalAnimatedStyle]}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1E3A8A', '#3B82F6']}
            style={styles.modal}
          >
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: getModalColor() }]}>
              <Ionicons name={getModalIcon()} size={36} color="#FFFFFF" />
            </View>

            {/* Title */}
            <Text style={styles.title}>{getModalTitle()}</Text>

            {/* Message */}
            <Text style={styles.message}>{warning.message}</Text>

            {/* WHO/AAP Guidelines Note */}
            <View style={styles.guidelinesContainer}>
              <Text style={styles.guidelinesText}>
                {t('screenTimeWarning.guidelines')}
              </Text>
            </View>

            {/* Activity-based suggestions — bridge cards or generic fallback */}
            <View style={styles.suggestionsContainer} testID="activity-suggestions">
              <Text style={styles.suggestionsTitle}>
                {SUGGESTION_EMOJI[lastActivityType]} {t('screenTimeWarning.trySomethingNew')}
              </Text>
              {bridgeData ? (
                <>
                  {/* Bridge narration */}
                  <Text style={styles.bridgeNarration} testID="bridge-narration">
                    {t(bridgeData.narrationKey)}
                  </Text>
                  {/* Adventure cards */}
                  {bridgeData.adventures.map((adventure, index) => {
                    const config = BRIDGE_CATEGORY_CONFIG[adventure.category];
                    return (
                      <View key={adventure.category} style={styles.bridgeCard} testID={`bridge-card-${index}`}>
                        <View style={[styles.bridgeCardHeader, { backgroundColor: config.color }]}>
                          <Ionicons name={config.icon} size={16} color="#FFFFFF" />
                          <Text style={styles.bridgeCategoryLabel}>{t(config.labelKey)}</Text>
                        </View>
                        <Text style={styles.bridgeCardDescription}>
                          {t(adventure.descriptionKey)}
                        </Text>
                      </View>
                    );
                  })}
                </>
              ) : (
                genericSuggestions.map((suggestion, index) => (
                  <View key={index} style={styles.suggestionItem}>
                    <Text style={styles.suggestionBullet}>•</Text>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Action Button */}
            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.button, styles.closeButton]}
                onPress={handleDismiss}
              >
                <Text style={styles.closeButtonText}>{t('screenTimeWarning.closeNotification')}</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
  },
  modal: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  guidelinesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  guidelinesText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  continueButton: {
    backgroundColor: '#F59E0B',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#10B981',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#EF4444',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dismissButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(76, 205, 196, 0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    width: '100%',
  },
  suggestionsTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  suggestionBullet: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginRight: 8,
    lineHeight: 20,
  },
  suggestionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  bridgeNarration: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  bridgeCard: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginTop: 6,
  },
  bridgeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
  },
  bridgeCategoryLabel: {
    fontFamily: Fonts.rounded,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bridgeCardDescription: {
    fontFamily: Fonts.primary,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 6,
    lineHeight: 18,
  },
});
