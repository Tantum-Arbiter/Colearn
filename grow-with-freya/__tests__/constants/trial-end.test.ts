/**
 * Tests for the rules that decide when the trial-end screen is worth showing.
 *
 * The screen asks a parent to upgrade before the first charge, so it belongs
 * on the trial's last day and nowhere earlier -- the day-3 "your trial is
 * ending" warning is a notification's job, and a screen selling a bigger plan
 * two days out is a sales pitch interrupting a decision still in progress.
 * The other thing that matters is that answering it once settles that trial.
 */

import {
  TRIAL_END_PROMPT_DAYS,
  shouldPromptTrialEnd,
  trialCalendarDaysRemaining,
  trialDaysRemaining,
  trialPromptKey,
  type TrialStatus,
} from '@/constants/trial-end';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-06T09:00:00.000Z');

function status(overrides: Partial<TrialStatus> = {}): TrialStatus {
  return {
    inTrial: true,
    daysRemaining: 0,
    endsAt: new Date('2026-09-08T09:00:00.000Z'),
    billingTier: 'basic',
    ...overrides,
  };
}

describe('trialDaysRemaining', () => {
  it.each([
    ['five whole days', 5 * DAY_MS, 5],
    ['two whole days', 2 * DAY_MS, 2],
    ['thirty hours', 30 * 60 * 60 * 1000, 1],
    ['five hours', 5 * 60 * 60 * 1000, 0],
  ])('reports %s as %i days left', (_label, offset, expected) => {
    const underTest = new Date(NOW.getTime() + offset);

    expect(trialDaysRemaining(underTest, NOW)).toBe(expected);
  });

  it('never counts below zero once the trial has passed', () => {
    const underTest = new Date(NOW.getTime() - 3 * DAY_MS);

    expect(trialDaysRemaining(underTest, NOW)).toBe(0);
  });
});

/**
 * Dates built in local time on purpose: a UTC instant lands on either side of
 * midnight depending on the runner's zone, and which side it lands on is the
 * whole question here.
 */
describe('trialCalendarDaysRemaining', () => {
  const NOON = new Date(2026, 8, 6, 12, 0);

  it.each([
    ['later the same day', new Date(2026, 8, 6, 23, 0), 0],
    ['a few hours away but after midnight', new Date(2026, 8, 7, 2, 0), 1],
    ['the same time tomorrow', new Date(2026, 8, 7, 12, 0), 1],
    ['three days out', new Date(2026, 8, 9, 9, 0), 3],
  ])('counts %s as %i', (_label, endsAt, expected) => {
    expect(trialCalendarDaysRemaining(endsAt, NOON)).toBe(expected);
  });

  it('never counts below zero once the day has passed', () => {
    expect(trialCalendarDaysRemaining(new Date(2026, 8, 4, 9, 0), NOON)).toBe(0);
  });
});

describe('trialPromptKey', () => {
  it('keys a trial by the day it converts', () => {
    expect(trialPromptKey(status())).toBe('2026-09-08');
  });

  it('has no key when there is no trial to key', () => {
    expect(trialPromptKey(null)).toBeNull();
    expect(trialPromptKey(status({ endsAt: null }))).toBeNull();
  });
});

describe('shouldPromptTrialEnd', () => {
  it('asks on the trial’s last day', () => {
    expect(shouldPromptTrialEnd(status({ daysRemaining: TRIAL_END_PROMPT_DAYS }), null)).toBe(true);
  });

  /**
   * The load-bearing one. A day out is still the day-3 warning's territory,
   * and this screen must not turn that warning into an upsell.
   */
  it.each([1, 2, 4])('stays quiet with %i days still to run', (daysRemaining) => {
    expect(shouldPromptTrialEnd(status({ daysRemaining }), null)).toBe(false);
  });

  it('stays quiet when there is no trial running', () => {
    expect(shouldPromptTrialEnd(status({ inTrial: false }), null)).toBe(false);
    expect(shouldPromptTrialEnd(null, null)).toBe(false);
  });

  /** Premium is what the screen sells; there is nothing to offer a Premium trial. */
  it('stays quiet when the trial already converts to Premium', () => {
    expect(shouldPromptTrialEnd(status({ billingTier: 'premium' }), null)).toBe(false);
  });

  it('stays quiet once this trial has been answered', () => {
    expect(shouldPromptTrialEnd(status(), '2026-09-08')).toBe(false);
  });

  it('asks again for a trial the parent has not answered', () => {
    expect(shouldPromptTrialEnd(status(), '2026-04-01')).toBe(true);
  });
});
