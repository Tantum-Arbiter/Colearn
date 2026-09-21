import layout from '@/assets/images/splash-logo/layout.json';
import { isWideScreen } from '@/constants/night-sky';

export const SPLASH_LOGO_LAYERS = [
  'bookLeft',
  'bookRight',
  'roots',
  'stem',
  'leafLeft',
  'leafRight',
  'leafTop',
  'wordmark',
] as const;
export const BOOK_HALVES = ['bookLeft', 'bookRight'] as const;
export const SPLASH_LEAVES = ['leafLeft', 'leafRight', 'leafTop'] as const;
export const OUTLINE_STROKES = ['cover', 'page'] as const;

export type SplashLogoLayer = (typeof SPLASH_LOGO_LAYERS)[number];
export type SplashLeaf = (typeof SPLASH_LEAVES)[number];
export type BookHalf = (typeof BOOK_HALVES)[number];
export type OutlineStroke = (typeof OUTLINE_STROKES)[number];
export type SplashLogoFrame = SplashLogoLayer | 'book';

export const NATIVE_SPLASH_IMAGE_WIDTH = 280;

const PHONE_LOGO_SIZE = 280;
const TABLET_LOGO_SIZE = 380;

const OUTLINE = { delayMs: 150, durationMs: 850 } as const;
const INK = { delayMs: 1000, durationMs: 150 } as const;
const BOOK = { delayMs: 1150, durationMs: 850 } as const;
const COVER_EDGE_ON = 0.5;
const STEM = { delayMs: 2000, durationMs: 1000 } as const;
const ROOTS = {
  delayMs: Math.ceil(BOOK.delayMs + growEaseInverse(COVER_EDGE_ON) * BOOK.durationMs),
  durationMs: 1000,
} as const;
const WORDMARK = { delayMs: 2900, durationMs: 450, risePx: 10 } as const;
const TAGLINE = { delayMs: 2950, durationMs: 400 } as const;
const LEAF_UNFURL_MS = 520;
const HOLD_MS = 2000;
const MOUNT_ALLOWANCE_MS = 1000;

const LEAF_FOLD_DEG: Record<SplashLeaf, number> = { leafLeft: 38, leafRight: -38, leafTop: -16 };
const LEAF_SWAY_DEG: Record<SplashLeaf, number> = { leafLeft: 2.4, leafRight: -1.9, leafTop: 1.4 };

export interface LayerFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PivotOffset {
  x: number;
  y: number;
}

export interface LeafPose {
  scale: number;
  rotateDeg: number;
}

export interface OutlinePoint {
  x: number;
  y: number;
}

function polylineLength(points: OutlinePoint[]): number {
  return points.reduce(
    (total, point, index) =>
      index === 0 ? 0 : total + Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y),
    0
  );
}

function outlineFractions(stroke: OutlineStroke): OutlinePoint[] {
  return layout.outline[stroke].map(([x, y]) => ({ x, y }));
}

const COVER_LENGTH = polylineLength(outlineFractions('cover'));
const PAGE_LENGTH = polylineLength(outlineFractions('page'));
const PAGE_FORK_AT = layout.outline.forkAt;

export function splashLogoSize(screenWidth: number): number {
  return isWideScreen(screenWidth) ? TABLET_LOGO_SIZE : PHONE_LOGO_SIZE;
}

export function logoIntroScale(logoSize: number): number {
  return NATIVE_SPLASH_IMAGE_WIDTH / logoSize;
}

export function layerFrame(layer: SplashLogoFrame, logoSize: number): LayerFrame {
  const source = layout.layers[layer];

  return {
    left: source.x * logoSize,
    top: source.y * logoSize,
    width: source.width * logoSize,
    height: source.height * logoSize,
  };
}

export function leafPivotOffset(leaf: SplashLeaf, logoSize: number): PivotOffset {
  const source = layout.layers[leaf];

  return {
    x: (source.pivot.x - (source.x + source.width / 2)) * logoSize,
    y: (source.pivot.y - (source.y + source.height / 2)) * logoSize,
  };
}

export function growEase(time: number): number {
  'worklet';
  return (1 - Math.cos(Math.PI * time)) / 2;
}

export function growEaseInverse(progress: number): number {
  return Math.acos(1 - 2 * progress) / Math.PI;
}

export function revealHeight(progress: number, fullHeight: number): number {
  'worklet';
  return Math.min(Math.max(progress, 0), 1) * fullHeight;
}

export function leafUnfurlDelayMs(leaf: SplashLeaf): number {
  const stem = layout.layers.stem;
  const stemBottom = stem.y + stem.height;
  const grownAtNeck = Math.min(Math.max((stemBottom - layout.layers[leaf].pivot.y) / stem.height, 0), 1);

  return Math.ceil(STEM.delayMs + growEaseInverse(grownAtNeck) * STEM.durationMs);
}

const LOGO_COMPLETE_MS = Math.max(
  OUTLINE.delayMs + OUTLINE.durationMs,
  INK.delayMs + INK.durationMs,
  BOOK.delayMs + BOOK.durationMs,
  STEM.delayMs + STEM.durationMs,
  ROOTS.delayMs + ROOTS.durationMs,
  WORDMARK.delayMs + WORDMARK.durationMs,
  TAGLINE.delayMs + TAGLINE.durationMs,
  ...SPLASH_LEAVES.map((leaf) => leafUnfurlDelayMs(leaf) + LEAF_UNFURL_MS)
);

export const SPLASH_TIMELINE = {
  outline: OUTLINE,
  ink: INK,
  book: BOOK,
  stem: STEM,
  roots: ROOTS,
  leafUnfurlMs: LEAF_UNFURL_MS,
  wordmark: WORDMARK,
  tagline: TAGLINE,
  glowMs: 1500,
  swayMs: 2600,
  logoCompleteMs: LOGO_COMPLETE_MS,
  holdMs: HOLD_MS,
  exitAtMs: LOGO_COMPLETE_MS + HOLD_MS,
  mountAllowanceMs: MOUNT_ALLOWANCE_MS,
  handoffMs: 120,
  exitMs: 400,
  reducedMotionFadeMs: 300,
} as const;

const SPINE_FADE = 0.1;
const COVER_ARCH = 0.55;

export interface BookPose {
  scaleX: number;
  shearY: number;
}

export function bookPose(half: BookHalf, open: number): BookPose {
  'worklet';
  const opened = Math.min(Math.max(open, 0), 1);
  if (half === 'bookRight' || opened >= 1) {
    return { scaleX: 1, shearY: 0 };
  }
  if (opened <= 0) {
    return { scaleX: -1, shearY: 0 };
  }
  const turn = Math.PI * (1 - opened);

  return { scaleX: Math.cos(turn), shearY: COVER_ARCH * Math.sin(turn) };
}

export function coverSkewYDeg(pose: BookPose): number {
  'worklet';
  return (Math.atan(pose.shearY) * 180) / Math.PI;
}

export function spineFrame(logoSize: number): LayerFrame {
  return {
    left: layout.spine.x * logoSize,
    top: layout.spine.y * logoSize,
    width: layout.spine.width * logoSize,
    height: layout.spine.height * logoSize,
  };
}

export function spineOpacity(open: number): number {
  'worklet';
  return Math.min(Math.max(1 - (open - COVER_EDGE_ON) / SPINE_FADE, 0), 1);
}

export function outlineStrokeWidth(logoSize: number): number {
  return layout.outline.strokeWidth * logoSize;
}

export function outlinePoints(stroke: OutlineStroke, logoSize: number): OutlinePoint[] {
  return outlineFractions(stroke).map(({ x, y }) => ({ x: x * logoSize, y: y * logoSize }));
}

export function outlinePath(stroke: OutlineStroke, logoSize: number): string {
  return outlinePoints(stroke, logoSize)
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ');
}

export function outlineLength(stroke: OutlineStroke, logoSize: number): number {
  return polylineLength(outlinePoints(stroke, logoSize));
}

export function outlineForkAt(logoSize: number): number {
  return PAGE_FORK_AT * logoSize;
}

export function outlineStrokeDrawn(stroke: OutlineStroke, drawn: number): number {
  'worklet';
  const pen = Math.min(Math.max(drawn, 0), 1);
  if (stroke === 'cover') {
    return pen;
  }

  return Math.min(Math.max((pen * COVER_LENGTH - PAGE_FORK_AT) / PAGE_LENGTH, 0), 1);
}

export function outlineDashOffset(length: number, drawn: number): number {
  'worklet';
  return length * (1 - Math.min(Math.max(drawn, 0), 1));
}

export function outlineOpacity(ink: number): number {
  'worklet';
  return ink < 1 ? 1 : 0;
}

export function bookSpineOffset(half: BookHalf, logoSize: number): number {
  const source = layout.layers[half];

  return (source.pivot.x - (source.x + source.width / 2)) * logoSize;
}

export function leafPose(leaf: SplashLeaf, unfurl: number, sway: number): LeafPose {
  'worklet';
  const open = Math.min(Math.max(unfurl, 0), 1);

  return {
    scale: Math.max(unfurl, 0),
    rotateDeg: LEAF_FOLD_DEG[leaf] * (1 - open) + LEAF_SWAY_DEG[leaf] * sway * open + 0,
  };
}
