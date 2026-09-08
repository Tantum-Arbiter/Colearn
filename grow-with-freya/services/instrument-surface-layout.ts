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

  const layout = layoutInstrumentSurface(artwork, noteLayout, { ...region, height: Math.max(1, Math.min(...limits)) }, options.maxButtonSize);
  if (!layout) return null;

  const surfaceTop = middle - rowY * layout.height;
  const buttonsBottom = surfaceTop + Math.max(...Object.values(layout.positions).map(position => position.top)) + layout.buttonSize;
  const centredBelow = buttonsBottom + (region.height - buttonsBottom - options.lowerBlockHeight) / 2;
  const lowerBlockTop = Math.min(
    Math.max(centredBelow, buttonsBottom + options.buttonGap),
    Math.max(0, region.height - options.lowerBlockHeight),
  );
  return { layout, surfaceTop, lowerBlockTop };
}
