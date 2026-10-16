import type { AgeRange } from '@/constants/age-range';
import type { ReadingMode } from '@/contexts/story-transition-context';

export type PlanStepKind = 'story' | 'music';

export type PlanSkill = 'listening' | 'vocabulary' | 'feelings' | 'confidence' | 'rhythm' | 'patience';

export type PlanAgeRange = Exclude<AgeRange, 'all'>;

export interface LearningPlanStep {
  id: string;
  day: number;
  kind: PlanStepKind;
  placeKey: string;
  domainKey: string;
  aimKey: string;
  skills: readonly [PlanSkill, PlanSkill];
  minutes: readonly [number, number];
  storyId?: string;
  mode?: ReadingMode;
}

export interface LearningPlan {
  id: string;
  steps: readonly LearningPlanStep[];
}

export type PlanLaunch =
  | { kind: 'story'; storyId: string; mode: ReadingMode }
  | { kind: 'music'; activityId: string };
