import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BORDER_DEFAULT, NIGHT_DEEP, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { CHILD_UI_MOTION, motionDuration, type MotionBeat } from '@/constants/child-ui-motion';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { RADIUS_LARGE, SPACE_2, SPACE_3, SPACE_4 } from '@/components/child-ui/tokens';
import { EditProfileContent } from '@/components/account/edit-profile-screen';
import { useCoversJourneyBar } from '@/components/child-ui/journey-bar-cover';

const RISE_PX = 48;
/** The slide back down, before the sheet is taken away. */
const EXIT_BEAT: MotionBeat = { duration: 260, reducedDuration: 0 };
export const PROFILE_EDIT_SHEET_EXIT_MS = EXIT_BEAT.duration;

interface ProfileEditSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * The edit page, risen over the profile rather than reached through the
 * grown-ups' area. It hosts exactly the content onboarding uses, so a name,
 * avatar or age changed here behaves as it did the first time.
 */
export function ProfileEditSheet({ visible, onClose }: ProfileEditSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize } = useAccessibility();
  const reduceMotion = useReducedMotion();
  const rise = useSharedValue(0);
  // the sheet leaves the way it came, so it stays mounted for the length of
  // the slide down and is only taken away once it is out of view; reopening
  // mid-slide cancels that through the effect's own cleanup
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      rise.value = withTiming(1, {
        duration: motionDuration(CHILD_UI_MOTION.navSlide, reduceMotion),
        easing: Easing.out(Easing.cubic),
      });
      return;
    }
    const exitMs = motionDuration(EXIT_BEAT, reduceMotion);
    rise.value = withTiming(0, { duration: exitMs, easing: Easing.in(Easing.cubic) });
    const leave = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(leave);
  }, [visible, rise, reduceMotion]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * RISE_PX }],
  }));

  useCoversJourneyBar(mounted);

  if (!mounted) return null;

  return (
    <View style={styles.overlay} testID="profile-edit-sheet" pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="profile-edit-backdrop" accessible={false} />
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + SPACE_3 }, sheetStyle]}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>{t('profile.editTitle')}</Text>
          <Pressable
            testID="profile-edit-close"
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            hitSlop={8}
            style={styles.close}
          >
            <Ionicons name="close" size={22} color={TEXT_PRIMARY} />
          </Pressable>
        </View>
        <EditProfileContent onSaveComplete={onClose} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 16, 47, 0.55)',
  },
  sheet: {
    height: '88%',
    backgroundColor: NIGHT_DEEP,
    borderTopLeftRadius: RADIUS_LARGE,
    borderTopRightRadius: RADIUS_LARGE,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: BORDER_DEFAULT,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE_4,
    paddingTop: SPACE_4,
    paddingBottom: SPACE_2,
  },
  title: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '800',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
