import { ISLAND_ART, type ArtFrame, type IslandArt } from '@/constants/island-art';
import type { SunFrame } from '@/constants/home-sky';

export const ISLAND_SUN = {
  faceShare: 0.76,
  shortSideShare: 0.5,
  topGap: 4,
} as const;

export const ISLAND_SKY = '#0B55D4';

export const ISLAND_NIGHT = {
  tint: '#0B164A',
  strength: 0.58,
} as const;

export interface IslandScreen {
  width: number;
  height: number;
  topInset: number;
}

export interface IslandFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface IslandLayout {
  scale: number;
  picture: IslandFrame;
  band: IslandFrame;
  sun: SunFrame;
  clipHeight: number;
  riseFrom: number;
}

const NOTHING: IslandFrame = { left: 0, top: 0, width: 0, height: 0 };

function measured(length: number): boolean {
  return Number.isFinite(length) && length > 0;
}

export type IslandArtShape = Pick<IslandArt, 'width' | 'height' | 'bandTop' | 'bandBottom' | 'seaLine' | 'sunX' | 'faceFloor'>;

export function islandLayout(screen: IslandScreen, art: IslandArtShape = ISLAND_ART): IslandLayout {
  if (!measured(screen.width) || !measured(screen.height)) {
    return {
      scale: 0,
      picture: NOTHING,
      band: NOTHING,
      sun: { centreX: 0, centreY: 0, top: 0, size: 0 },
      clipHeight: 0,
      riseFrom: 0,
    };
  }

  const topInset = Number.isFinite(screen.topInset) ? Math.max(0, screen.topInset) : 0;
  const scale = Math.max(screen.width / art.width, screen.height / art.height);
  const width = art.width * scale;
  const height = art.height * scale;
  const sunCentred = screen.width / 2 - art.sunX * scale;
  const left = Math.min(0, Math.max(screen.width - width, sunCentred));

  const picture: IslandFrame = { left, top: 0, width, height };
  const band: IslandFrame = {
    left,
    top: art.bandTop * scale,
    width,
    height: (art.bandBottom - art.bandTop) * scale,
  };

  const floor = art.faceFloor * scale;
  const roomAbove = (floor - topInset - ISLAND_SUN.topGap) / ISLAND_SUN.faceShare;
  const size = Math.max(
    0,
    Math.floor(
      Math.min(roomAbove, Math.min(screen.width, screen.height) * ISLAND_SUN.shortSideShare)
    )
  );
  const top = floor - size * ISLAND_SUN.faceShare;
  const clipHeight = art.seaLine * scale;

  return {
    scale,
    picture,
    band,
    sun: { centreX: left + art.sunX * scale, centreY: top + size / 2, top, size },
    clipHeight,
    riseFrom: clipHeight - top,
  };
}

export function artFrame(frame: ArtFrame, layout: IslandLayout): IslandFrame {
  return {
    left: layout.picture.left + frame.x * layout.scale,
    top: layout.picture.top + frame.y * layout.scale,
    width: frame.width * layout.scale,
    height: frame.height * layout.scale,
  };
}

export function artPoint(x: number, y: number, layout: IslandLayout): { x: number; y: number } {
  return { x: layout.picture.left + x * layout.scale, y: layout.picture.top + y * layout.scale };
}
