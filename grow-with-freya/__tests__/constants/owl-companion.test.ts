import {
  OWL_CANVAS,
  OWL_LAYER_ORDER,
  OWL_RIG,
  OWL_RHYTHM,
  GLANCE_GESTURES,
  TALK_PHRASES,
  blinkDuration,
  blinkShape,
  glanceHold,
  landingSquash,
  lidReveal,
  nextBlinkDelay,
  nextGlanceDelay,
  nextRuffleDelay,
  owlOrigin,
  pickGlance,
  talkBeats,
  talkDuration,
  waveDuration,
  wingPose,
} from '@/constants/owl-companion';
import { expectSmooth } from '../utils/motion-smoothness';

describe('OWL_CANVAS', () => {
  it('keeps the frame the layers were cut from', () => {
    expect(OWL_CANVAS).toEqual({ width: 174, height: 162 });
  });
});

describe('OWL_LAYER_ORDER', () => {
  it('folds the wing behind the body and the face on top of the head', () => {
    expect(OWL_LAYER_ORDER).toEqual(['wing', 'body', 'head', 'eyes', 'beak']);
  });
});

describe('owlOrigin', () => {
  it('turns a canvas point into a percentage origin', () => {
    expect(owlOrigin({ x: 87, y: 81 })).toBe('50% 50%');
  });

  it('rounds to whole percentages, which the native parser accepts', () => {
    expect(owlOrigin({ x: 86, y: 98 })).not.toMatch(/\./);
  });

  it('puts the head pivot at the neck', () => {
    expect(owlOrigin(OWL_RIG.headPivot)).toBe('49% 60%');
  });

  it('puts the wing pivot at the shoulder', () => {
    expect(owlOrigin(OWL_RIG.wingPivot)).toBe('84% 62%');
  });
});

describe('nextBlinkDelay', () => {
  it('blinks soon after arriving', () => {
    expect(nextBlinkDelay(0.9, true)).toBe(OWL_RHYTHM.blinkFirstMs);
  });

  it.each([
    [0, OWL_RHYTHM.blinkMinMs],
    [1, OWL_RHYTHM.blinkMaxMs],
    [0.5, (OWL_RHYTHM.blinkMinMs + OWL_RHYTHM.blinkMaxMs) / 2],
  ])('maps a roll of %s across the quiet stretch', (roll, expected) => {
    expect(nextBlinkDelay(roll)).toBe(expected);
  });

  it('clamps rolls outside the unit range', () => {
    expect(nextBlinkDelay(-3)).toBe(OWL_RHYTHM.blinkMinMs);
    expect(nextBlinkDelay(7)).toBe(OWL_RHYTHM.blinkMaxMs);
  });
});

describe('blinkShape', () => {
  it('doubles on the lowest rolls', () => {
    expect(blinkShape(0)).toBe('double');
    expect(blinkShape(OWL_RHYTHM.doubleBlinkChance - 0.01)).toBe('double');
  });

  it('slows on the next band', () => {
    expect(blinkShape(OWL_RHYTHM.doubleBlinkChance)).toBe('slow');
  });

  it('is quick most of the time', () => {
    expect(blinkShape(0.5)).toBe('quick');
    expect(blinkShape(1)).toBe('quick');
  });
});

describe('blinkDuration', () => {
  it('closes and opens a quick blink well inside a third of a second', () => {
    expect(blinkDuration('quick')).toBe(
      OWL_RHYTHM.blinkDownMs + OWL_RHYTHM.blinkHoldMs + OWL_RHYTHM.blinkUpMs
    );
    expect(blinkDuration('quick')).toBeLessThan(300);
  });

  it('fits two quick blinks and a gap into a double', () => {
    expect(blinkDuration('double')).toBe(blinkDuration('quick') * 2 + OWL_RHYTHM.doubleBlinkGapMs);
  });

  it('lingers on a slow blink', () => {
    expect(blinkDuration('slow')).toBe(
      OWL_RHYTHM.slowBlinkDownMs + OWL_RHYTHM.slowBlinkHoldMs + OWL_RHYTHM.slowBlinkUpMs
    );
    expect(blinkDuration('slow')).toBeGreaterThan(blinkDuration('quick') * 2);
  });
});

describe('nextGlanceDelay', () => {
  it('looks around a while after settling', () => {
    expect(nextGlanceDelay(0.1, true)).toBe(OWL_RHYTHM.glanceFirstMs);
  });

  it.each([
    [0, OWL_RHYTHM.glanceMinMs],
    [1, OWL_RHYTHM.glanceMaxMs],
  ])('maps a roll of %s across the range', (roll, expected) => {
    expect(nextGlanceDelay(roll)).toBe(expected);
  });
});

describe('pickGlance', () => {
  it('reaches every gesture across the unit range', () => {
    const seen = new Set(
      Array.from({ length: 100 }, (_, i) => pickGlance(i / 100))
    );

    expect([...seen].sort()).toEqual([...GLANCE_GESTURES].sort());
  });

  it('stays in range on a roll of exactly one', () => {
    expect(GLANCE_GESTURES).toContain(pickGlance(1));
  });
});

describe('glanceHold', () => {
  it('holds a look within its bounds', () => {
    expect(glanceHold(0)).toBe(OWL_RHYTHM.glanceHoldMinMs);
    expect(glanceHold(1)).toBe(OWL_RHYTHM.glanceHoldMaxMs);
  });
});

describe('nextRuffleDelay', () => {
  it('is the rarest habit', () => {
    expect(nextRuffleDelay(0.5, true)).toBe(OWL_RHYTHM.ruffleFirstMs);
    expect(nextRuffleDelay(0)).toBeGreaterThan(OWL_RHYTHM.glanceMaxMs);
    expect(nextRuffleDelay(1)).toBe(OWL_RHYTHM.ruffleMaxMs);
  });
});

describe('talkBeats', () => {
  it('opens and closes the beak once per syllable', () => {
    const phrase = TALK_PHRASES[0];
    const syllables = phrase.reduce((sum, n) => sum + n, 0);

    const beats = talkBeats(0);

    expect(beats).toHaveLength(syllables * 2);
    beats.forEach((beat, index) => expect(beat.open).toBe(index % 2 === 0));
  });

  it('starts speaking at once', () => {
    expect(talkBeats(0)[0].at).toBe(0);
  });

  it('runs each beat straight after the last, with a breath between phrases', () => {
    const beats = talkBeats(0);
    const boundaries = new Set<number>();
    TALK_PHRASES[0].reduce((count, syllables) => {
      boundaries.add(count);
      return count + syllables * 2;
    }, 0);

    for (let i = 1; i < beats.length; i++) {
      const gap = beats[i].at - (beats[i - 1].at + beats[i - 1].over);
      expect(gap).toBe(boundaries.has(i) ? OWL_RHYTHM.talkPauseMs : 0);
    }
  });

  it('holds every beat long enough to be seen', () => {
    expect(Math.min(...talkBeats(0.5).map((beat) => beat.over))).toBeGreaterThanOrEqual(60);
  });

  it('picks a different phrase on a different roll', () => {
    expect(talkBeats(0).length).not.toBe(talkBeats(0.99).length);
  });

  it('stays in range on a roll of exactly one', () => {
    expect(talkBeats(1)).toEqual(talkBeats(0.99));
  });
});

describe('talkDuration', () => {
  it('ends when the last beat does', () => {
    const beats = talkBeats(0.4);
    const last = beats[beats.length - 1];

    expect(talkDuration(0.4)).toBe(last.at + last.over);
  });

  it('says its piece in under two seconds', () => {
    TALK_PHRASES.forEach((_, i) => {
      expect(talkDuration(i / TALK_PHRASES.length)).toBeLessThan(2000);
    });
  });
});

describe('waveDuration', () => {
  it('raises, waves and lowers', () => {
    expect(waveDuration()).toBe(
      OWL_RHYTHM.waveRaiseMs +
        OWL_RHYTHM.waveBeatMs * OWL_RHYTHM.waveBeats +
        OWL_RHYTHM.waveLowerMs
    );
  });
});

describe('wingPose', () => {
  it('tucks the wing out of sight at rest', () => {
    expect(wingPose(0, 0)).toEqual({ rotate: OWL_RIG.wingTuckedDegrees, opacity: 0 });
  });

  it('raises it fully in view', () => {
    expect(wingPose(1, 0)).toEqual({ rotate: 0, opacity: 1 });
  });

  it('is fully visible before it is half way up', () => {
    expect(wingPose(0.45, 0).opacity).toBe(1);
    expect(wingPose(0.2, 0).opacity).toBeLessThan(1);
  });

  it('adds the wave on top of the raised angle', () => {
    expect(wingPose(1, 1).rotate).toBe(OWL_RIG.wingWaveDegrees);
    expect(wingPose(1, -1).rotate).toBe(-OWL_RIG.wingWaveDegrees);
  });

  it('clamps the lift', () => {
    expect(wingPose(1.5, 0)).toEqual(wingPose(1, 0));
    expect(wingPose(-1, 0)).toEqual(wingPose(0, 0));
  });

  it('moves without a hitch', () => {
    expectSmooth((lift) => wingPose(lift, 0));
  });
});

describe('landingSquash', () => {
  it('is upright before the landing', () => {
    expect(landingSquash(0)).toEqual({ x: 1, y: 1 });
  });

  it('is upright again once settled', () => {
    const { x, y } = landingSquash(1);

    expect(Math.abs(x - 1)).toBeLessThan(0.01);
    expect(Math.abs(y - 1)).toBeLessThan(0.01);
  });

  it('squashes wide and low on impact', () => {
    const { x, y } = landingSquash(0.2);

    expect(x).toBeGreaterThan(1.02);
    expect(y).toBeLessThan(0.97);
  });

  it('rebounds taller than rest before settling', () => {
    const tallest = Math.max(...Array.from({ length: 50 }, (_, i) => landingSquash(0.3 + i / 100).y));

    expect(tallest).toBeGreaterThan(1);
  });

  it('never snaps between squash and rebound', () => {
    expectSmooth(landingSquash, { steps: 300 });
  });
});

describe('lidReveal', () => {
  const scale = 0.7;

  it('keeps the closed-eye art fixed on the face however far the lid is down', () => {
    [0, 0.25, 0.5, 1].forEach((lid) => {
      const { windowTop, contentTop } = lidReveal(lid, scale);
      expect(windowTop + contentTop).toBeCloseTo(0, 6);
    });
  });

  it('reveals nothing with the lid up', () => {
    const { windowTop } = lidReveal(0, scale);
    const windowBottom = windowTop + OWL_RIG.eyeWindow.height * scale;

    expect(windowBottom).toBeCloseTo(OWL_RIG.eyeWindow.top * scale, 6);
  });

  it('covers the whole eye with the lid down', () => {
    expect(lidReveal(1, scale)).toEqual({
      windowTop: OWL_RIG.eyeWindow.top * scale,
      contentTop: -OWL_RIG.eyeWindow.top * scale,
    });
  });

  it('comes down from the top of the eye', () => {
    const half = lidReveal(0.5, scale);
    const bottom = half.windowTop + OWL_RIG.eyeWindow.height * scale;

    expect(bottom).toBeCloseTo((OWL_RIG.eyeWindow.top + OWL_RIG.eyeWindow.height / 2) * scale, 6);
  });
});

describe('OWL_RHYTHM', () => {
  it('lands the owl in well under a second', () => {
    expect(OWL_RHYTHM.arriveMs).toBeLessThan(1000);
  });

  it('breathes slowly', () => {
    expect(OWL_RHYTHM.breathMs).toBeGreaterThanOrEqual(3000);
  });

  it('fits the delight fade inside the delight', () => {
    expect(OWL_RHYTHM.delightFadeMs).toBeLessThan(OWL_RHYTHM.delightMs);
  });

  it('leaves quicker than it arrived', () => {
    expect(OWL_RHYTHM.leaveMs).toBeLessThan(OWL_RHYTHM.arriveMs);
  });
});
