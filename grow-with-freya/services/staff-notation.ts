import { regionTurnsForBlow } from '@/services/instrument-surface-layout';

/**
 * Staff notation geometry for the music sheet banner.
 *
 * Pure maths -- no React, no assets. Everything here is measured off
 * `assets/music/sheet/staff-banner.webp` (2000x667) so a note drawn at these
 * fractions lands on the printed staff whatever size the banner is rendered at.
 *
 * The five printed lines were sampled at y = 243.5, 285.5, 327.5, 369 and 410,
 * i.e. a 41.6px gap that holds steady across the width of the artwork.
 */

/** Width / height of the banner artwork. */
export const STAFF_ASPECT_RATIO = 2000 / 667;

/** Top printed staff line, as a fraction of the banner height. */
export const STAFF_TOP_LINE = 0.3651;

/** Gap between two printed staff lines, as a fraction of the banner height. */
export const STAFF_LINE_GAP = 0.0624;

/** Bottom printed staff line, as a fraction of the banner height. */
export const STAFF_BOTTOM_LINE = STAFF_TOP_LINE + 4 * STAFF_LINE_GAP;

/**
 * Where the opaque paper ends. Below this the artwork is transparent, so the
 * sheet can hang over the instrument this far without hiding any of it.
 * Measured across the middle of the artwork, where the banner dips lowest.
 */
export const STAFF_PAPER_BOTTOM = 0.78;

/** Where the opaque paper starts, clear of the curved top border. */
export const STAFF_PAPER_TOP = 0.2;

/**
 * Where the notes are cut off on the left, right against the treble clef.
 *
 * The clef's ink was measured off the artwork at columns 257-358 of 2000, so it
 * ends at 0.179; the cut sits two pixels past that. It was 0.19, which left a
 * 25px strip of bare paper between the clef and the point notes vanish -- the
 * played note's ring wants to sit flush against the clef, as it would if the
 * score were being pulled through a real sheet.
 */
export const STAFF_NOTE_LEFT = 0.181;

/** Right edge of clear paper, before the stars and leaves. */
export const STAFF_NOTE_RIGHT = 0.85;

/** One baseline under the staff, where every note's letter sits. */
export const STAFF_LETTER_CENTRE = 0.695;

/** Letter size relative to the line gap. */
const LETTER_SIZE_RATIO = 1.15;

/** Note head size relative to the line gap. Engraved heads are wider than tall. */
const HEAD_WIDTH_RATIO = 1.35;
const STEM_HEIGHT_RATIO = 3;
const STEM_WIDTH_RATIO = 0.14;
const MIN_STEM_WIDTH = 1.5;

/** Horizontal pitch between consecutive notes, relative to the line gap. */
const NOTE_SPACING_RATIO = 2.8;

/**
 * Clear paper left between the end of a note's shadow and the next note head,
 * as a share of the ordinary note spacing.
 *
 * This has to be wider than the 0.15 a default 0.85-of-a-beat hold leaves over:
 * at that width consecutive shadows very nearly touch and a run of equal notes
 * reads as one long band instead of several separate holds. 0.3 leaves the
 * rounded ends clearly apart, at the cost of every note sitting a little further
 * along than the bare spacing would put it.
 */
const SHADOW_GAP_RATIO = 0.3;

/**
 * How far in from the left of the window the note being played is parked, as a
 * multiple of the head width. Just enough that its ring clears the cut, so the
 * note sits flush against the point notes scroll out at; everything before it
 * has gone, and its hold runs away to the right.
 */
const PLAYHEAD_HEAD_WIDTHS = 0.74;

/** Breathing room between the sheet and the edges of the region. */
const STRIP_MARGIN = 12;

/** The sheet never grows past this share of the region height. */
const STRIP_MAX_HEIGHT_FRACTION = 0.55;

/** Below this the staff is too small to read a pitch off, so nothing is drawn. */
const STRIP_MIN_WIDTH = 180;

/**
 * Smallest staff line gap worth reading once the sheet has turned.
 *
 * Turned, the sheet can only be as long as the region is tall -- the width of
 * the phone as the child now holds it -- which leaves the staff too small to
 * pick a note off. So it is drawn longer than the screen, anchored by its left
 * edge: the moon and the treble clef stay in view and the notes slide in from
 * the right, off the end of the paper the child cannot see. A region already big
 * enough (a tablet) is left at its natural size and centred, ends and all.
 */
const TURNED_MIN_LINE_GAP = 14;

/** Letter positions within an octave, C first. */
const DIATONIC_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/**
 * Half-steps from the bottom staff line (E4 in treble clef) up to the app's C.
 *
 * The bundled samples were measured at 523 Hz for C through 880 Hz for A, so
 * the app's scale is the octave above middle C: C5 is the middle space, five
 * half-steps up. Writing it there is both the true pitch and the reading that
 * keeps a whole nursery melody inside the printed staff.
 */
const APP_C_STEPS = 5;

/** Steps of the topmost printed staff line. */
const TOP_LINE_STEPS = 8;

/** Steps of the middle printed staff line, where stems turn over. */
const MIDDLE_LINE_STEPS = 4;

/**
 * How many half-steps (line-to-space moves) a note sits above the bottom staff
 * line, or null for a name with no place on the staff.
 */
export function staffStepsAboveBottomLine(note: string): number | null {
  const letter = note.trim().charAt(0).toUpperCase();
  const index = DIATONIC_INDEX[letter];
  if (index === undefined) return null;
  return index + APP_C_STEPS;
}

/**
 * Ledger lines a note needs, as step positions -- the short lines that carry
 * the staff on for a note written off the top or bottom of it. Empty for a note
 * on the staff, or in the space just outside it.
 */
export function staffLedgerSteps(steps: number): number[] {
  const lines: number[] = [];
  for (let line = TOP_LINE_STEPS + 2; line <= steps; line += 2) lines.push(line);
  for (let line = -2; line >= steps; line -= 2) lines.push(line);
  return lines;
}

/** Engravers hang the stem down from the middle line up, and send it up below. */
export function staffStemsPointDown(steps: number): boolean {
  return steps >= MIDDLE_LINE_STEPS;
}

/** Vertical centre of a note head, in banner pixels. */
export function staffNoteY(steps: number, bannerHeight: number): number {
  return (STAFF_BOTTOM_LINE - steps * (STAFF_LINE_GAP / 2)) * bannerHeight;
}

export interface StaffNoteMetrics {
  /** Distance between two printed staff lines. */
  lineGap: number;
  headWidth: number;
  headHeight: number;
  stemWidth: number;
  /** Stem length for a note that needs no reach to the staff. */
  stemHeight: number;
  /** Centre of the shared letter baseline, in banner pixels. */
  letterY: number;
  letterSize: number;
  /** Distance between the centres of consecutive notes. */
  spacing: number;
  /** Left edge of the scrolling window, measured from the banner's left edge. */
  windowLeft: number;
  windowWidth: number;
  /** Where inside the window the note being played is parked. */
  playheadX: number;
}

/**
 * Note sizes for a banner drawn at `bannerWidth`, or null if unmeasured.
 *
 * `visibleFraction` is the share of the banner's length actually on screen. The
 * turned sheet is drawn longer than the screen, so the notes have to be parked
 * and scrolled within the part the child can see rather than the whole paper.
 */
export function staffNoteMetrics(bannerWidth: number, visibleFraction = 1): StaffNoteMetrics | null {
  if (bannerWidth <= 0) return null;
  const bannerHeight = bannerWidth / STAFF_ASPECT_RATIO;
  const lineGap = STAFF_LINE_GAP * bannerHeight;
  // The sheet is anchored by its left edge, so what is on screen runs from the
  // start of the paper up to wherever the screen ends.
  const seenFrom = STAFF_NOTE_LEFT;
  const seenTo = Math.min(STAFF_NOTE_RIGHT, Math.max(0, visibleFraction));
  const windowWidth = Math.max(0, seenTo - seenFrom) * bannerWidth;
  return {
    lineGap,
    headWidth: lineGap * HEAD_WIDTH_RATIO,
    headHeight: lineGap,
    stemWidth: Math.max(MIN_STEM_WIDTH, lineGap * STEM_WIDTH_RATIO),
    stemHeight: lineGap * STEM_HEIGHT_RATIO,
    letterY: STAFF_LETTER_CENTRE * bannerHeight,
    letterSize: lineGap * LETTER_SIZE_RATIO,
    spacing: lineGap * NOTE_SPACING_RATIO,
    windowLeft: seenFrom * bannerWidth,
    windowWidth,
    playheadX: lineGap * HEAD_WIDTH_RATIO * PLAYHEAD_HEAD_WIDTHS,
  };
}

/**
 * How long a hold reads on the page.
 *
 * One beat covers exactly the ordinary note spacing, so a song of plain one-beat
 * notes lays out precisely as it did before any of this existed, and a note held
 * twice as long simply takes twice the room.
 */
export function staffShadowLength(holdMs: number, beatMs: number, metrics: StaffNoteMetrics): number {
  if (beatMs <= 0) return 0;
  return (holdMs / beatMs) * metrics.spacing;
}

/**
 * Where each note head sits along the row, plus one entry past the end.
 *
 * A note takes the ordinary spacing, or more if its shadow needs the room, so a
 * long note is never written over by the note after it. The trailing entry means
 * `offsets[i + 1] - offsets[i]` is the distance the score travels while note `i`
 * is held, for every note including the last.
 */
export function staffNoteSlots(shadowLengths: number[], metrics: StaffNoteMetrics): number[] {
  const gap = SHADOW_GAP_RATIO * metrics.spacing;
  const offsets: number[] = [];
  let cursor = 0;
  for (const shadow of shadowLengths) {
    offsets.push(cursor);
    cursor += Math.max(metrics.spacing, shadow + gap);
  }
  offsets.push(cursor);
  return offsets;
}


/**
 * How long to draw a note's stem.
 *
 * A stem that hangs down runs all the way to the bottom staff line, so every
 * stem in a bar ends on the same line -- tidier to read than a row of stems
 * stopping at different heights, and it leaves the paper under the staff free
 * for the letters. A note written below the staff gets a plain upward stem.
 */
export function staffStemHeight(steps: number, bannerHeight: number, lineGap: number): number {
  if (!staffStemsPointDown(steps)) return lineGap * STEM_HEIGHT_RATIO;
  // Stems only hang down from the middle line up, so the reach to the bottom
  // line is always at least two line gaps -- long enough to read.
  return staffNoteY(0, bannerHeight) - staffNoteY(steps, bannerHeight);
}

export interface StaffStripRegion {
  width: number;
  height: number;
  /** Where the instrument artwork starts, in region coordinates. */
  instrumentTop: number;
  /** How far the paper may hang over the top of the instrument. */
  overlap: number;
  /**
   * Safe-area inset on the edge the sheet moves to in blow mode -- the top of
   * the phone as the child then holds it, where the notch is.
   */
  edgeInset?: number;
}

export interface StaffStripPlacement {
  /** Banner box in the upright pose the child sees when holding the phone in landscape. */
  left: number;
  top: number;
  width: number;
  height: number;
  /**
   * Whether blow mode turns the sheet at all. Only a landscape region is drawn
   * the phone way, where the child turns the device upright and the instrument
   * comes to point at the floor. A portrait region (a tablet held upright)
   * leaves the instrument lying across the screen, so the sheet stays above it.
   */
  turnsForBlow: boolean;
  /**
   * How much past the width of the screen the turned sheet is drawn, to bring
   * the staff up to a readable size. 1 when the region is already big enough.
   */
  rotatedZoom: number;
  /**
   * Blow pose. The instrument turns to point at the floor, so the sheet turns
   * with it: rotate the same box by -90 degrees, scale it by `rotatedScale` and
   * shift its centre by `rotatedTranslateX/Y`. That lands it across the top of
   * the upright phone, clear of the hand and the mouthpiece at the bottom.
   */
  rotatedScale: number;
  rotatedTranslateX: number;
  rotatedTranslateY: number;
}

/**
 * Fits the sheet into the space above the instrument, and works out where the
 * same sheet goes once the instrument turns for blow mode.
 *
 * Returns null while the region is unmeasured, or when the space left over is
 * too small for a readable staff.
 */
export function layoutStaffStrip(region: StaffStripRegion): StaffStripPlacement | null {
  if (region.width <= 0 || region.height <= 0) return null;

  const paperBottom = region.instrumentTop + region.overlap;
  const maxHeight = Math.min(
    paperBottom / STAFF_PAPER_BOTTOM,
    region.height * STRIP_MAX_HEIGHT_FRACTION,
  );
  const width = Math.min(maxHeight * STAFF_ASPECT_RATIO, region.width - 2 * STRIP_MARGIN);
  if (width < STRIP_MIN_WIDTH) return null;

  const height = width / STAFF_ASPECT_RATIO;
  const left = (region.width - width) / 2;
  const top = paperBottom - height * STAFF_PAPER_BOTTOM;

  // Turned a quarter turn, the sheet runs along the region's height -- which is
  // the width of the phone as the child now holds it.
  const acrossScale = (region.height - 2 * STRIP_MARGIN) / width;
  const rotatedZoom = Math.max(1, TURNED_MIN_LINE_GAP / (STAFF_LINE_GAP * height * acrossScale));
  const rotatedScale = acrossScale * rotatedZoom;
  // Turned a quarter turn, the region's near edge is the top of the upright
  // phone, and the paper's top edge lands that far left of the box centre.
  const paperEdgeReach = (0.5 - STAFF_PAPER_TOP) * height * rotatedScale;
  const rotatedCentreX = Math.max(STRIP_MARGIN, region.edgeInset ?? 0) + paperEdgeReach;
  // Anchored by its left edge: turned, the banner's own left runs to the far end
  // of the region's height, which is the left of the phone in the child's hands.
  // With no zoom this lands on the mid-line, exactly as centring it would.
  const rotatedCentreY = region.height - STRIP_MARGIN - (width / 2) * rotatedScale;

  return {
    left,
    top,
    width,
    height,
    turnsForBlow: regionTurnsForBlow(region),
    rotatedZoom,
    rotatedScale,
    rotatedTranslateX: rotatedCentreX - (left + width / 2),
    rotatedTranslateY: rotatedCentreY - (top + height / 2),
  };
}

/**
 * How far the row travels while note `focusIndex` is held -- exactly the gap to
 * where the next note rests, so a completed hold leaves the next note on the
 * playhead with nothing left over.
 */
export function staffHoldTravel(slots: number[], focusIndex: number): number {
  const restAt = slots[focusIndex] ?? 0;
  return (slots[focusIndex + 1] ?? restAt) - restAt;
}

/**
 * Where the row of notes sits, so the note being played is on the playhead and
 * its hold runs off the left edge of the window as it is held.
 *
 * Computed from the slot table rather than accumulated frame by frame: `held`
 * is only how much of *this* note's hold has run, so a finished hold and the
 * next note at rest give the same answer and the score cannot drift out of step
 * however long the song goes on.
 */
export function staffRowShift(
  slots: number[],
  focusIndex: number,
  held: number,
  playheadX: number,
): number {
  const restAt = slots[focusIndex] ?? 0;
  return playheadX - restAt - staffHoldTravel(slots, focusIndex) * held;
}
