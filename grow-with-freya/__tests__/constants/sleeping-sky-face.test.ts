/**
 * Grown-ups keeps whichever of the sun and moon is off duty: while the sun is
 * up on home, the moon sleeps here, and at night the sun does.
 */

import {
  SLEEPING_EYES,
  SLEEPING_MOUTH,
  SLEEP_RHYTHM,
  WAKE,
  WAKE_TOTAL_MS,
  breathPose,
  flutterSqueeze,
  gazeAt,
  lidBreath,
  lidsOpenness,
  mouthDepth,
  shutLineOpacity,
  sleepingBody,
  swayDeg,
  zzzAt,
} from '@/constants/sleeping-sky-face';

describe('sleepingBody', () => {
  it('lets the moon sleep while the sun is up on home', () => {
    expect(sleepingBody('day')).toBe('moon');
  });

  it('lets the sun sleep while the moon is out on home', () => {
    expect(sleepingBody('night')).toBe('sun');
  });
});

describe('SLEEPING_EYES', () => {
  it.each(['sun', 'moon'] as const)('keeps the %s\'s eyes on its face, left of right, in the upper half', (body) => {
    const { left, right } = SLEEPING_EYES[body];

    expect(left.x).toBeLessThan(0.5);
    expect(right.x).toBeGreaterThan(0.5);
    [left, right].forEach((eye) => {
      expect(eye.y).toBeGreaterThan(0.4);
      expect(eye.y).toBeLessThan(0.65);
      expect(eye.width).toBeGreaterThan(0.05);
      expect(eye.width).toBeLessThan(0.15);
    });
  });
});

describe('SLEEPING_MOUTH', () => {
  it.each(['sun', 'moon'] as const)('should put the %s mouth below its eyes, in the middle of the face, drawn in the art\'s stroke', (body) => {
    const underTest = SLEEPING_MOUTH[body];
    const eyes = SLEEPING_EYES[body];

    expect(underTest.y).toBeGreaterThan(Math.max(eyes.left.y, eyes.right.y));
    expect(underTest.x).toBeGreaterThan(eyes.left.x);
    expect(underTest.x).toBeLessThan(eyes.right.x);
    expect(underTest.width).toBeGreaterThan(0.08);
    expect(underTest.width).toBeLessThan(0.2);
    expect(underTest.depth).toBeGreaterThan(0);
    expect(underTest.depth).toBeLessThan(underTest.width / 2);
    expect(underTest.stroke).toBeGreaterThan(0.01);
    expect(underTest.stroke).toBeLessThan(0.02);
  });
});

describe('mouthDepth', () => {
  it('smiles while asleep and goes flat while the eye is open', () => {
    expect(mouthDepth(0)).toBe(1);
    expect(mouthDepth(0.5)).toBe(0.5);
    expect(mouthDepth(1)).toBe(0);
    expect(mouthDepth(1.3)).toBe(0);
  });
});

describe('lidsOpenness', () => {
  it('lasts as long as the open, the look about and the close together', () => {
    expect(WAKE_TOTAL_MS).toBe(WAKE.settleMs + WAKE.closeMs);
    expect(WAKE_TOTAL_MS).toBeGreaterThan(2000);
    expect(WAKE_TOTAL_MS).toBeLessThan(3500);
  });

  it('starts shut and opens smoothly', () => {
    expect(lidsOpenness(0)).toBe(0);
    expect(lidsOpenness(WAKE.openMs / 2)).toBeCloseTo(0.5, 6);
    expect(lidsOpenness(WAKE.openMs)).toBe(1);
  });

  it('stays wide open while it looks about, except for one blink', () => {
    expect(lidsOpenness(WAKE.openMs + 100)).toBe(1);
    expect(lidsOpenness(WAKE.blinkAtMs)).toBe(0);
    expect(lidsOpenness(WAKE.blinkAtMs - WAKE.blinkMs)).toBe(1);
    expect(lidsOpenness(WAKE.blinkAtMs + WAKE.blinkMs)).toBe(1);
    expect(lidsOpenness(WAKE.settleMs - 1)).toBe(1);
  });

  it('closes smoothly and stays shut', () => {
    expect(lidsOpenness(WAKE.settleMs + WAKE.closeMs / 2)).toBeCloseTo(0.5, 6);
    expect(lidsOpenness(WAKE_TOTAL_MS)).toBe(0);
    expect(lidsOpenness(WAKE_TOTAL_MS + 500)).toBe(0);
  });

  it('never opens beyond wide or closes beyond shut', () => {
    for (let ms = -100; ms <= WAKE_TOTAL_MS + 100; ms += 10) {
      const underTest = lidsOpenness(ms);

      expect(underTest).toBeGreaterThanOrEqual(0);
      expect(underTest).toBeLessThanOrEqual(1);
    }
  });
});

describe('shutLineOpacity', () => {
  it('draws the shut line only as the lid comes down over the last of the eye', () => {
    expect(shutLineOpacity(0)).toBe(1);
    expect(shutLineOpacity(WAKE.lineBelowOpen / 2)).toBeCloseTo(0.5, 6);
    expect(shutLineOpacity(WAKE.lineBelowOpen)).toBe(0);
    expect(shutLineOpacity(1)).toBe(0);
  });
});

describe('gazeAt', () => {
  it('looks straight ahead as the eyes open', () => {
    expect(gazeAt(0)).toEqual({ x: 0, y: 0 });
    expect(gazeAt(WAKE.openMs)).toEqual({ x: 0, y: 0 });
  });

  it('glances left, then right, then up, then settles', () => {
    expect(gazeAt(750)).toEqual({ x: -1, y: 0.1 });
    expect(gazeAt(1400)).toEqual({ x: 1, y: 0.1 });
    expect(gazeAt(2000)).toEqual({ x: 0, y: -0.7 });
    expect(gazeAt(WAKE.settleMs)).toEqual({ x: 0, y: 0 });
    expect(gazeAt(WAKE_TOTAL_MS)).toEqual({ x: 0, y: 0 });
  });

  it('eases between looks rather than jumping', () => {
    let previous = gazeAt(0);
    for (let ms = 1; ms <= WAKE_TOTAL_MS; ms += 5) {
      const underTest = gazeAt(ms);

      expect(Math.abs(underTest.x - previous.x)).toBeLessThan(0.06);
      expect(Math.abs(underTest.y - previous.y)).toBeLessThan(0.06);
      previous = underTest;
    }
  });

  it('is half way across at the middle of a glance', () => {
    expect(gazeAt(440).x).toBeCloseTo(-0.5, 6);
  });
});

describe('breathPose', () => {
  it('rests at its own size, glow dimmed, at the bottom of a breath', () => {
    expect(breathPose(0, 100)).toEqual({ scaleX: 1, scaleY: 1, rise: 0, glow: 1 - SLEEP_RHYTHM.glowPulse });
  });

  it('swells more upward than sideways, lifts a little and brightens at the top of a breath', () => {
    const underTest = breathPose(1, 100);

    expect(underTest.scaleY).toBeGreaterThan(underTest.scaleX);
    expect(underTest.scaleX).toBeGreaterThan(1);
    expect(underTest.rise).toBeLessThan(0);
    expect(underTest.glow).toBe(1);
  });

  it('never breathes past a full breath', () => {
    expect(breathPose(1.4, 100)).toEqual(breathPose(1, 100));
    expect(breathPose(-0.2, 100)).toEqual(breathPose(0, 100));
  });
});

describe('lidBreath', () => {
  it('rests the shut lids as drawn at the bottom of a breath', () => {
    expect(lidBreath(0, 100)).toEqual({ depth: 1, lift: 0 });
  });

  it('scrunches the lids deeper and lifts them with the cheeks on the in-breath', () => {
    const underTest = lidBreath(1, 100);

    expect(underTest.depth).toBeGreaterThan(1);
    expect(underTest.depth).toBeLessThan(1.5);
    expect(underTest.lift).toBeLessThan(0);
  });

  it('never breathes past a full breath', () => {
    expect(lidBreath(1.3, 100)).toEqual(lidBreath(1, 100));
  });
});

describe('swayDeg', () => {
  it('rocks gently to each side and back through upright', () => {
    expect(swayDeg(0)).toBeCloseTo(0, 6);
    expect(swayDeg(0.25)).toBeCloseTo(SLEEP_RHYTHM.swayDeg, 6);
    expect(swayDeg(0.5)).toBeCloseTo(0, 6);
    expect(swayDeg(0.75)).toBeCloseTo(-SLEEP_RHYTHM.swayDeg, 6);
    expect(SLEEP_RHYTHM.swayDeg).toBeLessThan(3);
  });
});

describe('flutterSqueeze', () => {
  const flutterShare = SLEEP_RHYTHM.flutterMs / SLEEP_RHYTHM.flutterEveryMs;

  it('leaves the lids still for most of the loop', () => {
    expect(flutterSqueeze(0.5, 0)).toBe(1);
    expect(flutterSqueeze(flutterShare + 0.01, 0)).toBe(1);
    expect(flutterSqueeze(0.99, 0)).toBe(1);
  });

  it('squeezes the lids briefly at the start of each loop, and never past the squeeze', () => {
    expect(flutterSqueeze(flutterShare / 2, 0)).toBeCloseTo(SLEEP_RHYTHM.flutterSqueeze, 6);
    expect(flutterSqueeze(flutterShare / 4, 0)).toBeGreaterThan(SLEEP_RHYTHM.flutterSqueeze);
    expect(flutterSqueeze(1 + flutterShare / 2, 0)).toBeCloseTo(SLEEP_RHYTHM.flutterSqueeze, 6);
  });

  it('lets the second eye flutter a breath behind the first', () => {
    expect(flutterSqueeze(flutterShare / 2, 0.012)).toBeGreaterThan(flutterSqueeze(flutterShare / 2, 0));
  });
});

describe('zzzAt', () => {
  it('tilts as it wobbles up', () => {
    expect(zzzAt(0, 0.125).tiltDeg).toBeCloseTo(SLEEP_RHYTHM.zzzTiltDeg, 6);
    expect(Math.abs(zzzAt(0, 0.5).tiltDeg)).toBeLessThan(1e-6);
  });

  it('rises and drifts right as it goes', () => {
    const early = zzzAt(0, 0.1);
    const late = zzzAt(0, 0.8);

    expect(late.y).toBeLessThan(early.y);
    expect(late.x).toBeGreaterThan(early.x);
    expect(late.scale).toBeGreaterThan(early.scale);
  });

  it('fades in from nothing and away to nothing', () => {
    expect(zzzAt(0, 0).opacity).toBeCloseTo(0, 5);
    expect(zzzAt(0, 0.5).opacity).toBeCloseTo(1, 5);
    expect(zzzAt(0, 0.999).opacity).toBeLessThan(0.01);
  });

  it('staggers the letters evenly through the loop', () => {
    const count = SLEEP_RHYTHM.zzzCount;

    expect(zzzAt(1, 0)).toEqual(zzzAt(0, 1 / count));
    expect(zzzAt(count - 1, 0)).toEqual(zzzAt(0, (count - 1) / count));
  });

  it('wraps round rather than running past the end of the loop', () => {
    expect(zzzAt(2, 0.9)).toEqual(zzzAt(0, (0.9 + 2 / SLEEP_RHYTHM.zzzCount) % 1));
  });
});
