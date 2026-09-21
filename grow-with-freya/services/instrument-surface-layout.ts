import type { InstrumentArtwork, NoteLayoutItem } from '@/services/music-asset-registry';

export interface SurfaceBox {
  width: number;
  height: number;
  reserveRight?: number;
}

export interface HoleButtonPosition {
  left: number;
  top: number;
}

export interface BellPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
}

export interface InstrumentSurfaceLayout {
  /** Offset that centres the artwork in the space left of the reserved strip. */
  left: number;
  width: number;
  height: number;
  buttonSize: number;
  positions: Record<string, HoleButtonPosition>;
  bell?: BellPlacement;
}

const MIN_TOUCH_TARGET = 44;
const MIN_BUTTON_SIZE = 24;
const BUTTON_TO_HOLE_RATIO = 1.5;
const NEIGHBOUR_GAP = 4;

type SurfaceArtwork = Pick<InstrumentArtwork, 'aspectRatio' | 'holeDiameter' | 'bell'>;

function bellGrowth(artwork: SurfaceArtwork): { x: number; y: number } {
  const bell = artwork.bell;
  if (!bell) return { x: 0, y: 0 };
  const reachRight = bell.frame.x + bell.frame.width - bell.origin.x;
  const reachY = Math.max(bell.origin.y - bell.frame.y, bell.frame.y + bell.frame.height - bell.origin.y);
  return { x: reachRight * (bell.scale.x - 1), y: reachY * (bell.scale.y - 1) };
}

export function layoutInstrumentSurface(
  artwork: SurfaceArtwork,
  noteLayout: NoteLayoutItem[],
  box: SurfaceBox,
  maxButtonSize: number,
): InstrumentSurfaceLayout | null {
  if (box.width <= 0 || box.height <= 0) return null;

  const growth = bellGrowth(artwork);
  const usableWidth = (box.width - (box.reserveRight ?? 0)) / (1 + growth.x);
  const usableHeight = box.height / (1 + 2 * growth.y);
  const width = Math.min(usableWidth, usableHeight * artwork.aspectRatio);
  const height = width / artwork.aspectRatio;

  const withHoles = noteLayout.filter(item => item.hole);
  const holePx = artwork.holeDiameter * width;
  const xs = withHoles.map(item => item.hole!.x * width).sort((a, b) => a - b);
  const minSpacing = xs.length > 1
    ? Math.min(...xs.slice(1).map((x, i) => x - xs[i]))
    : Number.POSITIVE_INFINITY;

  const preferred = Math.min(Math.max(MIN_TOUCH_TARGET, holePx * BUTTON_TO_HOLE_RATIO), maxButtonSize);
  const buttonSize = Math.max(Math.min(preferred, minSpacing - NEIGHBOUR_GAP), MIN_BUTTON_SIZE);

  const positions: Record<string, HoleButtonPosition> = {};
  for (const item of withHoles) {
    positions[item.note] = {
      left: item.hole!.x * width - buttonSize / 2,
      top: item.hole!.y * height - buttonSize / 2,
    };
  }

  const bell = artwork.bell
    ? {
        left: artwork.bell.frame.x * width,
        top: artwork.bell.frame.y * height,
        width: artwork.bell.frame.width * width,
        height: artwork.bell.frame.height * height,
        originX: (artwork.bell.origin.x - artwork.bell.frame.x) * width,
        originY: (artwork.bell.origin.y - artwork.bell.frame.y) * height,
      }
    : undefined;

  // A squat instrument is limited by the region's height, so it comes out far
  // narrower than the space available and would sit against the left edge.
  const available = box.width - (box.reserveRight ?? 0);
  const left = Math.max((available - width * (1 + growth.x)) / 2, 0);

  return { left, width, height, buttonSize, positions, bell };
}

export interface StageOptions {
  maxButtonSize: number;
  lowerBlockHeight: number;
  topMargin: number;
  buttonGap: number;
}

export interface InstrumentStage {
  layout: InstrumentSurfaceLayout;
  surfaceTop: number;
  lowerBlockTop: number;
}

/**
 * The widest the artwork may be drawn while every hole keeps a button's worth of
 * screen around it.
 *
 * An instrument far wider than it is tall is drawn to the screen's width, which
 * on a screen held upright leaves it a thin band with its buttons at the
 * smallest a finger can be asked to hit. Letting the art bleed further off both
 * edges grows the holes, and the buttons on them, with it. The outermost hole is
 * what sets the limit -- past it a button would be half off the screen.
 */
export function holeFitWidth(
  noteLayout: NoteLayoutItem[],
  available: number,
  margin: number,
): number {
  const xs = noteLayout.filter(item => item.hole).map(item => item.hole!.x);
  if (xs.length === 0) return available;
  const reach = Math.max(0.5 - Math.min(...xs), Math.max(...xs) - 0.5);
  if (reach <= 0) return available;
  return Math.max(available, (available / 2 - margin) / reach);
}

export function layoutInstrumentStage(
  artwork: SurfaceArtwork,
  noteLayout: NoteLayoutItem[],
  region: SurfaceBox,
  options: StageOptions,
): InstrumentStage | null {
  if (region.width <= 0 || region.height <= 0) return null;
  const holeYs = noteLayout.filter(item => item.hole).map(item => item.hole!.y);
  if (holeYs.length === 0) return null;

  const rowY = holeYs.reduce((sum, y) => sum + y, 0) / holeYs.length;
  const lowestHoleY = Math.max(...holeYs);
  const middle = region.height / 2;
  const halfButton = options.maxButtonSize / 2;

  const limits = [region.height, (middle - options.topMargin) / rowY];
  const roomBelow = region.height - middle - halfButton - options.buttonGap - options.lowerBlockHeight;
  if (lowestHoleY > rowY) {
    limits.push(Math.max(0, roomBelow) / (lowestHoleY - rowY));
  }

  const reserveRight = region.reserveRight ?? 0;
  const available = region.width - reserveRight;
  const surfaceWidth = region.height > region.width
    ? holeFitWidth(noteLayout, available, options.maxButtonSize)
    : available;

  const drawn = layoutInstrumentSurface(
    artwork,
    noteLayout,
    { ...region, width: surfaceWidth + reserveRight, height: Math.max(1, Math.min(...limits)) },
    options.maxButtonSize,
  );
  if (!drawn) return null;

  // Drawn to a width wider than the screen, the art is centred on that width;
  // bringing it back by half the difference centres it on the screen instead.
  const bleed = (surfaceWidth - available) / 2;
  const layout = bleed > 0 ? { ...drawn, left: drawn.left - bleed } : drawn;

  const surfaceTop = middle - rowY * layout.height;
  const buttonsBottom = surfaceTop + Math.max(...Object.values(layout.positions).map(position => position.top)) + layout.buttonSize;
  const centredBelow = buttonsBottom + (region.height - buttonsBottom - options.lowerBlockHeight) / 2;
  const lowerBlockTop = Math.min(
    Math.max(centredBelow, buttonsBottom + options.buttonGap),
    Math.max(0, region.height - options.lowerBlockHeight),
  );
  return { layout, surfaceTop, lowerBlockTop };
}

/**
 * Whether a measured region is drawn the phone way -- wider than it is tall, so
 * turning the device upright brings the instrument round to point at the floor.
 * A tablet held upright leaves it lying across the screen instead, and nothing
 * should turn.
 */
export function regionTurnsForBlow(region: { width: number; height: number }): boolean {
  return region.width > region.height;
}

/**
 * How far to slide a mirrored instrument.
 *
 * The body art is drawn with one end cut flat, to bleed off the edge of the
 * screen; the other end is finished. Reflecting the art about the middle of the
 * surface swaps those ends over and keeps the bleed exactly as deep, so the cut
 * is still never visible. A centred instrument stays centred.
 */
export function flippedSurfaceShift(
  layout: Pick<InstrumentSurfaceLayout, 'left' | 'width'>,
  surfaceWidth: number,
): number {
  return surfaceWidth - 2 * layout.left - layout.width;
}

/**
 * Instrument pose for blow mode, driven by the same 0 -> -90 degree value as the
 * note letters. Blowing means holding the phone upright with the mouthpiece at
 * the bottom, over the microphone, so the whole instrument turns end for end --
 * passing edge-on halfway, which reads as the instrument being turned round.
 */
export function instrumentFlipTransform(shift: number, rotationDegrees: number): { translateX: number; scaleX: number } {
  'worklet';
  // The driving value only ever runs 0 -> -90, and abs keeps a resting pose off
  // negative zero.
  const turned = Math.abs(rotationDegrees) / 90;
  return { translateX: shift * turned, scaleX: 1 - 2 * turned };
}

/**
 * Note letter pose. The letters sit inside the mirrored instrument, so they
 * carry the mirror again to come out the right way round -- and a rotation
 * inside a mirror comes out reversed, so the sign goes with it.
 */
export function noteLabelTransform(rotationDegrees: number): { rotate: string; scaleX: number } {
  'worklet';
  const scaleX = 1 + rotationDegrees / 45;
  return { rotate: `${rotationDegrees * scaleX}deg`, scaleX };
}
