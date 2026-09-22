export const LOGIN_CUE = {
  firstDelayMs: 2500,
  everyMs: 18000,
  warpMs: 450,
  holdMs: 3000,
  spinDeg: 90,
  avatarShrink: 0.25,
  glyphGrow: 0.3,
  glyphRatio: 0.68,
  glyphMinSize: 38,
} as const;

export interface CueLayerPose {
  opacity: number;
  scale: number;
  rotateDeg: number;
}

export interface LoginCuePose {
  avatar: CueLayerPose;
  glyph: CueLayerPose;
  highlight: number;
}

export function loginCuePose(cue: number, spin: boolean): LoginCuePose {
  'worklet';
  const on = Math.min(Math.max(cue, 0), 1);
  const turn = spin ? LOGIN_CUE.spinDeg : 0;

  return {
    avatar: { opacity: 1 - on, scale: 1 - LOGIN_CUE.avatarShrink * on, rotateDeg: -turn * on + 0 },
    glyph: { opacity: on, scale: 1 - LOGIN_CUE.glyphGrow * (1 - on), rotateDeg: turn * (1 - on) + 0 },
    highlight: on,
  };
}

export function loginGlyphSize(avatarSize: number): number {
  return Math.max(Math.round(avatarSize * LOGIN_CUE.glyphRatio), LOGIN_CUE.glyphMinSize);
}
