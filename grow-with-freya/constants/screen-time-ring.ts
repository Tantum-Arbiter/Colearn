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

  // the open choreography, in order: spin, travel, morph into a line, draw
  // the border, then settle -- the blackout and the fill arriving together.
  // The spin is long enough to actually read as a spinning circle: at 360ms
  // two turns were a blur, and the phase looked like a flicker before the
  // draw rather than a moment of its own.
  spinDuration: 620,
  // the line has further to go now that it forms at the ring rather than at
  // the corner, and a longer glide is what keeps that read as one movement
  travelDuration: 340,
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
  let d = '';

  for (let i = 0; i < SPLASH_DROPLETS; i++) {
    const t = i / (SPLASH_DROPLETS - 1);
    // the upward half in screen coordinates, nudged unevenly so the splash
    // does not read as a clock face
    const angle = Math.PI + t * Math.PI + ((i % 3) - 1) * 0.11;

    const r = radius * (1 - progress * 0.7);
    if (r <= 0.2) continue;

    const x = centre + Math.cos(angle) * out;
    const y = centre + Math.sin(angle) * out + gravity * progress * progress;

    // a circle as two arcs, so every droplet is one subpath
    d +=
      `M ${(x - r).toFixed(2)} ${y.toFixed(2)} ` +
      `a ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(r * 2).toFixed(2)} 0 ` +
      `a ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-r * 2).toFixed(2)} 0 `;
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
