import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
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
import { ScreenTimeAlertHeader } from '@/components/screen-time/screen-time-alert-header';
import { RealWorldTips } from '@/components/screen-time/real-world-tips';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { TABLET_CONTENT_MAX_WIDTH } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import { type TimeOfDay } from '@/constants/home-scene';
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
  /** Seconds used today and the day's allowance, for the alert header. Both
   *  default to zero so a host that only knows the exceeded flag still
   *  renders; the header is only shown when exceeded anyway. */
  usageSeconds?: number;
  limitSeconds?: number;
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
 * unrelated sheet arriving over the top of it. The circle stays full-bleed;
 * what it settles into is an inset, outlined panel, so the ring's colour is
 * left showing as a frame around the page.
 *
 * Once the day's limit is spent the panel leads with an alert header instead
 * of the dashboard greeting, and offers the one action that is actually worth
 * offering at that point: ways to carry the story off the screen.
 */
export const ScreenTimeGlance = memo(function ScreenTimeGlance({
  visible,
  timeOfDay,
  onClose,
  origin,
  exceeded = false,
  usageSeconds = 0,
  limitSeconds = 0,
  testID = 'screen-time-glance',
}: ScreenTimeGlanceProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const [mounted, setMounted] = useState(visible);
  const [tipsOpen, setTipsOpen] = useState(false);

  const reveal = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const { width, height } = Dimensions.get('window');
  const centre = origin ?? { x: width / 2, y: height / 2 };
  const diameter = revealDiameter(centre, width, height);

  const surface = exceeded ? SCREEN_TIME_GLANCE.exceededSurface : SCREEN_TIME_GLANCE.calmSurface;
  const revealColour = exceeded ? SCREEN_TIME_GLANCE.exceededReveal : SCREEN_TIME_GLANCE.calmReveal;
  const panelBorder = exceeded ? SCREEN_TIME_GLANCE.exceededBorder : SCREEN_TIME_GLANCE.calmBorder;
  const panelGlow = exceeded ? SCREEN_TIME_GLANCE.exceededGlow : SCREEN_TIME_GLANCE.calmGlow;

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
    setTipsOpen(false);
    reveal.value = 0;
    contentOpacity.value = 0;
  }, [visible, reduceMotion]);

  const finishClose = useCallback(() => {
    setMounted(false);
    setTipsOpen(false);
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

  const inset = SCREEN_TIME_GLANCE.panelInset;

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
          {/* the framed panel: inset from the edges so the ring's colour is
              left showing as a border of its own around the page */}
          <View
            testID="screen-time-glance-panel"
            style={[
              styles.panel,
              {
                top: insets.top + inset,
                bottom: insets.bottom + inset,
                left: inset,
                right: inset,
                borderRadius: SCREEN_TIME_GLANCE.panelRadius,
                borderWidth: SCREEN_TIME_GLANCE.panelBorderWidth,
                borderColor: panelBorder,
                backgroundColor: surface,
                shadowColor: panelGlow,
              },
            ]}
          >
            <View style={styles.panelHeader}>
              <Pressable
                testID="screen-time-glance-close"
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={handleClose}
                hitSlop={12}
                style={styles.close}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            {tipsOpen ? (
              <RealWorldTips onClose={() => setTipsOpen(false)} />
            ) : (
              <>
                <ScrollView
                  contentContainerStyle={styles.panelScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {/* the alert leads only when the limit is actually spent --
                      below it the encouragement banner is still positive, and
                      an alert over "you're within today's limit" would be the
                      app contradicting itself */}
                  {exceeded && (
                    <ScreenTimeAlertHeader
                      usageSeconds={usageSeconds}
                      limitSeconds={limitSeconds}
                    />
                  )}
                  <ScreenTimeContent
                    showSchedule={false}
                    showBackdrop={false}
                    showGreeting={!exceeded}
                  />
                </ScrollView>

                {exceeded && (
                  // the inset lives on the row so the button can be a plain
                  // full-width child, capped to the same column the dashboard
                  // above it uses on a tablet
                  <View style={styles.tipsRow}>
                    <Pressable
                      testID="screen-time-glance-tips"
                      accessibilityRole="button"
                      accessibilityLabel={t('screenTime.alert.showTips')}
                      onPress={() => setTipsOpen(true)}
                      style={styles.tipsButton}
                    >
                      <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.tipsLabel}>{t('screenTime.alert.showTips')}</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
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
  panel: {
    position: 'absolute',
    overflow: 'hidden',
    // the border's own glow, so the red frame reads as lit rather than drawn
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
  },
  // sits above the scroll content so the dashboard's earth art can rise up
  // behind it, as in the design
  panelHeader: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 10,
  },
  panelScroll: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    // a dark scrim rather than a white wash: in the calm state this button
    // sits directly over the dashboard's bright earth art, where a
    // translucent white fill disappears entirely
    backgroundColor: 'rgba(8, 10, 40, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsRow: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    alignItems: 'center',
  },
  tipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: TABLET_CONTENT_MAX_WIDTH,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F2705F',
  },
  tipsLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
