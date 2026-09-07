export const OWL_CANVAS = {
  width: 174,
  height: 162,
} as const;

export const OWL_LAYERS = {
  body: require('@/assets/images/screen-time/owl/owl-body.webp'),
  head: require('@/assets/images/screen-time/owl/owl-head.webp'),
  eyes: require('@/assets/images/screen-time/owl/owl-eyes.webp'),
  beak: require('@/assets/images/screen-time/owl/owl-beak.webp'),
  wing: require('@/assets/images/screen-time/owl/owl-wing.webp'),
} as const;

export type OwlLayerName = keyof typeof OWL_LAYERS;

export const OWL_LAYER_ORDER: readonly OwlLayerName[] = ['wing', 'body', 'head', 'eyes', 'beak'];

export const OWL_RIG = {
  headPivot: { x: 86, y: 98 },
  wingPivot: { x: 146, y: 100 },
  eyeWindow: { top: 24, height: 66 },
  wingTuckedDegrees: -75,
  wingWaveDegrees: 10,
  breathScaleY: 0.022,
  breathScaleX: 0.008,
  breathHeadLift: 1.2,
  tiltDegrees: 6,
  peekPixels: 3,
  peekDegrees: 2,
  peekScaleX: 0.97,
  bobPixels: 3,
  talkBobPixels: 1.5,
  ruffleScaleX: 1.06,
  ruffleScaleY: 0.95,
  ruffleShakeDegrees: 2,
  arriveFromPixels: 64,
  leaveToPixels: 40,
  delightHopPixels: 14,
} as const;

export const OWL_RHYTHM = {
  breathMs: 3400,
  arriveMs: 620,
  landSettleMs: 420,
  waveAfterLandingMs: 140,
  waveRaiseMs: 380,
  waveBeatMs: 200,
  waveBeats: 3,
  waveLowerMs: 440,
  waveLeanDegrees: -4,
  blinkFirstMs: 1400,
  blinkMinMs: 2400,
  blinkMaxMs: 5200,
  blinkDownMs: 60,
  blinkHoldMs: 40,
  blinkUpMs: 130,
  slowBlinkDownMs: 170,
  slowBlinkHoldMs: 240,
  slowBlinkUpMs: 280,
  doubleBlinkGapMs: 90,
  doubleBlinkChance: 0.2,
  slowBlinkChance: 0.15,
  glanceFirstMs: 2600,
  glanceMinMs: 3200,
  glanceMaxMs: 7000,
  glanceHoldMinMs: 800,
  glanceHoldMaxMs: 1700,
  glanceReturnMs: 520,
  bobMs: 420,
  ruffleFirstMs: 9000,
  ruffleMinMs: 12000,
  ruffleMaxMs: 22000,
  ruffleMs: 520,
  talkOpenMs: 70,
  talkCloseMs: 80,
  talkPauseMs: 160,
  delightMs: 560,
  delightFadeMs: 180,
  pointRaiseMs: 360,
  pointLowerMs: 420,
  pointBobMs: 1400,
  pointBob: 0.35,
  leaveMs: 320,
  reducedFadeMs: 200,
} as const;

export const OWL_PHASES = ['arrive', 'idle', 'delight', 'leave'] as const;

export type OwlApproach = 'below' | 'above' | 'none';

export type OwlWingSide = 'right' | 'left';

export function arrivalOffset(approach: OwlApproach): number {
  if (approach === 'none') return 0;
  return approach === 'above' ? -OWL_RIG.arriveFromPixels : OWL_RIG.arriveFromPixels;
}

export function leaveOffset(approach: OwlApproach): number {
  if (approach === 'none') return 0;
  return approach === 'above' ? -OWL_RIG.leaveToPixels : OWL_RIG.leaveToPixels;
}

export const OWL_PERCH = {
  ledge: require('@/assets/images/screen-time/owl/owl-ledge.webp'),
  cloud: require('@/assets/images/ui-elements/night-cloud-left.webp'),
  baseOwlWidth: 116,
  ledgeWidth: 236,
  ledgeHeight: 104,
  platformTop: 24,
  footOverlap: 7,
  owlLeft: 16,
  cloudAspect: 616 / 531,
  slideOvershoot: 24,
  driftPixels: 4,
  driftMs: 9000,
} as const;

export interface PerchBox {
  left: number;
  bottom: number;
  width: number;
  height: number;
}

export interface PerchFrame {
  scale: number;
  width: number;
  height: number;
  owl: PerchBox;
  ledge: PerchBox;
  cloudFront: PerchBox;
  cloudBack: PerchBox;
  slideFrom: number;
}

export function owlPerchFrame(owlWidth: number): PerchFrame {
  const scale = owlWidth / OWL_PERCH.baseOwlWidth;
  const owlHeight = owlWidth * (OWL_CANVAS.height / OWL_CANVAS.width);
  const ledgeWidth = OWL_PERCH.ledgeWidth * scale;
  const ledgeHeight = OWL_PERCH.ledgeHeight * scale;
  const owlBottom = (OWL_PERCH.ledgeHeight - OWL_PERCH.platformTop - OWL_PERCH.footOverlap) * scale;
  const frontWidth = 230 * scale;
  const backWidth = 150 * scale;

  return {
    scale,
    width: ledgeWidth,
    height: owlBottom + owlHeight,
    owl: { left: OWL_PERCH.owlLeft * scale, bottom: owlBottom, width: owlWidth, height: owlHeight },
    ledge: { left: 0, bottom: 0, width: ledgeWidth, height: ledgeHeight },
    cloudFront: { left: -70 * scale, bottom: -42 * scale, width: frontWidth, height: frontWidth * OWL_PERCH.cloudAspect },
    cloudBack: { left: 120 * scale, bottom: -60 * scale, width: backWidth, height: backWidth * OWL_PERCH.cloudAspect },
    slideFrom: -(ledgeWidth + OWL_PERCH.slideOvershoot),
  };
}

export type OwlPhase = (typeof OWL_PHASES)[number];

export type BlinkShape = 'quick' | 'slow' | 'double';

export type GlanceGesture = 'tilt-left' | 'tilt-right' | 'peek-left' | 'peek-right' | 'bob';

export const GLANCE_GESTURES: readonly GlanceGesture[] = [
  'tilt-left',
  'tilt-right',
  'peek-left',
  'peek-right',
  'bob',
];

function clampRoll(roll: number): number {
  return Math.min(Math.max(roll, 0), 1);
}

function between(roll: number, min: number, max: number): number {
  return Math.round(min + clampRoll(roll) * (max - min));
}

export function nextBlinkDelay(roll: number, isFirst = false): number {
  if (isFirst) return OWL_RHYTHM.blinkFirstMs;
  return between(roll, OWL_RHYTHM.blinkMinMs, OWL_RHYTHM.blinkMaxMs);
}

export function blinkShape(roll: number): BlinkShape {
  const r = clampRoll(roll);
  if (r < OWL_RHYTHM.doubleBlinkChance) return 'double';
  if (r < OWL_RHYTHM.doubleBlinkChance + OWL_RHYTHM.slowBlinkChance) return 'slow';
  return 'quick';
}

export function blinkDuration(shape: BlinkShape): number {
  const quick = OWL_RHYTHM.blinkDownMs + OWL_RHYTHM.blinkHoldMs + OWL_RHYTHM.blinkUpMs;
  if (shape === 'quick') return quick;
  if (shape === 'double') return quick * 2 + OWL_RHYTHM.doubleBlinkGapMs;
  return OWL_RHYTHM.slowBlinkDownMs + OWL_RHYTHM.slowBlinkHoldMs + OWL_RHYTHM.slowBlinkUpMs;
}

export function nextGlanceDelay(roll: number, isFirst = false): number {
  if (isFirst) return OWL_RHYTHM.glanceFirstMs;
  return between(roll, OWL_RHYTHM.glanceMinMs, OWL_RHYTHM.glanceMaxMs);
}

export function pickGlance(roll: number): GlanceGesture {
  const index = Math.min(
    Math.floor(clampRoll(roll) * GLANCE_GESTURES.length),
    GLANCE_GESTURES.length - 1
  );
  return GLANCE_GESTURES[index];
}

export function glanceHold(roll: number): number {
  return between(roll, OWL_RHYTHM.glanceHoldMinMs, OWL_RHYTHM.glanceHoldMaxMs);
}

export function nextRuffleDelay(roll: number, isFirst = false): number {
  if (isFirst) return OWL_RHYTHM.ruffleFirstMs;
  return between(roll, OWL_RHYTHM.ruffleMinMs, OWL_RHYTHM.ruffleMaxMs);
}

export interface TalkBeat {
  at: number;
  open: boolean;
  over: number;
}

export const TALK_PHRASES: readonly (readonly number[])[] = [
  [3, 4, 2],
  [4, 2, 3],
  [2, 3, 3],
];

export function talkBeats(roll: number): TalkBeat[] {
  const phrase = TALK_PHRASES[Math.min(Math.floor(clampRoll(roll) * TALK_PHRASES.length), TALK_PHRASES.length - 1)];
  const beats: TalkBeat[] = [];
  let cursor = 0;

  phrase.forEach((syllables, group) => {
    if (group > 0) cursor += OWL_RHYTHM.talkPauseMs;
    for (let i = 0; i < syllables; i++) {
      beats.push({ at: cursor, open: true, over: OWL_RHYTHM.talkOpenMs });
      cursor += OWL_RHYTHM.talkOpenMs;
      beats.push({ at: cursor, open: false, over: OWL_RHYTHM.talkCloseMs });
      cursor += OWL_RHYTHM.talkCloseMs;
    }
  });

  return beats;
}

export function talkDuration(roll: number): number {
  const beats = talkBeats(roll);
  const last = beats[beats.length - 1];
  return last.at + last.over;
}

export function waveDuration(): number {
  return (
    OWL_RHYTHM.waveRaiseMs +
    OWL_RHYTHM.waveBeatMs * OWL_RHYTHM.waveBeats +
    OWL_RHYTHM.waveLowerMs
  );
}

export function wingPose(lift: number, wave: number): { rotate: number; opacity: number } {
  'worklet';
  const l = Math.min(Math.max(lift, 0), 1);
  return {
    rotate: OWL_RIG.wingTuckedDegrees * (1 - l) + wave * OWL_RIG.wingWaveDegrees,
    opacity: Math.min(1, l * 2.4),
  };
}

export function landingSquash(progress: number): { x: number; y: number } {
  'worklet';
  const u = Math.min(Math.max(progress, 0), 1);
  const onset = Math.min(1, u / 0.2);
  const eased = onset * onset * (3 - 2 * onset);
  const depth = 0.8 * Math.exp(-2.5 * u) * Math.sin(6.5 * u) * (1 - u * u * u) * eased;
  return {
    x: 1 + depth * 0.09,
    y: 1 - depth * 0.12,
  };
}

export function lidReveal(lid: number, scale: number): { windowTop: number; contentTop: number } {
  'worklet';
  const height = OWL_RIG.eyeWindow.height * scale;
  const hidden = (1 - Math.min(Math.max(lid, 0), 1)) * height;
  return {
    windowTop: OWL_RIG.eyeWindow.top * scale - hidden,
    contentTop: -OWL_RIG.eyeWindow.top * scale + hidden,
  };
}

export function owlOrigin(point: { x: number; y: number }): string {
  const x = Math.round((point.x / OWL_CANVAS.width) * 100);
  const y = Math.round((point.y / OWL_CANVAS.height) * 100);
  return `${x}% ${y}%`;
}
