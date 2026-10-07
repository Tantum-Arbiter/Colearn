import { ageMonthsToRange } from '@/components/learning/age-range-carousel';
import type { TransitionActivity } from '@/contexts/ActivityTransitionContext';
import { ALL_LEARNING_ACTIVITIES } from '@/data/learning-activities';
import { MUSIC_PRACTISE_ACTIVITY } from '@/data/learning-plan';
import type { Ionicons } from '@expo/vector-icons';
import type { LearningPlan, LearningPlanStep, PlanAgeRange, PlanLaunch, PlanStepKind } from '@/types/learning-plan';

export const PLAN_STEPS_PER_WEEK = 7;

export const PLAN_STEP_ICON = {
  story: 'book',
  words: 'text',
  numbers: 'calculator',
  feelings: 'happy',
  music: 'musical-notes',
} as const satisfies Record<PlanStepKind, keyof typeof Ionicons.glyphMap>;

export type PlanStepState = 'done' | 'open' | 'tomorrow' | 'locked';

export interface LearningPlanProgress {
  planId: string;
  completed: Record<string, string>;
}

function twoDigits(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

export function localDayKey(moment: Date): string {
  return `${moment.getFullYear()}-${twoDigits(moment.getMonth() + 1)}-${twoDigits(moment.getDate())}`;
}

function completedOn(stamp: string | undefined): string | null {
  if (stamp === undefined) return null;
  const moment = new Date(stamp);
  if (Number.isNaN(moment.getTime())) return '';

  return localDayKey(moment);
}

export function stepStates(plan: LearningPlan, progress: LearningPlanProgress | null, now: Date): PlanStepState[] {
  const completed = progress && progress.planId === plan.id ? progress.completed : {};
  const today = localDayKey(now);
  let opened = false;

  return plan.steps.map((step, index) => {
    const finished = completedOn(completed[step.id]);
    if (finished !== null) return 'done';
    if (opened) return 'locked';
    opened = true;
    if (index === 0) return 'open';

    const before = completedOn(completed[plan.steps[index - 1].id]);
    if (before === null) return 'locked';

    return before < today ? 'open' : 'tomorrow';
  });
}

export function currentStep(plan: LearningPlan, progress: LearningPlanProgress | null, now: Date): LearningPlanStep | null {
  const states = stepStates(plan, progress, now);
  const index = states.findIndex((state) => state === 'open' || state === 'tomorrow');

  return index < 0 ? null : plan.steps[index];
}

export function activityFor(step: LearningPlanStep, ageInMonths: number | null): string | null {
  if (!step.activityByAge) return null;
  const known = ageInMonths !== null && Number.isFinite(ageInMonths) ? ageMonthsToRange(ageInMonths) : '1-2';
  const age: PlanAgeRange = known === 'all' ? '1-2' : known;

  return step.activityByAge[age];
}

export function previewable(launch: PlanLaunch): boolean {
  return launch.kind === 'story' || launch.kind === 'spelling';
}

export function previewActivity(activityId: string): TransitionActivity | null {
  const activity = ALL_LEARNING_ACTIVITIES.find((candidate) => candidate.id === activityId);
  if (!activity) return null;
  const { id, nameKey, descKey, ageKey, icon, color } = activity;

  return { id, nameKey, descKey, ageKey, icon, color };
}

export function launchFor(step: LearningPlanStep, ageInMonths: number | null): PlanLaunch | null {
  switch (step.kind) {
    case 'story':
      return step.storyId ? { kind: 'story', storyId: step.storyId } : null;
    case 'words':
    case 'numbers': {
      const activityId = activityFor(step, ageInMonths);
      return activityId ? { kind: 'spelling', activityId } : null;
    }
    case 'feelings':
      return step.activityIds && step.activityIds.length > 0 ? { kind: 'feelings', activityIds: step.activityIds } : null;
    case 'music':
      return { kind: 'music', activityId: MUSIC_PRACTISE_ACTIVITY };
  }
}
