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
 * The glance that opens out of the ring.
 *
 * The choreography keeps the ring's identity without flooding the screen in
 * its colour: a spinning echo of the ring rises where it was pressed, travels
 * to the panel's corner and draws the border, and only then does the fill
 * arrive -- so the alarm colour stays inside the frame it drew. The fill
 * settles a long way darker than the ring itself: full-strength alarm red
 * behind a whole screen of text is neither readable nor the calm register
 * the rest of the app keeps to. Closing runs the argument in reverse: the
 * panel gathers into a drop and falls away.
 */
export const SCREEN_TIME_GLANCE = {
  fadeDuration: 200,
  exceededSurface: '#2A0A0C',
  calmSurface: '#080A28',

  /** Everything outside the panel: dim night, never the alarm colour. */
  scrim: 'rgba(4, 6, 18, 0.94)',

  // the open choreography, in order: spin, travel, morph into a line, draw
  // the border, then settle -- the blackout and the fill arriving together.
  // The spin is long enough to actually read as a spinning circle: at 360ms
  // two turns were a blur, and the phase looked like a flicker before the
  // draw rather than a moment of its own.
  spinDuration: 620,
  travelDuration: 220,
  morphDuration: 140,
  drawDuration: 480,
  settleDuration: 260,

  // the spinner that echoes the ring while it travels
  spinnerRadius: 15,
  spinnerStroke: 3,

  /** Stroke the choreography works in. The orb rises in the ring's own
   *  colour, turns water-blue as it spins, and the border is drawn in that
   *  blue -- the box only takes the alarm red when the fill settles in and
   *  the panel's own border fades up underneath the drawn stroke. The calm
   *  final border is a faint hairline -- too faint to watch being drawn --
   *  which is the other reason the drawing stroke is a colour of its own. */
  exceededDraw: '#E4483F',
  calmDraw: 'rgba(198, 219, 250, 0.85)',
  drawWater: '#4FA8E0',

  // the close: the panel gathers, becomes a true teardrop, and falls
  dropShrink: 300,
  dropFall: 430,
  dropWidth: 38,
  dropHeight: 52,

  /**
   * The framed panel the reveal settles into.
   *
   * The circle still opens full-bleed in the ring's colour; the panel is the
   * outlined card that lands inside it, so the surrounding colour reads as a
   * frame rather than as the page. The border carries the alarm at full
   * strength precisely because it is a hairline -- a whole screen of #E4483F
   * is neither readable nor calm, but two pixels of it are unmistakable.
   */
  panelInset: 14,
  panelRadius: 28,
  panelBorderWidth: 2,
  exceededBorder: '#E4483F',
  calmBorder: 'rgba(255, 255, 255, 0.14)',
  exceededGlow: 'rgba(228, 72, 63, 0.55)',
  calmGlow: 'rgba(0, 0, 0, 0.45)',
} as const;

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
