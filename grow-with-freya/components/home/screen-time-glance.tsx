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
  interpolateColor,
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
  SCREEN_TIME_RING,
  panelBorderPath,
  dropFlight,
  splashPath,
  DROP_PATH,
  DROP_GLOSS,
  DROP_VIEWBOX,
} from '@/constants/screen-time-ring';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SPINNER_BOX = (SCREEN_TIME_GLANCE.spinnerRadius + SCREEN_TIME_GLANCE.spinnerStroke) * 2 + 2;

// the splash needs far more room than the orb: its droplets fly well clear
// of the drop that threw them
const SPLASH_BOX = 150;
const SPLASH_SPREAD = 44;
const SPLASH_GRAVITY = 52;
const SPLASH_DROP_RADIUS = 4.5;

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
      // the drop's flight home: from the panel's centre back to the ring it
      // came out of, so the close lands where the open began
      flight: dropFlight(bounds, centre),
      dropScaleX: SCREEN_TIME_GLANCE.dropWidth / panelW,
      dropScaleY: SCREEN_TIME_GLANCE.dropHeight / panelH,
    };
  }, [insets.top, insets.bottom, width, height, centre.x, centre.y]);

  // -- open choreography --
  const scrimOpacity = useSharedValue(0);
  const spinnerOpacity = useSharedValue(0);
  const spinnerRotate = useSharedValue(0);
  const spinnerScale = useSharedValue(1);
  const spinnerTravel = useSharedValue(0); // 0 at the ring, 1 at the border's start
  // the morph: the arc flattens into the vertical line the border grows from
  const spinnerSquashX = useSharedValue(1);
  const spinnerSquashY = useSharedValue(1);
  // the turn: 0 is the ring's own colour, 1 is the water blue the box is
  // drawn in -- the orb changes colour while it spins
  const spinnerWater = useSharedValue(0);
  // the core: the solid dot the orb takes over from the ring. 1 is the
  // ring's own dot; it shrinks to nothing as the orb reduces into the line
  const spinnerCore = useSharedValue(1);
  const drawProgress = useSharedValue(0);
  const drawOpacity = useSharedValue(1);
  const panelOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  // -- close choreography --
  const dropScaleX = useSharedValue(1);
  const dropScaleY = useSharedValue(1);
  const dropRadius = useSharedValue<number>(SCREEN_TIME_GLANCE.panelRadius);
  const dropTint = useSharedValue(0);
  // the teardrop that takes over from the gathered panel and flies home. Two
  // axes rather than one: given different easings they bend the flight into
  // an arc, where a single value could only ever slide in a straight line.
  const dropOpacity = useSharedValue(0);
  const dropStretch = useSharedValue(1);
  const dropReturnX = useSharedValue(0);
  const dropReturnY = useSharedValue(0);
  // the splash the drop makes as it lands, and the orb that emerges from it
  const splash = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);

      // a re-open starts from the beginning, whatever the close left behind
      dropScaleX.value = 1;
      dropScaleY.value = 1;
      dropRadius.value = SCREEN_TIME_GLANCE.panelRadius;
      dropTint.value = 0;
      dropOpacity.value = 0;
      dropStretch.value = 1;
      dropReturnX.value = 0;
      dropReturnY.value = 0;
      splash.value = 0;
      spinnerSquashX.value = 1;
      spinnerSquashY.value = 1;
      spinnerWater.value = 0;
      spinnerCore.value = 1;
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
      // The orb becomes the line where it was pressed, and only then does
      // the line move. Travelling first and flattening on arrival made the
      // shape change somewhere the eye was not yet looking; this way the
      // change happens under the finger and what travels is already the
      // thing the border is about to grow from.
      const morphStartsAt = spinDuration;
      const travelStartsAt = morphStartsAt + morphDuration;
      // the border picks up just before the line settles, so the two read as
      // one continuous stroke rather than a handover
      const drawStartsAt = travelStartsAt + travelDuration - 60;
      const settleStartsAt = drawStartsAt + drawDuration;

      // every long move runs on the same curve -- a soft start and a long
      // glide out -- so the beats feel like one gesture rather than a series
      // of separate animations with their own personalities
      const glide = Easing.bezier(0.25, 0.9, 0.25, 1);

      // 1. the ring's echo grows into a spinning circle where it was
      //    pressed, over the live home screen -- nothing dims yet -- and
      //    turns from the ring's colour to the water blue as it spins.
      //    One sequenced animation, not two assignments: reassigning a
      //    shared value cancels the animation already on it, which is how
      //    the orb once spent its whole spin at opacity zero.
      spinnerOpacity.value = withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
        withDelay(drawStartsAt + 40 - 140, withTiming(0, { duration: 180, easing: glide }))
      );
      spinnerScale.value = withSequence(
        withTiming(1.4, { duration: spinDuration * 0.55, easing: Easing.out(Easing.cubic) }),
        withTiming(1.1, { duration: spinDuration * 0.45, easing: glide })
      );
      // Two whole turns across the spin and the morph, on one curve, ending
      // exactly as the line settles -- a whole number so the line is
      // vertical, and nothing turning while it travels.
      spinnerRotate.value = withTiming(720, {
        duration: spinDuration + morphDuration,
        easing: Easing.inOut(Easing.cubic),
      });
      spinnerWater.value = withDelay(
        spinDuration * 0.25,
        withTiming(1, { duration: spinDuration * 0.65 })
      );
      // the solid dot the orb took over from the ring reduces away while the
      // arc travels and flattens -- by the time the line exists, only the
      // line is left, and all of it blue
      spinnerCore.value = withDelay(
        morphStartsAt,
        withTiming(0, { duration: morphDuration * 0.8, easing: glide })
      );

      // 2. ...squashes and stretches into the vertical line, right where it
      //    was pressed. Three beats rather than one: the orb squats wider
      //    and shorter first, the way anything about to spring does, then
      //    throws itself thin and tall past where it is going, then settles
      //    back. Going straight from circle to line in a single move reads
      //    as a cut rather than a change of shape.
      spinnerSquashX.value = withDelay(
        morphStartsAt,
        withSequence(
          withTiming(1.26, {
            duration: morphDuration * 0.3,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(0.1, {
            duration: morphDuration * 0.48,
            easing: Easing.inOut(Easing.cubic),
          }),
          withTiming(0.14, { duration: morphDuration * 0.22, easing: glide })
        )
      );
      spinnerSquashY.value = withDelay(
        morphStartsAt,
        withSequence(
          withTiming(0.76, {
            duration: morphDuration * 0.3,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1.64, {
            duration: morphDuration * 0.48,
            easing: Easing.inOut(Easing.cubic),
          }),
          withTiming(1.5, { duration: morphDuration * 0.22, easing: glide })
        )
      );

      // 3. ...and only then does the finished line glide to the border's
      //    start, on the same curve as everything else
      spinnerTravel.value = withDelay(
        travelStartsAt,
        withTiming(1, { duration: travelDuration, easing: glide })
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
    spinnerWater.value = 0;
    spinnerCore.value = 1;
    splash.value = 0;
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

    const { dropShrink, dropReturn, splashDuration, orbReform, fadeDuration } =
      SCREEN_TIME_GLANCE;
    const { dropScaleX: sx, dropScaleY: sy, panelW } = geometry;
    const gatherEndsAt = fadeDuration * 0.7 + dropShrink;
    const flightStartsAt = gatherEndsAt + 90;
    const landsAt = flightStartsAt + dropReturn;
    // the orb comes out of the splash, a beat behind it
    const orbFrom = landsAt + 90;

    // The orb is rebuilt where and how the drop leaves it: back at the ring
    // rather than parked at the border, round rather than flattened into the
    // line it became, small, and still in the water blue. Plain assignments,
    // not animations -- they set the starting point the reform animates away
    // from, and the orb is invisible until it does.
    spinnerTravel.value = 0;
    spinnerSquashX.value = 1;
    spinnerSquashY.value = 1;
    spinnerScale.value = 0.55;
    spinnerRotate.value = 0;

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
    // The teardrop's whole life in one sequence -- in at the crossfade, held
    // through the flight, out as it reforms into the orb. Two assignments
    // cancel each other and the drop is never seen at all: it is the same
    // bug that once kept the orb invisible through its entire spin, and the
    // gathered panel underneath is convincing enough to hide it.
    const dropInAt = gatherEndsAt - 30;
    dropOpacity.value = withSequence(
      withDelay(dropInAt, withTiming(1, { duration: 90 })),
      withDelay(landsAt - 60 - (dropInAt + 90), withTiming(0, { duration: 110 }))
    );

    // ...hangs for a beat, then falls home to the ring. The two axes carry
    // different easings on purpose: the sideways travel eases out while the
    // drop accelerates downward, which bends the flight into the arc a
    // falling thing actually takes.
    dropReturnX.value = withDelay(
      flightStartsAt,
      withTiming(1, { duration: dropReturn, easing: Easing.out(Easing.cubic) })
    );
    dropReturnY.value = withDelay(
      flightStartsAt,
      withTiming(1, { duration: dropReturn, easing: Easing.in(Easing.cubic) })
    );
    // stretched by the fall, squashed as it lands
    dropStretch.value = withDelay(
      flightStartsAt,
      withSequence(
        withTiming(1.18, { duration: dropReturn * 0.6 }),
        withTiming(0.88, { duration: dropReturn * 0.4, easing: Easing.in(Easing.cubic) })
      )
    );
    // the night lifts as it travels, so the home screen is back by the time
    // the drop gets there
    scrimOpacity.value = withDelay(
      flightStartsAt + dropReturn * 0.35,
      withTiming(0, { duration: dropReturn * 0.65 })
    );

    // ...and lands with a splash: droplets thrown up and out, arcing back
    // down under gravity, with a ring spreading from the point of impact
    splash.value = withDelay(landsAt, withTiming(1, { duration: splashDuration }));

    // ...out of which the orb emerges, growing back to the ring's own dot
    // size and turning from water blue to the ring's colour. It starts a
    // beat after the splash so it reads as coming out of it rather than
    // arriving alongside it. One assignment per value -- a second would
    // cancel the first and the orb would never appear.
    spinnerOpacity.value = withDelay(orbFrom, withTiming(1, { duration: 120 }));
    spinnerScale.value = withDelay(
      orbFrom,
      withTiming(1, { duration: orbReform, easing: Easing.out(Easing.cubic) })
    );
    // one settling turn, the mirror of the spin that opened the window
    spinnerRotate.value = withDelay(
      orbFrom,
      withTiming(360, { duration: orbReform, easing: Easing.out(Easing.cubic) })
    );
    // blue back to red, so the orb hands the corner to a ring of its own colour
    spinnerWater.value = withDelay(
      orbFrom,
      withTiming(0, { duration: orbReform * 0.8 })
    );
    spinnerCore.value = withDelay(
      orbFrom,
      withTiming(
        1,
        { duration: orbReform, easing: Easing.out(Easing.cubic) },
        (finished) => {
          // the ring underneath comes back instantly and identical, so the
          // window can close on the very frame the orb finishes reforming
          if (finished) runOnJS(finishClose)();
        }
      )
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

  const spinnerColourProps = useAnimatedProps(() => ({
    stroke: interpolateColor(
      spinnerWater.value,
      [0, 1],
      [drawStroke, SCREEN_TIME_GLANCE.drawWater]
    ),
  }));

  const spinnerCoreProps = useAnimatedProps(() => ({
    r: (SCREEN_TIME_RING.size / 2) * spinnerCore.value,
    fill: interpolateColor(
      spinnerWater.value,
      [0, 1],
      [drawStroke, SCREEN_TIME_GLANCE.drawWater]
    ),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    borderRadius: dropRadius.value,
    transform: [
      { scaleX: dropScaleX.value },
      { scaleY: dropScaleY.value },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const tintStyle = useAnimatedStyle(() => ({ opacity: dropTint.value }));

  // The splash lives in the tree the whole time, so its opacity has to be
  // zero at rest as well as at the end. Fading only on the way out left its
  // droplets stacked on the ring at full strength whenever nothing was
  // happening -- a blue dot sitting in the orb's place through the entire
  // open, and through the home screen besides.
  const splashProps = useAnimatedProps(() => ({
    d: splashPath(
      splash.value,
      SPLASH_BOX / 2,
      SPLASH_SPREAD,
      SPLASH_GRAVITY,
      SPLASH_DROP_RADIUS
    ),
    opacity: Math.min(1, splash.value * 10) * (1 - splash.value * splash.value),
  }));

  // the ring of impact: spreads from where the drop hit and thins as it goes
  const splashRingProps = useAnimatedProps(() => ({
    r: 4 + 46 * splash.value,
    opacity: Math.min(1, splash.value * 10) * 0.85 * (1 - splash.value),
    strokeWidth: 3 * (1 - splash.value) + 0.4,
  }));

  const teardropStyle = useAnimatedStyle(() => ({
    opacity: dropOpacity.value,
    transform: [
      { translateX: geometry.flight.dx * dropReturnX.value },
      { translateY: geometry.flight.dy * dropReturnY.value },
      { scaleY: dropStretch.value },
    ],
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
            stroke={SCREEN_TIME_GLANCE.drawWater}
            strokeWidth={SCREEN_TIME_GLANCE.panelBorderWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${geometry.border.length} ${geometry.border.length}`}
            animatedProps={drawProps}
          />
        </Svg>

        {/* the splash the returning drop makes as it lands, out of which the
            orb re-forms. Its own box because the droplets fly well clear of
            the orb that replaces them. */}
        <View
          testID="screen-time-glance-splash"
          pointerEvents="none"
          style={[
            styles.splash,
            { left: centre.x - SPLASH_BOX / 2, top: centre.y - SPLASH_BOX / 2 },
          ]}
        >
          <Svg width={SPLASH_BOX} height={SPLASH_BOX}>
            <AnimatedCircle
              testID="screen-time-glance-splash-ring"
              cx={SPLASH_BOX / 2}
              cy={SPLASH_BOX / 2}
              r={4}
              fill="none"
              stroke={SCREEN_TIME_GLANCE.drawWater}
              animatedProps={splashRingProps}
            />
            <AnimatedPath
              testID="screen-time-glance-splash-droplets"
              fill={SCREEN_TIME_GLANCE.drawWater}
              animatedProps={splashProps}
            />
          </Svg>
        </View>

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
            {/* the solid dot the orb takes over from the ring, which fades
                itself out underneath -- one control becoming the orb, not a
                second one appearing next to it. It turns blue with the arc,
                then reduces away as the orb becomes the line. */}
            <AnimatedCircle
              testID="screen-time-glance-spinner-core"
              cx={SPINNER_BOX / 2}
              cy={SPINNER_BOX / 2}
              r={SCREEN_TIME_RING.size / 2}
              fill={drawStroke}
              animatedProps={spinnerCoreProps}
            />
            {/* the gap is a third of the circle so the rotation actually
                reads as spinning rather than as a static ring */}
            <AnimatedCircle
              testID="screen-time-glance-spinner-arc"
              cx={SPINNER_BOX / 2}
              cy={SPINNER_BOX / 2}
              r={SCREEN_TIME_GLANCE.spinnerRadius}
              stroke={drawStroke}
              strokeWidth={SCREEN_TIME_GLANCE.spinnerStroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${spinnerArc * 0.66} ${spinnerArc * 0.34}`}
              animatedProps={spinnerColourProps}
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

          {/* what the drop is made of: the water blue washes over the panel
              as it gathers, so what falls reads as a drop of the same water
              the frame was drawn in rather than a shrinking page */}
          <Animated.View
            testID="screen-time-glance-drop-tint"
            pointerEvents="none"
            style={[
              styles.dropTint,
              { backgroundColor: SCREEN_TIME_GLANCE.drawWater },
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
            <Path
              testID="screen-time-glance-drop-shape"
              d={DROP_PATH}
              fill={SCREEN_TIME_GLANCE.drawWater}
            />
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
  splash: {
    position: 'absolute',
    width: SPLASH_BOX,
    height: SPLASH_BOX,
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
