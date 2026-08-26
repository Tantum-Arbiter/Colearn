import { SCREEN_TIME_GLANCE } from './screen-time-ring';

/**
 * A single move on the choreography's clock: when it starts, how long it
 * takes, and -- so callers never re-derive it -- when it is over.
 */
export interface Phase {
  readonly at: number;
  readonly over: number;
  readonly ends: number;
}

function phase(at: number, over: number): Phase {
  return { at, over, ends: at + over };
}

/**
 * The durations the glance is built from; the defaults are the real ones.
 *
 * Widened to `number` rather than picked off the `as const` object, so a test
 * can retime a beat and check the order still holds.
 */
export interface GlanceDurations {
  fadeDuration: number;
  spinDuration: number;
  travelDuration: number;
  morphDuration: number;
  drawDuration: number;
  settleDuration: number;
  dropShrink: number;
  dropReturn: number;
  splashDuration: number;
  orbReform: number;
}

/**
 * How far the border's draw reaches back into the line's travel.
 *
 * The stroke picks up just before the line settles, so the two read as one
 * continuous movement rather than a handover between two animations.
 */
export const DRAW_OVERLAP = 60;

/** How long the orb takes to arrive, and to leave once the border has it. */
export const ORB_FADE_IN = 140;
export const ORB_FADE_OUT = 180;
/** The orb holds a moment into the draw before going, so the line is never
 *  seen to vanish at the instant the border appears. */
export const ORB_LEAVES_AFTER_DRAW = 40;

/** The drop hangs for a beat at its smallest before it falls. */
export const DROP_HANGS = 90;
/** The teardrop fades up before the gathered panel is gone, and starts
 *  fading out just before it lands, so neither end of the flight pops. */
export const DROP_IN_LEAD = 80;
export const DROP_OUT_LEAD = 10;
export const DROP_FADE_IN = 150;
export const DROP_FADE_OUT = 120;
/** The gathered panel's crossfade into the teardrop. */
export const PANEL_HANDOVER = 150;

/** The orb comes out of the splash a beat behind it, rather than alongside. */
export const ORB_AFTER_SPLASH = 90;
export const ORB_REFORM_FADE = 120;
/** The outline comes back after the orb is solid, and the colour turns after
 *  that -- started together, the orb simply arrived a muddy red. */
export const ARC_AFTER_ORB = 120;
export const WATER_AFTER_ORB = 170;

export interface GlanceOpenTimeline {
  /** the orb spins where it was pressed */
  readonly spin: Phase;
  /** it grows as it spins, then eases back */
  readonly swell: Phase;
  readonly ease: Phase;
  /** the whole turn, across the spin and the morph */
  readonly turn: Phase;
  /** how many whole turns that is -- the line is only vertical on a whole one */
  readonly turns: number;
  readonly rotation: number;
  /** the orb arrives, and leaves once the border has taken over */
  readonly orbIn: Phase;
  readonly orbOut: Phase;
  /** the orb's colour turn, from the ring's own colour to the water blue */
  readonly water: Phase;
  /** the ring's outline goes as the orb flattens; the core is what travels */
  readonly arcOut: Phase;
  /** circle to line, under the finger */
  readonly morph: Phase;
  /** the finished line glides to the border's start */
  readonly travel: Phase;
  /** the line draws the box */
  readonly draw: Phase;
  /** blackout and fill, together, inside the frame that now exists */
  readonly settle: Phase;
  /** the drawn stroke handing over to the panel's own border */
  readonly strokeOut: Phase;
  readonly content: Phase;
  readonly total: number;
}

/**
 * The open, as named phases on one clock.
 *
 * This used to be four `const`s adding durations together inside the
 * component, with every other moment written as a millisecond offset from
 * one of them. Reordering the choreography -- which happened three times
 * over the design work -- meant re-deriving all of it by hand, and a mistake
 * showed only on a device. Here the order is expressed once, each phase
 * knows when it ends, and the invariants are unit-testable.
 */
export function glanceOpenTimeline(
  durations: GlanceDurations = SCREEN_TIME_GLANCE
): GlanceOpenTimeline {
  const {
    spinDuration,
    morphDuration,
    travelDuration,
    drawDuration,
    settleDuration,
    fadeDuration,
  } = durations;

  // The orb becomes the line where it was pressed, and only then does the
  // line move. Travelling first and flattening on arrival made the shape
  // change somewhere the eye was not yet looking.
  const spin = phase(0, spinDuration);
  const morph = phase(spin.ends, morphDuration);
  const travel = phase(morph.ends, travelDuration);
  const draw = phase(travel.ends - DRAW_OVERLAP, drawDuration);
  const settle = phase(draw.ends, settleDuration);

  const swell = phase(0, spinDuration * 0.55);
  const strokeOut = phase(settle.at + settle.over * 0.5, settleDuration);
  const content = phase(settle.at + settle.over * 0.7, fadeDuration);

  // Two whole turns across the spin and the morph, ending exactly as the
  // line settles. A fraction of a turn left the finished line lying on its
  // side, correct-looking in code and plainly wrong on screen.
  const turns = 2;

  return {
    spin,
    swell,
    ease: phase(swell.ends, spinDuration - swell.over),
    turn: phase(0, spin.over + morph.over),
    turns,
    rotation: turns * 360,
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
    // derived rather than named, so reordering the beats cannot leave a
    // stale total behind
    total: Math.max(strokeOut.ends, content.ends, settle.ends, draw.ends),
  };
}

export interface GlanceCloseTimeline {
  /** the content dims first */
  readonly dim: Phase;
  /** the panel gathers itself into a blob */
  readonly gather: Phase;
  /** and tints to the water blue as it does */
  readonly tint: Phase;
  /** the blob crossfades into a true teardrop */
  readonly handover: Phase;
  readonly dropIn: Phase;
  /** the fall home to the ring */
  readonly flight: Phase;
  readonly dropOut: Phase;
  /** the night lifts while the drop is still travelling */
  readonly nightLifts: Phase;
  readonly splash: Phase;
  /** the orb re-forms out of the splash */
  readonly orbIn: Phase;
  readonly reform: Phase;
  readonly arcBack: Phase;
  /** blue back to the ring's own colour -- the last thing to finish */
  readonly water: Phase;
  readonly total: number;
}

/**
 * The close, as named phases on one clock: the open run backwards.
 *
 * The panel gathers, becomes a drop, falls back to the ring it came out of
 * and reforms into the orb there, handing the corner back to the ring.
 */
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
    water,
    total: Math.max(water.ends, reform.ends, arcBack.ends, splash.ends),
  };
}
