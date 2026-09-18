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
  bookPose,
  bookShiftX,
  bookSpineOffset,
  spineFrame,
  spineOpacity,
  growEase,
  growEaseInverse,
  layerFrame,
  leafPivotOffset,
  leafPose,
  leafUnfurlDelayMs,
  logoIntroScale,
  revealHeight,
  splashLogoSize,
  type SplashLeaf,
} from '@/constants/splash-logo';
import { NIGHT_DEEP } from '@/constants/night-palette';

const PHONE_LOGO = 280;
const TABLET_LOGO = 380;
const LAUNCH_BUDGET_MS = 4900;
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
  it('should start folded shut: the left cover lying mirrored over the right page', () => {
    expect(bookPose('bookLeft', 0).scaleX).toBe(-1);
    expect(bookPose('bookRight', 0).scaleX).toBe(1);
  });

  it('should centre the closed book, which is only half as wide as the open one', () => {
    const book = layerFrame('book', PHONE_LOGO);

    const underTest = bookShiftX(0, PHONE_LOGO);

    expect(underTest).toBeCloseTo(-book.width / 4, 6);
  });

  it('should lie fully open exactly as drawn', () => {
    expect(bookPose('bookLeft', 1)).toEqual({ scaleX: 1 });
    expect(bookPose('bookRight', 1)).toEqual({ scaleX: 1 });
    expect(bookShiftX(1, PHONE_LOGO)).toBe(0);
  });

  it('should swing the cover through edge-on half way, and never move the right page', () => {
    expect(bookPose('bookLeft', 0.5).scaleX).toBeCloseTo(0, 6);
    expect(bookPose('bookLeft', 0.25).scaleX).toBeLessThan(0);
    expect(bookPose('bookLeft', 0.75).scaleX).toBeGreaterThan(0);
    expect(bookPose('bookRight', 0.5).scaleX).toBe(1);
  });

  it('should never fold past shut or stretch past open', () => {
    expect(bookPose('bookLeft', -0.4)).toEqual(bookPose('bookLeft', 0));
    expect(bookPose('bookLeft', 1.3)).toEqual(bookPose('bookLeft', 1));
    expect(bookShiftX(1.3, PHONE_LOGO)).toBe(0);
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
    bookOpenAt,
    SPLASH_TIMELINE.stem.delayMs + SPLASH_TIMELINE.stem.durationMs,
    SPLASH_TIMELINE.roots.delayMs + SPLASH_TIMELINE.roots.durationMs,
    SPLASH_TIMELINE.wordmark.delayMs + SPLASH_TIMELINE.wordmark.durationMs,
    SPLASH_TIMELINE.tagline.delayMs + SPLASH_TIMELINE.tagline.durationMs,
    lastLeaf,
  ];

  it('should have the book lying fully open before anything grows out of it', () => {
    expect(SPLASH_TIMELINE.stem.delayMs).toBeGreaterThanOrEqual(bookOpenAt);
    expect(SPLASH_TIMELINE.roots.delayMs).toBeGreaterThanOrEqual(SPLASH_TIMELINE.stem.delayMs);
    expect(SPLASH_TIMELINE.book.durationMs).toBeGreaterThanOrEqual(500);
  });

  it('should count the logo as there once its last piece has arrived', () => {
    expect(SPLASH_TIMELINE.logoCompleteMs).toBe(Math.max(...entrances));
  });

  it('should hold the finished logo for two seconds before the screen starts to leave', () => {
    expect(SPLASH_TIMELINE.holdMs).toBe(HOLD_MS);
    expect(SPLASH_TIMELINE.exitAtMs - Math.max(...entrances)).toBe(HOLD_MS);
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
