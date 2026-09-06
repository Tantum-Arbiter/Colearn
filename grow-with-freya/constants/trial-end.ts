import type { SubscriptionTier } from '@/store/app-store';

/**
 * How many whole days may remain for the upgrade offer to be worth showing.
 *
 * Zero: the trial's final day, with the first charge hours away. The day-3
 * warning is a different message with a different job -- it tells a parent who
 * does not want the subscription to go and cancel, and belongs in a
 * notification, not in a screen that sells them a bigger plan. Asking to
 * upgrade two days out reads as a sales pitch interrupting a trial the parent
 * is still making up their mind about; asking on the last day is the one
 * moment the question is actually live.
 */
export const TRIAL_END_PROMPT_DAYS = 0;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TrialStatus {
  inTrial: boolean;
  daysRemaining: number;
  endsAt: Date | null;
  billingTier: SubscriptionTier;
}

/**
 * Whole days left before the first charge.
 *
 * Floored, not rounded: a trial thirty hours out has one day left, and
 * calling that two would promise a day the parent does not have.
 */
export function trialDaysRemaining(endsAt: Date, now: Date): number {
  const remaining = Math.floor((endsAt.getTime() - now.getTime()) / DAY_MS);
  return remaining > 0 ? remaining : 0;
}

/**
 * Whole calendar days between now and the trial's end, in local time.
 *
 * The countdown is a sentence read directly above the date it refers to, so
 * it has to agree with the calendar rather than with 24-hour blocks: a trial
 * converting at 09:00 tomorrow ends "tomorrow", not "today", even though it
 * is thirteen hours away.
 */
export function trialCalendarDaysRemaining(endsAt: Date, now: Date): number {
  const endDay = new Date(endsAt.getFullYear(), endsAt.getMonth(), endsAt.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((endDay.getTime() - today.getTime()) / DAY_MS);
  return days > 0 ? days : 0;
}

/**
 * Identifies one trial, so the prompt can be answered once and stay answered.
 * The end date is the only handle the store gives that survives a reinstall.
 */
export function trialPromptKey(status: TrialStatus | null): string | null {
  if (!status?.endsAt) return null;
  return status.endsAt.toISOString().slice(0, 10);
}

export function shouldPromptTrialEnd(status: TrialStatus | null, seenFor: string | null): boolean {
  if (!status?.inTrial) return false;
  if (status.daysRemaining > TRIAL_END_PROMPT_DAYS) return false;
  if (status.billingTier === 'premium') return false;

  const key = trialPromptKey(status);
  return key !== null && key !== seenFor;
}
