/**
 * Tests for the splash logo's geometry and choreography.
 *
 * The logo is cut into layers by scripts/prepare-splash-logo.py; these rules
 * are what let the layers be animated and still land as the logo.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  NATIVE_SPLASH_IMAGE_WIDTH,
  SPLASH_LEAVES,
  SPLASH_LOGO_LAYERS,
  SPLASH_TIMELINE,
  BOOK_HALVES,
  OUTLINE_STROKES,
  bookPose,
  bookSpineOffset,
  coverSkewYDeg,
  spineFrame,
  spineOpacity,
  growEase,
  growEaseInverse,
  layerFrame,
  leafPivotOffset,
  leafPose,
  leafUnfurlDelayMs,
  logoIntroScale,
  outlineDashOffset,
  outlineForkAt,
  outlineLength,
  outlineOpacity,
  outlinePath,
  outlinePoints,
  outlineStrokeDrawn,
  outlineStrokeWidth,
  revealHeight,
  splashLogoSize,
  type OutlinePoint,
  type SplashLeaf,
} from '@/constants/splash-logo';
import { NIGHT_DEEP } from '@/constants/night-palette';

const PHONE_LOGO = 280;
const TABLET_LOGO = 380;
const LAUNCH_BUDGET_MS = 5900;
const HOLD_MS = 2000;

describe('splashLogoSize', () => {
  it.each([
    ['a phone', 390, PHONE_LOGO],
    ['a large phone', 430, PHONE_LOGO],
    ['a tablet', 834, TABLET_LOGO],
    ['a screen not measured yet', 0, PHONE_LOGO],
  ])('should size the logo for %s', (_case, width, expected) => {
    const underTest = splashLogoSize(width);

    expect(underTest).toBe(expected);
  });
});

describe('logoIntroScale', () => {
  it('should start a phone logo at the size the native launch image left it', () => {
    const underTest = logoIntroScale(PHONE_LOGO);

    expect(NATIVE_SPLASH_IMAGE_WIDTH).toBe(280);
    expect(underTest).toBe(1);
  });

  it('should start a tablet logo shrunk onto the native launch image', () => {
    const underTest = logoIntroScale(TABLET_LOGO);

    expect(underTest).toBeCloseTo(280 / 380, 6);
  });
});

describe('layerFrame', () => {
  it.each(SPLASH_LOGO_LAYERS)('should keep the %s layer inside the logo square', (layer) => {
    const underTest = layerFrame(layer, PHONE_LOGO);

    expect(underTest.left).toBeGreaterThanOrEqual(0);
    expect(underTest.top).toBeGreaterThanOrEqual(0);
    expect(underTest.left + underTest.width).toBeLessThanOrEqual(PHONE_LOGO);
    expect(underTest.top + underTest.height).toBeLessThanOrEqual(PHONE_LOGO);
    expect(underTest.width).toBeGreaterThan(0);
    expect(underTest.height).toBeGreaterThan(0);
  });

  it('should scale a frame with the logo', () => {
    const small = layerFrame('book', 100);

    const underTest = layerFrame('book', 300);

    expect(underTest.left).toBeCloseTo(small.left * 3, 6);
    expect(underTest.top).toBeCloseTo(small.top * 3, 6);
    expect(underTest.width).toBeCloseTo(small.width * 3, 6);
    expect(underTest.height).toBeCloseTo(small.height * 3, 6);
  });

  it('should stand the sprout on the book and hang the roots inside it', () => {
    const book = layerFrame('book', PHONE_LOGO);
    const stem = layerFrame('stem', PHONE_LOGO);
    const roots = layerFrame('roots', PHONE_LOGO);
    const wordmark = layerFrame('wordmark', PHONE_LOGO);
    expect(SPLASH_LOGO_LAYERS).not.toContain('book');

    expect(stem.top).toBeLessThan(book.top);
    expect(stem.top + stem.height).toBeGreaterThan(book.top);
    expect(roots.top + roots.height).toBeLessThan(book.top + book.height);
    expect(roots.left).toBeGreaterThan(book.left);
    expect(wordmark.top).toBeGreaterThan(book.top + book.height);
  });
});

describe('the two halves of the book', () => {
  it('should meet at the spine and together span the whole book', () => {
    const book = layerFrame('book', PHONE_LOGO);
    const left = layerFrame('bookLeft', PHONE_LOGO);
    const right = layerFrame('bookRight', PHONE_LOGO);

    expect(left.left).toBeCloseTo(book.left, 6);
    expect(right.left + right.width).toBeCloseTo(book.left + book.width, 6);
    expect(left.left + left.width).toBeGreaterThanOrEqual(right.left);
  });

  it.each(BOOK_HALVES)('should hinge the %s half on the spine, at the middle of the book', (half) => {
    const book = layerFrame('book', PHONE_LOGO);
    const frame = layerFrame(half, PHONE_LOGO);

    const underTest = bookSpineOffset(half, PHONE_LOGO);

    const spineX = frame.left + frame.width / 2 + underTest;
    expect(spineX).toBeCloseTo(book.left + book.width / 2, 0);
  });

  it('should hinge both halves on the same spine', () => {
    const left = layerFrame('bookLeft', PHONE_LOGO);
    const right = layerFrame('bookRight', PHONE_LOGO);

    const leftSpine = left.left + left.width / 2 + bookSpineOffset('bookLeft', PHONE_LOGO);
    const rightSpine = right.left + right.width / 2 + bookSpineOffset('bookRight', PHONE_LOGO);

    expect(leftSpine).toBeCloseTo(rightSpine, 6);
  });
});

describe('bookPose', () => {
  const flat = { scaleX: 1, shearY: 0 };
  const coverWidth = layerFrame('bookLeft', PHONE_LOGO).width;

  function freeEdgeRise(open: number): number {
    return bookPose('bookLeft', open).shearY * coverWidth;
  }

  it('should start folded shut: the left cover lying flat, mirrored over the right page', () => {
    expect(bookPose('bookLeft', 0)).toEqual({ scaleX: -1, shearY: 0 });
    expect(bookPose('bookRight', 0)).toEqual(flat);
  });

  it('should lie fully open exactly as drawn', () => {
    expect(bookPose('bookLeft', 1)).toEqual(flat);
    expect(bookPose('bookRight', 1)).toEqual(flat);
  });

  it('should swing the cover through edge-on half way, and never move the right page', () => {
    expect(bookPose('bookLeft', 0.5).scaleX).toBeCloseTo(0, 6);
    expect(bookPose('bookLeft', 0.25).scaleX).toBeLessThan(0);
    expect(bookPose('bookLeft', 0.75).scaleX).toBeGreaterThan(0);
    expect(bookPose('bookRight', 0.5)).toEqual(flat);
  });

  it('should arch the free edge of the cover up over the spine, highest when it stands edge-on', () => {
    const rises = [0, 0.1, 0.25, 0.4, 0.5].map(freeEdgeRise);

    expect(rises[0]).toBe(0);
    rises.slice(1).forEach((rise, index) => {
      expect(rise).toBeGreaterThan(rises[index]);
    });
    expect(rises[4]).toBeGreaterThan(coverWidth * 0.4);
    expect(rises[4]).toBeLessThan(coverWidth * 0.7);
  });

  it('should bring the free edge down the far side of the arch the way it went up', () => {
    expect(freeEdgeRise(0.75)).toBeCloseTo(freeEdgeRise(0.25), 6);
    expect(freeEdgeRise(0.9)).toBeCloseTo(freeEdgeRise(0.1), 6);
    expect(freeEdgeRise(1)).toBe(0);
  });

  it('should never fold past shut or stretch past open', () => {
    expect(bookPose('bookLeft', -0.4)).toEqual(bookPose('bookLeft', 0));
    expect(bookPose('bookLeft', 1.3)).toEqual(bookPose('bookLeft', 1));
  });
});

describe('coverSkewYDeg', () => {
  function apply(pose: { scaleX: number; shearY: number }, x: number, y: number): [number, number] {
    const skew = Math.tan((coverSkewYDeg(pose) * Math.PI) / 180);

    return [pose.scaleX * x + 0, y + skew * x + 0];
  }

  it('should not skew a cover lying flat', () => {
    expect(coverSkewYDeg({ scaleX: 1, shearY: 0 })).toBe(0);
    expect(coverSkewYDeg(bookPose('bookLeft', 0))).toBe(0);
  });

  it('should keep the hinge on the spine still whatever the cover is doing', () => {
    const underTest = bookPose('bookLeft', 0.37);

    expect(apply(underTest, 0, 12)).toEqual([0, 12]);
    expect(apply(underTest, 0, -30)).toEqual([0, -30]);
  });

  it('should lift a point on the cover in proportion to its distance from the spine, and up not down', () => {
    const underTest = bookPose('bookLeft', 0.5);

    const [, nearY] = apply(underTest, -10, 0);
    const [, farY] = apply(underTest, -40, 0);
    expect(nearY).toBeLessThan(0);
    expect(farY).toBeCloseTo(nearY * 4, 6);
    expect(farY).toBeCloseTo(-underTest.shearY * 40, 6);
  });

  it('should stay a finite skew when the cover stands edge-on', () => {
    const underTest = coverSkewYDeg(bookPose('bookLeft', 0.5));

    expect(underTest).toBeGreaterThan(0);
    expect(underTest).toBeLessThan(60);
  });

  it('should mirror the shut cover over the right page without lifting it', () => {
    expect(apply(bookPose('bookLeft', 0), -40, 7)).toEqual([40, 7]);
  });
});

describe('the spine of the closed book', () => {
  it('should run the height of the book, on the spine', () => {
    const book = layerFrame('book', PHONE_LOGO);
    const left = layerFrame('bookLeft', PHONE_LOGO);
    const spineX = left.left + left.width / 2 + bookSpineOffset('bookLeft', PHONE_LOGO);

    const underTest = spineFrame(PHONE_LOGO);

    expect(underTest.left + underTest.width / 2).toBeCloseTo(spineX, 0);
    expect(underTest.top).toBeGreaterThanOrEqual(book.top);
    expect(underTest.top + underTest.height).toBeLessThanOrEqual(book.top + book.height);
    expect(underTest.height).toBeGreaterThan(book.height * 0.95);
    expect(underTest.width).toBeGreaterThan(1);
    expect(underTest.width).toBeLessThan(book.width / 20);
  });

  it.each([
    ['drawn while the book is shut', 0, 1],
    ['solid as the cover lifts, not a half-faded bar beside it', 0.25, 1],
    ['solid until the cover is edge-on over it', 0.5, 1],
    ['fading once the cover has passed over', 0.55, 0.5],
    ['gone soon after', 0.6, 0],
    ['gone in the open book, which has no such line', 1, 0],
  ])('should be %s', (_case, open, expected) => {
    expect(spineOpacity(open)).toBeCloseTo(expected, 6);
  });
});

describe('the outline of the shut book', () => {
  const spine = spineFrame(PHONE_LOGO);
  const spineX = spine.left + spine.width / 2;
  const page = layerFrame('bookRight', PHONE_LOGO);
  const book = layerFrame('book', PHONE_LOGO);

  function distance(a: OutlinePoint, b: OutlinePoint): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pointAlong(points: OutlinePoint[], length: number): OutlinePoint {
    let left = length;
    for (let index = 1; index < points.length; index += 1) {
      const step = distance(points[index - 1], points[index]);
      if (left <= step) {
        const t = step === 0 ? 0 : left / step;

        return {
          x: points[index - 1].x + (points[index].x - points[index - 1].x) * t,
          y: points[index - 1].y + (points[index].y - points[index - 1].y) * t,
        };
      }
      left -= step;
    }

    return points[points.length - 1];
  }

  it('should be drawn with the art\'s own line weight', () => {
    const underTest = outlineStrokeWidth(PHONE_LOGO);

    expect(underTest).toBeCloseTo(spine.width, 6);
  });

  it.each(OUTLINE_STROKES)('should keep the %s stroke on the shut book', (stroke) => {
    const underTest = outlinePoints(stroke, PHONE_LOGO);

    expect(underTest.length).toBeGreaterThan(4);
    underTest.forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(spine.left);
      expect(point.x).toBeLessThanOrEqual(page.left + page.width);
      expect(point.y).toBeGreaterThanOrEqual(book.top);
      expect(point.y).toBeLessThanOrEqual(book.top + book.height);
    });
  });

  it('should start the cover stroke at the top edge, just across the stem\'s gap from the spine', () => {
    const stem = layerFrame('stem', PHONE_LOGO);

    const underTest = outlinePoints('cover', PHONE_LOGO);

    const first = underTest[0];
    expect(first.x).toBeGreaterThan(spineX);
    expect(first.x - spineX).toBeLessThan(stem.width);
    expect(Math.abs(first.y - spine.top)).toBeLessThan(spine.width);
  });

  it('should end the cover stroke at the top of the spine, a stem\'s gap from where it began', () => {
    const underTest = outlinePoints('cover', PHONE_LOGO);

    const first = underTest[0];
    const last = underTest[underTest.length - 1];
    expect(Math.abs(last.x - spineX)).toBeLessThan(spine.width);
    expect(Math.abs(last.y - spine.top)).toBeLessThan(spine.width);
    expect(distance(first, last)).toBeLessThan(layerFrame('stem', PHONE_LOGO).width);
  });

  it('should run the cover stroke along the top, down the far edge, under the pages and up the spine', () => {
    const underTest = outlinePoints('cover', PHONE_LOGO);

    const farthest = underTest.reduce((best, point, index) => (point.x > underTest[best].x ? index : best), 0);
    const lowest = underTest.reduce((best, point, index) => (point.y > underTest[best].y ? index : best), 0);
    expect(underTest[1].x).toBeGreaterThan(underTest[0].x);
    expect(Math.abs(underTest[1].y - underTest[0].y)).toBeLessThan(spine.width);
    expect(underTest[farthest].x).toBeGreaterThan(spineX + book.width / 3);
    expect(farthest).toBeLessThan(lowest);
    expect(Math.abs(underTest[lowest].x - spineX)).toBeLessThan(book.width / 4);
    expect(underTest.slice(lowest).every((point) => point.x < spineX + spine.width)).toBe(true);
  });

  it('should fork the page line off the cover stroke where the far edge turns under, and run it to the spine', () => {
    const cover = outlinePoints('cover', PHONE_LOGO);
    const forkAt = outlineForkAt(PHONE_LOGO);

    const underTest = outlinePoints('page', PHONE_LOGO);

    const fork = underTest[0];
    const end = underTest[underTest.length - 1];
    expect(forkAt).toBeGreaterThan(0);
    expect(forkAt).toBeLessThan(outlineLength('cover', PHONE_LOGO));
    expect(distance(pointAlong(cover, forkAt), fork)).toBeLessThan(spine.width);
    expect(fork.x).toBeGreaterThan(spineX + book.width / 3);
    expect(Math.abs(end.x - spineX)).toBeLessThan(spine.width);
    expect(end.y).toBeGreaterThan(book.top + book.height / 2);
  });

  it('should keep the page line shorter than the cover stroke it forks from', () => {
    expect(outlineLength('page', PHONE_LOGO)).toBeLessThan(outlineLength('cover', PHONE_LOGO) / 2);
    expect(outlineForkAt(PHONE_LOGO) + outlineLength('page', PHONE_LOGO)).toBeLessThan(outlineLength('cover', PHONE_LOGO));
  });

  it.each(OUTLINE_STROKES)('should scale the %s stroke with the logo', (stroke) => {
    const small = outlineLength(stroke, 100);

    const underTest = outlineLength(stroke, 300);

    expect(underTest).toBeCloseTo(small * 3, 6);
    expect(outlineStrokeWidth(300)).toBeCloseTo(outlineStrokeWidth(100) * 3, 6);
    expect(outlineForkAt(300)).toBeCloseTo(outlineForkAt(100) * 3, 6);
  });

  it.each(OUTLINE_STROKES)('should write the %s stroke as one path the pen follows point to point', (stroke) => {
    const points = outlinePoints(stroke, PHONE_LOGO);

    const underTest = outlinePath(stroke, PHONE_LOGO);

    expect(underTest).toMatch(/^M-?\d+(\.\d+)? -?\d+(\.\d+)?( L-?\d+(\.\d+)? -?\d+(\.\d+)?)+$/);
    expect(underTest.split(' L')).toHaveLength(points.length);
  });
});

describe('outlineStrokeDrawn', () => {
  const coverLength = outlineLength('cover', PHONE_LOGO);
  const pageLength = outlineLength('page', PHONE_LOGO);
  const forkFraction = outlineForkAt(PHONE_LOGO) / coverLength;

  it.each([
    ['none of the cover before the pen starts', 0, 0],
    ['half the cover half way', 0.5, 0.5],
    ['all of the cover when the pen finishes', 1, 1],
    ['no more than all of it on an overshoot', 1.2, 1],
    ['none of it on an undershoot', -0.3, 0],
  ])('should draw %s', (_case, drawn, expected) => {
    const underTest = outlineStrokeDrawn('cover', drawn);

    expect(underTest).toBeCloseTo(expected, 6);
  });

  it('should hold the page line until the pen reaches the fork', () => {
    expect(outlineStrokeDrawn('page', 0)).toBe(0);
    expect(outlineStrokeDrawn('page', forkFraction - 0.01)).toBe(0);
    expect(outlineStrokeDrawn('page', forkFraction)).toBeCloseTo(0, 6);
  });

  it('should draw the page line at the pen\'s own speed from the fork', () => {
    const underTest = outlineStrokeDrawn('page', (outlineForkAt(PHONE_LOGO) + pageLength / 2) / coverLength);

    expect(underTest).toBeCloseTo(0.5, 6);
  });

  it('should finish the page line before the pen finishes the cover', () => {
    expect(outlineStrokeDrawn('page', (outlineForkAt(PHONE_LOGO) + pageLength) / coverLength)).toBeCloseTo(1, 6);
    expect(outlineStrokeDrawn('page', 1)).toBe(1);
  });
});

describe('outlineOpacity', () => {
  it.each([0, 0.25, 0.5, 0.75, 0.999])('should keep the line solid while the book is inked in over it, at %s', (ink) => {
    expect(outlineOpacity(ink)).toBe(1);
  });

  it('should drop the line once the art covers it, not dip through a cross-fade', () => {
    expect(outlineOpacity(1)).toBe(0);
    expect(outlineOpacity(1.2)).toBe(0);
  });
});

describe('outlineDashOffset', () => {
  it.each([
    ['hide the whole line before the pen starts', 0, 120],
    ['show half of it half way', 0.5, 60],
    ['show all of it once drawn', 1, 0],
  ])('should %s', (_case, drawn, expected) => {
    const underTest = outlineDashOffset(120, drawn);

    expect(underTest).toBeCloseTo(expected, 6);
  });
});

describe('leafPivotOffset', () => {
  it.each(SPLASH_LEAVES)('should hinge the %s where it meets the stem', (leaf) => {
    const frame = layerFrame(leaf, PHONE_LOGO);
    const stem = layerFrame('stem', PHONE_LOGO);

    const underTest = leafPivotOffset(leaf, PHONE_LOGO);

    const pivotX = frame.left + frame.width / 2 + underTest.x;
    const pivotY = frame.top + frame.height / 2 + underTest.y;
    expect(pivotX).toBeGreaterThanOrEqual(stem.left);
    expect(pivotX).toBeLessThanOrEqual(stem.left + stem.width);
    expect(pivotY).toBeGreaterThanOrEqual(stem.top);
    expect(pivotY).toBeLessThanOrEqual(stem.top + stem.height);
  });

  it('should hinge the side leaves on opposite sides and the top leaf at its foot', () => {
    const left = leafPivotOffset('leafLeft', PHONE_LOGO);
    const right = leafPivotOffset('leafRight', PHONE_LOGO);
    const top = leafPivotOffset('leafTop', PHONE_LOGO);

    expect(left.x).toBeGreaterThan(0);
    expect(right.x).toBeLessThan(0);
    expect(top.y).toBeGreaterThan(0);
    expect(Math.abs(top.x)).toBeLessThan(layerFrame('leafTop', PHONE_LOGO).width / 4);
  });
});

describe('growEase', () => {
  it('should start and finish exactly', () => {
    expect(growEase(0)).toBe(0);
    expect(growEase(1)).toBe(1);
  });

  it('should only ever grow', () => {
    const samples = Array.from({ length: 41 }, (_, step) => growEase(step / 40));

    samples.slice(1).forEach((value, index) => {
      expect(value).toBeGreaterThan(samples[index]);
    });
  });

  it('should ease in and out rather than run at a constant rate', () => {
    expect(growEase(0.25)).toBeLessThan(0.25);
    expect(growEase(0.75)).toBeGreaterThan(0.75);
    expect(growEase(0.5)).toBeCloseTo(0.5, 6);
  });

  it.each([0, 0.1, 0.35, 0.5, 0.62, 0.9, 1])('should be undone by its inverse at %s', (time) => {
    const underTest = growEaseInverse(growEase(time));

    expect(underTest).toBeCloseTo(time, 6);
  });
});

describe('revealHeight', () => {
  it.each([
    ['nothing before it starts', 0, 0],
    ['half way', 0.5, 60],
    ['everything once grown', 1, 120],
    ['no more than everything on an overshoot', 1.2, 120],
    ['nothing on an undershoot', -0.3, 0],
  ])('should show %s', (_case, progress, expected) => {
    const underTest = revealHeight(progress, 120);

    expect(underTest).toBe(expected);
  });
});

describe('leafUnfurlDelayMs', () => {
  const stem = layerFrame('stem', 1);
  const stemBottom = stem.top + stem.height;

  function stemTipAt(timeMs: number): number {
    const elapsed = (timeMs - SPLASH_TIMELINE.stem.delayMs) / SPLASH_TIMELINE.stem.durationMs;
    const grown = growEase(Math.min(Math.max(elapsed, 0), 1));

    return stemBottom - grown * stem.height;
  }

  it.each(SPLASH_LEAVES)('should hold the %s until the stem has grown to its neck', (leaf) => {
    const frame = layerFrame(leaf, 1);
    const neckY = frame.top + frame.height / 2 + leafPivotOffset(leaf, 1).y;

    const underTest = leafUnfurlDelayMs(leaf);

    expect(stemTipAt(underTest)).toBeLessThanOrEqual(neckY + 1e-6);
    expect(stemTipAt(underTest - 40)).toBeGreaterThan(neckY);
  });

  it('should open the leaves from the lowest neck upwards', () => {
    const order = [...SPLASH_LEAVES].sort((a, b) => leafUnfurlDelayMs(a) - leafUnfurlDelayMs(b));

    expect(order).toEqual(['leafLeft', 'leafRight', 'leafTop']);
  });
});

describe('leafPose', () => {
  it.each(SPLASH_LEAVES)('should rest the %s exactly as drawn', (leaf) => {
    const underTest = leafPose(leaf, 1, 0);

    expect(underTest).toEqual({ scale: 1, rotateDeg: 0 });
  });

  it.each(SPLASH_LEAVES)('should start the %s closed and folded', (leaf) => {
    const underTest = leafPose(leaf, 0, 0);

    expect(underTest.scale).toBe(0);
    expect(Math.abs(underTest.rotateDeg)).toBeGreaterThan(10);
  });

  it('should fold the side leaves in towards the stem from opposite sides', () => {
    const left = leafPose('leafLeft', 0, 0);
    const right = leafPose('leafRight', 0, 0);

    expect(Math.sign(left.rotateDeg)).toBe(-Math.sign(right.rotateDeg));
  });

  it('should keep a closed leaf still in the breeze', () => {
    const underTest = leafPose('leafLeft', 0, 1);

    expect(underTest.rotateDeg).toBe(leafPose('leafLeft', 0, 0).rotateDeg);
  });

  it('should sway an open leaf gently, and not all leaves together', () => {
    const swayed = SPLASH_LEAVES.map((leaf: SplashLeaf) => leafPose(leaf, 1, 1).rotateDeg);

    swayed.forEach((degrees) => {
      expect(Math.abs(degrees)).toBeGreaterThan(0);
      expect(Math.abs(degrees)).toBeLessThanOrEqual(4);
    });
    expect(new Set(swayed).size).toBe(SPLASH_LEAVES.length);
    expect(leafPose('leafLeft', 1, -1).rotateDeg).toBeCloseTo(-swayed[0], 6);
  });
});

describe('SPLASH_TIMELINE', () => {
  const bookOpenAt = SPLASH_TIMELINE.book.delayMs + SPLASH_TIMELINE.book.durationMs;
  const lastLeaf = Math.max(...SPLASH_LEAVES.map(leafUnfurlDelayMs)) + SPLASH_TIMELINE.leafUnfurlMs;
  const entrances = [
    SPLASH_TIMELINE.outline.delayMs + SPLASH_TIMELINE.outline.durationMs,
    SPLASH_TIMELINE.ink.delayMs + SPLASH_TIMELINE.ink.durationMs,
    bookOpenAt,
    SPLASH_TIMELINE.stem.delayMs + SPLASH_TIMELINE.stem.durationMs,
    SPLASH_TIMELINE.roots.delayMs + SPLASH_TIMELINE.roots.durationMs,
    SPLASH_TIMELINE.wordmark.delayMs + SPLASH_TIMELINE.wordmark.durationMs,
    SPLASH_TIMELINE.tagline.delayMs + SPLASH_TIMELINE.tagline.durationMs,
    lastLeaf,
  ];

  it('should draw the outline of the shut book, ink it in, and only then open it', () => {
    expect(SPLASH_TIMELINE.outline.durationMs).toBeGreaterThanOrEqual(500);
    expect(SPLASH_TIMELINE.outline.delayMs + SPLASH_TIMELINE.outline.durationMs).toBeLessThanOrEqual(
      SPLASH_TIMELINE.ink.delayMs
    );
    expect(SPLASH_TIMELINE.ink.delayMs + SPLASH_TIMELINE.ink.durationMs).toBeLessThanOrEqual(
      SPLASH_TIMELINE.book.delayMs
    );
  });

  it('should have the book lying fully open before the stem rises out of it', () => {
    expect(SPLASH_TIMELINE.stem.delayMs).toBeGreaterThanOrEqual(bookOpenAt);
    expect(SPLASH_TIMELINE.book.durationMs).toBeGreaterThanOrEqual(500);
  });

  it('should start the roots spreading the moment the cover passes edge-on over the spine', () => {
    const coverEdgeOnAt = SPLASH_TIMELINE.book.delayMs + growEaseInverse(0.5) * SPLASH_TIMELINE.book.durationMs;

    expect(SPLASH_TIMELINE.roots.delayMs).toBe(Math.ceil(coverEdgeOnAt));
    expect(SPLASH_TIMELINE.roots.delayMs).toBeGreaterThan(SPLASH_TIMELINE.book.delayMs);
    expect(SPLASH_TIMELINE.roots.delayMs).toBeLessThan(bookOpenAt);
    expect(SPLASH_TIMELINE.roots.delayMs).toBeLessThan(SPLASH_TIMELINE.stem.delayMs);
  });

  it('should count the logo as there once its last piece has arrived', () => {
    expect(SPLASH_TIMELINE.logoCompleteMs).toBe(Math.max(...entrances));
  });

  it('should hold the finished logo for two seconds before the screen starts to leave', () => {
    expect(SPLASH_TIMELINE.holdMs).toBe(HOLD_MS);
    expect(SPLASH_TIMELINE.exitAtMs - Math.max(...entrances)).toBe(HOLD_MS);
  });

  it('should only ever open the app behind a finished logo', () => {
    expect(SPLASH_TIMELINE.mountAllowanceMs).toBeGreaterThan(0);
    expect(SPLASH_TIMELINE.mountAllowanceMs).toBeLessThanOrEqual(SPLASH_TIMELINE.holdMs);
    expect(SPLASH_TIMELINE.exitAtMs - SPLASH_TIMELINE.mountAllowanceMs).toBeGreaterThanOrEqual(
      SPLASH_TIMELINE.logoCompleteMs
    );
  });

  it('should bring the wordmark in once the sprout is mostly grown', () => {
    expect(SPLASH_TIMELINE.wordmark.delayMs).toBeGreaterThanOrEqual(leafUnfurlDelayMs('leafTop'));
  });

  it('should not keep a family waiting longer than the hold asks for', () => {
    expect(SPLASH_TIMELINE.exitAtMs + SPLASH_TIMELINE.handoffMs + SPLASH_TIMELINE.exitMs).toBeLessThanOrEqual(
      LAUNCH_BUDGET_MS
    );
  });

  it('should give the page behind a moment to draw before fading off it, but not a noticeable one', () => {
    expect(SPLASH_TIMELINE.handoffMs).toBeGreaterThanOrEqual(50);
    expect(SPLASH_TIMELINE.handoffMs).toBeLessThanOrEqual(200);
  });
});

describe('the native launch screen', () => {
  interface NativeSplash {
    imageWidth: number;
    backgrounds: string[];
  }

  function fromAppConfig(): NativeSplash {
    const source = readFileSync(join(__dirname, '../../app.config.js'), 'utf8');
    const block = source.slice(source.indexOf("'expo-splash-screen'"));
    const plugin = block.slice(0, block.indexOf(']'));

    return {
      imageWidth: Number(/imageWidth:\s*(\d+)/.exec(plugin)?.[1]),
      backgrounds: [...plugin.matchAll(/backgroundColor:\s*'(#[0-9A-Fa-f]{6})'/g)].map((match) => match[1]),
    };
  }

  function fromAppJson(): NativeSplash {
    const plugins: unknown[] = JSON.parse(readFileSync(join(__dirname, '../../app.json'), 'utf8')).expo.plugins;
    const entry = plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') as [
      string,
      { imageWidth: number; backgroundColor: string; dark: { backgroundColor: string } },
    ];

    return {
      imageWidth: entry[1].imageWidth,
      backgrounds: [entry[1].backgroundColor, entry[1].dark.backgroundColor],
    };
  }

  it.each([
    ['app.config.js', fromAppConfig],
    ['app.json', fromAppJson],
  ])('should hand over to the animated book at the same size and on the same sky in %s', (_file, read) => {
    const underTest = read();

    expect(underTest.imageWidth).toBe(NATIVE_SPLASH_IMAGE_WIDTH);
    expect(underTest.backgrounds).toEqual([NIGHT_DEEP, NIGHT_DEEP]);
  });
});
