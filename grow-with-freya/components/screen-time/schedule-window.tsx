import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Modal } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomRemindersContent, CreateReminderContent } from '../reminders';
import { RecommendedTimes } from './recommended-times';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Fonts } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

/** How much of the screen the sheet covers. The dashboard stays visible above. */
const SHEET_HEIGHT_RATIO = 0.92;

type SchedulePage = 'list' | 'create';

export interface ScheduleWindowProps {
  visible: boolean;
  onClose: () => void;
  /** Fires whenever a reminder is created, toggled or deleted, so the host can
   *  re-check its unsaved-changes state. */
  onReminderChange?: () => void;
}

/**
 * The reminders flow as a sheet over the Screen Time dashboard.
 *
 * The list and the create form are the header-less `*Content` variants, so this
 * supplies the one header both pages share. Opening no longer costs the parent
 * the usage figures they were reading -- those stay behind the sheet.
 */
export function ScheduleWindow({ visible, onClose, onReminderChange }: ScheduleWindowProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, isTablet, contentMaxWidth } = useAccessibility();
  const reduceMotion = useReducedMotion();

  const [mounted, setMounted] = useState(visible);
  const [page, setPage] = useState<SchedulePage>('list');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setPage('list');
      if (reduceMotion) {
        // no travel: the sheet is simply there
        translateY.value = 0;
        backdropOpacity.value = 1;
      } else {
        translateY.value = withTiming(0, {
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
        });
        backdropOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
      }
    } else {
      // the host closed it without going through handleClose (hardware back,
      // a save) -- drop it rather than leaving a sheet parked off-screen
      setMounted(false);
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
    }
  }, [visible, reduceMotion]);

  const finishClose = useCallback(() => {
    setMounted(false);
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (reduceMotion) {
      finishClose();
      return;
    }
    backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: ANIMATION_DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      }
    );
  }, [finishClose, reduceMotion]);

  /** Back steps within the sheet before it steps out of it. */
  const handleBack = useCallback(() => {
    if (page === 'create') {
      setPage('list');
      return;
    }
    handleClose();
  }, [page, handleClose]);

  const noteChange = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
    onReminderChange?.();
  }, [onReminderChange]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const onList = page === 'list';

  return (
    <Modal
      testID="schedule-window"
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleBack}
    >
      <Pressable
        testID="schedule-window-backdrop"
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        style={StyleSheet.absoluteFill}
        onPress={handleClose}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        </Animated.View>
      </Pressable>

      <Animated.View
        testID="schedule-window-sheet"
        style={[styles.sheetWrap, isTablet && tabletSheet(contentMaxWidth), sheetStyle]}
      >
        <LinearGradient colors={['#141A3C', '#0B1030']} style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Pressable
              testID="schedule-window-back"
              accessibilityRole="button"
              onPress={handleBack}
              style={[styles.headerButton, { minHeight: scaledButtonSize(40) }]}
            >
              <Ionicons
                name={onList ? 'close' : 'arrow-back'}
                size={scaledButtonSize(22)}
                color="rgba(255, 255, 255, 0.85)"
              />
            </Pressable>

            <Text style={[styles.headerTitle, { fontSize: scaledFontSize(18) }]} numberOfLines={1}>
              {t(onList ? 'screenTime.customReminders' : 'reminders.createTitle')}
            </Text>

            {onList ? (
              <Pressable
                testID="schedule-window-new"
                accessibilityRole="button"
                accessibilityLabel={t('reminders.createTitle')}
                onPress={() => setPage('create')}
                style={[styles.headerButton, { minHeight: scaledButtonSize(40) }]}
              >
                <Ionicons name="add" size={scaledButtonSize(24)} color="rgba(255, 255, 255, 0.85)" />
              </Pressable>
            ) : (
              <View style={[styles.headerButton, { minHeight: scaledButtonSize(40) }]} />
            )}
          </View>

          <View style={[styles.body, { paddingBottom: insets.bottom }]}>
            {onList ? (
              <CustomRemindersContent
                onCreateNew={() => setPage('create')}
                onReminderChange={noteChange}
                refreshTrigger={refreshTrigger}
                isActive
                footer={
                  <View style={styles.recommendedWrap}>
                    <RecommendedTimes />
                  </View>
                }
              />
            ) : (
              <CreateReminderContent
                onBack={() => setPage('list')}
                onSuccess={() => {
                  noteChange();
                  setPage('list');
                }}
                refreshTrigger={refreshTrigger}
                isActive
              />
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

/** On a tablet the sheet stops short of the bezels and sits centred. */
function tabletSheet(maxWidth: number) {
  return { width: maxWidth, alignSelf: 'center' as const, left: undefined, right: undefined };
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4, 8, 26, 0.55)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * SHEET_HEIGHT_RATIO,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
  },
  recommendedWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
});
