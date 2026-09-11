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

import React, { useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { isChordEntry, parseChordEntry } from '@/services/sequence-matcher';
import type { NoteLayoutItem } from '@/services/music-asset-registry';
import { holdRun, type HoldPlan } from '@/services/hold-plan';
import {
  STAFF_ASPECT_RATIO,
  STAFF_PAPER_TOP,
  STAFF_TOP_LINE,
  staffHoldTravel,
  staffLedgerSteps,
  staffNoteMetrics,
  staffNoteSlots,
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

/** Shadow thickness, a shade under a line gap so it never smears across two lines. */
const SHADOW_HEIGHT_RATIO = 0.8;

/** Song title size, as a multiple of the staff line gap. */
const TITLE_SIZE_RATIO = 1.25;

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
  const focusIndex = Math.max(0, Math.min(reached, sequence.length - 1));
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
  const currentHoldMs = holdPlan?.targets[focusIndex]?.holdMs ?? 0;
  const playheadX = metrics?.playheadX ?? 0;

  const progress = useSharedValue(0);
  const heldFor = useSharedValue(-1);

  useEffect(() => {
    const at = heldFor.value === focusIndex ? progress.value : 0;
    heldFor.value = focusIndex;
    if (currentHoldMs <= 0 || travel <= 0) {
      progress.value = 0;
      return;
    }
    const run = holdRun(holdingCurrent, at, currentHoldMs);
    progress.value = run.from;
    progress.value = reduceMotion
      ? run.to
      : withTiming(run.to, {
          duration: Math.max(1, run.durationMs),
          // Running forward is a clock, so it has to be even; snapping back is
          // not, and eases out so it lands rather than stops dead.
          easing: holdingCurrent ? Easing.linear : Easing.out(Easing.quad),
        });
  }, [focusIndex, holdingCurrent, currentHoldMs, travel, reduceMotion, progress, heldFor]);

  // Both ends of the move are worked out here, in plain JS, and the worklet only
  // slides between them by however much of the hold has run. So where the row
  // rests is ordinary style that a test can read, and the one thing crossing to
  // the UI thread each frame is a single number.
  const restingShift = staffRowShift(slots, focusIndex, 0, playheadX);
  const heldShift = staffRowShift(slots, focusIndex, 1, playheadX);

  const creepStyle = useAnimatedStyle(() => {
    const ran = heldFor.value === focusIndex ? progress.value : 0;
    return { transform: [{ translateX: (heldShift - restingShift) * ran }] };
  }, [focusIndex, restingShift, heldShift]);

  // The note that has just landed on the playhead gives a little bounce, so the
  // child can see the sheet has moved on.
  const landing = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    landing.value = withSequence(
      withTiming(1.22, { duration: LANDING_MS * 0.35, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 9, stiffness: 220 }),
    );
  }, [focusIndex, reduceMotion, landing]);

  const landingStyle = useAnimatedStyle(() => ({ transform: [{ scale: landing.value }] }));

  if (!metrics || sequence.length === 0) return null;

  const height = width / STAFF_ASPECT_RATIO;
  const playedBefore = reached;

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
      <View
        style={[styles.window, { left: metrics.windowLeft, width: metrics.windowWidth, height }]}
        testID="staff-note-window"
      >
        <Animated.View
          style={[styles.row, { height, left: restingShift }, creepStyle]}
          testID="staff-note-row"
        >
          {sequence.map((entry, index) => {
            const letters = isChordEntry(entry) ? parseChordEntry(entry) : [entry];
            const item = letters
              .map(letter => noteLayout.find(candidate => candidate.note === letter))
              .find(Boolean);
            const steps = staffStepsAboveBottomLine(item?.note ?? letters[0] ?? '');
            if (steps === null) return null;

            const colour = item?.color ?? UNMAPPED_NOTE_COLOR;
            const shadow = shadows[index] ?? 0;
            const focused = stillPlaying && index === focusIndex;
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
