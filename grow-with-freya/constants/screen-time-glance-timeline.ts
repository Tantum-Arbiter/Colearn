import { SCREEN_TIME_GLANCE } from './screen-time-ring';

export interface Phase {
  readonly at: number;
  readonly over: number;
  readonly ends: number;
}

function phase(at: number, over: number): Phase {
  return { at, over, ends: at + over };
}

export interface GlanceDurations {
  fadeDuration: number;
  spinDuration: number;
  morphDuration: number;
  drawDuration: number;
  settleDuration: number;
  dropShrink: number;
  dropReturn: number;
  splashDuration: number;
  orbReform: number;
}

export const DRAW_OVERLAP = 0;

export const ORB_FADE_IN = 140;
export const ORB_FADE_OUT = 180;
export const ORB_LEAVES_AFTER_DRAW = 40;

export const DROP_HANGS = 90;
export const DROP_IN_LEAD = 80;
export const DROP_OUT_LEAD = 10;
export const DROP_FADE_IN = 150;
export const DROP_FADE_OUT = 120;
export const PANEL_HANDOVER = 150;

export const ORB_AFTER_SPLASH = 90;
export const ORB_REFORM_FADE = 120;
export const ARC_AFTER_ORB = 120;
export const WATER_AFTER_ORB = 170;

export const SPIRAL_OUT_SHARE = 0.45;

/**
 * The half turn the orb makes while the arm lays itself down.
 *
 * A line is unchanged by half a turn, so once the arm rather than a squash is
 * what makes the line, the spin can keep running through the flatten and
 * still finish level. It could not before: a squash produces its line in the
 * element's own frame, so any rotation still in flight left the line at an
 * angle, slewing into place.
 */
export const SETTLING_HALF_TURN = 180;

/**
 * How far into the flatten the turn is finished.
 *
 * The turn used to run the whole length of the morph, and the arm is
 * recognisably a line well before the morph ends -- 59% laid down and still
 * 11 degrees off level, its far tip 25px from where it lands. So the line
 * appeared and was then swung into position, rather than appearing flat.
 *
 * Ending the turn early keeps the half turn happening during the flatten,
 * which is the point of it, but confines it to the part where the arm is
 * still a coil. A coil looks right rotating; a line looks like it is being
 * dragged.
 */
export const TURN_SETTLES_BY = 0.35;

/**
 * Where the draw's easing puts its first control point.
 *
 * Paired with `drawPickupSlope`, which sets the matching height. Together they
 * make the border leave the arm's tip at the speed the arm was laying at.
 */
/**
 * The curve the orb turns on: up to speed, hold, then brake.
 *
 * It used to be an in-out cubic, which is symmetric -- it peaked at 3650
 * deg/s a third of the way in and had coasted down to 379, a tenth of that,
 * by the time the arm began to lay down. So the orb spun hard, drifted to a
 * near halt, and only then unrolled: the spin and the line were sequential
 * rather than one carrying into the other.
 *
 * Initial slope of one (x and y equal) means it reaches its working speed and
 * holds it rather than spiking; the late second control point keeps it there
 * until the brake. It is still turning at 977 deg/s -- two thirds of its peak
 * -- when the arm starts to lay down, and stopped by the time the arm is
 * straight. The peak is less than half what it was, so the spin reads as
 * steady rather than as a lurch.
 */
export const TURN_CURVE: readonly [number, number, number, number] = [0.15, 0.15, 0.8, 1];

export const DRAW_PICKUP_X = 0.5;

/**
 * The height of that control point, derived so the border picks up at the arm's
 * own rate rather than from a standstill.
 *
 * The arm lays its line at about 380 px/s. The border has a whole perimeter to
 * cover and averages 8000, and eased in-out it *starts at zero* -- so the
 * stroke reached the arm's tip, stopped dead, and then accelerated away to
 * sixty times the speed it had arrived at. That is the same fault as a
 * `withSequence` join, committed across two elements instead of within one
 * value, which is why nothing that looked at either element on its own ever
 * showed it.
 *
 * The perimeter depends on the screen, so this has to be worked out where the
 * geometry is known rather than written down as a curve.
 */
export function drawPickupSlope(
  lineLength: number,
  borderLength: number,
  layingOver: number,
  drawOver: number
): number {
  if (borderLength <= 0 || layingOver <= 0) {
    return DRAW_PICKUP_X;
  }

  // the arm's rate, expressed as this curve's slope where it leaves the origin
  const slope = (lineLength / layingOver) * (drawOver / borderLength);

  return DRAW_PICKUP_X * slope;
}

export interface GlanceOpenTimeline {
  readonly spin: Phase;
  readonly spiralOut: Phase;
  readonly swell: Phase;
  readonly ease: Phase;
  readonly turn: Phase;
  readonly turns: number;
  readonly rotation: number;
  readonly orbIn: Phase;
  readonly orbOut: Phase;
  readonly water: Phase;
  readonly arcOut: Phase;
  readonly morph: Phase;
  readonly travel: Phase;
  readonly draw: Phase;
  readonly settle: Phase;
  readonly strokeOut: Phase;
  readonly content: Phase;
  readonly total: number;
}

export function glanceOpenTimeline(
  durations: GlanceDurations = SCREEN_TIME_GLANCE
): GlanceOpenTimeline {
  const {
    spinDuration,
    morphDuration,
    drawDuration,
    settleDuration,
    fadeDuration,
  } = durations;

  const spin = phase(0, spinDuration);
  const morph = phase(spin.ends, morphDuration);
  const travel = phase(morph.at, morph.over);
  const draw = phase(travel.ends - DRAW_OVERLAP, drawDuration);
  const settle = phase(draw.ends, settleDuration);

  const swell = phase(0, spinDuration * 0.55);
  const spiralOut = phase(0, spin.over * SPIRAL_OUT_SHARE);
  const strokeOut = phase(settle.at + settle.over * 0.5, settleDuration);
  const content = phase(settle.at + settle.over * 0.7, fadeDuration);

  const turns = 2;
  const rotation = turns * 360 + SETTLING_HALF_TURN;

  return {
    spin,
    spiralOut,
    swell,
    ease: phase(swell.ends, spinDuration - swell.over),
    turn: phase(0, spin.over + morph.over * TURN_SETTLES_BY),
    turns,
    rotation,
    orbIn: phase(0, ORB_FADE_IN),
    orbOut: phase(draw.at + ORB_LEAVES_AFTER_DRAW, ORB_FADE_OUT),
    water: phase(spinDuration * 0.25, spinDuration * 0.65),
    arcOut: phase(morph.at, morph.over * 0.55),
    morph,
    travel,
    draw,
    settle,
    strokeOut,
    content,
    total: Math.max(strokeOut.ends, content.ends, settle.ends, draw.ends),
  };
}

export interface GlanceCloseTimeline {
  readonly dim: Phase;
  readonly gather: Phase;
  readonly tint: Phase;
  readonly handover: Phase;
  readonly dropIn: Phase;
  readonly flight: Phase;
  readonly dropOut: Phase;
  readonly nightLifts: Phase;
  readonly splash: Phase;
  readonly orbIn: Phase;
  readonly reform: Phase;
  readonly arcBack: Phase;
  readonly arcSettle: Phase;
  readonly water: Phase;
  readonly total: number;
}

export function glanceCloseTimeline(
  durations: GlanceDurations = SCREEN_TIME_GLANCE
): GlanceCloseTimeline {
  const { fadeDuration, dropShrink, dropReturn, splashDuration, orbReform } = durations;

  const dim = phase(0, fadeDuration * 0.7);
  const gather = phase(dim.ends, dropShrink);
  const flight = phase(gather.ends + DROP_HANGS, dropReturn);
  const splash = phase(flight.ends, splashDuration);
  const orbIn = phase(splash.at + ORB_AFTER_SPLASH, ORB_REFORM_FADE);
  const water = phase(orbIn.at + WATER_AFTER_ORB, orbReform * 0.9);
  const reform = phase(orbIn.at, orbReform);
  const arcBack = phase(orbIn.at + ARC_AFTER_ORB, orbReform * 0.7);
  // and dissolves again into the solid dot, because the ring it hands the
  // corner back to has no such outline
  const arcSettle = phase(arcBack.ends, Math.max(0, water.ends - arcBack.ends));

  return {
    dim,
    gather,
    tint: phase(gather.at + gather.over * 0.4, gather.over * 0.6),
    handover: phase(gather.ends, PANEL_HANDOVER),
    dropIn: phase(gather.ends - DROP_IN_LEAD, DROP_FADE_IN),
    flight,
    dropOut: phase(flight.ends - DROP_OUT_LEAD, DROP_FADE_OUT),
    nightLifts: phase(flight.at + flight.over * 0.35, flight.over * 0.65),
    splash,
    orbIn,
    reform,
    arcBack,
    arcSettle,
    water,
    total: Math.max(water.ends, reform.ends, arcBack.ends, splash.ends),
  };
}
