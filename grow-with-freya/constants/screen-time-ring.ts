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
 * It borrows the ring's own colour so the window reads as the thing the
 * parent just pressed growing into a page, rather than an unrelated sheet
 * arriving over the top of it. The surface settles a long way darker than
 * the ring itself: full-strength alarm red behind a whole screen of text is
 * neither readable nor the calm register the rest of the app keeps to.
 */
export const SCREEN_TIME_GLANCE = {
  revealDuration: 340,
  fadeDuration: 200,
  exceededSurface: '#2A0A0C',
  exceededReveal: '#E4483F',
  calmSurface: '#080A28',
  calmReveal: '#141A3C',
} as const;

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
 * How wide the reveal circle has to grow to cover the screen from `origin`.
 *
 * Twice the distance to the furthest corner: anything less and the expanding
 * circle stops short, leaving a wedge of the page behind it uncovered.
 */
export function revealDiameter(
  origin: { x: number; y: number },
  width: number,
  height: number
): number {
  const dx = Math.max(origin.x, width - origin.x);
  const dy = Math.max(origin.y, height - origin.y);

  return 2 * Math.hypot(dx, dy);
}
