import type { ReadingMode } from '@/contexts/story-transition-context';
import { MUSIC_PRACTISE_ACTIVITY } from '@/data/plan-units';
import type { Ionicons } from '@expo/vector-icons';
import type { LearningPlan, LearningPlanStep, PlanLaunch, PlanStepKind } from '@/types/learning-plan';

export const PLAN_STEPS_PER_WEEK = 7;

export const PLAN_STEP_ICON = {
  story: 'book',
  music: 'musical-notes',
  game: 'sparkles',
} as const satisfies Record<PlanStepKind, keyof typeof Ionicons.glyphMap>;

export const PLAN_MODE_ICON = {
  read: 'book',
  narrate: 'volume-medium',
  record: 'mic',
} as const satisfies Record<ReadingMode, keyof typeof Ionicons.glyphMap>;

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

export function previewable(launch: PlanLaunch): boolean {
  return launch.kind === 'story';
}

export function launchFor(step: LearningPlanStep): PlanLaunch | null {
  switch (step.kind) {
    case 'story':
      return step.storyId ? { kind: 'story', storyId: step.storyId, mode: step.mode ?? 'read' } : null;
    case 'music':
      return { kind: 'music', activityId: MUSIC_PRACTISE_ACTIVITY };
    case 'game':
      return step.packId && step.missionId ? { kind: 'game', packId: step.packId, missionId: step.missionId } : null;
  }
}
