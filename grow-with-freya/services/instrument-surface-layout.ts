import type { InstrumentArtwork, NoteLayoutItem } from '@/services/music-asset-registry';

export interface SurfaceBox {
  width: number;
  height: number;
}

export interface HoleButtonPosition {
  left: number;
  top: number;
}

export interface InstrumentSurfaceLayout {
  width: number;
  height: number;
  buttonSize: number;
  positions: Record<string, HoleButtonPosition>;
}

const MIN_TOUCH_TARGET = 44;
const MIN_BUTTON_SIZE = 24;
const BUTTON_TO_HOLE_RATIO = 1.5;
const NEIGHBOUR_GAP = 4;

export function layoutInstrumentSurface(
  artwork: Pick<InstrumentArtwork, 'aspectRatio' | 'holeDiameter'>,
  noteLayout: NoteLayoutItem[],
  box: SurfaceBox,
  maxButtonSize: number,
): InstrumentSurfaceLayout | null {
  if (box.width <= 0 || box.height <= 0) return null;

  const width = Math.min(box.width, box.height * artwork.aspectRatio);
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

  return { width, height, buttonSize, positions };
}
