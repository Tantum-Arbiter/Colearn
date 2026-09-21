/**
 * Tests for the parent dashboard usage overview.
 *
 * Key behaviors tested:
 * 1. Every block of the design renders: greeting, child chip, today card,
 *    trend card, encouragement banner
 * 2. Copy comes from translation keys
 * 3. The banner flips between within-limit and over-limit states
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import { UsageOverview } from '@/components/screen-time/usage-overview';
import { TREND_BAR } from '@/constants/usage-trend-bars';

jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    userNickname: 'Liam',
    userAvatarId: 'bear',
    childAgeInMonths: 60,
  }),
}));

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function toStr(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

function makeDailyTotals(days = 30) {
  const totals = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    totals.push({ date: d.toISOString().split('T')[0], seconds: (i % 4) * 1800 });
  }
  return totals;
}

function renderOverview(overrides: Partial<React.ComponentProps<typeof UsageOverview>> = {}) {
  return render(
    <UsageOverview
      todayUsageSeconds={4680}
      dailyLimitSeconds={7200}
      dailyTotals={makeDailyTotals()}
      dayNames={DAY_NAMES}
      {...overrides}
    />
  );
}

describe('UsageOverview', () => {
  it('leads with the greeting by default', () => {
    expect(findByTestId(renderOverview(), 'usage-greeting').length).toBeGreaterThan(0);
  });

  it('drops the greeting when the host leads with a header of its own', () => {
    // the glance puts an alert header here once the limit is spent, and a
    // cheerful "Good afternoon" underneath it reads as two voices at once
    const tree = renderOverview({ showGreeting: false });

    expect(findByTestId(tree, 'usage-greeting')).toHaveLength(0);
    expect(findByTestId(tree, 'usage-child-chip').length).toBeGreaterThan(0);
  });

  it('renders every block of the dashboard', () => {
    const tree = renderOverview();

    for (const id of [
      'usage-overview',
      'usage-child-chip',
      'usage-today-card',
      'usage-trend-card',
      'usage-banner',
    ]) {
      expect(findByTestId(tree, id).length).toBeGreaterThan(0);
    }
  });

  it('takes its copy from translation keys', () => {
    const body = toStr(renderOverview());

    expect(body).toContain('screenTime.helpingStayBalanced');
    expect(body).toContain('screenTime.todaysScreenTime');
    expect(body).toContain('screenTime.used');
    expect(body).toContain('screenTime.remaining');
    expect(body).toContain('screenTime.dailyLimitLabel');
    expect(body).toContain('screenTime.screenTimeTrend');
    expect(body).toContain('screenTime.sevenDay');
    expect(body).toContain('screenTime.activeNow');
  });

  it('shows the child nickname on the chip', () => {
    expect(toStr(renderOverview())).toContain('Liam');
  });

  // the chip carries identity only; the age band moved to the profile screen
  it('shows the child in the chip without an age band', () => {
    const tree = renderOverview();

    expect(findByTestId(tree, 'usage-child-chip').length).toBeGreaterThan(0);

    const body = toStr(tree);
    expect(body).not.toContain('screenTime.age18to24months');
    expect(body).not.toContain('screenTime.age2to6years');
    expect(body).not.toContain('screenTime.age6plus');
  });

  it('encourages when under the limit', () => {
    const body = toStr(renderOverview({ todayUsageSeconds: 1800 }));

    expect(body).toContain('screenTime.withinLimitTitle');
    expect(body).not.toContain('screenTime.overLimitTitle');
  });

  it('flags when the limit is reached', () => {
    const body = toStr(renderOverview({ todayUsageSeconds: 7200 }));

    expect(body).toContain('screenTime.overLimitTitle');
    expect(body).not.toContain('screenTime.withinLimitTitle');
  });

  // the suite otherwise asserts only translation keys and testIDs, so a ring
  // rendering an impossible "51h 35m" would still pass everything else
  it('renders the actual usage figures rather than just the labels', () => {
    const tree = renderOverview({ todayUsageSeconds: 4680, dailyLimitSeconds: 7200 });
    const body = toStr(tree);

    expect(body).toContain('"1h 18m"'); // used
    expect(body).toContain('"42m"'); // remaining
    expect(body).toContain('"2h"'); // daily limit
  });

  // pinned by testID: asserting the string merely appears somewhere passes even
  // when the ring is showing the limit instead of the usage
  it('shows today\'s usage in the ring centre, not some other figure', () => {
    const tree = renderOverview({ todayUsageSeconds: 4680, dailyLimitSeconds: 7200 });

    const ringValue = findByTestId(tree, 'usage-ring-value')[0];

    expect(ringValue.props.children).toBe('1h 18m');
  });

  it('shows the remaining time bottoming out at zero once the limit is passed', () => {
    const body = toStr(renderOverview({ todayUsageSeconds: 9000, dailyLimitSeconds: 7200 }));

    expect(body).toContain('"2h 30m"');
    expect(body).toContain('"0m"');
    // remaining clamps at zero rather than rendering a negative duration.
    // Anchored on the opening quote so this matches rendered text nodes only,
    // not the hyphenated class names that fill the serialised tree.
    expect(body).not.toMatch(/"-\d/);
  });

  // the axis places each label under its own bar, so it needs the chart's
  // width before it can render any of them
  it('labels all seven days at the default range', () => {
    const tree = renderOverview();
    layOutChart(tree);

    const body = toStr(tree);

    for (const label of DAY_NAMES) {
      expect(body).toContain(label);
    }
  });

  it('opens the range menu from the pill', () => {
    const tree = renderOverview();

    expect(findByTestId(tree, 'usage-range-menu')).toHaveLength(0);

    fireEvent.press(findByTestId(tree, 'usage-range-pill')[0]);

    expect(findByTestId(tree, 'usage-range-menu')).toHaveLength(1);
    for (const days of [7, 14, 30]) {
      expect(findByTestId(tree, `usage-range-${days}`).length).toBeGreaterThan(0);
    }
  });

  it('switches the trend to a longer range', () => {
    const tree = renderOverview();

    fireEvent.press(findByTestId(tree, 'usage-range-pill')[0]);
    fireEvent.press(findByTestId(tree, 'usage-range-30')[0]);

    const body = toStr(tree);
    expect(body).toContain('screenTime.thirtyDay');
    // menu closes after choosing
    expect(findByTestId(tree, 'usage-range-menu')).toHaveLength(0);
    // 30-day labels are dates, not weekday names
    expect(body).not.toContain('"Tue"');
  });

  // the trend chart only renders once onLayout reports a width, which never
  // happens on its own in a test renderer
  function layOutChart(tree: ReturnType<typeof render>, width = 280) {
    const area = findByTestId(tree, 'usage-chart-area')[0];
    // react-native-web does not deliver a synthetic layout event, so invoke the
    // handler the component registered
    act(() => {
      (area.props.onLayout as (e: unknown) => void)({
        nativeEvent: { layout: { width, height: 88 } },
      });
    });
  }

  // the axis used to spread its labels with `space-between` over one empty
  // Text per unlabelled day, which pushed the last one off the end of the card
  // at 14 and 30 days
  describe('the x axis labels', () => {
    const CHART = 280;

    function axisLabels(tree: ReturnType<typeof render>) {
      return tree.UNSAFE_root.findAll(
        (n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('usage-trend-label-')
      );
    }

    interface LabelBox {
      left: number;
      width: number;
    }

    function boxOf(node: any): LabelBox {
      const style = Array.isArray(node.props.style)
        ? Object.assign({}, ...node.props.style.filter(Boolean))
        : node.props.style;

      return { left: style.left as number, width: style.width as number };
    }

    function openRange(tree: ReturnType<typeof render>, days: 7 | 14 | 30) {
      fireEvent.press(findByTestId(tree, 'usage-range-pill')[0]);
      fireEvent.press(findByTestId(tree, `usage-range-${days}`)[0]);
    }

    it.each([7, 14, 30] as const)('stay inside the chart across %i days', (days) => {
      const tree = renderOverview();
      layOutChart(tree, CHART);
      openRange(tree, days);
      layOutChart(tree, CHART);

      const boxes = axisLabels(tree).map(boxOf);

      expect(boxes.length).toBeGreaterThan(0);
      boxes.forEach(({ left, width }: LabelBox) => {
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left + width).toBeLessThanOrEqual(CHART);
      });
    });

    it.each([14, 30] as const)('never overlap each other across %i days', (days) => {
      const tree = renderOverview();
      layOutChart(tree, CHART);
      openRange(tree, days);
      layOutChart(tree, CHART);

      const boxes = axisLabels(tree)
        .map(boxOf)
        .sort((a: LabelBox, b: LabelBox) => a.left - b.left);

      boxes.slice(1).forEach((box: LabelBox, i: number) => {
        expect(box.left).toBeGreaterThanOrEqual(boxes[i].left + boxes[i].width);
      });
    });

    it('keeps every label the same size rather than shrinking them to fit', () => {
      const tree = renderOverview();
      layOutChart(tree, CHART);
      openRange(tree, 30);
      layOutChart(tree, CHART);

      const sizes = axisLabels(tree).map((n: any) => {
        const style = Array.isArray(n.props.style)
          ? Object.assign({}, ...n.props.style.filter(Boolean))
          : n.props.style;
        return style.fontSize as number;
      });

      expect(new Set(sizes).size).toBe(1);
      expect(sizes[0]).toBeGreaterThanOrEqual(11);
    });
  });

  // with only today's data the chart was 29 empty columns and one bar, and
  // nothing tied a clamped label to the bar it belonged to
  describe('reading dates off the chart', () => {
    const CHART = 280;

    function withRange(days: 7 | 14 | 30) {
      const tree = renderOverview();
      layOutChart(tree, CHART);
      fireEvent.press(findByTestId(tree, 'usage-range-pill')[0]);
      fireEvent.press(findByTestId(tree, `usage-range-${days}`)[0]);
      layOutChart(tree, CHART);

      return tree;
    }

    function testIdsStartingWith(tree: ReturnType<typeof render>, prefix: string) {
      return tree.UNSAFE_root.findAll(
        (n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith(prefix)
      );
    }

    it('names the span of dates it covers', () => {
      const tree = withRange(30);

      expect(findByTestId(tree, 'usage-trend-span')).toHaveLength(1);
    });

    it('marks the days that went past the limit in amber', () => {
      // Heights alone say how the days compare to each other; they say nothing
      // about whether any of them was a healthy amount.
      const overAndUnder = [
        { date: '2026-09-08', seconds: 600 },
        { date: '2026-09-09', seconds: 47820 },
        { date: '2026-09-10', seconds: 1200 },
      ];

      const tree = renderOverview({
        dailyTotals: overAndUnder,
        dailyLimitSeconds: 3600,
        todayUsageSeconds: 1200,
      });
      layOutChart(tree, CHART);

      const fills = testIdsStartingWith(tree, 'usage-trend-bar-').map((n: any) => n.props.fill);
      expect(fills[1]).toBe(TREND_BAR.overFaint);
      expect(fills[0]).toBe(TREND_BAR.withinFaint);
    });

    it('keeps a day that went past the limit amber when it is the one picked out', () => {
      const tree = renderOverview({
        dailyTotals: [{ date: '2026-09-10', seconds: 47820 }],
        dailyLimitSeconds: 3600,
        todayUsageSeconds: 47820,
      });
      layOutChart(tree, CHART);

      const fills = testIdsStartingWith(tree, 'usage-trend-bar-').map((n: any) => n.props.fill);
      expect(fills[0]).toBe(TREND_BAR.over);
    });

    it('leaves every day teal when no limit is set', () => {
      const tree = renderOverview({
        dailyTotals: [{ date: '2026-09-10', seconds: 47820 }],
        dailyLimitSeconds: 0,
        todayUsageSeconds: 47820,
      });
      layOutChart(tree, CHART);

      const fills = testIdsStartingWith(tree, 'usage-trend-bar-').map((n: any) => n.props.fill);
      expect(fills[0]).toBe(TREND_BAR.within);
    });

    it('gives every day a slot that can be seen, even an empty one', () => {
      const tree = withRange(30);

      const heights = testIdsStartingWith(tree, 'usage-trend-bar-').map(
        (n: any) => n.props.height as number
      );

      expect(heights).toHaveLength(30);
      heights.forEach((height: number) => expect(height).toBeGreaterThanOrEqual(2));
    });

    it.each([7, 14, 30] as const)('ticks the bar each label belongs to at %i days', (days) => {
      const tree = withRange(days);

      const ticks = testIdsStartingWith(tree, 'usage-trend-tick-');
      const labels = testIdsStartingWith(tree, 'usage-trend-label-');

      expect(ticks).toHaveLength(labels.length);
    });

    it('puts each tick on its own bar rather than on the label box', () => {
      const tree = withRange(30);

      const ticks = testIdsStartingWith(tree, 'usage-trend-tick-');
      const bars = testIdsStartingWith(tree, 'usage-trend-bar-');
      const barCentres = bars.map(
        (b: any) => (b.props.x as number) + (b.props.width as number) / 2
      );

      expect(ticks.length).toBeGreaterThan(0);
      ticks.forEach((tick: any) => {
        const x = tick.props.x1 as number;
        const nearest = Math.min(...barCentres.map((c: number) => Math.abs(c - x)));

        expect(nearest).toBeLessThan(1);
      });
    });

    it('closes the chart off with a baseline', () => {
      const tree = withRange(30);

      expect(findByTestId(tree, 'usage-trend-baseline')).toHaveLength(1);
    });
  });

  it('plots the trend chart once the chart area has a width', () => {
    const tree = renderOverview();

    expect(findByTestId(tree, 'usage-trend-chart')).toHaveLength(0);

    layOutChart(tree);

    expect(findByTestId(tree, 'usage-trend-chart').length).toBeGreaterThan(0);
  });

  // Apple Screen Time's weekly/monthly graph is bars, not a line -- every day
  // in the range gets a bar (unlike the axis labels, which thin out so dates
  // never crowd). These count svg-Rect globally: nothing else in this
  // component renders a Rect, so the count is exactly the bar count.
  function countBars(tree: ReturnType<typeof render>) {
    return tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => n.props.testID === 'svg-Rect'
    ).length;
  }

  it('draws one bar per day at the seven day range', () => {
    const tree = renderOverview();
    layOutChart(tree);

    expect(countBars(tree)).toBe(7);
  });

  it('still draws one bar per day at the thirty day range -- only the labels thin out', () => {
    const tree = renderOverview();
    layOutChart(tree);

    fireEvent.press(findByTestId(tree, 'usage-range-pill')[0]);
    fireEvent.press(findByTestId(tree, 'usage-range-30')[0]);

    expect(countBars(tree)).toBe(30);
  });

  describe('selecting a day', () => {
    // the i18n mock renders an interpolated call as "key (opt:value, ...)",
    // and nested t() calls resolve to their own bare key first -- so this
    // exact string can only appear from screenTime.trendDayUsage itself, not
    // from an unrelated key like screenTime.todaysScreenTime coincidentally
    // containing the substring "today"
    // UNSAFE_root.findAll returns live fiber nodes, which are circular and
    // cannot be JSON.stringify'd; toJSON()'s output is a plain serialisable
    // tree, so search that instead and stringify just the matched subtree
    function findInJSON(node: any, testID: string): any {
      if (!node) return null;
      if (Array.isArray(node)) {
        for (const n of node) {
          const found = findInJSON(n, testID);
          if (found) return found;
        }
        return null;
      }
      if (typeof node !== 'object') return null;
      // toJSON()'s output reflects react-native-web's rendered DOM props,
      // where testID becomes data-testid -- unlike UNSAFE_root.findAll, which
      // reads the pre-render React element props and keeps the name testID
      if (node.props?.['data-testid'] === testID) return node;
      const children = Array.isArray(node.children) ? node.children : [];
      for (const child of children) {
        const found = findInJSON(child, testID);
        if (found) return found;
      }
      return null;
    }

    function selectedSummary(tree: ReturnType<typeof render>) {
      return JSON.stringify(findInJSON(tree.toJSON(), 'usage-trend-selected'));
    }

    it("defaults to today's total, mirroring Apple Screen Time's default view", () => {
      const tree = renderOverview({ todayUsageSeconds: 4680 });
      layOutChart(tree);

      // 4680s = 1h 18m
      expect(selectedSummary(tree)).toContain(
        'screenTime.trendDayUsage (day:screenTime.today, duration:1h 18m)'
      );
    });

    it("shows that day's own total when a past bar is pressed, not the running total", () => {
      const tree = renderOverview({ todayUsageSeconds: 4680 });
      layOutChart(tree);

      // makeDailyTotals: seconds = (daysAgo % 4) * 1800; one day ago = 1800s = 30m
      fireEvent.press(findByTestId(tree, 'usage-trend-day-1')[0]);

      expect(selectedSummary(tree)).toContain('duration:30m');
      expect(selectedSummary(tree)).not.toContain('day:screenTime.today');
    });

    it("returns to reporting today when today's own bar is pressed again", () => {
      const tree = renderOverview({ todayUsageSeconds: 4680 });
      layOutChart(tree);

      fireEvent.press(findByTestId(tree, 'usage-trend-day-1')[0]);
      fireEvent.press(findByTestId(tree, 'usage-trend-day-6')[0]); // today, at the 7-day range

      expect(selectedSummary(tree)).toContain('day:screenTime.today');
    });

    it('resets the selection back to today when the range changes', () => {
      const tree = renderOverview({ todayUsageSeconds: 4680 });
      layOutChart(tree);

      fireEvent.press(findByTestId(tree, 'usage-trend-day-1')[0]);
      expect(selectedSummary(tree)).not.toContain('day:screenTime.today');

      fireEvent.press(findByTestId(tree, 'usage-range-pill')[0]);
      fireEvent.press(findByTestId(tree, 'usage-range-30')[0]);

      expect(selectedSummary(tree)).toContain('day:screenTime.today');
    });

    it("does not let the live usage poll silently override the parent's selection", () => {
      const tree = renderOverview({ todayUsageSeconds: 4680 });
      layOutChart(tree);

      fireEvent.press(findByTestId(tree, 'usage-trend-day-1')[0]);
      expect(selectedSummary(tree)).toContain('duration:30m');

      // todayUsageSeconds changing (a live poll) must not touch the selection
      tree.rerender(
        <UsageOverview
          todayUsageSeconds={5000}
          dailyLimitSeconds={7200}
          dailyTotals={makeDailyTotals()}
          dayNames={DAY_NAMES}
        />
      );

      expect(selectedSummary(tree)).toContain('duration:30m');
      expect(selectedSummary(tree)).not.toContain('day:screenTime.today');
    });

  });

  describe('edge cases', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it.each([
      ['2026-08-13T09:00:00.000Z', 'morning'],
      ['2026-08-13T14:00:00.000Z', 'afternoon'],
      ['2026-08-13T20:00:00.000Z', 'evening'],
    ])('greets by the time of day at %s', (now, expected) => {
      jest.useFakeTimers({ now: new Date(now) });

      expect(toStr(renderOverview())).toContain(`greeting.${expected}`);
    });

    it('does not divide by zero when no daily limit is set', () => {
      const body = toStr(renderOverview({ todayUsageSeconds: 600, dailyLimitSeconds: 0 }));

      // the ring still renders and the remaining time floors at zero
      expect(body).toContain('"10m"');
      expect(body).not.toContain('NaN');
      expect(body).not.toContain('Infinity');
    });

    it('falls back to the generic greeting when the child has no name', () => {
      const body = toStr(renderOverview());

      // the mocked store supplies "Liam", so the named variant is used
      expect(body).toContain('screenTime.helpingStayBalanced (name:Liam)');
    });
  });
});
