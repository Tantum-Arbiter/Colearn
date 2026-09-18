/**
 * Tests for the trend chart's x axis.
 *
 * The axis used to lay its labels out with `space-between` over one empty
 * Text per unlabelled day, so at 14 and 30 days the four real labels were
 * spread by the gaps between them rather than placed under their own bars --
 * and the last one ran off the end of the card. These pin the replacement:
 * how many labels fit is worked out from how wide they actually are, so a
 * language with longer date names simply gets fewer of them, and no label is
 * ever allowed outside the chart.
 */

import {
  AXIS_LABEL_GAP,
  axisLabelEvery,
  axisLabelLeft,
  estimateTextWidth,
} from '@/constants/usage-trend-axis';

const FONT = 11;

describe('estimateTextWidth', () => {
  it('should grow with the length of the text', () => {
    const underTest = estimateTextWidth('22 Aug', FONT);

    expect(underTest).toBeGreaterThan(estimateTextWidth('22', FONT));
  });

  it('should grow with the font size', () => {
    const underTest = estimateTextWidth('22 Aug', 16);

    expect(underTest).toBeGreaterThan(estimateTextWidth('22 Aug', 10));
  });

  it('should allow more room for scripts drawn on a square body', () => {
    const cjk = estimateTextWidth('8月22日', FONT);
    const latin = estimateTextWidth('22 Aug', FONT);

    expect(cjk / 4).toBeGreaterThan(latin / 6);
  });

  // a label is drawn inside a box this wide, so guessing narrow clips it
  it.each(['Wed', 'Mon', '22 Aug', '22 September'])(
    'should leave headroom rather than clip %s',
    (text) => {
      const underTest = estimateTextWidth(text, FONT);

      expect(underTest).toBeGreaterThanOrEqual(text.length * FONT * 0.65);
    }
  );

  it('should be nothing for nothing', () => {
    expect(estimateTextWidth('', FONT)).toBe(0);
  });
});

describe('axisLabelEvery', () => {
  it.each([
    ['a week', 7],
    ['a fortnight', 14],
    ['a month', 30],
  ])('should keep every label inside the chart across %s', (_case, count) => {
    const chartWidth = 300;
    const labelWidth = estimateTextWidth('22 Aug', FONT);

    const every = axisLabelEvery(count, chartWidth, labelWidth);
    const shown = Math.ceil(count / every);

    expect(shown * (labelWidth + AXIS_LABEL_GAP)).toBeLessThanOrEqual(chartWidth);
  });

  it('should thin the labels out further as they get wider', () => {
    const narrow = axisLabelEvery(30, 300, estimateTextWidth('22', FONT));
    const wide = axisLabelEvery(30, 300, estimateTextWidth('22 September', FONT));

    expect(wide).toBeGreaterThan(narrow);
  });

  it('should show more labels as the chart is given more room', () => {
    const labelWidth = estimateTextWidth('22 Aug', FONT);

    const cramped = axisLabelEvery(30, 160, labelWidth);
    const roomy = axisLabelEvery(30, 340, labelWidth);

    expect(roomy).toBeLessThanOrEqual(cramped);
  });

  it.each([
    ['no days', 0, 300, 40],
    ['no width', 7, 0, 40],
    ['an unmeasurable label', 7, 300, 0],
  ])('should still return a usable cadence with %s', (_case, count, width, label) => {
    const underTest = axisLabelEvery(count, width, label);

    expect(underTest).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(underTest)).toBe(true);
  });

  it('should never ask for a label wider than the whole chart', () => {
    const underTest = axisLabelEvery(30, 100, 400);

    expect(Math.ceil(30 / underTest)).toBe(1);
  });
});

describe('axisLabelLeft', () => {
  const CHART = 300;
  const LABEL = 44;

  it('should centre a label under its own bar when there is room', () => {
    const underTest = axisLabelLeft(150, LABEL, CHART);

    expect(underTest).toBe(150 - LABEL / 2);
  });

  it('should hold the first label inside the left edge', () => {
    const underTest = axisLabelLeft(6, LABEL, CHART);

    expect(underTest).toBe(0);
  });

  it('should hold the last label inside the right edge', () => {
    const underTest = axisLabelLeft(CHART - 6, LABEL, CHART);

    expect(underTest).toBe(CHART - LABEL);
  });

  it.each([0, 40, 150, 260, 300])(
    'should never leave the chart from a bar at %ipt',
    (centre) => {
      const underTest = axisLabelLeft(centre, LABEL, CHART);

      expect(underTest).toBeGreaterThanOrEqual(0);
      expect(underTest + LABEL).toBeLessThanOrEqual(CHART);
    }
  );

  it('should give up gracefully when the label cannot fit at all', () => {
    const underTest = axisLabelLeft(150, 400, CHART);

    expect(underTest).toBe(0);
  });
});
