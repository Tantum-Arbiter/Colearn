import {
  SKY_FACE_RHYTHM,
  SKY_FACE_SPARKLES,
  laughFace,
  laughGlow,
  laughPose,
  laughsPerMinute,
  nextRestDelay,
  sparkleAt,
} from '@/constants/sky-face';
import { expectSmooth } from '../utils/motion-smoothness';

describe('SKY_FACE_RHYTHM', () => {
  it('laughs about every ten seconds', () => {
    const average = (SKY_FACE_RHYTHM.restMinMs + SKY_FACE_RHYTHM.restMaxMs) / 2;

    expect(average).toBe(10000);
    expect(SKY_FACE_RHYTHM.restMinMs).toBeGreaterThanOrEqual(8000);
    expect(SKY_FACE_RHYTHM.restMaxMs).toBeLessThanOrEqual(12000);
  });

  it('keeps each laugh short', () => {
    expect(SKY_FACE_RHYTHM.laughMs).toBeLessThanOrEqual(2000);
  });
});

describe('nextRestDelay', () => {
  it.each([
    ['the shortest roll', 0, SKY_FACE_RHYTHM.restMinMs],
    ['the longest roll', 1, SKY_FACE_RHYTHM.restMaxMs],
  ])('should return %s', (_case, roll, expected) => {
    const underTest = nextRestDelay(roll);

    expect(underTest).toBe(expected);
  });

  it('should sit between the bounds for a middling roll', () => {
    const underTest = nextRestDelay(0.5);

    expect(underTest).toBeGreaterThan(SKY_FACE_RHYTHM.restMinMs);
    expect(underTest).toBeLessThan(SKY_FACE_RHYTHM.restMaxMs);
  });

  it.each([-4, 2.7])('should clamp a roll of %f', (roll) => {
    const underTest = nextRestDelay(roll);

    expect(underTest).toBeGreaterThanOrEqual(SKY_FACE_RHYTHM.restMinMs);
    expect(underTest).toBeLessThanOrEqual(SKY_FACE_RHYTHM.restMaxMs);
  });

  it('should let the first laugh come sooner so the face is not lifeless on arrival', () => {
    const underTest = nextRestDelay(0, true);

    expect(underTest).toBeLessThan(nextRestDelay(0));
  });

  it('should never make two identical rolls differ', () => {
    const underTest = [nextRestDelay(0.31), nextRestDelay(0.31)];

    expect(underTest[0]).toBe(underTest[1]);
  });
});

describe('laughsPerMinute', () => {
  it('should land close to six a minute across the whole range', () => {
    const underTest = [
      laughsPerMinute(SKY_FACE_RHYTHM.restMinMs),
      laughsPerMinute(SKY_FACE_RHYTHM.restMaxMs),
    ];

    expect(underTest[0]).toBeLessThan(7);
    expect(underTest[1]).toBeGreaterThan(4);
  });

  it('should still spend most of the time at rest', () => {
    const average = (SKY_FACE_RHYTHM.restMinMs + SKY_FACE_RHYTHM.restMaxMs) / 2;

    const underTest = SKY_FACE_RHYTHM.laughMs / (average + SKY_FACE_RHYTHM.laughMs);

    expect(underTest).toBeLessThan(0.2);
  });
});

describe('laughPose', () => {
  const rest = { scaleX: 1, scaleY: 1, rotate: 0, lift: 0 };

  it('starts at rest', () => {
    expect(laughPose(0)).toEqual(rest);
  });

  it('ends at rest', () => {
    const { scaleX, scaleY, rotate, lift } = laughPose(1);

    expect(Math.abs(scaleX - 1)).toBeLessThan(0.005);
    expect(Math.abs(scaleY - 1)).toBeLessThan(0.005);
    expect(Math.abs(rotate)).toBeLessThan(0.2);
    expect(Math.abs(lift)).toBeLessThan(0.2);
  });

  it('crouches before it laughs', () => {
    const { scaleY, scaleX, lift } = laughPose(SKY_FACE_RHYTHM.crouchEnds / 2);

    expect(scaleY).toBeLessThan(0.98);
    expect(scaleX).toBeGreaterThan(1.01);
    expect(lift).toBeGreaterThan(0);
  });

  it('hops off the ground more than once, each hop smaller than the last', () => {
    const samples = Array.from({ length: 400 }, (_, i) => laughPose(i / 400).lift);
    const peaks: number[] = [];
    for (let i = 1; i < samples.length - 1; i++) {
      if (samples[i] < samples[i - 1] && samples[i] <= samples[i + 1] && samples[i] < -1) {
        peaks.push(samples[i]);
      }
    }

    expect(peaks.length).toBe(SKY_FACE_RHYTHM.laughBounces);
    for (let i = 1; i < peaks.length; i++) {
      expect(peaks[i]).toBeGreaterThan(peaks[i - 1]);
    }
  });

  it('wobbles both ways without exceeding the giggle', () => {
    const rotations = Array.from({ length: 400 }, (_, i) => laughPose(i / 400).rotate);

    expect(Math.max(...rotations)).toBeGreaterThan(1);
    expect(Math.min(...rotations)).toBeLessThan(-1);
    expect(Math.max(...rotations.map(Math.abs))).toBeLessThanOrEqual(SKY_FACE_RHYTHM.giggleDegrees + 0.01);
  });

  it('stretches taller on the way up and never below the crouch', () => {
    const scales = Array.from({ length: 400 }, (_, i) => laughPose(i / 400).scaleY);

    expect(Math.max(...scales)).toBeGreaterThan(1.03);
    expect(Math.min(...scales)).toBeGreaterThan(0.9);
  });

  it('clamps progress outside the laugh', () => {
    expect(laughPose(-1)).toEqual(laughPose(0));
    expect(laughPose(2)).toEqual(laughPose(1));
  });

  it('moves without a hitch', () => {
    expectSmooth((progress) => ({ ...laughPose(progress) }), { steps: 400, tolerance: 5 });
  });
});

describe('laughFace', () => {
  it('shows the resting face at rest', () => {
    expect(laughFace(0)).toBe(0);
    expect(laughFace(1)).toBe(0);
  });

  it('wears the laughing face through the middle of the laugh', () => {
    expect(laughFace(0.3)).toBe(1);
    expect(laughFace(0.6)).toBe(1);
  });

  it('changes face only after the crouch has begun', () => {
    expect(laughFace(0.01)).toBe(0);
  });

  it('fades between faces rather than snapping', () => {
    const steps = Array.from({ length: 400 }, (_, i) => Math.abs(laughFace((i + 1) / 400) - laughFace(i / 400)));

    expect(Math.max(...steps)).toBeLessThan(0.05);
  });
});

describe('laughGlow', () => {
  it('is dark at rest and afterwards', () => {
    expect(laughGlow(0)).toBe(0);
    expect(laughGlow(1)).toBe(0);
  });

  it('glows brightest while the face is laughing', () => {
    expect(laughGlow(0.35)).toBeGreaterThan(0.9);
  });

  it('swells and fades smoothly', () => {
    expectSmooth(laughGlow, { steps: 400 });
  });
});

describe('sparkleAt', () => {
  it('has a handful of sparkles at distinct angles', () => {
    const angles = SKY_FACE_SPARKLES.map((sparkle) => sparkle.angle);

    expect(SKY_FACE_SPARKLES.length).toBeGreaterThanOrEqual(3);
    expect(new Set(angles).size).toBe(angles.length);
  });

  it.each(SKY_FACE_SPARKLES.map((_, index) => index))('hides sparkle %i before and after the laugh', (index) => {
    expect(sparkleAt(index, 0).opacity).toBe(0);
    expect(sparkleAt(index, 1).opacity).toBe(0);
  });

  it('shows each sparkle somewhere in the laugh', () => {
    SKY_FACE_SPARKLES.forEach((_, index) => {
      const peak = Math.max(...Array.from({ length: 200 }, (_, i) => sparkleAt(index, i / 200).opacity));
      expect(peak).toBeGreaterThan(0.95);
    });
  });

  it('staggers the sparkles rather than firing them together', () => {
    const firstSeen = SKY_FACE_SPARKLES.map((_, index) => {
      for (let i = 0; i <= 200; i++) {
        if (sparkleAt(index, i / 200).opacity > 0) return i;
      }
      return -1;
    });

    expect(new Set(firstSeen).size).toBe(firstSeen.length);
  });

  it('sends each sparkle outward from the face', () => {
    const start = SKY_FACE_SPARKLES[0].starts;
    const near = sparkleAt(0, start + 0.05);
    const far = sparkleAt(0, start + 0.4);
    const distance = (point: { x: number; y: number }) => Math.hypot(point.x - 0.5, point.y - 0.5);

    expect(distance(far)).toBeGreaterThan(distance(near));
  });

  it.each(SKY_FACE_SPARKLES.map((_, index) => index))('moves sparkle %i without a hitch', (index) => {
    expectSmooth((progress) => ({ ...sparkleAt(index, progress) }), { steps: 400 });
  });
});
