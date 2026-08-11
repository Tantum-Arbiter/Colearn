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
import { render, fireEvent } from '@testing-library/react-native';

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
});
