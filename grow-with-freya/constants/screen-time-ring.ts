export const SCREEN_TIME_RING = {
  size: 30,
  strokeWidth: 3,
  marginHorizontal: 18,
  marginBottom: 14,
  pulseScale: 1.22,
  pulseDuration: 620,
  trackOpacity: 0.18,
  arcOpacity: 0.55,
  exceededColour: '#E4483F',
  exceededHalo: 'rgba(228,72,63,0.30)',
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

  // the open choreography, in order: the orb spins, an arm unwinds out of
  // it as a real spiral, the spiral rotates into a flat line, the line
  // stretches, travels, draws the border, and the panel settles.
  //
  // Each of those is its own beat because each is a different shape. The
  // spiral genuinely unwinds (see spiralToLinePath) rather than being a
  // circle squashed flat while it turns -- that only ever read as a flat
  // thing spinning.
  spinDuration: 560,
  morphDuration: 480,
  straightenDuration: 360,
  glideDuration: 420,
  drawDuration: 480,
  settleDuration: 260,

  /** How long the finished arm is once it has landed on the border. The
   *  border's sweep starts from exactly this much already drawn, so the two
   *  are the same stroke at the moment of handover. */
  armLandLength: 96,
  /** How far the arm sweeps out from the ring while it is still a spiral. */
  armRadius: 34,
  /** Half the line's length while it is still at the ring. */
  armHalfAtRing: 26,

  // the spinner that echoes the ring while it travels
  spinnerRadius: 15,
  spinnerStroke: 3,

  /** Where the orb's colour turn starts: the ring's own colour, whichever
   *  state it is in. It ends at `drawWater` in both cases, so the border is
   *  always drawn -- and always settles -- in the water blue. */
  exceededDraw: '#E4483F',
  calmDraw: 'rgba(198, 219, 250, 0.85)',
  drawWater: WATER,

  // the close: the panel gathers, becomes a true teardrop, and falls
  dropShrink: 300,
  dropFall: 430,
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

/** How many turns the arm sweeps through as it unwinds out of the core. */
export const SPIRAL_TURNS = 2.5;
/** Points the arm is drawn from -- enough to read as a curve at this size. */
export const SPIRAL_STEPS = 56;
/**
 * How much of the curve is mid-unroll at any moment, as a fraction of its
 * length. The straighten travels along the arm as a wave rather than
 * applying to every point at once: a coil pulled straight releases from its
 * loose end inward, where a curve whose every point moves together just
 * crumples into the middle.
 */
export const SPIRAL_UNROLL_BAND = 0.42;

/**
 * The arm, somewhere between a spiral and a straight line.
 *
 * `grow` unwinds it: at 0 there is nothing at the core, at 1 the full
 * Archimedean spiral has swept out to `radius` over `SPIRAL_TURNS`.
 * `straighten` then pulls that spiral onto a vertical segment of
 * `2 * halfLength`, in the same order it was traced -- so the curve unwinds
 * into a line rather than being replaced by one.
 *
 * The straighten is a wave, not a switch. It starts at the loose outer end
 * and travels inward over `SPIRAL_UNROLL_BAND` of the arm's length, so the
 * coil peels onto the line the way a rolled thing pulled from one end does.
 * Straightening every point at the same time instead makes the whole curve
 * rush at its own centre and crumple.
 *
 * This is also the difference between a spiral and a flattened circle: a
 * squashed circle spinning is only ever a flat thing turning, where a real
 * spiral has a start at the centre and an end at the rim, and can unroll.
 *
 * Runs on the UI thread as an animated `d`, so it is a worklet -- and a
 * plain function of its inputs, so it is testable without a renderer.
 */
export interface Point {
  x: number;
  y: number;
}

export interface SpiralArmGeometry {
  /** Where the spiral lives while it unwinds: the ring's own centre. */
  centre: Point;
  /** How far the arm sweeps out from that centre. */
  radius: number;
  /** Half the line's length while it is still at the ring. */
  halfAtRing: number;
  /** The two ends of the line once it has glided onto the panel's border,
   *  in the same screen coordinates the border itself is drawn in. */
  landFrom: Point;
  landTo: Point;
}

/**
 * The arm: spiral, line, or anything between, in screen coordinates.
 *
 * Everything is one path in one space -- the same space the panel's border
 * is drawn in -- because the arm has to *become* the border's first stroke,
 * not be swapped for it. A separate element that travels and fades out over
 * the top of a second one can never line up exactly, and the join shows.
 *
 * `grow` unwinds the Archimedean spiral out of the core; `rotation` turns
 * it; `straighten` unrolls it onto a line as a wave from the loose outer end
 * inward (see SPIRAL_UNROLL_BAND); and `glide` carries that line from the
 * ring onto the border's own edge, extending it as it goes. At glide = 1 the
 * path IS the border's first `landFrom`-to-`landTo` stroke, so the border
 * can pick the sweep up from exactly there.
 */
export function spiralArmPath(
  geometry: SpiralArmGeometry,
  grow: number,
  rotation: number,
  straighten: number,
  glide: number
): string {
  'worklet';
  const { centre, radius, halfAtRing, landFrom, landTo } = geometry;

  const sweep = grow * SPIRAL_TURNS * 2 * Math.PI;
  // the wave has to clear the whole arm, so it travels a band further than
  // the length it is crossing
  const front = straighten * (1 + SPIRAL_UNROLL_BAND);

  // where the line lies right now: at the ring, on the border, or on its way
  const ringFromY = centre.y - halfAtRing;
  const ringToY = centre.y + halfAtRing;
  const fromX = centre.x + (landFrom.x - centre.x) * glide;
  const fromY = ringFromY + (landFrom.y - ringFromY) * glide;
  const toX = centre.x + (landTo.x - centre.x) * glide;
  const toY = ringToY + (landTo.y - ringToY) * glide;

  let d = '';

  for (let i = 0; i <= SPIRAL_STEPS; i++) {
    const f = i / SPIRAL_STEPS;
    const theta = f * sweep + rotation;
    const r = radius * grow * f;

    const spiralX = centre.x + r * Math.cos(theta);
    const spiralY = centre.y + r * Math.sin(theta);
    const lineX = fromX + (toX - fromX) * f;
    const lineY = fromY + (toY - fromY) * f;

    // how far this point in particular has been pulled straight: the outer
    // end (f = 1) goes first, the core (f = 0) last
    const raw = (front - (1 - f)) / SPIRAL_UNROLL_BAND;
    const clamped = raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
    // smoothstep, so a point eases off the curve and onto the line rather
    // than setting off and stopping abruptly
    const t = clamped * clamped * (3 - 2 * clamped);

    const x = spiralX + (lineX - spiralX) * t;
    const y = spiralY + (lineY - spiralY) * t;

    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }

  return d.trim();
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
 * It is pinned to the bottom-left corner by `screenTimeCorner`, so its centre
 * follows from the layout constants and the safe-area inset -- no runtime
 * measurement, and the glance can open from the right place on first render.
 */
export function ringCentre(
  screenHeight: number,
  insetBottom: number
): { x: number; y: number } {
  const half = SCREEN_TIME_RING.size / 2;

  return {
    x: SCREEN_TIME_RING.marginHorizontal + half,
    y: screenHeight - insetBottom - SCREEN_TIME_RING.marginBottom - half,
  };
}

/**
 * The rounded-rect path the open animation draws the panel's border along,
 * and its length -- the drawing is a dash-offset sweep, so the length is what
 * the dash pattern is built from.
 *
 * Starts at the left edge just above the bottom-left corner -- the nearest
 * point to the ring the spinner travels from -- and runs clockwise.
 */
export function panelBorderPath(bounds: {
  left: number;
  top: number;
  right: number;
  bottom: number;
  radius: number;
}): { d: string; length: number } {
  const { left: l, top: t, right: r, bottom: b, radius: rad } = bounds;

  const d = [
    `M ${l} ${b - rad}`,
    `L ${l} ${t + rad}`,
    `A ${rad} ${rad} 0 0 1 ${l + rad} ${t}`,
    `L ${r - rad} ${t}`,
    `A ${rad} ${rad} 0 0 1 ${r} ${t + rad}`,
    `L ${r} ${b - rad}`,
    `A ${rad} ${rad} 0 0 1 ${r - rad} ${b}`,
    `L ${l + rad} ${b}`,
    `A ${rad} ${rad} 0 0 1 ${l} ${b - rad}`,
  ].join(' ');

  const length =
    2 * (r - l - 2 * rad) + 2 * (b - t - 2 * rad) + 2 * Math.PI * rad;

  return { d, length };
}
