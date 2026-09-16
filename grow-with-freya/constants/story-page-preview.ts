import type { ImageSourcePropType } from 'react-native';
import type { Story } from '@/types/story';

export const STORY_PAGE_PREVIEW = {
  dwellMs: 3000,
  turnMs: 1500,
  fadeMs: 900,
  maxPages: 6,
  liftBulge: 0.05,
  leafShade: 0.42,
  castShade: 0.5,
} as const;

export type PreviewFrame = ImageSourcePropType;

function toSource(value: ImageSourcePropType | string | undefined): PreviewFrame | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.length > 0 ? { uri: value } : undefined;
  }
  return value;
}

export function frameKey(frame: PreviewFrame): string {
  if (typeof frame === 'number') {
    return String(frame);
  }
  if (Array.isArray(frame)) {
    return JSON.stringify(frame);
  }
  return frame.uri ?? JSON.stringify(frame);
}

export function previewFrames(story: Story): PreviewFrame[] {
  const frames: PreviewFrame[] = [];
  const seen = new Set<string>();
  const add = (raw: ImageSourcePropType | string | undefined) => {
    const source = toSource(raw);
    if (!source) {
      return;
    }
    const key = frameKey(source);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    frames.push(source);
  };

  add(story.coverImage);
  const limit = frames.length + STORY_PAGE_PREVIEW.maxPages;
  for (const page of story.pages ?? []) {
    if (frames.length >= limit) {
      break;
    }
    if (page.type === 'cover' || page.pageNumber === 0) {
      continue;
    }
    add(page.backgroundImage);
  }

  return frames;
}

export function nextFrame(index: number, count: number): number {
  if (count <= 1) {
    return 0;
  }
  return (index + 1) % count;
}

function clamp01(value: number): number {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

export function leafPose(progress: number, width: number): { transform: ({ translateX: number } | { scaleX: number } | { scaleY: number })[] } {
  'worklet';
  const pivot = width / 4;
  const angle = Math.PI * clamp01(progress);
  const fold = Math.abs(Math.cos(angle)) < 1e-9 ? 0 : Math.cos(angle);
  return {
    transform: [
      { translateX: -pivot },
      { scaleX: fold },
      { scaleY: 1 + STORY_PAGE_PREVIEW.liftBulge * Math.sin(angle) },
      { translateX: pivot },
    ],
  };
}

export function leafFaces(progress: number): { front: number; back: number } {
  'worklet';
  const turned = progress >= 0.5;
  return { front: turned ? 0 : 1, back: turned ? 1 : 0 };
}

export function leafShade(progress: number): { front: number; back: number } {
  'worklet';
  const rising = clamp01(progress * 2);
  const landing = clamp01((progress - 0.5) * 2);
  return {
    front: STORY_PAGE_PREVIEW.leafShade * rising,
    back: STORY_PAGE_PREVIEW.leafShade * (1 - landing),
  };
}

export function castShadows(progress: number): { left: number; right: number } {
  'worklet';
  const p = clamp01(progress);
  const landing = clamp01((p - 0.5) * 2);
  return {
    right: STORY_PAGE_PREVIEW.castShade * Math.sin(p * Math.PI),
    left: STORY_PAGE_PREVIEW.castShade * Math.sin(landing * Math.PI),
  };
}
