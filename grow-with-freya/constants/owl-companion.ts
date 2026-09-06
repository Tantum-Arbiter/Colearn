export const OWL_SHEET = {
  columns: 4,
  rows: 4,
  frameWidth: 174,
  frameHeight: 162,
} as const;

export const OWL_FRAME_COUNT = OWL_SHEET.columns * OWL_SHEET.rows;

export const OWL_SHEET_WIDTH = OWL_SHEET.columns * OWL_SHEET.frameWidth;
export const OWL_SHEET_HEIGHT = OWL_SHEET.rows * OWL_SHEET.frameHeight;

export const OWL_SHEET_SOURCE = require('@/assets/images/screen-time/owl-companion.webp');

export interface OwlStep {
  frame: number;
  ms: number;
}

export interface OwlClip {
  steps: readonly OwlStep[];
  loop: boolean;
}

export const OWL_CLIP_NAMES = ['idle', 'talk', 'wave', 'delight'] as const;

export type OwlClipName = (typeof OWL_CLIP_NAMES)[number];

export const OWL_CLIPS: Record<OwlClipName, OwlClip> = {
  idle: {
    loop: true,
    steps: [
      { frame: 0, ms: 1500 },
      { frame: 8, ms: 120 },
      { frame: 0, ms: 1700 },
      { frame: 1, ms: 1400 },
      { frame: 9, ms: 110 },
      { frame: 1, ms: 1500 },
      { frame: 2, ms: 1600 },
      { frame: 8, ms: 120 },
      { frame: 3, ms: 1300 },
    ],
  },
  talk: {
    loop: true,
    steps: [
      { frame: 0, ms: 150 },
      { frame: 4, ms: 170 },
      { frame: 1, ms: 140 },
      { frame: 5, ms: 180 },
      { frame: 2, ms: 150 },
      { frame: 6, ms: 160 },
      { frame: 0, ms: 140 },
      { frame: 7, ms: 190 },
    ],
  },
  wave: {
    loop: false,
    steps: [
      { frame: 0, ms: 110 },
      { frame: 12, ms: 100 },
      { frame: 13, ms: 100 },
      { frame: 14, ms: 110 },
      { frame: 15, ms: 200 },
      { frame: 14, ms: 110 },
      { frame: 13, ms: 100 },
      { frame: 12, ms: 110 },
      { frame: 0, ms: 140 },
    ],
  },
  delight: {
    loop: false,
    steps: [
      { frame: 11, ms: 180 },
      { frame: 10, ms: 620 },
      { frame: 9, ms: 160 },
      { frame: 0, ms: 160 },
    ],
  },
};

export function owlFrameOffset(frame: number): { left: number; top: number } {
  const column = frame % OWL_SHEET.columns;
  const row = Math.floor(frame / OWL_SHEET.columns);

  return {
    left: 0 - column * OWL_SHEET.frameWidth,
    top: 0 - row * OWL_SHEET.frameHeight,
  };
}

export function owlClipDuration(name: OwlClipName): number {
  return OWL_CLIPS[name].steps.reduce((total, step) => total + step.ms, 0);
}
