import type { ImageSourcePropType } from 'react-native';
import type { Story } from '@/types/story';

export const STORY_PAGE_PREVIEW = {
  dwellMs: 3000,
  turnMs: 2100,
  prepareMs: 700,
  fadeMs: 1200,
  maxPages: 6,
  curl: {
    strips: 32,
    overlap: 2,
    bend: 0.75,
    bendRise: 0.6,
    bendSettle: 2,
    cornerLead: 0.12,
    shade: 0.26,
    shadeGain: 0.4,
    highlight: 0.14,
    presenceGain: 1.4,
    crestAngle: 0.7,
    faceBlend: 0.2,
    castShade: 0.32,
    castWidth: 0.3,
  },
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

export function foldState(progress: number, half: number): { phi: number; bend: number } {
  'worklet';
  const { curl } = STORY_PAGE_PREVIEW;
  const p = clamp01(progress);
  const lift = Math.sin(Math.PI * p);
  const profile = Math.pow(Math.max(0, lift), p < 0.5 ? curl.bendRise : curl.bendSettle);
  const bend = half * curl.bend * profile;
  return { phi: Math.PI * p, bend: bend < 1e-9 ? 0 : bend };
}

export function sheetPoint(s: number, phi: number, bend: number): { x: number; theta: number } {
  'worklet';
  if (phi < 1e-9) {
    return { x: s, theta: 0 };
  }
  const radius = bend / phi;
  if (bend > 0 && s <= bend) {
    const theta = (phi * s) / bend;
    return { x: radius * Math.sin(theta), theta };
  }
  return { x: radius * Math.sin(phi) + (s - bend) * Math.cos(phi), theta: phi };
}

export function stripPose(a: number, b: number, phi: number, bend: number): { translateX: number; scaleX: number } {
  'worklet';
  const pa = sheetPoint(a, phi, bend).x;
  const pb = sheetPoint(b, phi, bend).x;
  const width = b - a;
  const scale = width > 0 ? (pb - pa) / width : 1;
  const shift = (pa + pb) / 2 - (a + b) / 2;
  return {
    translateX: Math.abs(shift) < 1e-9 ? 0 : shift,
    scaleX: Math.abs(scale) < 1e-6 ? 0 : scale,
  };
}

export function leadProgress(progress: number, y01: number): number {
  'worklet';
  const lead = STORY_PAGE_PREVIEW.curl.cornerLead;
  return clamp01(clamp01(progress) * (1 + lead) - lead * clamp01(y01));
}

export function cornerPose(a: number, b: number, progress: number, half: number, height: number): { translateX: number; scaleX: number; skewX: string } {
  'worklet';
  const top = foldState(leadProgress(progress, 0), half);
  const mid = foldState(leadProgress(progress, 0.5), half);
  const bottom = foldState(leadProgress(progress, 1), half);
  const topPose = stripPose(a, b, top.phi, top.bend);
  const midPose = stripPose(a, b, mid.phi, mid.bend);
  const bottomPose = stripPose(a, b, bottom.phi, bottom.bend);
  const shift = (topPose.translateX + bottomPose.translateX) / 2;
  const slant = height > 0 ? (Math.atan((bottomPose.translateX - topPose.translateX) / height) * 180) / Math.PI : 0;
  const widest = Math.max(Math.abs(topPose.scaleX), Math.abs(midPose.scaleX), Math.abs(bottomPose.scaleX));
  const facing = midPose.scaleX !== 0 ? midPose.scaleX : bottomPose.scaleX !== 0 ? bottomPose.scaleX : topPose.scaleX;
  const scaleX = widest === 0 ? 0 : facing < 0 ? -widest : widest;
  return {
    translateX: Math.abs(shift) < 1e-9 ? 0 : shift,
    scaleX,
    skewX: `${Math.abs(slant) < 1e-9 ? 0 : slant}deg`,
  };
}

export function faceMix(theta: number): number {
  'worklet';
  const { faceBlend } = STORY_PAGE_PREVIEW.curl;
  const t = clamp01((theta - (Math.PI / 2 - faceBlend)) / (2 * faceBlend));
  return t * t * (3 - 2 * t);
}

export function stripLight(theta: number): { shade: number; highlight: number } {
  'worklet';
  const { curl } = STORY_PAGE_PREVIEW;
  const facing = Math.cos(theta - curl.crestAngle);
  const mix = faceMix(theta);
  const lit = facing * (1 - mix) - facing * mix;
  const delta = lit - Math.cos(curl.crestAngle);
  if (delta >= 0) {
    return { shade: 0, highlight: (curl.highlight / (1 - Math.cos(curl.crestAngle))) * delta };
  }
  return { shade: Math.min(curl.shade, -delta * curl.shadeGain), highlight: 0 };
}

export function stripTint(theta: number, scaleX: number): string {
  'worklet';
  const light = stripLight(theta);
  const presence = Math.min(1, Math.abs(scaleX) * STORY_PAGE_PREVIEW.curl.presenceGain);
  if (light.shade >= light.highlight) {
    return `rgba(4, 9, 31, ${light.shade * presence})`;
  }
  return `rgba(255, 250, 240, ${light.highlight * presence})`;
}

export function liftShadow(phi: number, bend: number, half: number): { translateX: number; opacity: number } {
  'worklet';
  if (phi < 1e-9) {
    return { translateX: half, opacity: 0 };
  }
  const radius = bend / phi;
  const crest = phi >= Math.PI / 2 ? radius : sheetPoint(half, phi, bend).x;
  return { translateX: Math.max(0, crest), opacity: STORY_PAGE_PREVIEW.curl.castShade * Math.sin(phi) };
}

export function landingShadow(progress: number): number {
  'worklet';
  const landing = clamp01((clamp01(progress) - 0.5) * 2);
  return STORY_PAGE_PREVIEW.curl.castShade * Math.sin(landing * Math.PI);
}
