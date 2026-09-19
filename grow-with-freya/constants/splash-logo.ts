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

export type SplashLogoLayer = (typeof SPLASH_LOGO_LAYERS)[number];
export type SplashLeaf = (typeof SPLASH_LEAVES)[number];
export type BookHalf = (typeof BOOK_HALVES)[number];
export type SplashLogoFrame = SplashLogoLayer | 'book';

export const NATIVE_SPLASH_IMAGE_WIDTH = 280;

const PHONE_LOGO_SIZE = 280;
const TABLET_LOGO_SIZE = 380;

const BOOK = { delayMs: 150, durationMs: 850 } as const;
const STEM = { delayMs: 1000, durationMs: 1000 } as const;
const ROOTS = { delayMs: 1100, durationMs: 1000 } as const;
const WORDMARK = { delayMs: 1900, durationMs: 450, risePx: 10 } as const;
const TAGLINE = { delayMs: 1950, durationMs: 400 } as const;
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
  BOOK.delayMs + BOOK.durationMs,
  STEM.delayMs + STEM.durationMs,
  ROOTS.delayMs + ROOTS.durationMs,
  WORDMARK.delayMs + WORDMARK.durationMs,
  TAGLINE.delayMs + TAGLINE.durationMs,
  ...SPLASH_LEAVES.map((leaf) => leafUnfurlDelayMs(leaf) + LEAF_UNFURL_MS)
);

export const SPLASH_TIMELINE = {
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

const COVER_EDGE_ON = 0.5;
const SPINE_FADE = 0.1;

export interface BookPose {
  scaleX: number;
}

export function bookPose(half: BookHalf, open: number): BookPose {
  'worklet';
  const opened = Math.min(Math.max(open, 0), 1);

  return { scaleX: half === 'bookLeft' ? 2 * opened - 1 : 1 };
}

export function bookShiftX(open: number, logoSize: number): number {
  'worklet';
  const opened = Math.min(Math.max(open, 0), 1);

  return (opened - 1) * ((layout.layers.book.width * logoSize) / 4) + 0;
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
