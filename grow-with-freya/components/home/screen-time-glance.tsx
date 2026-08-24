import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, Modal, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenTimeContent } from '@/components/screen-time/screen-time-screen';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Fonts } from '@/constants/theme';
import { HOME_SCENE_TYPE, type TimeOfDay } from '@/constants/home-scene';
import { SCREEN_TIME_GLANCE, revealDiameter } from '@/constants/screen-time-ring';

export interface ScreenTimeGlanceProps {
  visible: boolean;
  timeOfDay: TimeOfDay;
  onClose: () => void;
  /** Centre of the ring this opened from, so the reveal starts there. Falls
   *  back to the middle of the screen when the host cannot say. */
  origin?: { x: number; y: number };
  /** True when the ring is in its over-limit red state -- the window takes
   *  its colour from the control the parent actually pressed. */
  exceeded?: boolean;
  testID?: string;
}

/**
 * The usage window that opens out of the home screen's screen-time ring.
 *
 * It answers one question -- how long today -- so it carries the usage
 * dashboard and nothing else: `showSchedule={false}` keeps the schedule
 * callout and bedtime guidance out, since building a schedule belongs in
 * settings rather than in a glance.
 *
 * The open is a circular reveal from the ring's own centre in the ring's own
 * colour, so it reads as that control growing into a page rather than an
 * unrelated sheet arriving over the top of it.
 */
export const ScreenTimeGlance = memo(function ScreenTimeGlance({
  visible,
  timeOfDay,
  onClose,
  origin,
  exceeded = false,
  testID = 'screen-time-glance',
}: ScreenTimeGlanceProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const [mounted, setMounted] = useState(visible);

  const reveal = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const { width, height } = Dimensions.get('window');
  const centre = origin ?? { x: width / 2, y: height / 2 };
  const diameter = revealDiameter(centre, width, height);

  const surface = exceeded ? SCREEN_TIME_GLANCE.exceededSurface : SCREEN_TIME_GLANCE.calmSurface;
  const revealColour = exceeded ? SCREEN_TIME_GLANCE.exceededReveal : SCREEN_TIME_GLANCE.calmReveal;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (reduceMotion) {
        // no travel: the window is simply there
        reveal.value = 1;
        contentOpacity.value = 1;
        return;
      }
      reveal.value = withTiming(1, {
        duration: SCREEN_TIME_GLANCE.revealDuration,
        easing: Easing.out(Easing.cubic),
      });
      // the dashboard fades in behind the circle once it has covered enough
      // ground to read as a surface rather than a growing dot
      contentOpacity.value = withDelay(
        SCREEN_TIME_GLANCE.revealDuration * 0.45,
        withTiming(1, { duration: SCREEN_TIME_GLANCE.fadeDuration })
      );
      return;
    }

    setMounted(false);
    reveal.value = 0;
    contentOpacity.value = 0;
  }, [visible, reduceMotion]);

  const finishClose = useCallback(() => {
    setMounted(false);
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (reduceMotion) {
      finishClose();
      return;
    }

    contentOpacity.value = withTiming(0, { duration: SCREEN_TIME_GLANCE.fadeDuration });
    reveal.value = withTiming(
      0,
      { duration: SCREEN_TIME_GLANCE.revealDuration, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      }
    );
  }, [finishClose, reduceMotion]);

  const revealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reveal.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <Modal
      testID={testID}
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.root} pointerEvents="box-none">
        {/* the circle that grows out of the ring */}
        <Animated.View
          testID="screen-time-glance-reveal"
          pointerEvents="none"
          style={[
            styles.reveal,
            {
              left: centre.x - diameter / 2,
              top: centre.y - diameter / 2,
              width: diameter,
              height: diameter,
              borderRadius: diameter / 2,
              backgroundColor: revealColour,
            },
            revealStyle,
          ]}
        />

        {/* the surface the dashboard actually sits on, held just inside the
            circle's colour so text stays readable once it has opened */}
        <Animated.View
          testID="screen-time-glance-surface"
          style={[styles.surface, { backgroundColor: surface }, contentStyle]}
        >
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Pressable
              testID="screen-time-glance-close"
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={handleClose}
              hitSlop={12}
              style={[
                styles.close,
                {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32 }}
            showsVerticalScrollIndicator={false}
          >
            <ScreenTimeContent showSchedule={false} showBackdrop={false} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  reveal: {
    position: 'absolute',
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
  },
  // floats over the scroll content so the dashboard's earth art can rise up
  // behind the title, as in the design
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_SCENE_TYPE.continueTitle,
    fontWeight: '700',
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
