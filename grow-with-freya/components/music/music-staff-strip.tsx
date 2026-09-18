/**
 * MusicStaffStrip
 *
 * The song the child has to play, written on a staff instead of listed as
 * chips: one coloured note per entry, sitting on the line or space that note
 * belongs to in treble clef, in the same colour as its button on the
 * instrument. Middle C hangs below the staff on its own ledger line.
 *
 * The row of notes scrolls so the note being played sits on the playhead, which
 * keeps long songs readable on a strip only a dozen notes wide.
 *
 * Purely decorative: it never takes a touch, so it can hang over the top of the
 * instrument without stealing presses from the note buttons.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnUI,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { isChordEntry, parseChordEntry } from '@/services/sequence-matcher';
import type { NoteLayoutItem } from '@/services/music-asset-registry';
import { holdMoveMs, holdRun, type HoldPlan } from '@/services/hold-plan';
import {
  ERROR_RED_IN_MS,
  ERROR_RED_OUT_MS,
  NOTES_IN_MS,
  NOTES_OUT_MS,
  cueHiddenMs,
} from '@/services/sheet-transition';
import {
  STAFF_ASPECT_RATIO,
  STAFF_PAPER_TOP,
  STAFF_TOP_LINE,
  staffHoldTravel,
  staffLedgerSteps,
  staffNoteMetrics,
  staffNoteSlots,
  staffFocusIndex,
  staffNoteY,
  staffRowShift,
  staffShadowLength,
  staffStemHeight,
  staffStemsPointDown,
  staffStepsAboveBottomLine,
} from '@/services/staff-notation';

const STAFF_BANNER = require('@/assets/music/sheet/staff-banner.webp');

/** How long the score takes to slide to the next note. */
export const STAFF_SCROLL_MS = 260;

/** Ink colour of the printed staff, used for ledger lines. */
const STAFF_INK = '#6B5136';

/** A note the chosen instrument has no button for still gets written, in ink. */
const UNMAPPED_NOTE_COLOR = STAFF_INK;

/** Notes already played stay on the page but step back. */
const PLAYED_OPACITY = 0.4;

/** The shadow is the note's own colour, strong enough to read the length off at a glance. */
const SHADOW_OPACITY = 0.8;

/** Height of the line marking where a hold has to reach, as a multiple of the line gap. */
const TARGET_LINE_HEIGHT_RATIO = 1.9;

/** How long a landing note takes to bounce. */
const LANDING_MS = 260;

/**
 * How far a note swells as the score arrives on it. The reward melody bounces
 * harder than the child's own playing: nothing is being asked of them there, so
 * the notes are free to be pleased with themselves.
 */
const LANDING_SWELL = 1.22;
const PLAYBACK_SWELL = 1.5;

/**
 * The light at the cut, where the note being held slides out of view.
 *
 * It brightens with the hold, so how far through a note the child is can be
 * read without watching the score creep. It sits *on* the note's own row rather
 * than crossing the whole staff -- what is being consumed is that one note and
 * its highlight, and a full-height line said nothing about which.
 *
 * The halo is drawn in the note's own colour and the core in near-white, so it
 * reads as the highlight itself lighting up where it disappears. A pale line on
 * cream paper was simply too low in contrast to see.
 */
const HOLD_LIGHT = '#FFFFFF';

/**
 * The glow, as layers spilling right from the cut -- innermost first, sized
 * against the staff line gap.
 *
 * Three of them rather than one block: a single rounded rectangle of the note's
 * colour read as a pale slab sitting on the paper, not as light coming off the
 * edge. Stacking them with the opacity falling away gives the falloff that
 * makes it radiate, and lets the whole thing be narrower than the one block was
 * while carrying further.
 */
const HOLD_GLOW_LAYERS = [
  { width: 0.5, height: 1.15, opacity: 1 },
  { width: 0.9, height: 1.45, opacity: 0.5 },
  { width: 1.4, height: 1.85, opacity: 0.22 },
];

/**
 * The line itself, standing on the cut across the note's row.
 *
 * It both brightens and grows as the hold runs -- opacity alone was too quiet
 * to notice against the coloured glow behind it, so there was no telling the
 * thing was animating at all. A white bloom sits behind the core so it reads as
 * a light rather than a painted bar.
 */
const HOLD_LINE_WIDTH_RATIO = 2.2;
const HOLD_LINE_HEIGHT_RATIO = 1.55;
const HOLD_LINE_BLOOM_WIDTH_RATIO = 6;
const HOLD_LINE_BLOOM_OPACITY = 0.4;
/** How short the line starts, so its growth is what shows the hold running. */
const HOLD_LINE_MIN_SCALE = 0.45;
/** Box the line and its bloom sit in, so the growth scales about the note's row. */
const HOLD_LINE_BOX_HEIGHT_RATIO = 1.9;

/** Shadow thickness, a shade under a line gap so it never smears across two lines. */
const SHADOW_HEIGHT_RATIO = 0.8;

/** Song title size, as a multiple of the staff line gap. */
const TITLE_SIZE_RATIO = 1.25;

/** The wash that says a wrong note was played, over the whole paper. */
const ERROR_RED = '#D8412F';
const ERROR_RED_PEAK = 0.55;

/**
 * Easings for the two moves, built once out here rather than inside the worklet
 * that uses them: composing one on the UI thread is the kind of call that takes
 * the app down outright instead of reporting an error.
 */
const MOVE_EVENLY = Easing.linear;
const MOVE_BACK = Easing.out(Easing.quad);

interface MusicStaffStripProps {
  /** Note entries for the song, in order. Chord entries like "C+E" are allowed. */
  sequence: string[];
  /** The chosen instrument's buttons, which give each note its colour. */
  noteLayout: NoteLayoutItem[];
  /** How many notes the child has played correctly so far. */
  currentIndex: number;
  /**
   * How long each note is held. Given one, each note carries a shadow behind it
   * for its length, and a long note takes more room along the row.
   */
  holdPlan?: HoldPlan;
  /**
   * Whether the note the child has to play next is sounding right now. While it
   * is, the score creeps left so the note's hold runs off the edge of the
   * window -- what is still to the right of the edge is what is left to hold.
   */
  holdingCurrent?: boolean;
  /** Index sounding during the success melody, or -1 when nothing is playing. */
  playbackIndex?: number;
  /**
   * Whether to ring the note in focus. On a sheet being read rather than played
   * -- the one in the music-sheet page -- there is no next note to point at, so
   * a ring only invites the child to press the wrong thing.
   */
  markCurrent?: boolean;
  /**
   * Counters that tick when the sheet should play a cue. A wrong note washes
   * the paper red and then clears the notes; a finished song just clears them.
   * Either way the score is reset behind the cue, so what fades back in is the
   * song from its first note.
   */
  wrongCue?: number;
  replayCue?: number;
  /** Width to draw the banner at; its height follows the artwork's aspect ratio. */
  width: number;
  /** Written on the paper above the staff, the way a score is headed. */
  title?: string;
  /**
   * Share of the sheet's length actually on screen. Below 1 the notes are
   * parked and scrolled within that part instead of the whole paper.
   */
  visibleFraction?: number;
  testID?: string;
}

export const MusicStaffStrip = React.memo(function MusicStaffStrip({
  sequence,
  noteLayout,
  currentIndex,
  holdPlan,
  holdingCurrent = false,
  playbackIndex = -1,
  markCurrent = true,
  wrongCue = 0,
  replayCue = 0,
  width,
  title,
  visibleFraction = 1,
  testID = 'staff-strip',
}: MusicStaffStripProps) {
  const reduceMotion = useReducedMotion();
  const metrics = useMemo(() => staffNoteMetrics(width, visibleFraction), [width, visibleFraction]);

  // Past the last note the song is over, and a row scrolled off the end would
  // leave a blank staff behind the celebration. The score stops on the closing
  // note instead, played out and with no ring on it.
  const reached = playbackIndex >= 0 ? playbackIndex : currentIndex;
  const focusIndex = staffFocusIndex(reached, sequence.length);
  const stillPlaying = reached < sequence.length;

  // A note's shadow can need more room than the ordinary spacing, so where each
  // head sits comes from the shadows rather than from the index.
  const shadows = useMemo(
    () => (metrics && holdPlan
      ? sequence.map((_, index) => {
          const target = holdPlan.targets[index];
          return target ? staffShadowLength(target.holdMs, holdPlan.beatMs, metrics) : 0;
        })
      : sequence.map(() => 0)),
    [metrics, holdPlan, sequence],
  );
  const slots = useMemo(() => (metrics ? staffNoteSlots(shadows, metrics) : []), [metrics, shadows]);

  // The row's position is computed by `staffRowShift`, not accumulated: it only
  // ever depends on which note is in focus and how much of *that* note's hold
  // has run, so the score cannot drift out of step however long the song is.
  //
  // `heldFor` records which note the progress belongs to. On the render where
  // the sheet advances, the worklet sees it no longer matches and reads progress
  // as zero -- so the new note is exactly on the playhead from the first frame,
  // with no reset effect to run late and no leftover to hand over.
  const travel = staffHoldTravel(slots, focusIndex);
  const playheadX = metrics?.playheadX ?? 0;

  // The hold under the child's fingers, the whole slot when the melody is
  // playing it back -- `holdMoveMs` carries the reasoning.
  const moveMs = holdMoveMs(holdPlan?.targets[focusIndex], playbackIndex >= 0);

  // Where the row rests for this note, and how far it moves while the note is
  // held. Both are worked out by the pure layer.
  const restingShift = staffRowShift(slots, focusIndex, 0, playheadX);
  const heldShift = staffRowShift(slots, focusIndex, 1, playheadX);

  // The whole position lives on shared values, and so travels to the screen by
  // one route. It used to be split -- the resting place as a plain `left` from
  // React, the move as an animated transform -- and the two reach the UI thread
  // independently, so a frame could be drawn pairing this note's resting place
  // with the last note's finished move. That flashed the score a whole note's
  // travel sideways and back on every completed note. There is no ordering to
  // get right now: all three are written in a single UI-thread tick below.
  const rowRest = useSharedValue(restingShift);
  const rowTravel = useSharedValue(restingShift - heldShift);
  const progress = useSharedValue(0);
  // Only JS writes this, so reading it back is safe -- unlike a shared value the
  // UI thread is animating, whose JS copy lags.
  const lastFocus = useRef(focusIndex);
  const lastWrongCue = useRef(wrongCue);
  const lastReplayCue = useRef(replayCue);

  useEffect(() => {
    const freshNote = lastFocus.current !== focusIndex;
    lastFocus.current = focusIndex;
    const { to, durationMs, fromStart } = holdRun(holdingCurrent, freshNote, moveMs);
    const nowhereToGo = durationMs <= 0 || travel <= 0;
    // Running forward is a clock, so it has to be even; snapping back is not,
    // and eases out so it lands rather than stops dead.
    const easing = holdingCurrent ? MOVE_EVENLY : MOVE_BACK;
    const duration = Math.max(1, durationMs);
    const instant = reduceMotion;
    const rest = restingShift;
    const span = restingShift - heldShift;

    runOnUI(() => {
      'worklet';
      rowRest.value = rest;
      rowTravel.value = span;
      if (nowhereToGo) {
        progress.value = 0;
        return;
      }
      // A plain assignment, not a one-millisecond animation: an animation would
      // not land until the next frame, which is the flash all over again.
      if (fromStart) progress.value = 0;
      progress.value = instant ? to : withTiming(to, { duration, easing });
    })();
  }, [focusIndex, holdingCurrent, moveMs, travel, reduceMotion, restingShift, heldShift,
      progress, rowRest, rowTravel]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rowRest.value - rowTravel.value * progress.value }],
  }));

  // The two cues. A wrong note washes the paper red and then takes the notes
  // away; a finished song takes them away without the red. Either way the score
  // is reset behind them -- `sheet-transition` holds the timings both sides
  // work from -- so what fades back in is the song from its first note.
  const notesOpacity = useSharedValue(1);
  const errorWash = useSharedValue(0);
  const firstCue = useRef(true);

  useEffect(() => {
    if (firstCue.current) {
      firstCue.current = false;
      return;
    }
    const wrong = wrongCue > lastWrongCue.current;
    lastWrongCue.current = wrongCue;
    lastReplayCue.current = replayCue;
    if (reduceMotion) return;

    if (wrong) {
      errorWash.value = withSequence(
        withTiming(ERROR_RED_PEAK, { duration: ERROR_RED_IN_MS, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: ERROR_RED_OUT_MS, easing: Easing.in(Easing.quad) }),
      );
    }
    // The notes leave only once the red has gone, so the child sees what went
    // wrong before the page clears. Both fades run at an even rate: eased, the
    // way back in crossed into visibility almost at once and read as the song
    // appearing rather than fading in.
    notesOpacity.value = withSequence(
      withDelay(wrong ? ERROR_RED_IN_MS + ERROR_RED_OUT_MS : 0,
        withTiming(0, { duration: NOTES_OUT_MS, easing: Easing.linear })),
      withDelay(cueHiddenMs(wrong ? 'wrong' : 'replay') - NOTES_IN_MS,
        withTiming(1, { duration: NOTES_IN_MS, easing: Easing.linear })),
    );
  }, [wrongCue, replayCue, reduceMotion, notesOpacity, errorWash]);

  const notesStyle = useAnimatedStyle(() => ({ opacity: notesOpacity.value }));
  const errorStyle = useAnimatedStyle(() => ({ opacity: errorWash.value }));

  // The note that has just landed on the playhead gives a little bounce, so the
  // child can see the sheet has moved on.
  const landing = useSharedValue(1);
  const playingBack = playbackIndex >= 0;
  useEffect(() => {
    if (reduceMotion) return;
    landing.value = withSequence(
      withTiming(playingBack ? PLAYBACK_SWELL : LANDING_SWELL, {
        duration: LANDING_MS * 0.35,
        easing: Easing.out(Easing.quad),
      }),
      // Looser on the way back during playback, so it rings rather than lands.
      withSpring(1, playingBack
        ? { damping: 6, stiffness: 190 }
        : { damping: 9, stiffness: 220 }),
    );
  }, [focusIndex, playingBack, reduceMotion, landing]);

  const landingStyle = useAnimatedStyle(() => ({ transform: [{ scale: landing.value }] }));

  // The light at the cut comes up with the hold and goes out when the note is
  // done, so the run of a note reads as something brightening and not only as
  // the score sliding along.
  const holdLightStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  // The line brightens *and* grows, so the hold running is visible in the shape
  // and not only in how bright it is.
  const holdLineStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scaleY: HOLD_LINE_MIN_SCALE + (1 - HOLD_LINE_MIN_SCALE) * progress.value },
    ],
  }));

  if (!metrics || sequence.length === 0) return null;

  const height = width / STAFF_ASPECT_RATIO;
  const playedBefore = reached;

  // The light belongs to the note being held, so it takes that note's row and
  // its colour.
  const focusEntry = sequence[focusIndex] ?? '';
  const focusLetters = isChordEntry(focusEntry) ? parseChordEntry(focusEntry) : [focusEntry];
  const focusItem = focusLetters
    .map(letter => noteLayout.find(candidate => candidate.note === letter))
    .find(Boolean);
  const focusSteps = staffStepsAboveBottomLine(focusItem?.note ?? focusLetters[0] ?? '');
  const focusColour = focusItem?.color ?? UNMAPPED_NOTE_COLOR;
  const focusY = focusSteps === null ? null : staffNoteY(focusSteps, height);

  return (
    <View style={{ width, height }} pointerEvents="none" testID={testID}>
      <Image
        source={STAFF_BANNER}
        style={{ width, height }}
        resizeMode="contain"
        testID="staff-banner"
      />
      {title ? (
        <View
          testID="staff-title-band"
          style={{
            position: 'absolute',
            left: metrics.windowLeft,
            width: metrics.windowWidth,
            // The clear band of paper between the top border and the staff.
            top: STAFF_PAPER_TOP * height,
            height: (STAFF_TOP_LINE - STAFF_PAPER_TOP) * height,
            justifyContent: 'center',
          }}
        >
          <Text
            testID="staff-title"
            numberOfLines={1}
            style={{
              color: STAFF_INK,
              fontSize: metrics.lineGap * TITLE_SIZE_RATIO,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
        </View>
      ) : null}
      <Animated.View
        style={[styles.window, { left: metrics.windowLeft, width: metrics.windowWidth, height }, notesStyle]}
        testID="staff-note-window"
      >
        <Animated.View style={[styles.row, { height }, rowStyle]} testID="staff-note-row">
          {sequence.map((entry, index) => {
            const letters = isChordEntry(entry) ? parseChordEntry(entry) : [entry];
            const item = letters
              .map(letter => noteLayout.find(candidate => candidate.note === letter))
              .find(Boolean);
            const steps = staffStepsAboveBottomLine(item?.note ?? letters[0] ?? '');
            if (steps === null) return null;

            const colour = item?.color ?? UNMAPPED_NOTE_COLOR;
            const shadow = shadows[index] ?? 0;
            const focused = markCurrent && stillPlaying && index === focusIndex;
            const centreY = staffNoteY(steps, height);
            const stemHeight = staffStemHeight(steps, height, metrics.lineGap);
            const letter = item?.note ?? letters[0] ?? '';

            return (
              <View
                key={`staff-note-${index}`}
                testID={`staff-note-${index}`}
                style={{
                  position: 'absolute',
                  left: (slots[index] ?? 0) - metrics.headWidth / 2,
                  top: centreY - metrics.headHeight / 2,
                  width: metrics.headWidth,
                  height: metrics.headHeight,
                  opacity: index < playedBefore ? PLAYED_OPACITY : 1,
                }}
              >
                {holdPlan && shadow > 0 && (
                  <>
                    <View
                      testID={`staff-note-shadow-${index}`}
                      style={{
                        position: 'absolute',
                        left: metrics.headWidth / 2,
                        width: shadow,
                        top: (metrics.headHeight - metrics.lineGap * SHADOW_HEIGHT_RATIO) / 2,
                        height: metrics.lineGap * SHADOW_HEIGHT_RATIO,
                        borderRadius: metrics.lineGap * SHADOW_HEIGHT_RATIO / 2,
                        backgroundColor: colour,
                        opacity: SHADOW_OPACITY,
                      }}
                    />
                    {/* The line the hold has to reach for the note to count. */}
                    <View
                      testID={`staff-note-target-${index}`}
                      style={{
                        position: 'absolute',
                        left: metrics.headWidth / 2 + shadow - metrics.stemWidth,
                        width: metrics.stemWidth,
                        top: (metrics.headHeight - metrics.lineGap * TARGET_LINE_HEIGHT_RATIO) / 2,
                        height: metrics.lineGap * TARGET_LINE_HEIGHT_RATIO,
                        borderRadius: metrics.stemWidth / 2,
                        backgroundColor: colour,
                      }}
                    />
                  </>
                )}
                {staffLedgerSteps(steps).map(line => (
                  <View
                    key={`ledger-${line}`}
                    testID={`staff-note-ledger-${index}`}
                    style={{
                      position: 'absolute',
                      left: -metrics.headWidth * 0.35,
                      width: metrics.headWidth * 1.7,
                      top: (metrics.headHeight - metrics.stemWidth) / 2 + (steps - line) * (metrics.lineGap / 2),
                      height: metrics.stemWidth,
                      backgroundColor: STAFF_INK,
                    }}
                  />
                ))}
                {focused && (
                  <View
                    testID={`staff-note-halo-${index}`}
                    style={{
                      position: 'absolute',
                      left: -metrics.headWidth * 0.24,
                      top: -metrics.headHeight * 0.24,
                      width: metrics.headWidth * 1.48,
                      height: metrics.headHeight * 1.48,
                      borderRadius: metrics.headHeight * 0.74,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                )}
                <View
                  testID={`staff-note-stem-${index}`}
                  style={{
                    position: 'absolute',
                    ...(staffStemsPointDown(steps)
                      ? { left: 0, top: metrics.headHeight / 2 }
                      : { right: 0, bottom: metrics.headHeight / 2 }),
                    width: metrics.stemWidth,
                    height: stemHeight,
                    borderRadius: metrics.stemWidth / 2,
                    backgroundColor: colour,
                  }}
                />
                <Animated.View
                  testID={`staff-note-head-${index}`}
                  style={[{
                    width: metrics.headWidth,
                    height: metrics.headHeight,
                    borderRadius: metrics.headHeight / 2,
                    backgroundColor: colour,
                  }, focused && landingStyle]}
                />
                {/* Every letter on one baseline under the staff, so the row of
                    them reads straight however high the notes climb. */}
                <Text
                  testID={`staff-note-letter-${index}`}
                  style={{
                    position: 'absolute',
                    left: (metrics.headWidth - metrics.spacing) / 2,
                    width: metrics.spacing,
                    // Centred on the shared baseline, measured back through the
                    // wrapper, which sits at this note's own height.
                    top: metrics.letterY - centreY + metrics.headHeight / 2 - metrics.letterSize * 0.6,
                    height: metrics.letterSize * 1.2,
                    lineHeight: metrics.letterSize * 1.2,
                    color: colour,
                    fontSize: metrics.letterSize,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}
                >
                  {letter}
                </Text>
              </View>
            );
          })}
        </Animated.View>
      </Animated.View>
      {/*
        The light at the cut, outside the note window so the very edge it marks
        cannot clip it in half. It sits on the held note's own row, in that
        note's colour under a near-white core, and comes up with the hold.
      */}
      {focusY !== null && (
        // One animated opacity for the whole light: nested opacity multiplies,
        // so each layer keeps its own static share of it and the falloff needs
        // no further animation.
        <Animated.View
          testID="staff-hold-light-wrap"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, holdLightStyle]}
        >
          {[...HOLD_GLOW_LAYERS].reverse().map(layer => (
            <View
              key={`glow-${layer.width}`}
              testID={layer === HOLD_GLOW_LAYERS[HOLD_GLOW_LAYERS.length - 1]
                ? 'staff-hold-glow'
                : 'staff-hold-glow-inner'}
              style={{
                position: 'absolute',
                // Spilling right from the cut, over the highlight being eaten.
                left: metrics.windowLeft,
                top: focusY - (metrics.lineGap * layer.height) / 2,
                width: metrics.lineGap * layer.width,
                height: metrics.lineGap * layer.height,
                borderRadius: (metrics.lineGap * layer.height) / 2,
                backgroundColor: focusColour,
                opacity: layer.opacity,
              }}
            />
          ))}
        </Animated.View>
      )}
      {focusY !== null && (
        <Animated.View
          testID="staff-hold-light"
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: metrics.windowLeft - (metrics.stemWidth * HOLD_LINE_BLOOM_WIDTH_RATIO) / 2,
              top: focusY - (metrics.lineGap * HOLD_LINE_BOX_HEIGHT_RATIO) / 2,
              width: metrics.stemWidth * HOLD_LINE_BLOOM_WIDTH_RATIO,
              height: metrics.lineGap * HOLD_LINE_BOX_HEIGHT_RATIO,
              alignItems: 'center',
              justifyContent: 'center',
            },
            holdLineStyle,
          ]}
        >
          <View
            testID="staff-hold-line-bloom"
            style={{
              position: 'absolute',
              width: metrics.stemWidth * HOLD_LINE_BLOOM_WIDTH_RATIO,
              height: metrics.lineGap * HOLD_LINE_BOX_HEIGHT_RATIO,
              borderRadius: (metrics.stemWidth * HOLD_LINE_BLOOM_WIDTH_RATIO) / 2,
              backgroundColor: HOLD_LIGHT,
              opacity: HOLD_LINE_BLOOM_OPACITY,
            }}
          />
          <View
            testID="staff-hold-line"
            style={{
              width: metrics.stemWidth * HOLD_LINE_WIDTH_RATIO,
              height: metrics.lineGap * HOLD_LINE_HEIGHT_RATIO,
              borderRadius: (metrics.stemWidth * HOLD_LINE_WIDTH_RATIO) / 2,
              backgroundColor: HOLD_LIGHT,
            }}
          />
        </Animated.View>
      )}
      {/*
        The wrong-note wash. A second copy of the banner, tinted, rather than a
        coloured rectangle: the artwork is paper with transparent margins and a
        transparent skirt below it, so a rectangle washed 125px of the story art
        above the sheet red as well. Tinting the image keeps the red inside the
        paper's own shape, wavy edges and all.
      */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.Image
          source={STAFF_BANNER}
          resizeMode="contain"
          testID="staff-error-wash"
          style={[
            { position: 'absolute', left: 0, top: 0, width, height, tintColor: ERROR_RED },
            errorStyle,
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  window: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  row: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
