/**
 * Timings and poses for the one move between reading the song and playing it.
 *
 * Pure numbers -- no React, no timers. Every lane is measured in milliseconds
 * from the moment "Ready to Play" is pressed, and read back off a single
 * progress value the caller runs from 0 to 1 over `ARRIVAL_TOTAL_MS`. Keeping
 * them here rather than in the two screens that play them is what lets the
 * sheet, the instrument, the note buttons and the controls be read as one
 * timeline instead of four separate fades.
 *
 * The helpers are worklets: they are called from `useAnimatedStyle` on the UI
 * thread, where a plain function would abort the process.
 */

/** A rectangle in the challenge view's own coordinates. */
export interface SheetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where the flying sheet sits, relative to where the panel had it. */
export interface SheetFlightPose {
  translateX: number;
  translateY: number;
  scale: number;
}

/** How far a piece still has to travel (1 = off screen), and how solid it is. */
export interface EntryPose {
  slide: number;
  opacity: number;
}

/**
 * How long the whole arrival lasts.
 *
 * The child has already pressed the button, so this is time spent not playing:
 * long enough for the sheet's journey to be followed, short enough not to be a
 * wait. Every lane below is clamped inside it.
 */
export const ARRIVAL_TOTAL_MS = 720;

/** How long the panel and its buttons take to leave, once the sheet has gone. */
export const PANEL_EXIT_MS = 240;

/** The sheet's own journey, from the panel's middle to the staff position. */
export const SHEET_FLIGHT_MS = 420;

/**
 * The overlap at the end of the flight, where the staff's own sheet comes up
 * under the flying one before it goes. Both are the same song at the same size
 * by then, so the swap is a frame nobody sees.
 */
export const SHEET_HANDOVER_MS = 60;

/** The instrument slides in from the left, starting while the sheet is in the air. */
export const INSTRUMENT_START_MS = 180;
export const INSTRUMENT_MS = 380;

/** The note buttons balloon onto their holes, one after another along the body. */
export const NOTE_BALLOON_START_MS = 400;
export const NOTE_BALLOON_STAGGER_MS = 25;
export const NOTE_BALLOON_MS = 180;

/** The controls rise from the bottom edge last. */
export const CHROME_START_MS = 480;
export const CHROME_MS = 220;

const BACK_OVERSHOOT = 1.2;

function clamp01(value: number): number {
  "worklet";
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Where a lane has got to, given the arrival's overall progress. */
export function laneProgress(
  progress: number,
  startMs: number,
  durationMs: number,
): number {
  "worklet";
  return clamp01((progress * ARRIVAL_TOTAL_MS - startMs) / durationMs);
}

function easeInOutCubic(p: number): number {
  "worklet";
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

function easeOutCubic(p: number): number {
  "worklet";
  return 1 - Math.pow(1 - p, 3);
}

function easeOutBack(p: number): number {
  "worklet";
  const back = p - 1;
  return (
    1 + (BACK_OVERSHOOT + 1) * back * back * back + BACK_OVERSHOOT * back * back
  );
}

/**
 * The flying sheet's pose, given the rectangle the panel had it in and the
 * rectangle the staff wants it in.
 *
 * The sheet is laid out at the panel's width and shrinks into the staff's, so
 * the paper is only ever sampled down; laid out at the staff width it would
 * start the journey blown up, which is the half the child is looking at.
 */
export function flightPose(
  progress: number,
  from: SheetRect,
  to: SheetRect,
): SheetFlightPose {
  "worklet";
  const p = easeInOutCubic(laneProgress(progress, 0, SHEET_FLIGHT_MS));
  if (p <= 0) return { translateX: 0, translateY: 0, scale: 1 };
  const fromCentreX = from.x + from.width / 2;
  const fromCentreY = from.y + from.height / 2;
  const toCentreX = to.x + to.width / 2;
  const toCentreY = to.y + to.height / 2;
  const targetScale = from.width > 0 ? to.width / from.width : 1;
  return {
    translateX: (toCentreX - fromCentreX) * p,
    translateY: (toCentreY - fromCentreY) * p,
    scale: 1 + (targetScale - 1) * p,
  };
}

/**
 * The instrument arrives whole, under its own timing rather than a spring: an
 * overshoot here would slide the note buttons off the holes they are pinned to.
 */
export function instrumentEntry(progress: number): EntryPose {
  "worklet";
  const lane = laneProgress(progress, INSTRUMENT_START_MS, INSTRUMENT_MS);
  return {
    slide: 1 - easeOutCubic(lane),
    opacity: clamp01(lane * 3),
  };
}

/** When a given button's turn comes, tightened so the last one still lands in time. */
export function noteBalloonDelayMs(index: number, count: number): number {
  "worklet";
  const spread = Math.max(count - 1, 1);
  const room =
    (ARRIVAL_TOTAL_MS - NOTE_BALLOON_START_MS - NOTE_BALLOON_MS) / spread;
  return (
    NOTE_BALLOON_START_MS + index * Math.min(NOTE_BALLOON_STAGGER_MS, room)
  );
}

/** A button's size, from nothing to a little past full and back onto it. */
export function noteBalloonScale(
  progress: number,
  index: number,
  count: number,
): number {
  "worklet";
  const lane = laneProgress(
    progress,
    noteBalloonDelayMs(index, count),
    NOTE_BALLOON_MS,
  );
  if (lane <= 0) return 0;
  if (lane >= 1) return 1;
  return easeOutBack(lane);
}

/** The play-mode toggle, the continue and skip buttons, and the floating pair. */
export function chromeEntry(progress: number): EntryPose {
  "worklet";
  const lane = laneProgress(progress, CHROME_START_MS, CHROME_MS);
  return {
    slide: 1 - easeOutCubic(lane),
    opacity: lane,
  };
}
