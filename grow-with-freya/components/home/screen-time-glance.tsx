import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withDelay,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
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
import {
  SCREEN_TIME_GLANCE,
  panelBorderPath,
  DROP_PATH,
  DROP_GLOSS,
  DROP_VIEWBOX,
} from '@/constants/screen-time-ring';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SPINNER_BOX = (SCREEN_TIME_GLANCE.spinnerRadius + SCREEN_TIME_GLANCE.spinnerStroke) * 2 + 2;

export interface ScreenTimeGlanceProps {
  visible: boolean;
  timeOfDay: TimeOfDay;
  onClose: () => void;
  /** Centre of the ring this opened from, so the spinner rises there. Falls
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
 * The open is a piece of choreography rather than a fade: an echo of the
 * ring spins up where the parent pressed it, travels to the panel's nearest
 * corner, flattens into a line, and that line draws the border -- all of it
 * over the live home screen. Only once the border closes does the settle
 * happen: the background blacks out and the fill arrives inside the frame,
 * together. The ring's colour never floods the screen, and nothing dims
 * until the frame that will hold the colour exists.
 *
 * Closing runs it in reverse register: the content dims, the panel gathers
 * itself in, becomes a true teardrop, and the drop falls off the bottom of
 * the screen.
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

  const { width, height } = Dimensions.get('window');
  const centre = origin ?? { x: width / 2, y: height / 2 };

  const surface = exceeded ? SCREEN_TIME_GLANCE.exceededSurface : SCREEN_TIME_GLANCE.calmSurface;
  const panelBorder = exceeded ? SCREEN_TIME_GLANCE.exceededBorder : SCREEN_TIME_GLANCE.calmBorder;
  const panelGlow = exceeded ? SCREEN_TIME_GLANCE.exceededGlow : SCREEN_TIME_GLANCE.calmGlow;
  const drawStroke = exceeded ? SCREEN_TIME_GLANCE.exceededDraw : SCREEN_TIME_GLANCE.calmDraw;

  const geometry = useMemo(() => {
    const inset = SCREEN_TIME_GLANCE.panelInset;
    const bounds = {
      left: inset,
      top: insets.top + inset,
      right: width - inset,
      bottom: height - insets.bottom - inset,
      radius: SCREEN_TIME_GLANCE.panelRadius,
    };
    const border = panelBorderPath(bounds);
    const panelW = bounds.right - bounds.left;
    const panelH = bounds.bottom - bounds.top;

    return {
      bounds,
      border,
      panelW,
      panelH,
      // where the spinner hands over to the border: the path's own start
      drawStart: { x: bounds.left, y: bounds.bottom - bounds.radius },
      // how far the drop falls to clear the bottom of the screen
      fallDistance: height - (bounds.top + bounds.bottom) / 2 + 80,
      dropScaleX: SCREEN_TIME_GLANCE.dropWidth / panelW,
      dropScaleY: SCREEN_TIME_GLANCE.dropHeight / panelH,
    };
  }, [insets.top, insets.bottom, width, height]);

  // -- open choreography --
  const scrimOpacity = useSharedValue(0);
  const spinnerOpacity = useSharedValue(0);
  const spinnerRotate = useSharedValue(0);
  const spinnerScale = useSharedValue(1);
  const spinnerTravel = useSharedValue(0); // 0 at the ring, 1 at the border's start
  // the morph: the arc flattens into the vertical line the border grows from
  const spinnerSquashX = useSharedValue(1);
  const spinnerSquashY = useSharedValue(1);
  const drawProgress = useSharedValue(0);
  const drawOpacity = useSharedValue(1);
  const panelOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  // -- close choreography --
  const dropScaleX = useSharedValue(1);
  const dropScaleY = useSharedValue(1);
  const dropRadius = useSharedValue<number>(SCREEN_TIME_GLANCE.panelRadius);
  const dropFall = useSharedValue(0);
  const dropTint = useSharedValue(0);
  // the teardrop that takes over from the gathered panel and does the falling
  const dropOpacity = useSharedValue(0);
  const dropStretch = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      setMounted(true);

      // a re-open starts from the beginning, whatever the close left behind
      dropScaleX.value = 1;
      dropScaleY.value = 1;
      dropRadius.value = SCREEN_TIME_GLANCE.panelRadius;
      dropFall.value = 0;
      dropTint.value = 0;
      dropOpacity.value = 0;
      dropStretch.value = 1;
      spinnerSquashX.value = 1;
      spinnerSquashY.value = 1;
      drawProgress.value = 0;
      drawOpacity.value = 1;

      if (reduceMotion) {
        // no travel: the window is simply there
        scrimOpacity.value = 1;
        spinnerOpacity.value = 0;
        drawProgress.value = 1;
        drawOpacity.value = 0;
        panelOpacity.value = 1;
        contentOpacity.value = 1;
        return;
      }

      const {
        spinDuration,
        travelDuration,
        morphDuration,
        drawDuration,
        settleDuration,
        fadeDuration,
      } = SCREEN_TIME_GLANCE;
      const morphStartsAt = spinDuration + travelDuration;
      // the line starts growing while the morph is still finishing, so the
      // flattened arc and the border's first segment read as one stroke
      const drawStartsAt = morphStartsAt + morphDuration * 0.5;
      const settleStartsAt = drawStartsAt + drawDuration;

      // 1. the ring's echo spins up where it was pressed, over the live
      //    home screen -- nothing dims yet...
      spinnerOpacity.value = withTiming(1, { duration: 120 });
      spinnerScale.value = withSequence(
        withTiming(1.18, { duration: spinDuration * 0.55, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: spinDuration * 0.45 })
      );
      spinnerRotate.value = withTiming(720, {
        duration: morphStartsAt,
        easing: Easing.inOut(Easing.cubic),
      });

      // 2. ...travels to the border's start...
      spinnerTravel.value = withDelay(
        spinDuration,
        withTiming(1, { duration: travelDuration, easing: Easing.in(Easing.cubic) })
      );

      // 3. ...flattens into the vertical line the border grows from...
      spinnerSquashX.value = withDelay(
        morphStartsAt,
        withTiming(0.14, { duration: morphDuration, easing: Easing.in(Easing.cubic) })
      );
      spinnerSquashY.value = withDelay(
        morphStartsAt,
        withTiming(1.5, { duration: morphDuration, easing: Easing.out(Easing.cubic) })
      );
      spinnerOpacity.value = withDelay(
        morphStartsAt + morphDuration * 0.6,
        withTiming(0, { duration: 140 })
      );

      // 4. ...and the line draws the box
      drawProgress.value = withDelay(
        drawStartsAt,
        withTiming(1, { duration: drawDuration, easing: Easing.inOut(Easing.cubic) })
      );

      // 5. the settle: the background blacks out and the fill arrives inside
      //    the frame at the same time, the drawn stroke handing over to the
      //    panel's own border
      scrimOpacity.value = withDelay(
        settleStartsAt,
        withTiming(1, { duration: settleDuration })
      );
      panelOpacity.value = withDelay(
        settleStartsAt,
        withTiming(1, { duration: settleDuration })
      );
      drawOpacity.value = withDelay(
        settleStartsAt + settleDuration * 0.5,
        withTiming(0, { duration: settleDuration })
      );
      contentOpacity.value = withDelay(
        settleStartsAt + settleDuration * 0.7,
        withTiming(1, { duration: fadeDuration })
      );
      return;
    }

    setMounted(false);
    setTipsOpen(false);
    scrimOpacity.value = 0;
    spinnerOpacity.value = 0;
    spinnerRotate.value = 0;
    spinnerScale.value = 1;
    spinnerTravel.value = 0;
    spinnerSquashX.value = 1;
    spinnerSquashY.value = 1;
    drawProgress.value = 0;
    panelOpacity.value = 0;
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

    const { dropShrink, dropFall: fallDuration, fadeDuration } = SCREEN_TIME_GLANCE;
    const { fallDistance, dropScaleX: sx, dropScaleY: sy, panelW } = geometry;
    const gatherEndsAt = fadeDuration * 0.7 + dropShrink;
    const fallStartsAt = gatherEndsAt + 90;

    // the content dims, the panel gathers in...
    contentOpacity.value = withTiming(0, { duration: fadeDuration * 0.7 });
    dropTint.value = withDelay(
      fadeDuration * 0.7 + dropShrink * 0.4,
      withTiming(1, { duration: dropShrink * 0.6 })
    );
    dropScaleX.value = withDelay(
      fadeDuration * 0.7,
      withTiming(sx, { duration: dropShrink, easing: Easing.inOut(Easing.cubic) })
    );
    dropScaleY.value = withDelay(
      fadeDuration * 0.7,
      withTiming(sy, { duration: dropShrink, easing: Easing.inOut(Easing.cubic) })
    );
    dropRadius.value = withDelay(
      fadeDuration * 0.7,
      withTiming(panelW / 2, { duration: dropShrink, easing: Easing.inOut(Easing.cubic) })
    );

    // ...becomes a true teardrop -- the gathered blob hands over to the drop
    // shape in a quick crossfade at its smallest...
    panelOpacity.value = withDelay(gatherEndsAt, withTiming(0, { duration: 90 }));
    dropOpacity.value = withDelay(gatherEndsAt - 30, withTiming(1, { duration: 90 }));

    // ...hangs for a beat, stretches, and falls
    dropStretch.value = withDelay(
      fallStartsAt,
      withTiming(1.15, { duration: fallDuration })
    );
    dropFall.value = withDelay(
      fallStartsAt,
      withTiming(
        fallDistance,
        { duration: fallDuration, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(finishClose)();
        }
      )
    );
    scrimOpacity.value = withDelay(
      fallStartsAt + fallDuration * 0.4,
      withTiming(0, { duration: fallDuration * 0.6 })
    );
  }, [finishClose, reduceMotion, geometry]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));

  const spinnerStyle = useAnimatedStyle(() => {
    const dx = (geometry.drawStart.x - centre.x) * spinnerTravel.value;
    const dy = (geometry.drawStart.y - centre.y) * spinnerTravel.value;
    return {
      opacity: spinnerOpacity.value,
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotate: `${spinnerRotate.value}deg` },
        { scale: spinnerScale.value },
        { scaleX: spinnerSquashX.value },
        { scaleY: spinnerSquashY.value },
      ],
    };
  });

  const drawProps = useAnimatedProps(() => ({
    strokeDashoffset: geometry.border.length * (1 - drawProgress.value),
    opacity: drawOpacity.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    borderRadius: dropRadius.value,
    transform: [
      { translateY: dropFall.value },
      { scaleX: dropScaleX.value },
      { scaleY: dropScaleY.value },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const tintStyle = useAnimatedStyle(() => ({ opacity: dropTint.value }));

  const teardropStyle = useAnimatedStyle(() => ({
    opacity: dropOpacity.value,
    transform: [{ translateY: dropFall.value }, { scaleY: dropStretch.value }],
  }));

  const { bounds } = geometry;
  const spinnerArc = 2 * Math.PI * SCREEN_TIME_GLANCE.spinnerRadius;

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
        {/* everything outside the panel: dim night, never the alarm colour */}
        <Animated.View
          testID="screen-time-glance-scrim"
          pointerEvents="none"
          style={[styles.scrim, scrimStyle]}
        />

        {/* the border being drawn, ahead of the panel existing */}
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={width}
          height={height}
        >
          <AnimatedPath
            testID="screen-time-glance-border"
            d={geometry.border.d}
            stroke={drawStroke}
            strokeWidth={SCREEN_TIME_GLANCE.panelBorderWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${geometry.border.length} ${geometry.border.length}`}
            animatedProps={drawProps}
          />
        </Svg>

        {/* the ring's echo: spins where it was pressed, then travels to the
            border's start point and hands over to the drawing */}
        <Animated.View
          testID="screen-time-glance-spinner"
          pointerEvents="none"
          style={[
            styles.spinner,
            {
              left: centre.x - SPINNER_BOX / 2,
              top: centre.y - SPINNER_BOX / 2,
            },
            spinnerStyle,
          ]}
        >
          <Svg width={SPINNER_BOX} height={SPINNER_BOX}>
            <Circle
              cx={SPINNER_BOX / 2}
              cy={SPINNER_BOX / 2}
              r={SCREEN_TIME_GLANCE.spinnerRadius}
              stroke={drawStroke}
              strokeWidth={SCREEN_TIME_GLANCE.spinnerStroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${spinnerArc * 0.72} ${spinnerArc * 0.28}`}
            />
          </Svg>
        </Animated.View>

        {/* the panel the border was drawn for -- the only place the fill
            colour is allowed to be */}
        <Animated.View
          testID="screen-time-glance-panel"
          style={[
            styles.panel,
            {
              top: bounds.top,
              bottom: height - bounds.bottom,
              left: bounds.left,
              right: width - bounds.right,
              borderRadius: SCREEN_TIME_GLANCE.panelRadius,
              borderWidth: SCREEN_TIME_GLANCE.panelBorderWidth,
              borderColor: panelBorder,
              backgroundColor: surface,
              shadowColor: panelGlow,
            },
            panelStyle,
          ]}
        >
          <Animated.View style={[styles.panelContent, contentStyle]}>
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
          </Animated.View>

          {/* what the drop is made of: the bright ring colour washes over the
              panel as it gathers, so the falling drop reads as the ring's
              water rather than a shrinking page */}
          <Animated.View
            testID="screen-time-glance-drop-tint"
            pointerEvents="none"
            style={[
              styles.dropTint,
              { backgroundColor: drawStroke },
              tintStyle,
            ]}
          />
        </Animated.View>

        {/* the teardrop itself: takes over from the gathered panel at its
            smallest, then stretches and falls -- a real drop silhouette, not
            a shrunken rectangle */}
        <Animated.View
          testID="screen-time-glance-drop"
          pointerEvents="none"
          style={[
            styles.teardrop,
            {
              left: (bounds.left + bounds.right) / 2 - SCREEN_TIME_GLANCE.dropWidth / 2,
              top: (bounds.top + bounds.bottom) / 2 - SCREEN_TIME_GLANCE.dropHeight / 2,
            },
            teardropStyle,
          ]}
        >
          <Svg
            width={SCREEN_TIME_GLANCE.dropWidth}
            height={SCREEN_TIME_GLANCE.dropHeight}
            viewBox={DROP_VIEWBOX}
          >
            <Path testID="screen-time-glance-drop-shape" d={DROP_PATH} fill={drawStroke} />
            {/* the highlight crescent that makes it read as water */}
            <Path d={DROP_GLOSS} fill="rgba(255, 255, 255, 0.45)" />
          </Svg>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SCREEN_TIME_GLANCE.scrim,
  },
  spinner: {
    position: 'absolute',
    width: SPINNER_BOX,
    height: SPINNER_BOX,
  },
  panel: {
    position: 'absolute',
    overflow: 'hidden',
    // the border's own glow, so the frame reads as lit rather than drawn
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
  },
  panelContent: {
    flex: 1,
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
  dropTint: {
    ...StyleSheet.absoluteFillObject,
  },
  teardrop: {
    position: 'absolute',
    width: SCREEN_TIME_GLANCE.dropWidth,
    height: SCREEN_TIME_GLANCE.dropHeight,
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
