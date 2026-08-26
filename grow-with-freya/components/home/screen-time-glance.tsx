import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
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
  waterTurnRamp,
  spiralArmPath,
  SPIRAL_RADIUS,
  SPIRAL_LINE_LENGTH,
  splashOpacity,
  splashRing,
  dropHandoverScale,
  dropStretchAt,
  DROP_PATH,
  DROP_GLOSS,
  DROP_VIEWBOX,
  SPLASH_BOX,
  SPLASH_SPREAD,
  SPLASH_GRAVITY,
  SPLASH_DROP_RADIUS,
} from '@/constants/screen-time-ring';
import {
  glanceOpenTimeline,
  glanceCloseTimeline,
  drawPickupSlope,
  DRAW_PICKUP_X,
} from '@/constants/screen-time-glance-timeline';
import { choreograph, type Track } from '@/utils/choreograph';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// wide enough for whichever reaches further, the ring's echo or the spiral
// arm it winds out, so raising SPIRAL_RADIUS cannot clip the arm
// the same halo the ring wears, so the two are interchangeable at the handover
const HALO_SIZE = SCREEN_TIME_RING.size * SCREEN_TIME_RING.haloScale;

// Wide enough for the longest thing it holds, which is not the coil but the
// line the coil lays down -- the arm conserves its length, so the line reaches
// far further from the centre than the spiral ever does. Derived, so raising
// SPIRAL_RADIUS cannot clip the longer line it produces.
const SPINNER_BOX =
  (Math.max(SCREEN_TIME_GLANCE.spinnerRadius, SPIRAL_RADIUS, SPIRAL_LINE_LENGTH) +
    SCREEN_TIME_GLANCE.spinnerStroke) *
    2 +
  2;

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
  // stable identity: the drop's flight home is memoised against it, and a
  // fresh object every render would rebuild that on every frame
  const centre = useMemo(
    () => origin ?? { x: width / 2, y: height / 2 },
    [origin, width, height]
  );

  const surface = exceeded ? SCREEN_TIME_GLANCE.exceededSurface : SCREEN_TIME_GLANCE.calmSurface;
  const panelBorder = exceeded ? SCREEN_TIME_GLANCE.exceededBorder : SCREEN_TIME_GLANCE.calmBorder;
  const panelGlow = exceeded ? SCREEN_TIME_GLANCE.exceededGlow : SCREEN_TIME_GLANCE.calmGlow;
  const drawStroke = exceeded ? SCREEN_TIME_GLANCE.exceededDraw : SCREEN_TIME_GLANCE.calmDraw;
  // the orb's colour turn, routed so it never passes through mud
  const water = useMemo(() => waterTurnRamp(drawStroke, exceeded), [drawStroke, exceeded]);

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
      drawStart: { x: (bounds.left + bounds.right) / 2, y: bounds.bottom },
      // the drop's flight home: from the panel's centre back to the ring it
      // came out of, so the close lands where the open began
      flight: dropFlight(bounds, centre),
      dropScaleX: SCREEN_TIME_GLANCE.dropWidth / panelW,
      dropScaleY: SCREEN_TIME_GLANCE.dropHeight / panelH,
    };
  }, [insets.top, insets.bottom, width, height, centre]);

  // -- open choreography --
  const scrimOpacity = useSharedValue(0);
  const spinnerOpacity = useSharedValue(0);
  const spinnerRotate = useSharedValue(0);
  const spinnerScale = useSharedValue(1);
  const spinnerTravel = useSharedValue(0); // 0 at the ring, 1 at the border's start
  // the morph: the progress of the wave that pulls the spiral arm straight
  // into the line the border grows from. One progress, so the whole arm
  // unrolls off a single clock and cannot come apart mid-way
  const spinnerMorph = useSharedValue(0);
  // the turn: 0 is the ring's own colour, 1 is the water blue the box is
  // drawn in -- the orb changes colour while it spins
  const spinnerWater = useSharedValue(0);
  // the ring's outline, which hands over to the core as the orb flattens --
  // an outline squashed to a line is a pair of hairline caps, not a stroke
  const spinnerArcOpacity = useSharedValue(1);
  // the core: the solid dot the orb takes over from the ring. 1 is the
  // ring's own dot; it shrinks to nothing as the orb reduces into the line
  const spinnerCore = useSharedValue(1);
  // the spiral arm the orb winds out as it spins, and winds back in before it
  // flattens -- 0 is a point at the core, 1 is its full reach
  const spiralGrow = useSharedValue(0);
  // the halo the ring wears while it is over its limit. The orb has to wear
  // it too, and grow into it, or it arrives out of nowhere the frame the
  // corner is handed back
  const spinnerHalo = useSharedValue(0);
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
  const dropReturnX = useSharedValue(0);
  const dropReturnY = useSharedValue(0);
  // the splash the drop makes as it lands, and the orb that emerges from it
  const splash = useSharedValue(0);

  const atRest = useCallback(
    ({ open }: { open: boolean }): Track[] => [
      { on: scrimOpacity, name: 'scrim', from: open ? 1 : 0, beats: [] },
      { on: spinnerOpacity, name: 'orb', from: 0, beats: [] },
      { on: spinnerRotate, name: 'orb turn', from: 0, beats: [] },
      { on: spinnerScale, name: 'orb size', from: 1, beats: [] },
      { on: spinnerTravel, name: 'travel', from: 0, beats: [] },
      { on: spinnerMorph, name: 'morph', from: 0, beats: [] },
      { on: spinnerWater, name: 'orb colour', from: 0, beats: [] },
      { on: spinnerArcOpacity, name: 'orb outline', from: 1, beats: [] },
      { on: spinnerCore, name: 'orb core', from: 1, beats: [] },
      { on: spiralGrow, name: 'spiral', from: 0, beats: [] },
      { on: spinnerHalo, name: 'halo', from: 0, beats: [] },
      { on: drawProgress, name: 'border', from: open ? 1 : 0, beats: [] },
      { on: drawOpacity, name: 'drawn stroke', from: open ? 0 : 1, beats: [] },
      { on: panelOpacity, name: 'panel', from: open ? 1 : 0, beats: [] },
      { on: contentOpacity, name: 'content', from: open ? 1 : 0, beats: [] },
      { on: dropScaleX, name: 'gather x', from: 1, beats: [] },
      { on: dropScaleY, name: 'gather y', from: 1, beats: [] },
      {
        on: dropRadius,
        name: 'gather radius',
        from: SCREEN_TIME_GLANCE.panelRadius,
        beats: [],
      },
      { on: dropTint, name: 'gather tint', from: 0, beats: [] },
      { on: dropOpacity, name: 'teardrop', from: 0, beats: [] },
      { on: dropReturnX, name: 'flight x', from: 0, beats: [] },
      { on: dropReturnY, name: 'flight y', from: 0, beats: [] },
      { on: splash, name: 'splash', from: 0, beats: [] },
    ],
    []
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);

      if (reduceMotion) {
        // no travel: the window is simply there
        choreograph(atRest({ open: true }));
        return;
      }

      const timeline = glanceOpenTimeline();
      // every long move runs on the same curve -- a soft start and a long
      // glide out -- so the beats feel like one gesture rather than a series
      // of separate animations with their own personalities
      const glide = Easing.bezier(0.25, 0.9, 0.25, 1);

      choreograph([
        // 1. the ring's echo grows into a spinning circle where it was
        //    pressed, over the live home screen -- nothing dims yet -- and
        //    turns from the ring's colour to the water blue as it spins
        {
          on: spinnerOpacity,
          name: 'orb',
          from: 0,
          beats: [
            {
              at: timeline.orbIn.at,
              to: 1,
              over: timeline.orbIn.over,
              easing: Easing.out(Easing.quad),
            },
            {
              at: timeline.orbOut.at,
              to: 0,
              over: timeline.orbOut.over,
              easing: glide,
            },
          ],
        },
        {
          on: spinnerScale,
          name: 'orb size',
          from: 1,
          beats: [
            {
              at: timeline.swell.at,
              to: 1.4,
              over: timeline.swell.over,
              easing: Easing.out(Easing.cubic),
            },
            { at: timeline.ease.at, to: 1.1, over: timeline.ease.over, easing: glide },
          ],
        },
        // Two whole turns across the spin and the morph, on one curve, ending
        // exactly as the line settles -- a whole number so the line is
        // vertical, and nothing turning while it travels.
        {
          on: spinnerRotate,
          name: 'orb turn',
          from: 0,
          beats: [
            {
              at: timeline.turn.at,
              to: timeline.rotation,
              over: timeline.turn.over,
              easing: Easing.inOut(Easing.cubic),
            },
          ],
        },
        {
          on: spinnerWater,
          name: 'orb colour',
          from: 0,
          beats: [{ at: timeline.water.at, to: 1, over: timeline.water.over }],
        },
        // it starts wearing the ring's halo, because that is what it replaces,
        // and sheds it on the same beat as the colour
        {
          on: spinnerHalo,
          name: 'halo',
          from: 1,
          beats: [{ at: timeline.water.at, to: 0, over: timeline.water.over }],
        },
        // The core stays: squashed and stretched, it IS the line. What goes is
        // the ring's outline around it, which flattens to nothing useful.
        // Shrinking the core away instead left the travel with no visible line
        // at all -- the orb changed shape and then simply was not there.
        {
          on: spinnerArcOpacity,
          name: 'orb outline',
          from: 1,
          beats: [
            { at: timeline.arcOut.at, to: 0, over: timeline.arcOut.over, easing: glide },
          ],
        },
        // the solid core gives way as the arm takes over: what the border
        // grows from is the unrolled arm, not the dot
        {
          on: spinnerCore,
          name: 'orb core',
          from: 1,
          beats: [
            {
              at: timeline.morph.at,
              to: 0,
              over: timeline.morph.over * 0.6,
              easing: Easing.in(Easing.quad),
            },
          ],
        },
        // ...winding a spiral arm out of the core as it goes. It does not
        // wind back: it holds at full reach, and the morph lays it down as
        // the line. `grow` is linear in the path so easing it is right --
        // unlike `straighten` below, which drives the wave's own smoothstep.
        {
          on: spiralGrow,
          name: 'spiral',
          from: 0,
          beats: [
            {
              at: timeline.spiralOut.at,
              to: 1,
              over: timeline.spiralOut.over,
              easing: Easing.out(Easing.cubic),
            },
          ],
        },

        // 2. ...and then lays that arm down as the line, right where it was
        //    pressed. A wave enters at the arm's outer end and travels in, so
        //    each point peels off the curve and onto the line in turn.
        //    Interpolating every point at the same rate crumples the spiral
        //    in on itself, which is what sank an earlier attempt at this.
        {
          on: spinnerMorph,
          name: 'morph',
          from: 0,
          beats: [
            {
              at: timeline.morph.at,
              to: 1,
              over: timeline.morph.over,
              // linear: the wave carries its own smoothstep, and easing this
              // as well composes two curves
              easing: Easing.linear,
            },
          ],
        },

        // 3. ...and it settles onto the border as it flattens, not after.
        //    Flatten first and drop afterwards and the descent reads as a
        //    second, separate beat -- the line going down into position
        //    rather than arriving there. Sharing the morph's window makes it
        //    one gesture: the orb pours itself down into the line.
        //
        //    `inOut(cubic)` so the descent has the same soft start and long
        //    glide as the arm laying itself down, rather than drifting
        //    against it.
        {
          on: spinnerTravel,
          name: 'travel',
          from: 0,
          beats: [
            {
              at: timeline.travel.at,
              to: 1,
              over: timeline.travel.over,
              easing: Easing.inOut(Easing.cubic),
            },
          ],
        },

        // 4. ...and the border carries on from the arm's tip.
        //
        //    Not from a standstill, which is what it used to do. The arm lays
        //    its line at about 380 px/s; the border has a whole perimeter to
        //    cover and averages 8000, and eased in-out it started at zero --
        //    so the stroke reached the tip, stopped dead, and accelerated away
        //    to sixty times the speed it arrived at. The pickup curve leaves
        //    the tip at the rate the arm handed over and gathers pace from
        //    there.
        {
          on: drawProgress,
          name: 'border',
          from: 0,
          beats: [
            {
              at: timeline.draw.at,
              to: 1,
              over: timeline.draw.over,
              easing: Easing.bezier(
                DRAW_PICKUP_X,
                drawPickupSlope(
                  SPIRAL_LINE_LENGTH,
                  geometry.border.length,
                  timeline.morph.over,
                  timeline.draw.over
                ),
                0.4,
                1
              ),
            },
          ],
        },

        // 5. the settle: the background blacks out and the fill arrives inside
        //    the frame at the same time, the drawn stroke handing over to the
        //    panel's own border
        {
          on: scrimOpacity,
          name: 'scrim',
          from: 0,
          beats: [{ at: timeline.settle.at, to: 1, over: timeline.settle.over }],
        },
        {
          on: panelOpacity,
          name: 'panel',
          from: 0,
          beats: [{ at: timeline.settle.at, to: 1, over: timeline.settle.over }],
        },
        {
          on: drawOpacity,
          name: 'drawn stroke',
          from: 1,
          beats: [{ at: timeline.strokeOut.at, to: 0, over: timeline.strokeOut.over }],
        },
        {
          on: contentOpacity,
          name: 'content',
          from: 0,
          beats: [{ at: timeline.content.at, to: 1, over: timeline.content.over }],
        },

        // the close's own values, put back where a fresh open expects them --
        // a re-open starts from the beginning, whatever the close left behind
        { on: dropScaleX, name: 'gather x', from: 1, beats: [] },
        { on: dropScaleY, name: 'gather y', from: 1, beats: [] },
        {
          on: dropRadius,
          name: 'gather radius',
          from: SCREEN_TIME_GLANCE.panelRadius,
          beats: [],
        },
        { on: dropTint, name: 'gather tint', from: 0, beats: [] },
        { on: dropOpacity, name: 'teardrop', from: 0, beats: [] },
        { on: dropReturnX, name: 'flight x', from: 0, beats: [] },
        { on: dropReturnY, name: 'flight y', from: 0, beats: [] },
        { on: splash, name: 'splash', from: 0, beats: [] },
      ]);
      return;
    }

    setMounted(false);
    setTipsOpen(false);
    choreograph(atRest({ open: false }));
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

    const timeline = glanceCloseTimeline();
    const { dropScaleX: sx, dropScaleY: sy, panelW } = geometry;

    choreograph(
      [
        // the content dims, the panel gathers in...
        {
          on: contentOpacity,
          name: 'content',
          beats: [{ at: timeline.dim.at, to: 0, over: timeline.dim.over }],
        },
        {
          on: dropTint,
          name: 'gather tint',
          beats: [{ at: timeline.tint.at, to: 1, over: timeline.tint.over }],
        },
        {
          on: dropScaleX,
          name: 'gather x',
          beats: [
            {
              at: timeline.gather.at,
              to: sx,
              over: timeline.gather.over,
              easing: Easing.inOut(Easing.cubic),
            },
          ],
        },
        {
          on: dropScaleY,
          name: 'gather y',
          beats: [
            {
              at: timeline.gather.at,
              to: sy,
              over: timeline.gather.over,
              easing: Easing.inOut(Easing.cubic),
            },
          ],
        },
        {
          on: dropRadius,
          name: 'gather radius',
          beats: [
            {
              at: timeline.gather.at,
              to: panelW / 2,
              over: timeline.gather.over,
              easing: Easing.inOut(Easing.cubic),
            },
          ],
        },

        // ...becomes a true teardrop -- the gathered blob hands over to the
        // drop shape in a quick crossfade at its smallest...
        {
          on: panelOpacity,
          name: 'panel',
          beats: [{ at: timeline.handover.at, to: 0, over: timeline.handover.over }],
        },
        // The teardrop's whole life in one sequence -- in at the crossfade, held
        // through the flight, out as it reforms into the orb. Two assignments
        // cancel each other and the drop is never seen at all: it is the same
        // bug that once kept the orb invisible through its entire spin, and the
        // gathered panel underneath is convincing enough to hide it.
        {
          on: dropOpacity,
          name: 'teardrop',
          beats: [
            { at: timeline.dropIn.at, to: 1, over: timeline.dropIn.over },
            { at: timeline.dropOut.at, to: 0, over: timeline.dropOut.over },
          ],
        },

        // ...hangs for a beat, then falls home to the ring. The two axes carry
        // different easings on purpose: the sideways travel eases out while
        // the drop accelerates downward, which bends the flight into the arc a
        // falling thing actually takes.
        {
          on: dropReturnX,
          name: 'flight x',
          beats: [
            {
              at: timeline.flight.at,
              to: 1,
              over: timeline.flight.over,
              easing: Easing.out(Easing.cubic),
            },
          ],
        },
        {
          on: dropReturnY,
          name: 'flight y',
          beats: [
            {
              at: timeline.flight.at,
              to: 1,
              over: timeline.flight.over,
              easing: Easing.in(Easing.cubic),
            },
          ],
        },

        // the night lifts as it travels, so the home screen is back by the
        // time the drop gets there
        {
          on: scrimOpacity,
          name: 'scrim',
          beats: [{ at: timeline.nightLifts.at, to: 0, over: timeline.nightLifts.over }],
        },

        // ...and lands with a splash: droplets thrown up and out, arcing back
        // down under gravity, with a ring spreading from the point of impact
        {
          on: splash,
          name: 'splash',
          // linear for the same reason as the morph, and more so: `splashPath`
          // is ballistic -- the droplets ease outward and fall under a term
          // that grows with the square of the progress. Omitting the easing
          // does not mean linear, it means Reanimated's in-out default, which
          // is what made the droplets stutter on their way to the orb.
          beats: [
            {
              at: timeline.splash.at,
              to: 1,
              over: timeline.splash.over,
              easing: Easing.linear,
            },
          ],
        },

        // ...out of which the orb emerges, growing back to the ring's own dot
        // size and turning from water blue to the ring's colour. It starts a
        // beat after the splash so it reads as coming out of it rather than
        // arriving alongside it.
        //
        // The `from`s rebuild the orb where and how the drop leaves it: back
        // at the ring rather than parked at the border, round rather than
        // flattened into the line it became, small, and still water blue.
        { on: spinnerTravel, name: 'travel', from: 0, beats: [] },
        { on: spinnerMorph, name: 'morph', from: 0, beats: [] },
        { on: spiralGrow, name: 'spiral', from: 0, beats: [] },
        {
          on: spinnerOpacity,
          name: 'orb',
          beats: [{ at: timeline.orbIn.at, to: 1, over: timeline.orbIn.over }],
        },
        {
          on: spinnerScale,
          name: 'orb size',
          from: 0.55,
          beats: [
            {
              at: timeline.reform.at,
              to: 1,
              over: timeline.reform.over,
              easing: Easing.out(Easing.cubic),
            },
          ],
        },
        // one settling turn, the mirror of the spin that opened the window
        {
          on: spinnerRotate,
          name: 'orb turn',
          from: 0,
          beats: [
            {
              at: timeline.reform.at,
              to: 360,
              over: timeline.reform.over,
              easing: Easing.out(Easing.cubic),
            },
          ],
        },
        {
          on: spinnerArcOpacity,
          name: 'orb outline',
          from: 0,
          beats: [{ at: timeline.arcBack.at, to: 1, over: timeline.arcBack.over }],
        },
        // the open leaves the core at full size -- it was the line -- so the
        // reform has to start it from nothing for it to grow back out of the
        // splash rather than snapping into place
        {
          on: spinnerCore,
          name: 'orb core',
          from: 0,
          beats: [
            {
              at: timeline.reform.at,
              to: 1,
              over: timeline.reform.over,
              easing: Easing.out(Easing.cubic),
            },
          ],
        },
        // Blue first, then red. The turn waits until the orb has finished
        // fading up: started with the fade-in, the colour was already halfway
        // to red before there was anything solid enough to see it on, and the
        // orb simply arrived a muddy red.
        {
          on: spinnerWater,
          name: 'orb colour',
          beats: [{ at: timeline.water.at, to: 0, over: timeline.water.over }],
        },
        // and the halo grows in on the same beat, so the orb is wearing it at
        // full strength on the frame the ring takes the corner back
        {
          on: spinnerHalo,
          name: 'halo',
          from: 0,
          beats: [{ at: timeline.water.at, to: 1, over: timeline.water.over }],
        },
      ],
      { onFinished: finishClose }
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
      ],
    };
  });

  const drawProps = useAnimatedProps(() => ({
    strokeDashoffset: geometry.border.length * (1 - drawProgress.value),
    opacity: drawOpacity.value,
  }));

  const spinnerColourProps = useAnimatedProps(() => ({
    opacity: spinnerArcOpacity.value,
    stroke: interpolateColor(spinnerWater.value, water.input, water.output),
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: spinnerHalo.value,
    // tied to its own opacity, so it grows into place rather than appearing
    // at full size
    transform: [{ scale: 0.7 + 0.3 * spinnerHalo.value }],
    backgroundColor: interpolateColor(
      spinnerWater.value,
      [0, 1],
      [SCREEN_TIME_RING.exceededHalo, SCREEN_TIME_GLANCE.waterHalo]
    ),
  }));

  const spiralProps = useAnimatedProps(() => ({
    d: spiralArmPath(
      SPINNER_BOX / 2,
      SPIRAL_RADIUS,
      spiralGrow.value,
      spinnerMorph.value,
      SPIRAL_LINE_LENGTH
    ),
    opacity: spiralGrow.value,
    stroke: interpolateColor(spinnerWater.value, water.input, water.output),
  }));

  const spinnerCoreProps = useAnimatedProps(() => ({
    r: (SCREEN_TIME_RING.size / 2) * spinnerCore.value,
    fill: interpolateColor(spinnerWater.value, water.input, water.output),
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

  const splashProps = useAnimatedProps(() => ({
    d: splashPath(
      splash.value,
      SPLASH_BOX / 2,
      SPLASH_SPREAD,
      SPLASH_GRAVITY,
      SPLASH_DROP_RADIUS
    ),
    opacity: splashOpacity(splash.value),
  }));

  // the ring of impact: spreads from where the drop hit and thins as it goes
  const splashRingProps = useAnimatedProps(() => splashRing(splash.value));

  const teardropStyle = useAnimatedStyle(() => ({
    opacity: dropOpacity.value,
    transform: [
      // tied to its own opacity, so the drop grows out of the gathered panel
      // and shrinks into the splash rather than appearing and vanishing at
      // full size -- which is what made both ends of the flight pop
      { scale: dropHandoverScale(dropOpacity.value) },
      { translateX: geometry.flight.dx * dropReturnX.value },
      { translateY: geometry.flight.dy * dropReturnY.value },
      { scaleY: dropStretchAt(dropReturnY.value) },
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
          {exceeded ? (
            <Animated.View
              testID="screen-time-glance-spinner-halo"
              pointerEvents="none"
              style={[styles.spinnerHalo, haloStyle]}
            />
          ) : null}
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
            {/* the arm the orb winds out while it spins. It sits inside the
                same rotating box as the arc and the core, so it spins with
                them rather than needing a rotation of its own. */}
            <AnimatedPath
              testID="screen-time-glance-spinner-spiral"
              fill="none"
              strokeWidth={SCREEN_TIME_GLANCE.spinnerStroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              animatedProps={spiralProps}
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
  spinnerHalo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    left: (SPINNER_BOX - HALO_SIZE) / 2,
    top: (SPINNER_BOX - HALO_SIZE) / 2,
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
