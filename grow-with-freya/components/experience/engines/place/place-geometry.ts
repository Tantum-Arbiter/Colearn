import type { Frame, ZonePlace } from '@/types/game-pack';

export const SNAP_RADIUS = 24;

export interface ArtFit {
  scale: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ScreenFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ArtShape {
  width: number;
  height: number;
}

export interface ScreenShape {
  width: number;
  height: number;
  insets: { top: number; bottom: number; left: number; right: number };
}

const NOTHING: ArtFit = { scale: 0, left: 0, top: 0, width: 0, height: 0 };

function measured(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function fitArt(art: ArtShape, screen: ScreenShape): ArtFit {
  if (!measured(screen.width) || !measured(screen.height)) return NOTHING;
  const roomWidth = screen.width - screen.insets.left - screen.insets.right;
  const roomHeight = screen.height - screen.insets.top - screen.insets.bottom;
  if (!measured(roomWidth) || !measured(roomHeight)) return NOTHING;
  const scale = Math.min(roomWidth / art.width, roomHeight / art.height);
  const width = art.width * scale;
  const height = art.height * scale;

  return {
    scale,
    left: screen.insets.left + (roomWidth - width) / 2,
    top: screen.insets.top + (roomHeight - height) / 2,
    width,
    height,
  };
}

export function toScreen(frame: Frame, fit: ArtFit): ScreenFrame {
  'worklet';
  return {
    left: fit.left + frame.x * fit.scale,
    top: fit.top + frame.y * fit.scale,
    width: frame.w * fit.scale,
    height: frame.h * fit.scale,
  };
}

function distanceOutside(point: { x: number; y: number }, frame: ScreenFrame): number {
  'worklet';
  const dx = Math.max(frame.left - point.x, 0, point.x - (frame.left + frame.width));
  const dy = Math.max(frame.top - point.y, 0, point.y - (frame.top + frame.height));

  return Math.sqrt(dx * dx + dy * dy);
}

export function zoneAt(point: { x: number; y: number }, zones: readonly ZonePlace[], fit: ArtFit): string | null {
  'worklet';
  let nearest: string | null = null;
  let best = SNAP_RADIUS;
  for (let index = 0; index < zones.length; index += 1) {
    const distance = distanceOutside(point, toScreen(zones[index].frame, fit));
    if (distance < best || (distance === best && nearest === null)) {
      best = distance;
      nearest = zones[index].id;
    }
  }

  return nearest;
}

export function slotIn(zone: Frame, item: Frame, index: number, count: number): Frame {
  const across = Math.max(count, 1);
  const cell = zone.w / across;
  const scale = Math.min(1, (cell * 0.92) / item.w, zone.h / item.h);
  const w = item.w * scale;
  const h = item.h * scale;
  const x = zone.x + cell * index + (cell - w) / 2;
  const y = zone.y + zone.h - h - (zone.h - h) * 0.15;

  return { x, y, w, h };
}
