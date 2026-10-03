import type { AgeRange } from '@/components/learning/age-range-carousel';

export type PlanStepKind = 'story' | 'words' | 'numbers' | 'feelings' | 'music';

export type PlanSkill =
  | 'listening'
  | 'vocabulary'
  | 'letters'
  | 'counting'
  | 'numbers'
  | 'feelings'
  | 'confidence'
  | 'rhythm'
  | 'patience';

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
  activityByAge?: Readonly<Record<PlanAgeRange, string>>;
  activityIds?: readonly string[];
}

export interface LearningPlan {
  id: string;
  steps: readonly LearningPlanStep[];
}

export type PlanLaunch =
  | { kind: 'story'; storyId: string }
  | { kind: 'spelling'; activityId: string }
  | { kind: 'feelings'; activityIds: readonly string[] }
  | { kind: 'music'; activityId: string };
