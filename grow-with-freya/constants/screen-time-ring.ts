export const SCREEN_TIME_RING = {
  size: 30,
  strokeWidth: 3,
  marginHorizontal: 18,
  marginBottom: 14,
  pulseScale: 1.22,
  pulseDuration: 620,
  // The ring comes back at rest and only then starts to breathe. Left free
  // running while hidden, the pulse was at an arbitrary scale the instant the
  // corner was handed back, so the glance's orb settled at 1 and the ring
  // appeared at anything up to pulseScale in the same frame.
  pulseSettle: 260,
  trackOpacity: 0.18,
  arcOpacity: 0.55,
  exceededColour: '#E4483F',
  exceededHalo: 'rgba(228,72,63,0.30)',
  /** How far the halo reaches past the dial. Shared, because the glance's
   *  orb has to wear the same one: the close hands the corner back the
   *  instant the orb has reformed, so anything the ring has and the orb does
   *  not appears out of nowhere in that frame. */
  haloScale: 1.9,
  hitSlop: 14,
} as const;

/**
 * The water blue the whole glance is built from: the colour the orb turns as
 * it spins, the colour the border is drawn in, the colour that border keeps
 * once the panel settles, and the colour of the drop it leaves as.
 */
const WATER = '#4FA8E0';

/**
 * The glance that opens out of the ring.
 *
 * The window is water, not alarm. A spinning echo of the ring rises where it
 * was pressed in the ring's own colour, turns this blue as it spins, and the
 * line it becomes draws the border -- which stays that blue when the panel
 * settles behind it. A whole screen in the alarm colour is neither readable
 * nor the calm register the rest of the app keeps to, so red survives only
 * where it means something: the ring the parent pressed, the alert header's
 * badge, and the usage figure it is warning about. Closing runs the argument
 * in reverse: the panel gathers into a drop of the same water and falls away.
 */
export const SCREEN_TIME_GLANCE = {
  fadeDuration: 200,
  // deep water-ink rather than the old near-black red: the surface belongs
  // to the same water as the frame around it
  exceededSurface: '#071A2E',
  calmSurface: '#080A28',

  /** Everything outside the panel: dim night, never the alarm colour. */
  scrim: 'rgba(4, 6, 18, 0.94)',

  // the open choreography, in order: spin, travel, morph into a line, draw
  // the border, then settle -- the blackout and the fill arriving together.
  // The spin is long enough to actually read as a spinning circle: at 360ms
  // two turns were a blur, and the phase looked like a flicker before the
  // draw rather than a moment of its own.
  spinDuration: 620,
  // long enough to be a movement rather than a cut: at 140ms the orb went
  // from circle to line in one step, with no squash to sell the change
  morphDuration: 340,
  drawDuration: 480,
  settleDuration: 260,

  // the spinner that echoes the ring while it travels
  spinnerRadius: 15,
  spinnerStroke: 3,

  /** Where the orb's colour turn starts: the ring's own colour, whichever
   *  state it is in. It ends at `drawWater` in both cases, so the border is
   *  always drawn -- and always settles -- in the water blue. */
  exceededDraw: '#E4483F',
  calmDraw: 'rgba(198, 219, 250, 0.85)',
  drawWater: WATER,
  /** The halo while the orb is still water, turning to the ring's own as the
   *  colour goes back. */
  waterHalo: 'rgba(79, 168, 224, 0.30)',

  // The close, which is the open run backwards: the panel gathers, becomes
  // a true teardrop, falls back to the ring it came out of, and reforms into
  // the orb there -- turning from water blue to the ring's own colour before
  // handing the corner back to the ring itself.
  dropShrink: 300,
  dropReturn: 520,
  splashDuration: 460,
  orbReform: 320,
  dropWidth: 38,
  dropHeight: 52,

  /**
   * The framed panel the drawn line settles into.
   *
   * The exceeded border keeps the water blue the line drew it in, lit by a
   * glow of the same colour -- the drawn stroke fades out over a border it
   * matches, so the handover is invisible and the frame never flips colour
   * under the parent's eye. The calm border stays the faint hairline it has
   * always been: a lit blue frame is the alert's own signal.
   */
  panelInset: 14,
  panelRadius: 28,
  panelBorderWidth: 2,
  exceededBorder: WATER,
  calmBorder: 'rgba(255, 255, 255, 0.14)',
  exceededGlow: 'rgba(79, 168, 224, 0.55)',
  calmGlow: 'rgba(0, 0, 0, 0.45)',
} as const;

/**
 * The colour the orb passes through on its way from the ring's red to the
 * water blue.
 *
 * Interpolated straight, red to blue in RGB runs through rgb(154,120,144) --
 * saturation falls from 0.72 to 0.22 and it arrives at a muddy mauve grey
 * before recovering. That is the whole reason the turn does not read as a
 * turn: it goes red, mud, blue. Routing it through a violet keeps the
 * minimum saturation at 0.41 and reads as warm cooling to cold.
 *
 * The calm state needs no such help: its draw colour is already a pale blue,
 * so the direct path never leaves the blues.
 */
export const WATER_TURN_MID = '#9B6FD4';

export function waterTurnRamp(
  from: string,
  exceeded: boolean
): { input: number[]; output: string[] } {
  return exceeded
    ? { input: [0, 0.5, 1], output: [from, WATER_TURN_MID, SCREEN_TIME_GLANCE.drawWater] }
    : { input: [0, 1], output: [from, SCREEN_TIME_GLANCE.drawWater] };
}

/**
 * The drop's flight home: from the centre of the panel it condenses out of,
 * back to the ring it came from.
 *
 * The close is the open run backwards, so the drop returns to the corner
 * rather than falling off the bottom of the screen -- and it has to arrive
 * exactly where the ring is, because what it reforms into there hands the
 * corner back to that ring.
 */
export function dropFlight(
  bounds: { left: number; top: number; right: number; bottom: number },
  ring: { x: number; y: number }
): { dx: number; dy: number } {
  return {
    dx: ring.x - (bounds.left + bounds.right) / 2,
    dy: ring.y - (bounds.top + bounds.bottom) / 2,
  };
}

/**
 * The returning drop's stretch: drawn out by the fall, squashed as it
 * lands. One function of the flight's own progress rather than a two-beat
 * sequence, which reversed direction abruptly at its join.
 */
export function dropStretchAt(progress: number): number {
  'worklet';
  const u = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
  return 1 + 0.22 * Math.sin(Math.PI * u) - 0.16 * u * u;
}

/**
 * A whole number of turns, so the arm's tip finishes pointing along the line
 * it is about to become. At 1.6 turns the tip ended at 216 degrees -- aimed
 * away from the line -- and had to swing right across the coil to reach it,
 * which is what made the early unroll frames cross themselves.
 */
export const SPIRAL_TURNS = 2;
/**
 * How finely the arm is sampled.
 *
 * Forty is where it stops mattering. Fifty-six was indistinguishable from it
 * on a sixty-point box, and thirty-two visibly facets the outer turn. Every
 * sample is two numbers the renderer parses back into a path on every frame,
 * so the difference between fifty-six and forty is about a third of that work
 * for no change on screen.
 */
export const SPIRAL_STEPS = 40;

/**
 * How far the arm reaches.
 *
 * It has to clear the orb, not merely match it. At the ring echo's own radius
 * the whole spiral sat inside the solid core dot, in the same colour, and was
 * invisible -- which is what "legible only at a corner-sized scale" meant in
 * the revert. Reaching well past the core is what makes it read as an arm
 * swept out of the orb rather than a texture on it.
 */
export const SPIRAL_RADIUS = 26;

/** Half the length of the line the arm lays itself down as. */
export const SPIRAL_LINE_HALF = 24;

/**
 * How much of the arm's length the straightening wave occupies.
 *
 * The unroll is a wave, not a uniform blend. Interpolating every point toward
 * the line at the same rate crumples the spiral inward on itself -- it was
 * rebuilt as a travelling wave for exactly that reason. The wave enters at the
 * outer end and travels inward over this fraction of the arm, so each point
 * peels off the curve and onto the line in turn, and the core end goes last.
 *
 * Wide, because a narrow wave leaves the untouched part of the coil sitting
 * across the part already straightened and the arm crosses itself. At 0.42
 * the mid-unroll frames were a closed loop; at 0.9 the whole arm relaxes
 * together and the residual coil shrinks rather than knotting.
 */
export const SPIRAL_UNROLL_BAND = 0.9;

/**
 * The spiral arm the orb winds out while it spins, and then lays down as the
 * line the border is drawn from.
 *
 * An Archimedean curve -- radius growing in step with the angle -- sampled as
 * a polyline, so it is a single animated `d` rather than a stack of elements.
 * `grow` scales the whole arm from nothing to its full reach, which means the
 * arm is a point at zero and cannot be seen at rest. `straighten` then drives
 * the travelling wave that pulls it flat.
 *
 * It carries a curve of its own -- the smoothstep in the wave -- so whatever
 * drives `straighten` has to be linear, the same rule as `splashPath`.
 *
 * The arm becomes the line rather than being swapped for one. A previous
 * attempt at this was reverted (b639885) for three reasons: two animations on
 * one shared value, a straighten that crumpled, and illegibility at small
 * scale. The first is now unrepresentable, the second is what the travelling
 * wave fixes, and the third is what `SPIRAL_RADIUS` is tested against.
 */
/**
 * Everything about the arm that does not depend on the animation, worked out
 * once at module load.
 *
 * The angle of each sample and its distance along the arm follow from
 * SPIRAL_TURNS and SPIRAL_STEPS alone, so recomputing them per frame bought
 * nothing and cost a great deal: a sine, a cosine, a square root and a
 * logarithm for every one of 57 points, plus a closure allocated per point,
 * sixty times a second. What is left in the frame is multiply and add.
 *
 * The distance term is the arc length of an Archimedean spiral in closed
 * form. The inner turns are short and the outer ones long, which is why the
 * arm has to be laid onto the line by length rather than by the parameter
 * that draws it -- by parameter, the point at the very centre was aimed at
 * the far end of the line and dragged sideways across the coil.
 */
const SPIRAL_TABLE = (() => {
  const sweep = SPIRAL_TURNS * 2 * Math.PI;
  const arcAt = (u: number) => {
    const bu = sweep * u;
    const root = Math.sqrt(1 + bu * bu);

    return (u * root) / 2 + Math.log(bu + root) / (2 * sweep);
  };
  const total = arcAt(1);

  const at: number[] = [];
  const cos: number[] = [];
  const sin: number[] = [];
  const arc: number[] = [];

  for (let i = 0; i <= SPIRAL_STEPS; i++) {
    const u = i / SPIRAL_STEPS;

    at.push(u);
    cos.push(Math.cos(u * sweep));
    sin.push(Math.sin(u * sweep));
    arc.push(arcAt(u) / total);
  }

  return { at, cos, sin, arc };
})();

/**
 * Rounds to a tenth of a point for a path string.
 *
 * `toFixed` formats through a far heavier path than this and was called twice
 * per sample, 57 samples a frame. A tenth of a point is finer than anything
 * here is drawn -- the arm lives in a box sixty points across -- and shorter
 * numbers mean less string for the renderer to parse back into a path on
 * every frame.
 */
function coord(value: number): number {
  'worklet';
  return Math.round(value * 10) / 10;
}

export function spiralArmPath(
  centre: number,
  radius: number,
  grow: number,
  straighten: number,
  lineHalf: number
): string {
  'worklet';
  const g = grow <= 0 ? 0 : grow >= 1 ? 1 : grow;
  const s = straighten <= 0 ? 0 : straighten >= 1 ? 1 : straighten;

  if (g <= 0 && s <= 0) {
    return '';
  }

  // the wave has to clear the whole arm, so it travels a band further than
  // the length it is crossing
  const front = s * (1 + SPIRAL_UNROLL_BAND);
  const length = lineHalf * 2;
  const shift = lineHalf * s;

  let d = '';

  for (let i = 0; i <= SPIRAL_STEPS; i++) {
    const f = SPIRAL_TABLE.at[i];
    const r = radius * g * f;

    const spiralX = centre + r * SPIRAL_TABLE.cos[i];
    const spiralY = centre + r * SPIRAL_TABLE.sin[i];

    // The line it lays itself down as, anchored where the core already is and
    // running out from there by length along the arm. The core end therefore
    // barely moves and the arm unwinds off it, which is what an unrolling
    // coil does -- aiming the core at a point half a line away is what made
    // it loop instead.
    const lineX = centre + length * SPIRAL_TABLE.arc[i];

    // how far this point in particular has been pulled straight: the outer
    // end (f = 1) goes first, the core (f = 0) last
    const raw = (front - (1 - f)) / SPIRAL_UNROLL_BAND;
    const clamped = raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
    // smoothstep, so a point eases off the curve and onto the line rather
    // than setting off and stopping abruptly
    const t = clamped * clamped * (3 - 2 * clamped);

    // the finished line runs from the core rightward, so the whole arm slides
    // back by half its length as it straightens and ends up centred on the
    // point the border is drawn from
    const x = spiralX + (lineX - spiralX) * t - shift;
    const y = spiralY + (centre - spiralY) * t;

    d += `${i === 0 ? 'M' : 'L'} ${coord(x)} ${coord(y)} `;
  }

  return d.trim();
}

/** Droplets thrown up by the returning drop as it lands. */
export const SPLASH_DROPLETS = 7;

/**
 * The splash, as one path of small circles.
 *
 * The droplets fan across the upward half, fly out along that fan, and are
 * pulled back down by a gravity term that grows with the square of the
 * progress -- so they arc rather than sliding outward in a straight line.
 * They shrink as they go, and the caller fades the whole path out.
 *
 * One path rather than seven elements: it is a single animated `d` on the
 * UI thread, where seven circles would be seven animated props.
 */
const SPLASH_TABLE = (() => {
  const cos: number[] = [];
  const sin: number[] = [];

  for (let i = 0; i < SPLASH_DROPLETS; i++) {
    const t = i / (SPLASH_DROPLETS - 1);
    // the upward half in screen coordinates, nudged unevenly so the splash
    // does not read as a clock face
    const angle = Math.PI + t * Math.PI + ((i % 3) - 1) * 0.11;

    cos.push(Math.cos(angle));
    sin.push(Math.sin(angle));
  }

  return { cos, sin };
})();

export function splashPath(
  progress: number,
  centre: number,
  spread: number,
  gravity: number,
  radius: number
): string {
  'worklet';
  // ease out, so the droplets leave fast and slow as they rise
  const out = spread * (1 - (1 - progress) * (1 - progress));
  // every droplet shares a radius, so it is worked out once rather than seven
  // times, and once it is sub-pixel there is no path left to build at all
  const r = radius * (1 - progress * 0.7);

  if (r <= 0.2) {
    return '';
  }

  const fall = gravity * progress * progress;
  const rr = coord(r);
  const across = coord(r * 2);
  let d = '';

  for (let i = 0; i < SPLASH_DROPLETS; i++) {
    const x = centre + SPLASH_TABLE.cos[i] * out;
    const y = centre + SPLASH_TABLE.sin[i] * out + fall;

    // a circle as two arcs, so every droplet is one subpath
    d +=
      `M ${coord(x - r)} ${coord(y)} ` +
      `a ${rr} ${rr} 0 1 0 ${across} 0 ` +
      `a ${rr} ${rr} 0 1 0 ${-across} 0 `;
  }

  return d.trim();
}

// the splash needs far more room than the orb: its droplets fly well clear
// of the drop that threw them
export const SPLASH_BOX = 150;
export const SPLASH_SPREAD = 44;
export const SPLASH_GRAVITY = 52;
export const SPLASH_DROP_RADIUS = 4.5;

// The splash lives in the tree the whole time, so its opacity has to be
// zero at rest as well as at the end. Fading only on the way out left its
// droplets stacked on the ring at full strength whenever nothing was
// happening -- a blue dot sitting in the orb's place through the entire
// open, and through the home screen besides.
export function splashOpacity(progress: number): number {
  'worklet';
  const u = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;

  return Math.min(1, u * 10) * (1 - u * u);
}

/**
 * The ring of impact: spreads from where the drop hit, thinning as it goes.
 *
 * It is born at roughly the drop's own width rather than at a point. A ring
 * starting from nothing where a whole drop had just been is a visible jump,
 * which is the same defect as a thing appearing at full size, run backwards.
 */
export const SPLASH_RING_BIRTH = 15;
export const SPLASH_RING_SPREAD = 38;

export function splashRing(progress: number): {
  r: number;
  opacity: number;
  strokeWidth: number;
} {
  'worklet';
  const u = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;

  return {
    r: SPLASH_RING_BIRTH + SPLASH_RING_SPREAD * u,
    opacity: Math.min(1, u * 10) * 0.85 * (1 - u),
    strokeWidth: 3 * (1 - u) + 0.4,
  };
}

export function dropHandoverScale(opacity: number): number {
  'worklet';
  const u = opacity <= 0 ? 0 : opacity >= 1 ? 1 : opacity;

  return 0.6 + 0.4 * u;
}

/**
 * The falling drop, drawn as a real teardrop rather than a shrunken panel:
 * a point at the top flaring into a circular base, the classic water-drop
 * silhouette. In a 100x140 box: tip at (50,0), base a circle of radius 40
 * centred at (50,95). The gloss is the small highlight crescent that makes
 * it read as water.
 */
export const DROP_PATH =
  'M 50 0 C 50 0 10 60 10 95 A 40 40 0 1 0 90 95 C 90 60 50 0 50 0 Z';
export const DROP_GLOSS =
  'M 30 92 C 27 110 38 122 50 125 C 36 128 22 114 25 94 Z';
export const DROP_VIEWBOX = '0 0 100 140';

export function screenTimeProgress(usageSeconds: number, limitSeconds: number): number {
  if (limitSeconds <= 0 || usageSeconds <= 0) {
    return 0;
  }

  return Math.min(usageSeconds / limitSeconds, 1);
}

export function isScreenTimeExceeded(usageSeconds: number, limitSeconds: number): boolean {
  return limitSeconds > 0 && usageSeconds >= limitSeconds;
}

export function ringDashOffset(progress: number, circumference: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1);

  return circumference * (1 - clamped);
}

/**
 * Where the ring sits on screen.
 *
 * Centred along the bottom edge, so its centre follows from the screen and
 * the safe-area inset -- no runtime measurement, and the glance can open
 * from the right place on first render. The glance's whole choreography is
 * anchored here: the orb rises at this point and the closing drop falls
 * back to it, so this and `screenTimeCorner` have to agree.
 */
export function ringCentre(
  screenWidth: number,
  screenHeight: number,
  insetBottom: number
): { x: number; y: number } {
  const half = SCREEN_TIME_RING.size / 2;

  return {
    x: screenWidth / 2,
    y: screenHeight - insetBottom - SCREEN_TIME_RING.marginBottom - half,
  };
}

/**
 * The rounded-rect path the open animation draws the panel's border along,
 * and its length -- the drawing is a dash-offset sweep, so the length is what
 * the dash pattern is built from.
 *
 * Starts on the bottom edge at its centre -- directly below the ring the
 * glance opens from -- and runs clockwise: left along the bottom, up the left
 * edge, right along the top, down the right, and back along the bottom to
 * where it began. The bottom edge is therefore drawn in two runs, the first
 * and the last.
 */
export function panelBorderPath(bounds: {
  left: number;
  top: number;
  right: number;
  bottom: number;
  radius: number;
}): { d: string; length: number } {
  const { left: l, top: t, right: r, bottom: b, radius: rad } = bounds;

  const cx = (l + r) / 2;

  const d = [
    `M ${cx} ${b}`,
    `L ${l + rad} ${b}`,
    `A ${rad} ${rad} 0 0 1 ${l} ${b - rad}`,
    `L ${l} ${t + rad}`,
    `A ${rad} ${rad} 0 0 1 ${l + rad} ${t}`,
    `L ${r - rad} ${t}`,
    `A ${rad} ${rad} 0 0 1 ${r} ${t + rad}`,
    `L ${r} ${b - rad}`,
    `A ${rad} ${rad} 0 0 1 ${r - rad} ${b}`,
    `L ${cx} ${b}`,
  ].join(' ');

  const length =
    2 * (r - l - 2 * rad) + 2 * (b - t - 2 * rad) + 2 * Math.PI * rad;

  return { d, length };
}
