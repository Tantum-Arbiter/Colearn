/**
 * Tests for the story card's page preview.
 *
 * While the card is open its cover turns, every few seconds, to the next
 * page of the book, so the pair get a glimpse of what is inside before they
 * choose how to read. The turn is a real page turn: the right-hand half of
 * the picture swings up about the spine as a gently bowed sheet, stands,
 * and comes down on the left, showing the next page on its back and
 * uncovering the rest of it beneath. The bow is a circular bend anchored at
 * the spine, broad mid-turn and shrinking as the page lands, with the rest
 * of the leaf straight at the swing angle; it is drawn as narrow strips.
 */

import type { ImageSourcePropType } from 'react-native';
import {
  STORY_PAGE_PREVIEW,
  cornerPose,
  faceMix,
  foldState,
  frameKey,
  landingShadow,
  leadProgress,
  liftShadow,
  nextFrame,
  previewFrames,
  sheetPoint,
  stripLight,
  stripPose,
  stripTint,
} from '@/constants/story-page-preview';
import type { Story, StoryPage } from '@/types/story';

const art = (name: string) => ({ uri: `test://${name}` }) as unknown as string;

function page(pageNumber: number, extra: Partial<StoryPage> = {}): StoryPage {
  return { id: `p${pageNumber}`, pageNumber, text: 'words', ...extra };
}

function story(extra: Partial<Story> = {}): Story {
  return {
    id: 'juni',
    title: 'Hold On, Juni',
    category: 'growing',
    isAvailable: true,
    coverImage: art('cover') as unknown as ImageSourcePropType,
    pages: [
      page(0, { type: 'cover', backgroundImage: art('cover-full') }),
      page(1, { type: 'story', backgroundImage: art('page-1') }),
      page(2, { type: 'story', backgroundImage: art('page-2') }),
      page(3, { type: 'story', backgroundImage: art('page-3') }),
    ],
    ...extra,
  };
}

const uris = (frames: ImageSourcePropType[]) => frames.map((frame) => frameKey(frame));

describe('previewFrames', () => {
  it('should start on the cover and then show the pages of the book in order', () => {
    const underTest = previewFrames(story());

    expect(uris(underTest)).toEqual(['test://cover', 'test://page-1', 'test://page-2', 'test://page-3']);
  });

  it('should not show the cover twice: the cover page of the book is skipped', () => {
    const underTest = previewFrames(story());

    expect(uris(underTest)).not.toContain('test://cover-full');
  });

  it('should skip pages that have no picture rather than turning to a blank', () => {
    const underTest = previewFrames(story({ pages: [page(1, { backgroundImage: art('page-1') }), page(2), page(3, { backgroundImage: art('page-3') })] }));

    expect(uris(underTest)).toEqual(['test://cover', 'test://page-1', 'test://page-3']);
  });

  it('should show each picture once even when pages share one', () => {
    const underTest = previewFrames(story({ pages: [page(1, { backgroundImage: art('same') }), page(2, { backgroundImage: art('same') })] }));

    expect(uris(underTest)).toEqual(['test://cover', 'test://same']);
  });

  it('should read page pictures given as web addresses', () => {
    const underTest = previewFrames(story({ coverImage: 'https://cdn/cover.webp', pages: [page(1, { backgroundImage: 'https://cdn/p1.webp' })] }));

    expect(underTest).toEqual([{ uri: 'https://cdn/cover.webp' }, { uri: 'https://cdn/p1.webp' }]);
  });

  it('should read bundled pictures given as asset numbers', () => {
    const underTest = previewFrames(story({ coverImage: 7, pages: [page(1, { backgroundImage: 8 as unknown as string })] }));

    expect(underTest).toEqual([7, 8]);
  });

  it('should give only a glimpse: no more than the first few pages after the cover', () => {
    const many = Array.from({ length: STORY_PAGE_PREVIEW.maxPages + 4 }, (_, i) => page(i + 1, { backgroundImage: art(`page-${i + 1}`) }));

    const underTest = previewFrames(story({ pages: many }));

    expect(underTest).toHaveLength(STORY_PAGE_PREVIEW.maxPages + 1);
    expect(uris(underTest)[underTest.length - 1]).toBe(`test://page-${STORY_PAGE_PREVIEW.maxPages}`);
  });

  it('should leave a book with only a cover on its cover', () => {
    const underTest = previewFrames(story({ pages: [page(1), page(2)] }));

    expect(uris(underTest)).toEqual(['test://cover']);
  });

  it('should have nothing to show for a book with no pictures at all', () => {
    const underTest = previewFrames(story({ coverImage: '', pages: undefined }));

    expect(underTest).toEqual([]);
  });
});

describe('nextFrame', () => {
  it.each([
    [0, 4, 1],
    [2, 4, 3],
    [3, 4, 0],
  ])('should turn from frame %i of %i to frame %i, back to the cover after the last page', (from, count, expected) => {
    expect(nextFrame(from, count)).toBe(expected);
  });

  it.each([0, 1])('should stay put with %i frame(s)', (count) => {
    expect(nextFrame(0, count)).toBe(0);
  });
});

describe('the fold', () => {
  const half = 200;
  const { curl } = STORY_PAGE_PREVIEW;

  it('should wait three seconds on each page and turn slowly enough to be easy on the eyes', () => {
    expect(STORY_PAGE_PREVIEW.dwellMs).toBe(3000);
    expect(STORY_PAGE_PREVIEW.turnMs).toBeGreaterThanOrEqual(1800);
    expect(STORY_PAGE_PREVIEW.turnMs).toBeLessThanOrEqual(2600);
    expect(STORY_PAGE_PREVIEW.fadeMs).toBeGreaterThanOrEqual(900);
  });

  it('should be drawn with enough strips to bend smoothly but not so many the phone labours', () => {
    expect(curl.strips).toBeGreaterThanOrEqual(12);
    expect(curl.strips).toBeLessThanOrEqual(40);
  });

  it('should swing the leaf from flat, through upright, to flat on the other side', () => {
    expect(foldState(0, half)).toEqual({ phi: 0, bend: 0 });
    expect(foldState(0.5, half).phi).toBeCloseTo(Math.PI / 2);
    expect(foldState(1, half)).toEqual({ phi: Math.PI, bend: 0 });
  });

  it('should bow the leaf most when it stands upright and flatten it again as it lands', () => {
    const rising = foldState(0.2, half).bend;
    const upright = foldState(0.5, half).bend;
    const landing = foldState(0.9, half).bend;

    expect(upright).toBeCloseTo(half * curl.bend);
    expect(rising).toBeGreaterThan(0);
    expect(rising).toBeLessThan(upright);
    expect(landing).toBeLessThan(rising);
  });

  it('should bow quickly on the way up and settle slowly on the way down, so the landing is soft', () => {
    expect(foldState(0.75, half).bend).toBeLessThan(foldState(0.25, half).bend);
    expect(foldState(0.25, half).bend).toBeGreaterThan(half * curl.bend * 0.75);
  });

  it('should keep the bow within the leaf so the page reads as a page, not a roll', () => {
    expect(curl.bend).toBeGreaterThanOrEqual(0.5);
    expect(curl.bend).toBeLessThanOrEqual(1);
  });

  it('should leave the sheet flat and untouched at rest', () => {
    const { phi, bend } = foldState(0, half);

    expect(sheetPoint(0, phi, bend)).toEqual({ x: 0, theta: 0 });
    expect(sheetPoint(120, phi, bend)).toEqual({ x: 120, theta: 0 });
    expect(sheetPoint(half, phi, bend)).toEqual({ x: half, theta: 0 });
  });

  it('should lay the whole sheet mirrored onto the left once landed', () => {
    const { phi, bend } = foldState(1, half);

    expect(sheetPoint(0, phi, bend).x).toBeCloseTo(0);
    expect(sheetPoint(75, phi, bend).x).toBeCloseTo(-75);
    expect(sheetPoint(half, phi, bend).x).toBeCloseTo(-half);
    expect(sheetPoint(75, phi, bend).theta).toBeCloseTo(Math.PI);
  });

  it('should bend the sheet in a circular bow from the spine and run straight beyond it at the swing angle', () => {
    const phi = Math.PI / 3;
    const bend = 120;
    const radius = bend / phi;

    expect(sheetPoint(0, phi, bend)).toEqual({ x: 0, theta: 0 });
    expect(sheetPoint(bend / 2, phi, bend).theta).toBeCloseTo(phi / 2);
    expect(sheetPoint(bend / 2, phi, bend).x).toBeCloseTo(radius * Math.sin(phi / 2));
    expect(sheetPoint(bend, phi, bend).x).toBeCloseTo(radius * Math.sin(phi));
    expect(sheetPoint(bend + 40, phi, bend).x).toBeCloseTo(radius * Math.sin(phi) + 40 * Math.cos(phi));
    expect(sheetPoint(bend + 40, phi, bend).theta).toBeCloseTo(phi);
  });

  it('should never tear: the sheet is continuous where the bow meets the straight run', () => {
    const phi = 2;
    const bend = 90;

    expect(sheetPoint(bend - 1e-6, phi, bend).x).toBeCloseTo(sheetPoint(bend + 1e-6, phi, bend).x, 4);
  });

  it('should stand the straight run edge-on when upright, so from above the page is a line beyond the bow', () => {
    const { phi, bend } = foldState(0.5, half);

    expect(sheetPoint(bend + 10, phi, bend).x).toBeCloseTo(sheetPoint(bend + 60, phi, bend).x);
  });

  it('should carry the tip smoothly from fore-edge to the far side, never leaping', () => {
    const steps = 40;
    const tips = Array.from({ length: steps + 1 }, (_, i) => {
      const { phi, bend } = foldState(i / steps, half);
      return sheetPoint(half, phi, bend).x;
    });

    const jumps = tips.slice(1).map((x, i) => Math.abs(x - tips[i]));

    expect(tips[0]).toBeCloseTo(half);
    expect(tips[steps]).toBeCloseTo(-half);
    expect(Math.max(...jumps)).toBeLessThan(half * 0.2);
    expect(tips.slice(1).every((x, i) => x <= tips[i] + 1e-9)).toBe(true);
  });

  it('should fold sharply at the spine when there is no bow part-way through', () => {
    expect(sheetPoint(150, Math.PI, 0)).toEqual({ x: -150, theta: Math.PI });
  });

  it('should place a flat strip where it lies, unstretched', () => {
    expect(stripPose(40, 50, 0, 0)).toEqual({ translateX: 0, scaleX: 1 });
  });

  it('should mirror a landed strip onto the left', () => {
    const underTest = stripPose(40, 50, Math.PI, 0);

    expect(underTest.scaleX).toBeCloseTo(-1);
    expect(underTest.translateX).toBeCloseTo(-90);
  });

  it('should squeeze a strip on the bow to the width it shows from above', () => {
    const { phi, bend } = foldState(0.5, half);
    const a = bend * 0.6;
    const b = a + 4;

    const underTest = stripPose(a, b, phi, bend);

    expect(underTest.scaleX).toBeGreaterThan(0);
    expect(underTest.scaleX).toBeLessThan(0.9);
    expect(underTest.translateX).toBeLessThan(0);
  });

  it('should vanish rather than invert a strip standing edge-on', () => {
    const { phi, bend } = foldState(0.5, half);

    const underTest = stripPose(bend + 10, bend + 14, phi, bend);

    expect(Math.abs(underTest.scaleX)).toBeLessThan(0.05);
    expect(Object.is(underTest.scaleX, -0)).toBe(false);
  });

  it('should tile: neighbouring strips meet edge to edge wherever they are on the sheet', () => {
    const { phi, bend } = foldState(0.4, half);
    const w = half / curl.strips;

    const underTest = Array.from({ length: curl.strips - 1 }, (_, i) => {
      const left = stripPose(i * w, (i + 1) * w, phi, bend);
      const right = stripPose((i + 1) * w, (i + 2) * w, phi, bend);
      const leftEdge = (i + 0.5) * w + left.translateX + (w / 2) * left.scaleX;
      const rightEdge = (i + 1.5) * w + right.translateX - (w / 2) * right.scaleX;
      return Math.abs(leftEdge - rightEdge);
    });

    expect(Math.max(...underTest)).toBeLessThan(1e-6);
  });

  it('should turn a strip over gradually: the back face fades in across a narrow window either side of upright, never switching', () => {
    expect(faceMix(0)).toBe(0);
    expect(faceMix(Math.PI / 2 - curl.faceBlend)).toBe(0);
    expect(faceMix(Math.PI / 2)).toBeCloseTo(0.5);
    expect(faceMix(Math.PI / 2 + curl.faceBlend)).toBe(1);
    expect(faceMix(Math.PI)).toBe(1);
    const steps = Array.from({ length: 41 }, (_, i) => faceMix(Math.PI / 2 - curl.faceBlend + (i / 40) * 2 * curl.faceBlend));
    expect(steps.slice(1).every((v, i) => v >= steps[i])).toBe(true);
    expect(Math.max(...steps.slice(1).map((v, i) => v - steps[i]))).toBeLessThan(0.06);
  });

  it('should keep the lighting continuous through upright, so nothing pops as a strip turns over', () => {
    const before = stripLight(Math.PI / 2 - 0.01);
    const after = stripLight(Math.PI / 2 + 0.01);

    expect(Math.abs(before.shade - after.shade)).toBeLessThan(0.02);
    expect(Math.abs(before.highlight - after.highlight)).toBeLessThan(0.02);
    expect(stripLight(Math.PI / 2).shade).toBeGreaterThan(0);
  });

  it('should light the paper like a lamp up-front: the rising face bright, the face past upright in its own shadow, both flats plain', () => {
    expect(stripLight(0)).toEqual({ shade: 0, highlight: 0 });
    expect(stripLight(Math.PI).shade).toBeCloseTo(0);
    expect(stripLight(Math.PI).highlight).toBeCloseTo(0);
    expect(stripLight(Math.PI * 0.25).shade).toBe(0);
    expect(stripLight(Math.PI * 0.6).shade).toBeCloseTo(curl.shade);
    expect(stripLight(Math.PI * 0.9).shade).toBeGreaterThan(0);
    expect(stripLight(Math.PI * 0.9).shade).toBeLessThan(stripLight(Math.PI * 0.6).shade);
  });

  it('should catch the light most where the paper faces the lamp', () => {
    expect(stripLight(curl.crestAngle).highlight).toBeCloseTo(curl.highlight);
    expect(stripLight(curl.crestAngle / 2).highlight).toBeLessThan(curl.highlight);
    expect(stripLight(curl.crestAngle / 2).highlight).toBeGreaterThan(0);
    expect(stripLight(Math.PI / 2).highlight).toBeLessThan(stripLight(curl.crestAngle).highlight);
    expect(curl.highlight).toBeLessThan(curl.shade);
  });

  it('should paint shade as night ink and light as warm paper, one overlay per strip', () => {
    expect(stripTint(Math.PI * 0.6, 1)).toBe(`rgba(4, 9, 31, ${curl.shade})`);
    expect(stripTint(curl.crestAngle, 1)).toMatch(/^rgba\(255, 250, 240, /);
    expect(Number(stripTint(curl.crestAngle, 1).slice(20, -1))).toBeCloseTo(curl.highlight);
    expect(stripTint(0, 1)).toBe('rgba(4, 9, 31, 0)');
  });

  it('should tint a strip only as much as it shows: a strip standing edge-on carries none, so standing strips cannot pile into a dark wedge', () => {
    expect(stripTint(Math.PI * 0.6, 0)).toBe('rgba(4, 9, 31, 0)');
    expect(Number(stripTint(Math.PI * 0.6, 0.1).slice(15, -1))).toBeCloseTo(curl.shade * Math.min(1, 0.1 * curl.presenceGain));
    expect(stripTint(Math.PI * 0.6, -1)).toBe(`rgba(4, 9, 31, ${curl.shade})`);
    expect(stripTint(curl.crestAngle, 0)).toBe('rgba(255, 250, 240, 0)');
  });

  it.each([
    ['a strip all but edge-on', Math.PI * 0.6, 1e-9],
    ['a strip just past the crest', curl.crestAngle, 1e-9],
    ['a strip barely turning', 1e-9, 1],
  ])('should tint %s with a colour Reanimated can parse, never an exponent', (_label, theta, scaleX) => {
    expect(stripTint(theta, scaleX)).toMatch(/^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0\.\d{1,3})\)$/);
  });

  it('should tint every strip of a whole turn with a colour Reanimated can parse', () => {
    for (let step = 0; step <= 2000; step += 1) {
      const theta = (Math.PI * step) / 2000;
      const scaleX = Math.cos(theta);
      expect(stripTint(theta, scaleX)).toMatch(/^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0\.\d{1,3})\)$/);
    }
  });

  it('should keep every shade and shadow gentle enough that the picture stays readable', () => {
    expect(curl.shade).toBeLessThanOrEqual(0.35);
    expect(curl.castShade).toBeLessThanOrEqual(0.35);
    expect(curl.highlight).toBeLessThanOrEqual(0.2);
    expect(curl.cornerLead).toBeLessThanOrEqual(0.15);
    expect(curl.presenceGain).toBeLessThanOrEqual(2);
  });

  it('should cast the lifted leaf\'s shadow onto the uncovered page beyond its outermost point, strongest when upright and gone when flat', () => {
    const rising = foldState(0.25, half);
    const upright = foldState(0.5, half);

    expect(liftShadow(0, 0, half).opacity).toBe(0);
    expect(liftShadow(upright.phi, upright.bend, half).opacity).toBeCloseTo(curl.castShade);
    expect(liftShadow(rising.phi, rising.bend, half).opacity).toBeLessThan(curl.castShade);
    expect(liftShadow(rising.phi, rising.bend, half).translateX).toBeCloseTo(sheetPoint(half, rising.phi, rising.bend).x);
    expect(liftShadow(upright.phi, upright.bend, half).translateX).toBeCloseTo(upright.bend / upright.phi);
    expect(liftShadow(Math.PI, 0, half).opacity).toBeCloseTo(0);
  });

  it('should keep the shadow at the crest of the bow once the leaf is past upright, since the tip has swung back over it', () => {
    const { phi, bend } = foldState(0.7, half);

    const underTest = liftShadow(phi, bend, half).translateX;

    expect(underTest).toBeCloseTo(bend / phi);
    expect(underTest).toBeGreaterThan(sheetPoint(half, phi, bend).x);
  });

  it('should lift the top-right corner first: the top of the leaf runs ahead of the bottom', () => {
    expect(leadProgress(0, 0)).toBe(0);
    expect(leadProgress(0, 1)).toBe(0);
    expect(leadProgress(1, 0)).toBe(1);
    expect(leadProgress(1, 1)).toBe(1);
    expect(leadProgress(0.3, 0)).toBeGreaterThan(leadProgress(0.3, 1));
    expect(leadProgress(0.3, 0)).toBeGreaterThan(0.3);
    expect(leadProgress(0.3, 1)).toBeLessThan(0.3);
    expect(leadProgress(0.3, 0.5)).toBeCloseTo((leadProgress(0.3, 0) + leadProgress(0.3, 1)) / 2);
  });

  it('should lead by a corner, not a whole page: the bottom has started before the top is half-way', () => {
    expect(curl.cornerLead).toBeGreaterThan(0);
    expect(curl.cornerLead).toBeLessThanOrEqual(0.5);
    const bottomStarts = curl.cornerLead / (1 + curl.cornerLead);
    expect(leadProgress(bottomStarts, 0)).toBeLessThan(0.5);
  });

  it('should pose a strip flat with no skew at rest and mirrored with no skew once landed', () => {
    expect(cornerPose(40, 50, 0, half, 100)).toEqual({ translateX: 0, scaleX: 1, skewX: '0deg' });

    const landed = cornerPose(40, 50, 1, half, 100);
    expect(landed.scaleX).toBeCloseTo(-1);
    expect(landed.translateX).toBeCloseTo(-90);
    expect(landed.skewX).toBe('0deg');
  });

  it('should skew a strip mid-turn so its top edge sits where the leading fold puts it and its bottom where the trailing one does', () => {
    const a = 150;
    const b = 154;
    const height = 100;
    const progress = 0.3;
    const top = foldState(leadProgress(progress, 0), half);
    const bottom = foldState(leadProgress(progress, 1), half);
    const topPose = stripPose(a, b, top.phi, top.bend);
    const bottomPose = stripPose(a, b, bottom.phi, bottom.bend);

    const underTest = cornerPose(a, b, progress, half, height);

    expect(underTest.translateX).toBeCloseTo((topPose.translateX + bottomPose.translateX) / 2);
    expect(Number.parseFloat(underTest.skewX)).toBeCloseTo((Math.atan((bottomPose.translateX - topPose.translateX) / height) * 180) / Math.PI);
    expect(Number.parseFloat(underTest.skewX)).toBeGreaterThan(0);
  });

  it('should give a strip the widest of its top, middle and bottom squeezes, so neighbours overlap rather than part', () => {
    const half = 200;
    const a = 120;
    const b = 124;
    const progress = 0.3;
    const widths = [0, 0.5, 1].map((y01) => {
      const { phi, bend } = foldState(leadProgress(progress, y01), half);
      return Math.abs(stripPose(a, b, phi, bend).scaleX);
    });

    const underTest = cornerPose(a, b, progress, half, 100);

    expect(Math.abs(underTest.scaleX)).toBeCloseTo(Math.max(...widths));
    expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths) + 0.01);
  });

  it('should face a strip the way its middle faces, mirrored once past upright', () => {
    const half = 200;
    const late = cornerPose(150, 154, 0.8, half, 100);
    const early = cornerPose(150, 154, 0.15, half, 100);

    expect(late.scaleX).toBeLessThan(0);
    expect(early.scaleX).toBeGreaterThan(0);
  });

  it('should shadow the page being landed on only once the leaf is past upright', () => {
    expect(landingShadow(0.25)).toBe(0);
    expect(landingShadow(0.5)).toBe(0);
    expect(landingShadow(0.75)).toBeCloseTo(curl.castShade);
    expect(landingShadow(1)).toBeCloseTo(0);
  });
});
