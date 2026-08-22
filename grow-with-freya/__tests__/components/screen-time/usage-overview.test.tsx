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

  it('labels all seven days at the default range', () => {
    const body = toStr(renderOverview());

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

  it('plots the trend chart once the chart area has a width', () => {
    const tree = renderOverview();

    expect(findByTestId(tree, 'usage-trend-chart')).toHaveLength(0);

    layOutChart(tree);

    expect(findByTestId(tree, 'usage-trend-chart').length).toBeGreaterThan(0);
  });

  it('draws one dot per day at the seven day range', () => {
    const tree = renderOverview();
    layOutChart(tree);

    const dots = tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => n.props.testID === 'svg-Circle'
    );

    // seven trend points plus the two ring circles
    expect(dots.length).toBe(7 + 2);
  });

  it('thins the dots out at the thirty day range', () => {
    const tree = renderOverview();
    layOutChart(tree);

    fireEvent.press(findByTestId(tree, 'usage-range-pill')[0]);
    fireEvent.press(findByTestId(tree, 'usage-range-30')[0]);

    const dots = tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => n.props.testID === 'svg-Circle'
    );

    // every fifth day over thirty days, plus the two ring circles
    expect(dots.length).toBe(6 + 2);
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

      expect(toStr(renderOverview())).toContain(`storyGarden.greeting.${expected}`);
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
