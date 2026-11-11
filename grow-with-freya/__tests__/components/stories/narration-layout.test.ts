import { NAV_BUTTON, NARRATION_WIDTH_SHARE, narrationLayout, readerEdge } from '@/components/stories/narration-layout';

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

