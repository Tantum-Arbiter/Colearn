/**
 * Tests for the Screen Time dashboard's schedule callout.
 *
 * The card has two jobs: sell the schedule while none exists, and report the
 * real one once it does. Both are checked here, along with the helper that
 * decides which reminder counts as "next".
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { ScheduleCallout, pickNextReminder } from '@/components/screen-time/schedule-callout';
import type { CustomReminder, ReminderStats } from '@/services/reminder-service';

jest.mock('@/services/reminder-service', () => ({
  // the callout only reaches for the formatter
  ReminderService: { formatTime: (time: string) => `at ${time}` },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, style }: any) => <View style={style}>{children}</View> };
});

function reminder(over: Partial<CustomReminder> = {}): CustomReminder {
  return {
    id: 'r1',
    title: 'Story time',
    message: 'Time for a story',
    dayOfWeek: 2,
    time: '09:00',
    isActive: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...over,
  };
}

function stats(over: Partial<ReminderStats> = {}): ReminderStats {
  return { totalReminders: 0, activeReminders: 0, upcomingToday: [], ...over };
}

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function toStr(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

describe('pickNextReminder', () => {
  it('excludes a reminder firing at exactly this minute -- only what is still ahead counts', () => {
    const next = pickNextReminder([reminder({ time: '09:00' })], '09:00');

    expect(next).toBeNull();
  });

  it('takes the earliest reminder still ahead', () => {
    const next = pickNextReminder(
      [reminder({ id: 'late', time: '17:00' }), reminder({ id: 'soon', time: '14:30' })],
      '13:00'
    );

    expect(next?.id).toBe('soon');
  });

  it('ignores reminders whose time has passed', () => {
    const next = pickNextReminder(
      [reminder({ id: 'gone', time: '08:00' }), reminder({ id: 'ahead', time: '20:15' })],
      '12:00'
    );

    expect(next?.id).toBe('ahead');
  });

  it('returns null once the day is done', () => {
    expect(pickNextReminder([reminder({ time: '08:00' })], '22:00')).toBeNull();
  });

  it('returns null when nothing is scheduled today', () => {
    expect(pickNextReminder([], '09:00')).toBeNull();
  });
});

describe('ScheduleCallout', () => {
  describe('with no schedule yet', () => {
    it('leads with the benefit rather than the mechanics', () => {
      const body = toStr(render(<ScheduleCallout stats={stats()} onOpen={jest.fn()} />));

      expect(body).toContain('screenTime.scheduleEmptyTitle');
      expect(body).toContain('screenTime.scheduleEmptyBody');
      expect(body).not.toContain('screenTime.scheduleActiveTitle');
    });

    it('shows all three benefit chips', () => {
      const body = toStr(render(<ScheduleCallout stats={stats()} onOpen={jest.fn()} />));

      expect(body).toContain('screenTime.scheduleBenefitCalm');
      expect(body).toContain('screenTime.scheduleBenefitGentle');
      expect(body).toContain('screenTime.scheduleBenefitBedtime');
    });

    it('invites the parent to create one', () => {
      const body = toStr(render(<ScheduleCallout stats={stats()} onOpen={jest.fn()} />));

      expect(body).toContain('screenTime.createMySchedule');
      expect(body).not.toContain('screenTime.scheduleManage');
    });

    it('reads as empty while the stats are still loading', () => {
      const body = toStr(render(<ScheduleCallout stats={null} onOpen={jest.fn()} />));

      expect(body).toContain('screenTime.scheduleEmptyTitle');
    });
  });

  describe('with a schedule', () => {
    const withReminders = stats({
      totalReminders: 3,
      activeReminders: 3,
      upcomingToday: [reminder({ time: '08:00' }), reminder({ id: 'r2', time: '18:45' })],
    });

    // a reminder can be created and then paused, rather than deleted -- it
    // should stay visible and manageable, not silently drop the parent back
    // into the "create a schedule" pitch as if nothing existed
    it('counts every created reminder, not only the active ones', () => {
      const paused = stats({
        totalReminders: 2,
        activeReminders: 0,
        upcomingToday: [],
      });

      const body = toStr(render(<ScheduleCallout stats={paused} onOpen={jest.fn()} />));

      expect(body).toContain('screenTime.scheduleActiveTitle');
      expect(body).toContain('count:2');
    });

    beforeEach(() => {
      // fix the clock so "next" is deterministic: 12:00 leaves 18:45 ahead
      jest.useFakeTimers().setSystemTime(new Date('2026-08-23T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('reports the state instead of repeating the pitch', () => {
      const body = toStr(render(<ScheduleCallout stats={withReminders} onOpen={jest.fn()} />));

      expect(body).toContain('screenTime.scheduleActiveTitle');
      expect(body).not.toContain('screenTime.scheduleEmptyBody');
    });

    it('counts the reminders and names the next one', () => {
      const body = toStr(render(<ScheduleCallout stats={withReminders} onOpen={jest.fn()} />));

      expect(body).toContain('count:3');
      expect(body).toContain('next:at 18:45');
    });

    it('says so when nothing is left today', () => {
      const done = stats({
        totalReminders: 2,
        activeReminders: 2,
        upcomingToday: [reminder({ time: '08:00' })],
      });

      const body = toStr(render(<ScheduleCallout stats={done} onOpen={jest.fn()} />));

      expect(body).toContain('next:screenTime.scheduleNothingToday');
    });

    it('drops the benefit chips once the parent is sold', () => {
      const body = toStr(render(<ScheduleCallout stats={withReminders} onOpen={jest.fn()} />));

      expect(body).not.toContain('screenTime.scheduleBenefitCalm');
    });

    it('offers to manage rather than to create', () => {
      const body = toStr(render(<ScheduleCallout stats={withReminders} onOpen={jest.fn()} />));

      expect(body).toContain('screenTime.scheduleManage');
      expect(body).not.toContain('screenTime.createMySchedule');
    });
  });

  it('opens the window when the call to action is pressed', () => {
    const onOpen = jest.fn();
    const tree = render(<ScheduleCallout stats={stats()} onOpen={onOpen} />);

    fireEvent.press(findByTestId(tree, 'schedule-callout-cta')[0]);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('takes a testID for the host to hang assertions on', () => {
    const tree = render(<ScheduleCallout stats={stats()} onOpen={jest.fn()} testID="host-callout" />);

    expect(findByTestId(tree, 'host-callout').length).toBeGreaterThan(0);
  });
});
