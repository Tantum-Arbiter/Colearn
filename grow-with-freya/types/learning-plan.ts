import type { ImageSourcePropType } from 'react-native';
import type { AgeRange } from '@/constants/age-range';
import type { ReadingMode } from '@/contexts/story-transition-context';

export type PlanStepKind = 'story' | 'music' | 'game';

export type PlanDomain = 'language' | 'feelings' | 'music' | 'maths';

export type PlanGoal = 'cosyStories' | 'bigFeelings' | 'makeMusic';

export type PlanUnitId =
  | 'wombat-read'
  | 'wombat-record'
  | 'wombat-picnic'
  | 'wombat-listen'
  | 'juni-record'
  | 'music-practise'
  | 'juni-read'
  | 'juni-listen'
  | 'ding-read'
  | 'ding-record'
  | 'ding-listen';

export type PlanSkill = 'listening' | 'vocabulary' | 'feelings' | 'confidence' | 'rhythm' | 'patience' | 'counting' | 'numbers';

export type PlanAgeRange = Exclude<AgeRange, 'all'>;

export interface LearningPlanStep {
  id: string;
  day: number;
  unitId: PlanUnitId;
  kind: PlanStepKind;
  placeKey: string;
  domainKey: string;
  aimKey: string;
  skills: readonly [PlanSkill, PlanSkill];
  minutes: readonly [number, number];
  storyId?: string;
  mode?: ReadingMode;
  packId?: string;
  missionId?: string;
  titleKey?: string;
  picture?: ImageSourcePropType;
}

export interface LearningPlan {
  id: string;
  steps: readonly LearningPlanStep[];
}

export type PlanLaunch =
  | { kind: 'story'; storyId: string; mode: ReadingMode }
  | { kind: 'music'; activityId: string }
  | { kind: 'game'; packId: string; missionId: string };
