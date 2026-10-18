import type { ImageSourcePropType } from 'react-native';
import type { MotionBeat } from '@/constants/child-ui-motion';

export const ROADMAP = {
  margin: 8,
  shrinkStep: 0.99,
  smallest: 0.05,
  ink: '#FFF6E3',
  glow: 'rgba(255, 205, 120, 0.75)',
  glowRadius: 6,
  minimumFontScale: 0.6,
  homePillSpan: 2,
  fade: {
    mapIn: { duration: 420, reducedDuration: 200 },
    titleDelay: { duration: 260, reducedDuration: 0 },
    titleIn: { duration: 520, reducedDuration: 200 },
    out: { duration: 300, reducedDuration: 150 },
  } satisfies Record<string, MotionBeat>,
  titleGlow: 'rgba(255, 205, 120, 0.9)',
  titleGlowRadius: 10,
  titleShade: 'rgba(8, 14, 40, 0.85)',
  titleShadeRadius: 8,
  playAgain: {
    phone: { fontSize: 15, iconSize: 20, padding: 16 },
    tablet: { fontSize: 18, iconSize: 22, padding: 20 },
  },
  hairline: 0.5,
} as const;

export interface ArtRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type RoadmapStopId = 'japanNewZealand' | 'franceItaly' | 'lapland';

export interface RoadmapStop {
  id: RoadmapStopId;
  quarter: 2 | 3 | 4;
  year: number;
  label: ArtRect;
  nameSize: number;
}

export interface RoadmapArt {
  id: 'phone' | 'tablet';
  picture: ImageSourcePropType;
  width: number;
  height: number;
  sky: string;
  vortex: ArtRect;
  roadmap: ArtRect;
  title: ArtRect;
  titleSize: number;
  stops: readonly RoadmapStop[];
}

export interface RoadmapFrame {
  width: number;
  height: number;
  insets: { top: number; bottom: number; left: number; right: number };
  controls: readonly ScreenRect[];
}

export interface RoadmapLayout {
  scale: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RoadmapStopFrame extends ScreenRect {
  fontSize: number;
}

export type RoadmapMirrorKey = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface RoadmapMirror extends ScreenRect {
  key: RoadmapMirrorKey;
  flipX: boolean;
  flipY: boolean;
}

function stops(labels: readonly [ArtRect, ArtRect, ArtRect], nameSize: number): readonly RoadmapStop[] {
  return [
    { id: 'japanNewZealand', quarter: 2, year: 2027, label: labels[0], nameSize },
    { id: 'franceItaly', quarter: 3, year: 2027, label: labels[1], nameSize },
    { id: 'lapland', quarter: 4, year: 2027, label: labels[2], nameSize },
  ];
}

export const ROADMAP_ART: Record<RoadmapArt['id'], RoadmapArt> = {
  phone: {
    id: 'phone',
    picture: require('@/assets/images/roadmap/roadmap-phone.webp'),
    width: 941,
    height: 1672,
    sky: '#062468',
    vortex: { x: 95, y: 258, width: 755, height: 692 },
    roadmap: { x: 56, y: 1183, width: 846, height: 312 },
    title: { x: 129, y: 1098, width: 700, height: 70 },
    titleSize: 50,
    stops: stops(
      [
        { x: 70, y: 1416, width: 206, height: 58 },
        { x: 370, y: 1416, width: 202, height: 58 },
        { x: 669, y: 1416, width: 205, height: 58 },
      ],
      23
    ),
  },
  tablet: {
    id: 'tablet',
    picture: require('@/assets/images/roadmap/roadmap-tablet.webp'),
    width: 1448,
    height: 1086,
    sky: '#0F2060',
    vortex: { x: 355, y: 12, width: 760, height: 628 },
    roadmap: { x: 205, y: 742, width: 1035, height: 263 },
    title: { x: 373, y: 692, width: 700, height: 48 },
    titleSize: 40,
    stops: stops(
      [
        { x: 287, y: 938, width: 198, height: 54 },
        { x: 626, y: 938, width: 196, height: 54 },
        { x: 962, y: 938, width: 198, height: 54 },
      ],
      23
    ),
  },
};

const NOTHING: RoadmapLayout = { scale: 0, left: 0, top: 0, width: 0, height: 0 };

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

export function roadmapArtFor(width: number, height: number): RoadmapArt {
  const shape = height > 0 ? width / height : 1;
  const distance = (art: RoadmapArt) => Math.abs(Math.log(shape / (art.width / art.height)));

  return distance(ROADMAP_ART.tablet) < distance(ROADMAP_ART.phone) ? ROADMAP_ART.tablet : ROADMAP_ART.phone;
}

function floorUnder(controls: readonly ScreenRect[], from: number, to: number, safeTop: number): number {
  return controls
    .filter((control) => control.left - ROADMAP.margin < to && from < control.left + control.width + ROADMAP.margin)
    .reduce((floor, control) => Math.max(floor, control.top + control.height + ROADMAP.margin), safeTop);
}

function placement(art: RoadmapArt, frame: RoadmapFrame, scale: number): { left: number; top: number } | null {
  const { width, height, insets, controls } = frame;
  const safeLeft = insets.left + ROADMAP.margin;
  const safeRight = width - insets.right - ROADMAP.margin;
  const safeTop = insets.top + ROADMAP.margin;
  const safeBottom = height - insets.bottom - ROADMAP.margin;
  const { vortex, roadmap } = art;
  const keepLeft = Math.min(vortex.x, roadmap.x);
  const keepRight = Math.max(vortex.x + vortex.width, roadmap.x + roadmap.width);
  const artWidth = art.width * scale;
  const artHeight = art.height * scale;

  const leftLow = safeLeft - keepLeft * scale;
  const leftHigh = safeRight - keepRight * scale;
  if (leftLow > leftHigh) return null;
  const centred =
    artWidth >= width ? clamp((width - (keepLeft + keepRight) * scale) / 2, width - artWidth, 0) : (width - artWidth) / 2;
  const left = clamp(centred, leftLow, leftHigh);

  const vortexFloor = floorUnder(controls, left + vortex.x * scale, left + (vortex.x + vortex.width) * scale, safeTop);
  const roadmapFloor = floorUnder(controls, left + roadmap.x * scale, left + (roadmap.x + roadmap.width) * scale, safeTop);
  const topLow = Math.max(vortexFloor - vortex.y * scale, roadmapFloor - roadmap.y * scale);
  const topHigh = Math.min(
    safeBottom - (vortex.y + vortex.height) * scale,
    safeBottom - (roadmap.y + roadmap.height) * scale
  );
  if (topLow > topHigh) return null;
  const standing = artHeight >= height ? clamp((topLow + topHigh) / 2, height - artHeight, 0) : height - artHeight;

  return { left, top: clamp(standing, topLow, topHigh) };
}

export function roadmapFits(art: RoadmapArt, frame: RoadmapFrame, scale: number): boolean {
  return placement(art, frame, scale) !== null;
}

export function roadmapLayout(art: RoadmapArt, frame: RoadmapFrame): RoadmapLayout {
  if (!(frame.width > 0) || !(frame.height > 0)) return NOTHING;

  const cover = Math.max(frame.width / art.width, frame.height / art.height);
  for (let scale = cover; scale >= cover * ROADMAP.smallest; scale *= ROADMAP.shrinkStep) {
    const at = placement(art, frame, scale);
    if (at) return { scale, left: at.left, top: at.top, width: art.width * scale, height: art.height * scale };
  }

  const contain = Math.min(frame.width / art.width, frame.height / art.height);
  return {
    scale: contain,
    left: (frame.width - art.width * contain) / 2,
    top: (frame.height - art.height * contain) / 2,
    width: art.width * contain,
    height: art.height * contain,
  };
}

export function roadmapStopFrame(stop: RoadmapStop, at: RoadmapLayout): RoadmapStopFrame {
  return {
    left: at.left + stop.label.x * at.scale,
    top: at.top + stop.label.y * at.scale,
    width: stop.label.width * at.scale,
    height: stop.label.height * at.scale,
    fontSize: stop.nameSize * at.scale,
  };
}

export function roadmapMirrors(at: RoadmapLayout, width: number, height: number): RoadmapMirror[] {
  if (!(at.width > 0) || !(at.height > 0)) return [];

  const open = {
    left: at.left > ROADMAP.hairline,
    right: at.left + at.width < width - ROADMAP.hairline,
    top: at.top > ROADMAP.hairline,
    bottom: at.top + at.height < height - ROADMAP.hairline,
  };
  const beside = { left: at.left - at.width, right: at.left + at.width };
  const across = { top: at.top - at.height, bottom: at.top + at.height };
  const mirror = (key: RoadmapMirrorKey, left: number, top: number, flipX: boolean, flipY: boolean): RoadmapMirror => ({
    key,
    left,
    top,
    width: at.width,
    height: at.height,
    flipX,
    flipY,
  });
  const mirrors: RoadmapMirror[] = [];

  if (open.left) mirrors.push(mirror('left', beside.left, at.top, true, false));
  if (open.right) mirrors.push(mirror('right', beside.right, at.top, true, false));
  if (open.top) mirrors.push(mirror('top', at.left, across.top, false, true));
  if (open.top && open.left) mirrors.push(mirror('top-left', beside.left, across.top, true, true));
  if (open.top && open.right) mirrors.push(mirror('top-right', beside.right, across.top, true, true));
  if (open.bottom) mirrors.push(mirror('bottom', at.left, across.bottom, false, true));
  if (open.bottom && open.left) mirrors.push(mirror('bottom-left', beside.left, across.bottom, true, true));
  if (open.bottom && open.right) mirrors.push(mirror('bottom-right', beside.right, across.bottom, true, true));

  return mirrors;
}

export function roadmapTitleFrame(art: RoadmapArt, at: RoadmapLayout): RoadmapStopFrame {
  return {
    left: at.left + art.title.x * at.scale,
    top: at.top + art.title.y * at.scale,
    width: art.title.width * at.scale,
    height: art.title.height * at.scale,
    fontSize: art.titleSize * at.scale,
  };
}
