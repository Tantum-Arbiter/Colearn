/**
 * The greeting on the home page is set on an arc, the subtitle on a smaller
 * arc beneath it about the same centre, so the two bow together over the cards.
 */

import {
  ARCHED_GREETING,
  arcLength,
  archedGreetingLayout,
  fitToArc,
  planGreetingTitle,
  textAdvance,
} from '@/constants/arched-greeting';
import { MAX_NICKNAME_LENGTH } from '@/constants/profile';
import ar from '@/locales/ar';
import da from '@/locales/da';
import de from '@/locales/de';
import en from '@/locales/en';
import es from '@/locales/es';
import fr from '@/locales/fr';
import it_ from '@/locales/it';
import ja from '@/locales/ja';
import la from '@/locales/la';
import nl from '@/locales/nl';
import pl from '@/locales/pl';
import pt from '@/locales/pt';
import tr from '@/locales/tr';
import zh from '@/locales/zh';

const PHONE = 402;
const TITLE = 34;
const SUBTITLE = 18;

function pointsOf(path: string): { start: [number, number]; end: [number, number]; radius: number } {
  const match = /^M(-?[\d.]+) (-?[\d.]+) A(-?[\d.]+) -?[\d.]+ 0 0 1 (-?[\d.]+) (-?[\d.]+)$/.exec(path);
  if (!match) {
    throw new Error(`not an arc: ${path}`);
  }

  return { start: [Number(match[1]), Number(match[2])], end: [Number(match[4]), Number(match[5])], radius: Number(match[3]) };
}

describe('archedGreetingLayout', () => {
  const underTest = archedGreetingLayout(PHONE, TITLE, SUBTITLE);

  it('should bow the title up over the cards, from edge to edge of the screen less a margin', () => {
    const { start, end, radius } = pointsOf(underTest.titlePath);

    expect(start[0]).toBe(ARCHED_GREETING.sidePadding);
    expect(end[0]).toBe(PHONE - ARCHED_GREETING.sidePadding);
    expect(start[1]).toBe(end[1]);
    expect(radius).toBe(ARCHED_GREETING.radius);
    expect(underTest.titleSag).toBeGreaterThan(8);
    expect(underTest.titleSag).toBeLessThan(TITLE);
  });

  it('should set the subtitle on a smaller arc beneath the title, about the same centre', () => {
    const title = pointsOf(underTest.titlePath);
    const subtitle = pointsOf(underTest.subtitlePath);

    expect(subtitle.radius).toBeLessThan(title.radius);
    expect(subtitle.end[0] - subtitle.start[0]).toBeLessThan(title.end[0] - title.start[0]);
    expect(subtitle.start[1] - subtitle.radius).toBeGreaterThan(title.start[1] - title.radius);
    expect(subtitle.start[1]).toBeGreaterThan(title.start[1]);
  });

  it('should keep the title\'s apex clear of the top and the subtitle\'s ends clear of the bottom', () => {
    const title = pointsOf(underTest.titlePath);
    const subtitle = pointsOf(underTest.subtitlePath);
    const titleApex = title.start[1] - underTest.titleSag;

    expect(titleApex).toBeGreaterThanOrEqual(TITLE * ARCHED_GREETING.titleAscent);
    expect(underTest.height).toBeGreaterThan(subtitle.start[1] + SUBTITLE * ARCHED_GREETING.subtitleDescent);
  });

  it('should keep the two lines apart by more than the subtitle is tall', () => {
    const title = pointsOf(underTest.titlePath);
    const subtitle = pointsOf(underTest.subtitlePath);
    const titleApex = title.start[1] - underTest.titleSag;
    const subtitleApex = subtitle.start[1] - underTest.subtitleSag;

    expect(subtitleApex - titleApex).toBeGreaterThan(SUBTITLE);
  });

  it('should grow with the type and bow more on a wider screen', () => {
    const bigger = archedGreetingLayout(PHONE, TITLE * 1.3, SUBTITLE * 1.3);
    const wider = archedGreetingLayout(834, TITLE, SUBTITLE);

    expect(bigger.height).toBeGreaterThan(underTest.height);
    expect(wider.titleSag).toBeGreaterThan(underTest.titleSag);
  });

  it('should not fall over on a screen not measured yet', () => {
    const unmeasured = archedGreetingLayout(0, TITLE, SUBTITLE);

    expect(unmeasured.height).toBeGreaterThan(0);
    expect(Number.isFinite(unmeasured.titleSag)).toBe(true);
  });
});

function roomOn(width: number, chordRatio = 1): number {
  return arcLength(ARCHED_GREETING.radius, (width / 2 - ARCHED_GREETING.sidePadding) * chordRatio) * ARCHED_GREETING.arcFill;
}

describe('fitToArc', () => {
  it('should leave a short greeting at its full size', () => {
    expect(fitToArc('Welcome back, Liam!', TITLE, PHONE)).toBe(TITLE);
  });

  it('should shrink a long name or translation until it sits on the arc rather than falling off its ends', () => {
    const underTest = fitToArc('Willkommen zurück, Maximiliane!', TITLE, PHONE);

    expect(underTest).toBeLessThan(TITLE);
    expect(textAdvance('Willkommen zurück, Maximiliane!', underTest, 'heavy')).toBeLessThanOrEqual(roomOn(PHONE));
  });

  /**
   * The arc drops every glyph that runs past its ends, so a floor that left
   * the words too long for it cut letters off -- the W of Welcome went first.
   * However long the words, they are set small enough to be drawn whole.
   */
  it('should never set the words larger than the arc can hold, however long they are', () => {
    for (const text of ['x'.repeat(200), 'W'.repeat(60), 'Welcome back, wdwdsd!']) {
      const size = fitToArc(text, TITLE, PHONE);

      expect(textAdvance(text, size, 'heavy')).toBeLessThanOrEqual(roomOn(PHONE));
    }
  });

  it('should give the subtitle less room, on its shorter arc', () => {
    const text = 'a'.repeat(40);

    expect(fitToArc(text, SUBTITLE, PHONE, ARCHED_GREETING.subtitleChordRatio)).toBeLessThanOrEqual(fitToArc(text, SUBTITLE, PHONE));
  });

  it('should count the medium-weight subtitle as narrower than the heavy title', () => {
    const text = '2 days of stories in a row. Wonderful!';
    const asSubtitle = fitToArc(text, SUBTITLE, PHONE, ARCHED_GREETING.subtitleChordRatio, 'medium');

    expect(textAdvance(text, SUBTITLE, 'medium')).toBeLessThan(textAdvance(text, SUBTITLE, 'heavy'));
    expect(asSubtitle).toBe(SUBTITLE);
  });

  it('should measure the arc as longer than its chord', () => {
    expect(arcLength(ARCHED_GREETING.radius, 177)).toBeGreaterThan(354);
    expect(arcLength(ARCHED_GREETING.radius, 177)).toBeLessThan(354 * 1.1);
  });
});

/**
 * Widths are the rounded face's own, letter by letter. A flat half-em per
 * letter said "Welcome back, wdwdsd!" fitted at full size; drawn, it ran
 * fifty points past the arc.
 */
describe('textAdvance', () => {
  it('should count wide letters wider than narrow ones', () => {
    expect(textAdvance('WWWW', TITLE, 'heavy')).toBeGreaterThan(textAdvance('iiii', TITLE, 'heavy') * 3);
  });

  it('should find the greeting that lost its W too long for one arc at full size', () => {
    expect(textAdvance('Welcome back, wdwdsd!', TITLE, 'heavy')).toBeGreaterThan(roomOn(PHONE));
  });

  it('should measure an accented letter as its base letter', () => {
    expect(textAdvance('ü', TITLE, 'heavy')).toBe(textAdvance('u', TITLE, 'heavy'));
  });

  it('should give a CJK character a full em', () => {
    expect(textAdvance('欢', TITLE, 'heavy')).toBe(TITLE);
  });

  it('should scale with the type', () => {
    expect(textAdvance('Freya', TITLE * 2, 'heavy')).toBeCloseTo(textAdvance('Freya', TITLE, 'heavy') * 2);
  });
});

/**
 * A greeting too long for one arc breaks onto a second, rather than shrinking
 * until it is small or running off the ends: the name comes down to a line of
 * its own and both stay close to full size.
 */
describe('planGreetingTitle', () => {
  it('should leave a greeting that fits on one line', () => {
    expect(planGreetingTitle('Welcome back, Liam!', TITLE, PHONE)).toEqual({ lines: ['Welcome back, Liam!'], size: TITLE });
  });

  it('should bring the name down to a second line when the greeting will not fit on one', () => {
    const underTest = planGreetingTitle('Welcome back, wdwdsd!', TITLE, PHONE);

    expect(underTest.lines).toEqual(['Welcome back,', 'wdwdsd!']);
    expect(underTest.size).toBe(TITLE);
  });

  it('should keep a greeting that only needs a touch smaller on one line', () => {
    const underTest = planGreetingTitle('Welcome back, Freyaa!', TITLE, PHONE);

    expect(underTest.lines).toHaveLength(1);
    expect(underTest.size).toBeGreaterThanOrEqual(TITLE * ARCHED_GREETING.wrapBelow);
  });

  it('should break after a Japanese comma, where there are no spaces', () => {
    const underTest = planGreetingTitle(`${'ア'.repeat(MAX_NICKNAME_LENGTH)}さん、ようこそ！`, TITLE, PHONE);

    expect(underTest.lines).toEqual([`${'ア'.repeat(MAX_NICKNAME_LENGTH)}さん、`, 'ようこそ！']);
  });

  it('should shrink a line with nowhere to break rather than cut it', () => {
    const text = 'W'.repeat(40);
    const underTest = planGreetingTitle(text, TITLE, PHONE);

    expect(underTest.lines).toEqual([text]);
    expect(textAdvance(text, underTest.size, 'heavy')).toBeLessThanOrEqual(roomOn(PHONE));
  });

  /**
   * The name is capped, so the longest greeting there can ever be is known:
   * the widest letter, as many times as the cap allows, in every greeting of
   * every language. On the narrowest phone each still sits whole on its arcs,
   * at no less than the readable floor.
   */
  describe('with the longest name there can be', () => {
    const NARROWEST = 375;
    const LOCALES = { ar, da, de, en, es, fr, it: it_, ja, la, nl, pl, pt, tr, zh };
    const name = 'W'.repeat(MAX_NICKNAME_LENGTH);
    const cases = Object.entries(LOCALES).flatMap(([code, locale]) =>
      Object.entries((locale as any).home.welcome as Record<string, { title: string }>).map(
        ([moment, copy]) => [code, moment, copy.title.replace('{{name}}', name)] as const,
      ),
    );

    it.each(cases)('%s %s fits whole', (_code, _moment, title) => {
      const underTest = planGreetingTitle(title, TITLE, NARROWEST);

      expect(underTest.lines.length).toBeLessThanOrEqual(2);
      expect(underTest.lines.join(' ').replace(/\s+/g, '')).toBe(title.replace(/\s+/g, ''));
      expect(underTest.size).toBeGreaterThanOrEqual(Math.ceil(TITLE * ARCHED_GREETING.minScale));
      for (const line of underTest.lines) {
        expect(textAdvance(line, underTest.size, 'heavy')).toBeLessThanOrEqual(roomOn(NARROWEST));
      }
    });
  });
});

/** Where an arc peaks, and the centre it bows about. */
function apexOf(path: string): number {
  const { start, end, radius } = pointsOf(path);
  const half = (end[0] - start[0]) / 2;
  return start[1] - (radius - Math.sqrt(radius ** 2 - half ** 2));
}

function centreOf(path: string): number {
  return apexOf(path) + pointsOf(path).radius;
}

describe('archedGreetingLayout over two lines', () => {
  const one = archedGreetingLayout(PHONE, TITLE, SUBTITLE);
  const two = archedGreetingLayout(PHONE, TITLE, SUBTITLE, 2);

  it('should set each title line on its own arc', () => {
    expect(two.titlePaths).toHaveLength(2);
    expect(one.titlePaths).toEqual([one.titlePath]);
  });

  it('should hang the second line a line beneath the first, about the same centre', () => {
    expect(pointsOf(two.titlePaths[1]).radius).toBeLessThan(pointsOf(two.titlePaths[0]).radius);
    expect(apexOf(two.titlePaths[1]) - apexOf(two.titlePaths[0])).toBeGreaterThan(TITLE * 0.9);
    expect(centreOf(two.titlePaths[1])).toBeCloseTo(centreOf(two.titlePaths[0]), 3);
  });

  it('should keep the second line as wide as the first, so it holds as much', () => {
    const first = pointsOf(two.titlePaths[0]);
    const second = pointsOf(two.titlePaths[1]);

    expect(second.start[0]).toBe(first.start[0]);
    expect(second.end[0]).toBe(first.end[0]);
  });

  it('should drop the subtitle below the second line and grow to hold it', () => {
    expect(apexOf(two.subtitlePath) - apexOf(two.titlePaths[1])).toBeGreaterThan(SUBTITLE);
    expect(centreOf(two.subtitlePath)).toBeCloseTo(centreOf(two.titlePaths[0]), 3);
    expect(two.height).toBeGreaterThan(one.height + TITLE * 0.9);
  });
});
