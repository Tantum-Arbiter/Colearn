import { NAV_BUTTON, NARRATION_WIDTH_SHARE, PHONE_READER, captionScale, narrationLayout, readerEdge, readerScale } from '@/components/stories/narration-layout';

const NONE = { left: 0, right: 0, bottom: 0 };

describe('narration sits along the bottom edge in every book', () => {
  it.each([
    ['a 20:9 phone', 874, 402, { left: 59, right: 59, bottom: 21 }],
    ['a 16:9 phone', 844, 390, NONE],
    ['a landscape tablet', 1194, 834, { left: 0, right: 0, bottom: 20 }],
    ['a portrait tablet', 834, 1194, NONE],
  ])('%s: 85% of the width between the corner arrows, centred, on the bottom edge', (_name, width, height, insets) => {
    const underTest = narrationLayout(width, height, insets);

    const side = Math.max(Math.max(insets.left, insets.right) + 20, width * 0.05) + NAV_BUTTON + 12;
    const between = width - 2 * side;
    expect(underTest.width).toBeCloseTo(between * 0.85);
    expect(underTest.maxWidth).toBeCloseTo(between * 0.85);
    expect(underTest.left).toBeCloseTo(side + between * 0.075);
    expect(underTest.right).toBeCloseTo(side + between * 0.075);
    expect(underTest.bottom).toBe(Math.max(insets.bottom, 12));
    expect(underTest.top).toBeUndefined();
    expect(underTest.maxHeight).toBeLessThanOrEqual(height * 0.34 + 0.01);
    expect(underTest.justifyContent).toBe('flex-end');
  });

  it('is centred: as far from the left edge as from the right', () => {
    const underTest = narrationLayout(844, 390, NONE);

    expect(underTest.left).toBe(underTest.right);
    expect(underTest.left! + underTest.width + underTest.right).toBeCloseTo(844);
  });
});

it('the share is 85%: the box was narrowed by 15% (operator, 2026-11-11)', () => {
  expect(NARRATION_WIDTH_SHARE).toBe(0.85);
});

describe('readerEdge', () => {
  it.each([
    ['no inset, as on a tablet', 0, 20],
    ['a phone on its side, beside the island or the home side', 59, 27],
    ['a 62-point inset', 62, 28],
  ])('%s: the buttons sit %p points in at an inset of %p', (_name, inset, expected) => {
    expect(readerEdge(inset as number)).toBe(expected);
  });

  it('uses more of the width on a phone on its side than the old inset-plus-20 margin', () => {
    expect(readerEdge(59)).toBeLessThan(59 + 20);
  });

  it('never closer to the edge than 20 points', () => {
    for (const inset of [0, 5, 20, 44]) expect(readerEdge(inset)).toBeGreaterThanOrEqual(20);
  });
});

describe('readerScale: how much larger a tablet draws the phone`s reader', () => {
  it.each([
    ['the reference phone', 874, 402],
    ['a larger phone', 932, 430],
  ])('is the phone itself on %s', (_name, width, height) => {
    expect(readerScale(width, height, false)).toBe(1);
  });

  it.each([
    ['on its side', 1210, 834],
    ['upright', 834, 1210],
  ])('is the same for an 11-inch tablet %s: its long side over the phone`s', (_name, width, height) => {
    expect(readerScale(width, height, true)).toBeCloseTo(1210 / PHONE_READER.width);
  });

  it('never shrinks the phone`s reader on a small tablet', () => {
    expect(readerScale(800, 600, true)).toBe(1);
  });
});

describe('the caption on a tablet is the phone`s caption, scaled', () => {
  const phone = narrationLayout(PHONE_READER.width, PHONE_READER.height, PHONE_READER.insets);
  const NONE = { left: 0, right: 0, bottom: 20 };

  it.each([
    ['the reference phone', PHONE_READER.width, PHONE_READER.height],
    ['a small phone', 667, 375],
  ])('is the phone`s own box on %s', (_name, width, height) => {
    expect(captionScale(width, height, PHONE_READER.insets, false)).toBe(1);
  });

  it('on a tablet on its side, the box is the phone`s box at the tablet`s scale', () => {
    const scale = captionScale(1210, 834, NONE, true);

    const underTest = narrationLayout(1210, 834, NONE, true);

    expect(scale).toBeCloseTo(readerScale(1210, 834, true));
    expect(underTest.width).toBeCloseTo(phone.width * scale);
  });

  it('upright, it shrinks just enough to fit between the corner arrows, text and box together', () => {
    const scale = captionScale(834, 1210, NONE, true);
    const side = Math.max(20, 834 * 0.05) + NAV_BUTTON + 12;

    const underTest = narrationLayout(834, 1210, NONE, true);

    expect(scale).toBeLessThan(readerScale(834, 1210, true));
    expect(underTest.width).toBeCloseTo(834 - 2 * side);
    expect(underTest.width).toBeCloseTo(phone.width * scale);
  });

  it('stays centred on a tablet', () => {
    const underTest = narrationLayout(834, 1210, NONE, true);

    expect(underTest.left).toBeCloseTo(underTest.right);
    expect(underTest.left + underTest.width + underTest.right).toBeCloseTo(834);
  });
});

